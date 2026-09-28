---
id: ml-pipeline-internals
title: ML Pipeline Internals
description: Band ordering, model caching, the mirrored-border fix, and the streaming statistics that make TTA affordable.
sidebar_position: 3
---

# ML Pipeline Internals

[Architecture](/architecture) covers what the pipeline does. This page covers the implementation details in
`ml/ml_final_pipeline.py` that matter for correctness, not just the high-level flow -- the kind of thing that's
easy to get subtly wrong once and never notice.

## Band order is a fixed contract, not a convention

```python
BAND_ORDER = ["B02", "B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B11", "B12"]
```

Every downstream index computation, RGB composite, and the model's own input tensor all assume this exact order.
`compute_ndvi` doesn't re-derive which index is red or NIR each time -- it hardcodes `tensor[2]` (B04, red) and
`tensor[6]` (B08, NIR) directly, trusting the loader to have stacked the bands in this order. Get the order wrong
once at load time and every spectral index downstream is silently wrong in a way that still looks plausible on
screen -- the same failure shape as [the reflectance-scale bug](/development-journey#the-reflectance-scale-bug).

## Sector to spectral index: an explicit table, not a rule

```python
SECTOR_INDEX = {
    "agriculture": ("ndvi", 6, 2),   # NIR, Red
    "forest":      ("ndvi", 6, 2),   # NIR, Red
    "defence":     ("ndvi", 6, 2),   # NIR, Red (vegetation masking for camouflage)
    "disaster":    ("ndwi", 1, 6),   # Green (B03), NIR (B08)
    "urban":       ("ndbi", 8, 6),   # SWIR (B11), NIR (B08)
}
```

`compute_spectral_index(tensor, band_a_idx, band_b_idx)` is one generic normalized-difference function --
`(A - B) / (A + B)` -- reused for all three indices by passing different band pairs. NDVI, NDWI, and NDBI are
mathematically the same operation on different bands; keeping that generic and driving it from one explicit table
(rather than three near-duplicate functions) is what makes it possible to state with confidence that agriculture,
forest, and defence are never accidentally scored with the wrong index -- the table is the single place that
mapping can go wrong, and it's the one place it's checked.

## MNDWI: a second water index for disaster, alongside NDWI

Disaster's default index is NDWI (Green/NIR), but the pipeline also computes **MNDWI** -- `(Green - SWIR1) / (Green
+ SWIR1)`, using bands B03 and B11 (Xu, 2006) -- for both the input and the SR output, saved as
`index_mndwi_before`/`index_mndwi_after` in `meta.json`. It reuses the same generic `compute_spectral_index` function
as every other index above, just with a different band pair. MNDWI is generally more robust than NDWI against
built-up-area false positives in flood mapping (SWIR1 responds less to urban surfaces than NIR does), so having both
numbers side by side is a genuine second check on the same water-extent claim, not a cosmetic addition.

## Model loading and caching

```python
_MODEL_MARKER = ".download_ok.json"
```

The compiled model is cached in-process per `(output_dir, device, name)`, so a multi-sector run compiles it once.
Across separate runs, the download itself is skipped when the model folder matches a marker file recorded after a
previous successful load -- the marker records every file in the folder with its exact size, so a truncated or
corrupted re-download is never silently trusted. If a "skip the download" load fails anyway (the cache passed the
marker check but the weights are still bad), the marker is deleted and the model is downloaded again once, rather
than failing the whole run.

## The mirrored border, and why it exists

```python
def run_sen2sr_lite(input_tensor, compiled_model, border=None):
    ...
```

Before tiling and inference, the input gets a mirrored border (`BORDER_PAD`, default 32px, override with the
`border` argument or `0` to reproduce the old unpadded behaviour) reflected around its edges, then cropped back off
afterward. Without it, the network's own zero-padded convolutions darken the outer part of every output --
measured directly: **20.1 dB without a border versus 29.7 dB with one** on a 128x128 benchmark tile (where almost
the whole tile *is* edge region), and a smaller but still real ~0.2-0.3 dB effect on the project's own much larger
512x512 production tiles. Full story, including how this was found and what it invalidated, is in
[Development Journey](/development-journey#the-border-padding-bug). One function (`run_sen2sr_lite`) is shared by
every code path that calls the model -- the single pass, the 8-pass TTA ensemble, fine-tune validation, and both
evaluation scripts -- specifically so this fix can't be applied in some places and forgotten in others.

## Streaming statistics for the TTA ensemble

```python
class WelfordAccumulator:
    """Streaming per-pixel mean / population variance over successive passes..."""
