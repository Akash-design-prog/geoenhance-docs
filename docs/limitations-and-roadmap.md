---
id: limitations-and-roadmap
title: Limitations & Roadmap
description: What this project doesn't claim, stated plainly -- and what's next.
sidebar_position: 8
---

# Limitations & Roadmap

Per this project's own positioning notes: stating real limits next to real results is treated as a strength here,
not a weakness to bury in a footnote. Three real limitations, each with its actual mitigation:

## 1. Validated level-to-modestly-ahead of bicubic, not a large gain

See [Validation & Results](/validation-results): +0.22 dB on 238 never-used SEN2NEON tiles, roughly level on four of
five outside ESA benchmark sets, a clearer +0.41/+0.94 dB at two same-day sites in India. The confidence layer's
uncertainty spread is only marginally better than a plain edge detector at *ranking* real error (though the
split-conformal interval built on top of it is genuinely calibrated -- see
[Trust & Uncertainty](/trust-and-uncertainty)). Two attempts at fine-tuning on real paired data improved SEN2NEON
itself but didn't transfer to outside benchmarks, so the pretrained recipe stays the delivered model. The demo tiles
have no reference, so their per-tile PSNR/SSIM/SAM stay `null`.

**Mitigation:** every number above is reported with its method and sample size, never as a bare percentage; the model
that generalised was kept over the one that looked better only in-domain.

## 2. The reference benchmarks are mostly outside India

SEN2NEON's reference is US sites only; the ESA sets add other places and sensors but limited development intensity;
the Indian evidence is two sites, mostly cropland, at 2x rather than the model's native 4x.

**Mitigation:** this documentation and the product's own wording never say "validated in India" -- only "tested at
two real sites in India against a true same-day 5 m reference," which is the literal, defensible claim.

## 3. The change layers are indicative, not a damage assessment

See [Disaster & Change Detection](/disaster-change-detection). The uncertainty gate measures model disagreement, not
a complete error budget; thin haze and cloud shadow aren't caught by the cloud/snow exclusion; this is not an
early-warning system.

**Mitigation:** the interface and this documentation both say "indicative surface change," never "damage assessment"
or "detected."

## Other named gaps

- **CUDA path lightly tested on the live upload server specifically.** The offline pipeline's core inference has been
  run and verified on Kaggle T4 GPUs (for fine-tuning and evaluation); the *live* inference server's own GPU
  auto-detect path hasn't yet been exercised on real GPU hardware in production, only on CPU.
- **Some interface text is still generic.** The dashboard's analytics come from `meta.json`, but the hero text and
  the Urban/Forest sector captions describe intended use cases, not measured results.
- **Input scale is inferred, not stated in file metadata.** See [Getting Started](/getting-started#input-data).

## Roadmap

**Done since the last update:** validation extended to two same-day sites in India (SEN2VENuS); fine-tuning tried
twice, tested against outside benchmarks, not adopted because it didn't transfer (the honest result reported, not
hidden); a second, more thorough attempt at a better trust score, tested against the shipped one, also not adopted;
the uncertainty's *size*, not just its ranking, is now calibrated via split-conformal prediction against a
pre-declared rule (92.1% measured coverage, target 90%); **`POST /enhance` is now wired to a real local inference
server** with GPU auto-detect (full TTA when a GPU is available, single-pass on CPU) -- live upload is real, not a
stub.

**Open:**

1. Wire the conformal interval into the live dashboard's confidence display (currently a research finding in
   `data/sen2neon/calibration/conformal.json`, not shown to a user -- see [Trust & Uncertainty](/trust-and-uncertainty)
   for why this needs care, not just a UI change).
2. Replace the remaining generic interface text (hero, Urban and Forest captions) with statements backed by
   measurements.
3. Score the 633 secondary SEN2NEON tiles (longer date gaps, more missing reference data) for full coverage of the
   held-out set.
4. Re-measure edge and land-cover classification agreement with the border-padding fix applied.

## Licence and credits

- Super-resolution model and the vendored `ml/vendor/sen2sr` package: ESA OpenSR, SEN2SR, CC0 1.0. The vendored copy
  carries a fix for non-square tiles; full provenance is in `ml/vendor/README.md`.
- Imagery: contains modified Copernicus Sentinel data, obtained through the Copernicus Browser.
- Model distribution and loading: `mlstac` and the TACO Foundation model hub.
