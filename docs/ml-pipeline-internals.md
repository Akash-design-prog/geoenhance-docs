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
