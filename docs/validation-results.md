---
id: validation-results
title: Validation & Results
description: Every reported number, where it comes from, what it means, and what it doesn't -- across three independent real-reference benchmark families.
sidebar_position: 3
---

# Validation & Results

*Updated 2026-09-22 after a real bug was found and fixed: `run_sen2sr_lite` only padded to fill the last 128-pixel
window and never mirrored a border around the scene, so the network's zero-padded convolutions darkened the outer
part of every output (measured on a 128x128 tile: 20.1 dB against 29.7 dB with a mirrored border). Every number below
was re-measured after the fix; earlier numbers understated the delivered output by roughly 0.2-0.3 dB.*

## What's delivered, and why

The delivered output is the plain single pass, pulled back toward bicubic where it added the most detail relative to
a tile's own 95th percentile (`kappa = 0.5`, chosen on validation tiles by a rule written *before* the results were
seen), then matched to the input's per-band value distribution. It needs one model pass and no ensemble -- the 8-pass
ensemble is used only for the confidence layer, not for the delivered pixels themselves. The code is
`ml/postprocess.py`.

## Protocol, fixed before any result

`ml/eval_sen2neon.py` scores the model against the real 2.5 m airborne-derived reference of the SEN2NEON benchmark
(Hugging Face `isp-uv-es/SEN2NEON`, CC-BY-4.0). Sites are split into training, validation and test groups *before* any
result is seen; only test sites are ever scored for a headline number; bicubic and nearest-neighbour are scored on
the identical pixels; every output is reported both raw and histogram-matched to the input (the benchmark's own
scoring step, not something added to flatter the result).

## 1. SEN2NEON, held-out sites, raw output

Paired 95% bootstrap intervals against bicubic (`ml/score_many.py`). 278 tiles from the 15 held-out test sites pass
the same quality filters as the original protocol; 238 of them were never used to choose anything (the list was fixed
beforehand in `ml/protocol/sen2neon/eval_tiles_large.csv`).

| Output | PSNR (dB) | vs bicubic | SAM (degrees) | vs bicubic |
|---|---|---|---|---|
| Bicubic | 35.98 | | 3.03 | |
| Plain model | 35.07 | -0.91 | 3.08 | +0.05 |
| Gate alone (kappa 0.5) | 35.65 | -0.33 | 2.91 | -0.12 |
| **Delivered: gate + matching** | **36.20** | **+0.22** | **2.69** | **-0.34** |

Better on 261 of 278 tiles, and positive at every one of the 13 sites. The gate alone is still below bicubic --
matching to the input's own distribution is what actually lifts the delivered output above it. Three gate strengths
were compared (0.25, 0.5, 1.0): they differ by at most 0.14 dB and change how much added detail is kept vs. pulled
back, not the pixel accuracy -- a stronger pull-back is not "more accurate."

## 2. Five official ESA `opensr-test` benchmark sets

Independent of SEN2NEON entirely (`ml/protocol/opensr_benchmark/`) -- different sensors, places, and references.
SPAIN URBAN, SPOT, SPAIN CROPS and NAIP are 4x tasks like this model; VENUS is a 2x task, included for completeness
even though the model was built for 4x.

| Set | Images | PSNR vs bicubic | SAM vs bicubic |
|---|---|---|---|
| SPAIN URBAN | 20 | +0.09 dB | -0.04 (better) |
| SPOT | 9 | +0.19 dB | +0.07 (worse) |
| SPAIN CROPS | 28 | +0.05 dB, not a clear difference | -0.01, not a clear difference |
| NAIP | 62 | +0.24 dB | -0.02 (better) |
| VENUS (2x task) | 59 | -0.17 dB, worse | +0.03 (worse) |

SPOT's interval (the smallest set here, 9 images) comes from a percentile bootstrap at a sample size where that
method is known to under-cover its nominal rate -- measured directly at ~89% actual coverage for a stated 95% in a
matched synthetic check, so read its interval as approximate. Every other set here has at least 20 images.

**Read honestly:** on outside data the delivered recipe is roughly level with bicubic on raw pixel accuracy -- ahead
on two sets, tied on one, behind on the one set that's a different scale task than the model was built for. This is
*not* a pixel-accuracy win. The model's real advantage shows up in what it reconstructs, not in raw error -- see
section 4 below.

## 3. Two same-day sites in India, SEN2VENuS v2

A **true 5 m reference captured the same day** as the Sentinel-2 image (Zenodo 14603764, `ml/eval_sen2venus.py`) -- a
2x task (the 2.5 m output averaged 2x2), four acquisitions per site spanning different seasons, pre-declared before
any patch was looked at.

| Site | Patches | PSNR vs bicubic | SAM vs bicubic | Per acquisition |
|---|---|---|---|---|
| BENGA (West Bengal) | 320 | +0.41 dB | -0.34 (better) | +0.44, +0.78, +0.29, +0.05 |
| KUDALIAR (Telangana) | 400 | +0.94 dB | -0.33 (better) | +1.37, +0.85, +1.01, +0.52 |

