---
id: getting-started
title: Getting Started
description: Clone, install, and run all three parts of GeoEnhance-AI -- the ML pipeline, the backend, and the frontend.
sidebar_position: 1
---

# Getting Started

GeoEnhance-AI has three independent parts that only meet on the filesystem (`data/demo_tiles/`) and over HTTP. Each is
installed and run separately -- there is deliberately no single root requirements file, because the parts are deployed
separately too (the ML pipeline runs offline on a laptop or Kaggle/Colab GPU, the backend is a thin proxy, the frontend
is a static React build).

## Requirements

| Component | Requirement |
|---|---|
| ML pipeline | Python 3.11 (verified), PyTorch 2.x, about 2 GB of disk for PyTorch plus the model weights |
| Backend | Python 3.10 or newer |
| Frontend | Node.js 22 or newer, npm |
| Hardware | CPU is sufficient for everything. A CUDA GPU is used automatically when present -- both for the offline pipeline and for the live inference server (see [Architecture](/architecture)) |

Python dependencies are pinned per component: `ml/requirements.txt` and `backend/requirements.txt`. Frontend dependencies
are in `frontend/package.json` with a committed `package-lock.json`.

## Installation

Clone the repository, then set up only the parts you need.

### ML pipeline

```bash
python -m venv ml/venv
```

Activate the environment (`ml\venv\Scripts\activate` on Windows, `source ml/venv/bin/activate` on Linux/macOS), then
install PyTorch **first** -- it's not in `requirements.txt` because the correct build depends on the machine:

```bash
# CPU only
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
# CUDA: use the command generated at https://pytorch.org/get-started/locally/
# Google Colab: PyTorch is preinstalled, do not reinstall it
```

Install torch **and** torchvision together, from that same index, in one command -- not separately. `timm` (below)
transitively needs torchvision, and if the two are resolved from different sources they can land on an ABI-incompatible
pair (this broke CI here once; see [Limitations & Roadmap](/limitations-and-roadmap)).

```bash
pip install -r ml/requirements.txt
```

The `sen2sr` package is **not** installed from PyPI. The pipeline imports the patched copy vendored in `ml/vendor/sen2sr`,
which fixes a tiling bug for non-square scenes that exists upstream (`ml/vendor/README.md` has the full provenance and
patch history). SEN2SR Lite's weights download automatically from Hugging Face on the first run into `ml/output/` --
name-and-size-verified so a truncated or tampered re-download is never trusted silently.

### Backend

```bash
python -m venv backend/venv
pip install -r backend/requirements.txt
```

Activate `backend/venv` before the `pip install`.

### Local inference server (for live uploads)

```bash
# uses the SAME ml/venv as the pipeline above -- it needs torch, not just fastapi
pip install -r ml/requirements.txt
```

This is Tier 3 of the [3-tier architecture](/architecture) -- a separate process the backend proxies live `/enhance`
uploads to, so the backend itself never needs torch.

### Frontend

```bash
cd frontend
npm ci
```

## Input data

The pipeline expects Sentinel-2 L2A band files exported from the Copernicus Browser as 16-bit GeoTIFF, one file per
band. Place the ten bands of a scene in `data/raw_tiles/{sector}/`, where `{sector}` is one of `agriculture`,
`disaster`, `defence`, `urban`, `forest`. Files are matched by band name in the filename (`B02`, `B03`, `B04`, `B05`,
`B06`, `B07`, `B08`, `B8A`, `B11`, `B12`) -- and if two files ever match the same band, the loader raises loudly
naming both files rather than silently picking whichever the filesystem happens to enumerate first.

Three properties of these exports matter and are handled in the loader:

- **Scale.** Values are reflectance multiplied by 65535, not the `x10000` convention of ESA L2A products that SEN2SR
  expects. The loader divides by 65535 (override with `REFLECTANCE_SCALE`) and aborts with an explicit error if the
  result is physically implausible (a wrong scale ran the model ~6.5x out of its training distribution without ever
  crashing -- this guard exists specifically because of that incident).
- **Pixel geometry.** As of the current production tiles, `data/raw_tiles/` is exported in projected UTM (10 m per
  pixel, genuinely square) rather than WGS84/degrees -- prefer the scene's UTM zone in the Copernicus Browser, since a
  degrees export gives non-square pixels (roughly 8.2-9.8 m E-W vs ~9.95 m N-S depending on latitude) and noticeably
  less fine detail after super-resolution. Only the fine-tuning inputs and the `ml/Images` agriculture fallback are
  still in WGS84.
- **No-data borders.** Exports can leave the outermost lines partly zero-filled. The loader trims lines that are
  mostly zero in every band (up to 4 per side) before inference and records this as `nodata_trim` in `meta.json`.

Raster data is not stored in this repository -- raw tiles and all generated images are gitignored.

## Running

Run each command from the repository root unless stated otherwise.

### 1. Generate demo tiles

```bash
python ml/ml_final_pipeline.py
```

Sectors without a folder in `data/raw_tiles/` are skipped with a message -- and one sector's bad input no longer
aborts the other four (an earlier version of this script did abort the whole run on any exception).

| Variable | Default | Effect |
|---|---|---|
| `ROI_SIZE` | `512` | Centre-crop window in input pixels. `0` processes the full scene. |
| `SR_OUTPUT` | `gated` | See [Validation & Results](/validation-results) for why this is the delivered default. |
| `GATE_KAPPA` | `0.5` | Gate strength: 0 leaves the plain pass unchanged, 1 pulls the highest-detail pixels fully to bicubic. |
| `MATCH_TO_INPUT` | `1` | Re-map each band's post-gate values to match the input's distribution (the benchmark's own scoring step). |
| `REFLECTANCE_SCALE` | `65535` | Divisor applied to raw values. |
| `WEBP_QUALITY` | `90` | Quality of the web image copies. |

### 2. Start the backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Interactive API documentation is served at `http://localhost:8000/docs`.

### 3. (Optional) Start the local inference server, for live uploads

```bash
cd ml
../ml/venv/Scripts/python.exe -m uvicorn inference_server:app --port 8100
```

This is what `POST /enhance` proxies to. Without it running, the precomputed demo tiles still work fully -- live
upload is the one thing that needs it. See [Architecture](/architecture) for why it's a separate process.

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

The dashboard is served on port 8443 and calls the backend at `http://localhost:8000`. If the backend is unreachable
the interface falls back to placeholder content, so frontend-only work doesn't need it running.
