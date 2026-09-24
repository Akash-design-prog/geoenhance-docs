---
id: test-coverage
title: Test Coverage
description: What each test file actually proves, not just that tests exist.
sidebar_position: 10
---

# Test Coverage

213 test functions across 22 files -- 195 in `ml/tests/`, 18 in `backend/tests/`. This page says what each file
actually checks, and where the boundary is between "verified" and "assumed." `.github/workflows/ci.yml` runs the
full ML suite, the backend suite, and the frontend type check/build on every push.

## What's real and what's stubbed

Most of the ML suite replaces `torch`/`mlstac`/`sen2sr` and the SEN2SR Lite model itself with small, deterministic
fakes -- so it verifies plumbing, numerics, and edge cases exactly, not the real model's output quality. A few
files specifically don't do this, because the thing they're testing *is* the real numerical code:

- **`test_border_pad.py`** and **`test_predict_large_tiling.py`** need the real `torch` (skipped without it) and
  exercise the actual vendored tiling/cropping arithmetic from `ml/vendor/sen2sr` -- with only the neural network
  itself replaced by a deterministic 4x nearest-neighbour upsampler, so the stitched output can be checked
  **pixel-for-pixel** against a known-exact ground truth, not just checked for the right shape.
- **`test_finetune.py`**'s loss and training-loop tests need `torch` and use a tiny stand-in network built to
  mirror SEN2SR Lite's actual structure (real branch weights, with a fused copy recomputed from them at inference,
  exactly like the real model) -- see [Development Journey](/development-journey#two-fine-tuning-attempts-both-honestly-reported-as-not-adopted)
  for why that structural detail mattered.
- **`test_geotiff_export.py`** needs `rasterio` and checks coordinates worked out by hand from the input grid, any
  trimmed no-data lines, and the crop window -- not just "a file was written."

## The two tests worth knowing about specifically

**`test_real_agriculture_tile_scale_regression`** (in `test_pipeline.py`) loads a real agriculture tile and fails
if the reflectance divisor is wrong -- this is the test that exists specifically because of
[the reflectance-scale bug](/development-journey#the-reflectance-scale-bug): with the old, wrong `/10000` divisor
in place, the 99.9th-percentile reflectance check trips and the loader raises, on real data, not a synthetic case
built to trigger it.

**`test_predict_large_tiling.py`** exercises the actual `define_iteration`/`fix_lastchunk`/`predict_large` code
(not a stub of it) against a deterministic fake model, so the tiling and overlap-blend arithmetic that produced
[the border-padding bug](/development-journey#the-border-padding-bug) is now checked against an exact,
independently-computed reference on every run.

## Full file list

| File | Tests | What it actually checks |
|---|---|---|
| `test_pipeline.py` | 41 | Core pipeline plumbing and numerics: routing, scaling guards, streaming statistics, percentile scaling, image formats, JSON validity, metadata fields, model-download caching, no-data trimming, the reflectance regression test above. |
| `test_finetune.py` | 22 | Fine-tuning data helpers (pure numpy) and the loss/training loop (needs torch, structural stand-in network). |
| `test_change_analysis.py` | 15 | The disaster change-detection module against synthetic scenes (a field that turns to bare ground, plus cloud/snow/noise) with every expected value known in advance. |
| `test_sr_metrics.py` | 16 | PSNR/SSIM/SAM and friends -- pure numpy, checked against exact constants, mathematical identities, or a slow brute-force reference. |
| `test_eval_sen2neon.py` | 14 | The SEN2NEON evaluation harness against synthetic tiles and fake scoring functions; the real file-loader path needs rasterio and is skipped without it. |
| `test_geotiff_export.py` | 11 | Georeferenced export coordinates, hand-derived from the input grid, trim, and crop. |
| `test_uncertainty_eval.py` | 12 | Uncertainty-ranking metrics against constructed cases with a known correct ranking. |
| `test_postprocess.py` | 8 | The detail gate (`GATE_KAPPA`) and input-matching logic. |
| `test_trust_map.py` | 7 | The per-tile trust-rank map. |
| `test_trust_v2.py` | 7 | The (not-adopted) learned trust-score experiment -- pure numpy, no GPU. |
| `test_score_many.py` | 6 | The batch scoring script's aggregation logic. |
| `test_select_blend.py` | 5 | The blend-weight rule, pinned so it can't quietly change after results are seen. |
| `test_calibration.py` | 4 | The spread-to-expected-error regression line. |
| `test_conformal.py` | 4 | The split-conformal quantile formula, the tile-split determinism, and that the pass/fail thresholds match what's documented. |
| `test_eval_sen2venus.py` | 4 | The India same-day-reference evaluation harness. |
| `test_analyse_output.py` | 4 | Output-analysis summary statistics. |
| `test_eval_uncertainty.py` | 3 | Whether a constructed "good" uncertainty score beats a constructed "bad" one, on cases where the answer is known. |
| `test_opensr_test_2_score.py` | 3 | `ResumableScoreCSV`'s resumability logic (the scorer's `main()` itself needs a separate environment, per its own docstring). |
| `test_predict_large_tiling.py` | 3 | See above. |
| `test_border_pad.py` | 2 | See above. |
| `test_opensr_eval_sets.py` | 2 | Grid handling for the official ESA benchmark scorer. |
| `test_dump_outputs.py` | 2 | Output-dumping utility. |
| `backend/tests/test_api.py` | 18 | Starts the real backend with `uvicorn` against a temporary tiles folder and queries it over real HTTP -- routing, both sectors' phase switch, the change layer, `/enhance`'s validation/proxying/concurrency lock (a real thread-level concurrency test, not mocked), and that a real inference-server error is relayed rather than replaced with a generic failure. |

## What this doesn't cover

None of this tests real-model *quality* -- whether the actual SEN2SR Lite weights produce good output on a given
tile is what [Validation & Results](/validation-results) measures separately, against real reference data. This
suite exists to catch the other kind of bug: the plumbing, the arithmetic, and the honest-null contract breaking
silently, the way [the reflectance-scale and border-padding bugs](/development-journey) once did before either had
a regression test.