All eight acquisitions are positive. This is the strongest real-reference evidence in the project, and it sits in the
region the problem statement targets -- but it's one site per state, mostly cropland, and shouldn't be described as
more than that: "two sites in India," never "validated in India."

## 4. Improvement, omission, and hallucination

ESA's own `opensr-test` measure, on the original 40 held-out test tiles, raw output, delivered minus bicubic, 95%
bootstrap interval:

| Measure | Delivered minus bicubic | Reading |
|---|---|---|
| Improvement (points) | +6.7 | more real detail than bicubic, on 40 of 40 tiles |
| Omission (points) | -8.8 | less missed detail than bicubic, on 40 of 40 tiles |
| Hallucination (points) | +2.1, worse | more invented detail than bicubic |
| Improvement minus hallucination | +4.6, better on 39 of 40 tiles | |
| Spectral consistency with input | +0.84, worse | |

Read together: the model adds real detail bicubic lacks, and pays for it with more hallucinated detail and a less
faithful spectrum. That trade-off is exactly why the product ships a confidence layer and labels every output
AI-reconstructed, not measured.

## 5. Feature agreement (edges, land-cover classes)

`ml/sr_metrics.py` scores edge agreement and classification agreement (F1/IoU for vegetation, water, built-up)
against the true reference, on both the 40 test and 30 validation tiles. Vegetation and built-up F1 are essentially
level with bicubic on both sets; edge agreement is consistently a little behind bicubic on both. Water F1 is
small-sample and noisy (behind on test, ahead on validation) -- not a number worth leaning on either way. Overall:
the model's advantage is in pixel fidelity and spectral accuracy, not in sharper feature boundaries.

## 6. Model training with paired data

SEN2SR Lite was fine-tuned **twice** on 232-250 real SEN2NEON pairs, with a validation-set selection rule fixed
before training and neither run allowed to touch the test sites. Both runs improved on SEN2NEON itself (+0.6 to
+0.8 dB raw) but the gain didn't transfer: scored on the five ESA sets above, both fine-tuned checkpoints were level
with or below bicubic on every set, while the pretrained delivered recipe was ahead on three of them. The diagnosis:
most of the in-domain gain was the network learning to match SEN2NEON's reference brightness (it runs 8-17% darker
than Sentinel-2 on average, measured directly), not real added detail. The honest result of this attempt is
reported, not hidden -- training was tried, tested against outside data, and the model that generalised was kept.

## 7. Does the uncertainty predict real error?

The 8-pass ensemble spread ranks pixels by real error better than a random ranking (Spearman 0.28 on a 10-tile check)
and clearly better than a plain edge detector (0.10, 95% interval excludes zero), and the most-distrusted decile
carries about 2.0x the error of the least-distrusted one. A second, more thorough attempt -- a small learned score
trained on spread, added detail, edge strength, texture, and input consistency, tested against the spread layer and
an edge baseline with a rule fixed in advance -- did not clearly beat either baseline and was not adopted.

`ml/calibration.py` confirms the spread's *point estimate* of expected error is informative but not itself
well-calibrated: error rises steadily across ten spread groups on held-out tiles, but a fitted line from spread to
expected error doesn't transfer cleanly between sites (R² 0.16 validation, 0.13 test).

### A genuine calibrated interval, not just a ranking

`ml/conformal.py` wraps that same line in a **split-conformal margin** -- a method with a real, finite-sample
coverage guarantee regardless of how good the underlying point estimate is, which is exactly the right tool for a
predictor whose ranking is useful but whose point value isn't precise on its own. The regression line and the
conformal margin are fit on two disjoint halves of the validation tiles (never the same pixels twice), and coverage
is checked only on the test tiles -- almost entirely different land-cover classes (Forest/Water/Developed) than
validation's (all Rural), a real distribution-shift check, not home turf.

Against a pre-declared rule (target 90% coverage, pass band 85-95%, decided before this was run):

**Measured coverage: 92.1%**, with a typical interval width of 2.3x the flat baseline error -- tight enough to be
informative, not a "covers everything" trivial band.

This is a real, measured answer to the problem statement's "manage uncertainty" requirement, and to a limitation
this project's own competitor research found every comparable public repo -- including the one repo ahead of this
one on raw validation numbers -- explicitly admitting it lacks.

## Limits, stated plainly

SEN2NEON's reference is an airborne product on a different date, at US sites only. The ESA sets add other places and
sensors but limited development intensity. The Indian evidence is two sites, mostly cropland, at 2x rather than the
model's native 4x. The demo tiles in this repository have no reference, so their per-tile PSNR/SSIM/SAM in
`meta.json` stay `null` -- never invented. Full tables and the scripts that produce them live under
`ml/protocol/sen2neon/` and `ml/protocol/opensr_benchmark/`.
