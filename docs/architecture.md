---
id: architecture
title: System Architecture
description: The 3-tier architecture -- frontend, thin backend, and the local/GPU inference server -- and how the ML pipeline itself works.
sidebar_position: 2
---

# System Architecture

## The 3-tier design

GeoEnhance-AI is three independent parts that meet only on the filesystem (`data/demo_tiles/`) and over HTTP. The
whole point of this split is that the primary demo path -- the five precomputed sector tiles -- survives even if the
live inference path is ever slow, unavailable, or dropped mid-demo.

```
                    Sentinel-2 band TIFFs
                data/raw_tiles/{sector}/
                  (one file per band)
                          |
                          v
              ml/ml_final_pipeline.py  ------->  data/demo_tiles/{sector}/
              (offline, run once)                 output.webp  input.webp
                                                    confidence*.webp  meta.json
                                                          |
                                                          v
Frontend (React, :8443)  <----HTTP---->  Backend (FastAPI, :8000, no ML)
      |                                          |
      | live upload (.zip of 10 bands)           | proxies POST /enhance
      v                                          v
                                    Local inference server (FastAPI, :8100)
                                    -- runs ml_final_pipeline.process_sector()
                                    -- GPU auto-detected: full 8-pass TTA
                                    -- CPU: single-pass, smaller ROI
```

1. **ML pipeline (`ml/`)** reads the ten band files of a scene, runs SEN2SR Lite at 4x, runs an 8-pass test-time
   augmentation ensemble for uncertainty, computes a sector-appropriate spectral index and a sharpness metric, and
   writes display images plus `meta.json` per sector. This is what both the offline demo-tile generation **and** the
   live inference server call -- the same audited code path, not two implementations.
2. **Backend (`backend/`)** is a thin FastAPI service. It runs **no model** -- that's a locked design decision, not an
   oversight. It serves the precomputed outputs and their metadata, and it proxies `POST /enhance` to the local
   inference server rather than running inference itself.
3. **Local inference server (`ml/inference_server.py`)** is Tier 3 -- a separate process, run with `ml/venv`'s Python
   (which has torch; `backend/venv` deliberately doesn't). It's what actually calls `process_sector()` for a live
   upload. Single-request-at-a-time by design (`asyncio.Lock`, reject with 429 rather than queue) -- a CPU inference
   run can take a minute or more, and this has to stay responsive rather than absorb pile-on load. GPU is
   auto-detected once at import (`torch.cuda.is_available()`): if present, live uploads get full 8-pass TTA at the
   production 512px window; on CPU, they get a single pass at a smaller window, so a live demo stays fast regardless
   of what hardware it's running on.
4. **Frontend (`frontend/`)** is a React 19 + Vite + Tailwind dashboard: before/after slider, switchable confidence
   overlays, a magnifier with true-pixel raw-side rendering, and per-sector statistics read straight from
   `meta.json` -- nothing on screen is a number the interface invented.

Why Tier 3 is a separate process instead of Colab/ngrok: the original plan used a remote GPU notebook tunneled in with
ngrok, but that reintroduces exactly the "the live path can drop mid-demo" risk the 3-tier split exists to avoid. A
local process gets the same tier separation -- and the same GPU-when-available speedup, if hosted on a machine that
has one -- without a tunnel that can silently die.

## The model

- **SEN2SR Lite**, 1.71 M parameters, ESA OpenSR's pretrained network. It takes exactly 128x128 patches of the ten
  bands and returns 512x512; larger scenes are tiled with overlap-blending (`predict_large`, vendored and patched --
  see [Validation & Results](/validation-results) for the one real bug this project found and fixed in that tiling
  code). A Fourier hard constraint locks the output's low frequencies to match the input, so the network only ever
  adds fine detail, never rewrites the coarse structure.
- **Why not Real-ESRGAN.** An earlier version of this project used Real-ESRGAN (RGB-only). It was replaced because it
  discards 7 of Sentinel-2's 10 bands and hallucinates texture on satellite imagery that was never trained for it.
  SEN2SR Lite operates natively on all 10 bands, which is also why the sector-specific spectral indices (NDVI, NDWI,
  NDBI -- all of which need bands beyond RGB) are possible at all.
- **Uncertainty: 8-pass D4 test-time augmentation, not MC-Dropout.** SEN2SR Lite has no dropout layers at inference,
  so Monte Carlo dropout would give exactly zero variance on this architecture -- checked directly against the
  model's own layer definitions, not assumed. Instead the pipeline runs the eight symmetries of the dihedral group
  (four rotations, with and without a flip), undoes each transform, and takes the per-pixel variance. Real ground
  features are orientation-invariant; a model's invented detail generally isn't. Statistics are accumulated with a
  streaming (Welford) update -- memory stays at roughly 4x one output regardless of how many passes are folded in,
  instead of holding all 8 outputs plus a stacked copy (~50 GB for a full-scene run otherwise).
- **Which pass is delivered.** The unaugmented single pass measured 23.7% sharper than a bicubic 4x baseline
  (Laplacian variance); the mean of the 8 augmented passes measured 20.4% *less* sharp than the same baseline, because
  averaging orientation-dependent predictions cancels real detail. The ensemble mean is therefore never delivered --
  the single pass is, pulled toward bicubic specifically where it added the most detail (see
  [Validation & Results](/validation-results) for why), while the full ensemble is used only to build the confidence
  maps.

## Repository layout

```
backend/            FastAPI service (main.py) -- no ML dependency
ml/
  ml_final_pipeline.py    inference, TTA, indices, image and metadata export
  inference_server.py     Tier 3: local live-upload server (needs torch)
  conformal.py             split-conformal calibration of the confidence layer
  vendor/sen2sr/           patched copy of ESA SEN2SR (CC0) -- see vendor/README.md
  tests/                   195+ automated tests (model stubbed for the fast ones)
frontend/           React 19 + Vite + Tailwind CSS v4 dashboard
data/
  raw_tiles/{sector}/      input band TIFFs            (not tracked)
  demo_tiles/{sector}/     generated outputs            (only meta.json + .webp tracked)
  demo_tiles/_live/        live-upload results, reserved namespace, never touches the real sectors
```