```

The 8-pass test-time-augmentation ensemble (see [Trust & Uncertainty](/trust-and-uncertainty) for why TTA and not
MC-Dropout) needs a running mean and variance across passes, not any individual pass held in memory. A naive
implementation -- collect all 8 outputs in a list, `np.stack` them, then call `.mean()`/`.var()` -- was calculated
to need on the order of **50 GB of RAM** for a full-scene Sentinel-2 tile (roughly 1900x2200 input pixels, 4x
upsampled). `WelfordAccumulator` folds each pass in with a single-pass online update (Welford's algorithm), keeping
memory at roughly **4x one pass's output regardless of how many passes run**. Measured on the production 512x512
default: **1.5 GB peak**, not 50 GB. Passes whose spatial size differs by a few pixels (a 128-alignment padding
remainder on a non-square tile) are reconciled by cropping the running state to the common top-left region shared
by all passes -- equivalent to cropping every pass up front, without needing to know the final size in advance.

## What actually ships: gated, not the plain pass or the TTA mean

The identity (single, unaugmented) pass is sharper than the 8-pass mean -- see
[Development Journey](/development-journey#why-test-time-augmentation-not-mc-dropout) for the +23.7% / -20.4%
measurement that established this. The production default goes one step further: `sr_output="gated"` pulls the
identity pass back toward a bicubic baseline specifically where the ensemble's own spread is high, controlled by
`GATE_KAPPA` (default 0.5, chosen on validation tiles by a rule fixed before results were seen, scored once on held-out
test tiles). `SR_OUTPUT=identity` or `SR_OUTPUT=tta_mean` are available as environment-variable overrides for
comparison, and both alternates are saved alongside the gated output specifically so they can be scored against a
reference too -- see [Validation & Results](/validation-results) for what that scoring showed.

## The 512x512 default, and why it's not the full scene

```python
DEFAULT_ROI_SIZE = 512
```

A full Sentinel-2 export (roughly 1900x2200 pixels) upsamples 4x to about 7700x8400 -- an 8-pass TTA ensemble at
that size needs on the order of 50 GB of RAM (the exact problem `WelfordAccumulator` solves *per pass*, but the
final images themselves would still be ~65 megapixel PNGs no browser slider handles well). The pipeline
center-crops to a 512x512 window by default; `ROI_SIZE=1024` or `ROI_SIZE=0` (full scene) are available as
environment overrides for anyone running the pipeline directly, and the applied crop is always recorded in
`meta.json` under `roi` so it's never silently different from what a reader assumes.

## The PSF-based consistency check: a fairer self-consistency test

`consistency_error_pct` (block-averaging the SR output back down and comparing to the real input) implicitly assumes
the sensor's footprint is a perfectly sharp box -- average exactly 4x4 SR pixels, compare to 1 input pixel, done. A
real optical system doesn't work that way: its point-spread function rolls off smoothly, so a real 10 m pixel
actually blends in a bit of its neighbours' signal too. Treating the footprint as a sharp box understates that
blending, and can make a genuinely-consistent output look slightly worse than it really is.

`consistency_error_psf_pct` (`ml/sr_metrics.py`) fixes this by blurring the SR output with a Gaussian matched to
Sentinel-2's real MTF at Nyquist (`mtf_nyquist=0.3`, a commonly-used approximation for the 10 m VNIR bands) *before*
block-averaging. The Gaussian's sigma comes from a closed-form solution of the Gaussian-MTF Fourier pair
(`gaussian_sigma_for_mtf`), verified numerically -- not just algebraically -- against a brute-force DFT of the
actual discrete kernel, exact to 1e-4 in `test_sr_metrics.py`. Falls back to the plain box result if `opencv` isn't
installed, rather than failing an otherwise-optional check.

## Runtime and memory: CPU vs GPU

Every number below was actually measured, not estimated -- each is annotated with the hardware it ran on so nothing
here is compared apples-to-oranges.

| | CPU (2-core i3 laptop) | GPU (Kaggle T4) |
|---|---|---|
| Single pass, small tile (221x161) | ~24-30 s (9 overlapping 128px patches, ~2.7 s/patch) | not separately measured -- TTA row below covers it |
| 8-pass TTA, small tile | 208-337 s (±60% run-to-run noise measured across two runs on this machine) | -- |
| 8-pass TTA, production 512x512 default (Nilgiris) | 1,291 s total, ~157 s/pass, ~6.3 s/patch (~2.3x slower per patch than the small tile -- likely sustained-load thermal throttling, not a shape effect) | -- |
| Peak RAM, one sector | ~1.1 GB (small tile) / ~1.5 GB (512x512 default) | not separately profiled |
| All 5 sectors, 8-pass TTA each | ~1.5-2 h | ~7 min 21 s for the equivalent TTA-calibration job (measured directly on a real Kaggle run) -- roughly a 12-16x speedup, consistent with the ~12x figure used to size the live-upload path's GPU-auto-detect timeout |
| SEN2SR (full/larger model) vs SEN2SR Lite, same pass | -- (full model needs `mamba-ssm`, CUDA-only, cannot run on this CPU at all) | ~50x slower per pass than Lite on the same GPU hardware -- this alone is why the larger model can only ever ship as an optional mode, never the default |

**What this is not**: a formal benchmark suite run under controlled, repeated conditions -- these are real measurements
taken during actual development and Kaggle runs, kept here because they're the only runtime numbers that exist, not
because they're lab-clean. The ±60% run-to-run noise on the small-tile TTA figure is reported as measured, not
smoothed over. `SR_MODEL=SEN2SR` (the larger model) is wired into `load_model()` as an environment override for
anyone with GPU access to try; a full accuracy comparison against Lite across all validation sets was designed
(`ml/colab_fullmodel.ipynb`, with the adoption rule fixed before results: only ship it if it beats Lite on validation
*and* test tiles *and* both Indian sites, and isn't worse on 3 of the 4 ESA sets) but, as of this page, has not yet
been run to completion on real GPU hardware -- treat the larger model as available-but-unvalidated, not benchmarked.

## ONNX export: attempted, does not currently work

A CPU speed test was a real candidate for closing the gap between this pipeline's own CPU numbers and a
production-style deployment. Attempted directly (`torch.onnx.export` against the loaded, compiled SEN2SR Lite model,
a real 128x128x10 input) rather than assumed either way:

- **Tracing itself succeeded past the model's own Fourier hard constraint** -- `aten::fft_fftn`, `fft_fftshift`,
  `fft_ifftshift` and `fft_ifft2` all exported cleanly. This was the operation expected to be the blocker going in;
  it wasn't.
- **The real blocker is `aten::_upsample_bilinear2d_aa`** (antialiased bilinear upsampling, used by the hard
  constraint's own bicubic-antialias reference resample), which has no ONNX equivalent at any opset version this
  torch build supports (checked 18, 20, and 23 -- the newest available -- all fail identically).
- The newer `torch.export`-based ("dynamo") exporter was also tried as a real alternative, since it sometimes
  decomposes ops the legacy tracer can't. It did not fail outright, but did not complete in a reasonable time either
  (extensive per-layer tracing warnings, no output file, no error) -- inconclusive, not a pass.

**Net result: ONNX export does not currently work for this model**, for a specific, identified reason (not "it broke
somewhere"), and CPU inference timing stays exactly the numbers in the table above -- no ONNX Runtime comparison
exists because no exported model exists to run it on. A workaround exists in principle (patch the hard constraint
to use a plain, non-antialiased resize when exporting, since the antialiasing only affects the reference the FFT
constraint compares against, not the model's own learned weights) but was not attempted -- it would change the
constraint's numerical behaviour in a way that needs its own accuracy check before trusting the exported model's
output, which is beyond the scope of a speed test.
