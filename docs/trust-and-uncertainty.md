---
id: trust-and-uncertainty
title: Trust & Uncertainty
description: Why TTA and not MC-Dropout, what the confidence layer actually measures, and the calibrated interval.
sidebar_position: 5
---

# Trust & Uncertainty

The problem statement's own text says some reconstructed detail is "inferred by the model and not directly
observed," and that a solution "must clearly manage uncertainty" as a result. This page is the full answer to that
line -- not a single confidence heatmap, but three layers: a ranking, a calibrated interval, and an honest account of
what didn't work.

## Why test-time augmentation, not MC-Dropout

Monte Carlo dropout is the more commonly reached-for uncertainty technique in the field, and it doesn't work here --
checked directly against SEN2SR Lite's own layer definitions, not assumed. The network has no dropout layers at
inference, so MC-Dropout would produce exactly zero variance on this architecture. Instead, the pipeline runs the
eight symmetries of the dihedral group (four rotations, with and without a flip), undoes each transform back to the
original orientation, and takes the per-pixel variance across the eight results. The reasoning: real ground features
are rotation- and reflection-invariant -- a road looks the same road no matter which way the sensor was flying -- but
a model's *hallucinated* detail generally isn't, since it's an artefact of that specific input orientation. Genuine
disagreement across the eight symmetry-corrected passes is therefore a real signal, not noise.

Statistics are accumulated with a streaming (Welford) update rather than holding all 8 outputs plus a stacked copy --
memory stays at roughly 4x one output regardless of pass count, which matters at full-scene sizes (a naive
stack-and-average approach would need on the order of 50 GB of RAM for a full ~1900x2200 scene).

## What the confidence layer actually shows

Four views, switchable in the dashboard:

- **RGB** -- variance over the visible bands (blue = the ensemble agrees, red = it disagrees).
- **NIR** -- variance of the near-infrared band alone, since vegetation-related disagreement often concentrates there.
- **Spectral** -- a false-colour composite of variance across a wider band set.
- **Index** -- variance of the *sector's own* spectral index (NDVI, NDWI, or NDBI) rather than raw reflectance --
  directly answers "how much does the AI disagree about whether this pixel is vegetation/water/built-up," which is
  the thing an analyst usually actually cares about.

Read the colour-coded display as a *relative* indicator of where the output is less trustworthy inside one tile --
never as an error estimate in reflectance units. The interface doesn't claim otherwise.

## Does it predict real error?

Measured directly, not assumed: the ensemble spread ranks pixels by real error better than a random ranking
(Spearman 0.28 on a 10-tile check against the SEN2NEON reference) and clearly better than a plain edge detector
(0.10 -- the paired difference across tiles is positive with a 95% interval that excludes zero). The most-distrusted
decile of pixels carries about 2.0x the error of the least-distrusted decile.

A second, more thorough attempt -- a small learned score trained on the ensemble spread, added detail, edge strength,
local texture, and input consistency, tested against the plain spread and an edge baseline with a rule fixed in
advance -- did **not** clearly beat either baseline, and was not adopted. The shipped confidence layer is still the
plain ensemble spread. This negative result is reported, not hidden.

## From a ranking to a calibrated interval

A ranking tells you *which* pixels to trust less. It doesn't tell you *how much* less -- for that, the spread needs
to be calibrated against real error, which `ml/calibration.py` shows it isn't, on its own: a fitted line from spread
to expected error has R² 0.16 on validation tiles and 0.13 on test tiles. Informative, not calibrated.

`ml/conformal.py` closes that gap with **split-conformal prediction** -- a method that wraps any point predictor in a
data-driven margin with a real, finite-sample coverage guarantee, regardless of how good the underlying point
estimate is. Concretely:

1. The validation tiles are split into two disjoint halves (fixed seed, split by whole tile so no pixel is reused
   between steps 2 and 3 -- pixels within one tile are spatially correlated, so a pixel-level split would leak).
2. The regression line (spread → expected error) is fit on the **fit** half.
3. A locally-adaptive nonconformity score, normalized by each pixel's own spread, is computed on the **calibrate**
   half, giving the finite-sample-correct conformal quantile.
4. That quantile is applied to the **test** tiles -- never touched by either of the first two steps, and mostly
   different land-cover classes (Forest/Water/Developed) than the validation tiles (all Rural), so this is a real
   distribution-shift check, not home turf.

Against a pre-declared rule (target 90% coverage, pass band 85-95%, decided before this was run):

| | Result |
|---|---|
| Empirical test coverage | **92.1%** |
| Typical interval half-width | 2.3x the flat baseline error |
| Pass? | **Yes**, against both the coverage band and an informativeness check (the interval isn't trivially wide) |

This is a genuinely rare thing for a project at this stage to have: not just a plausible-looking uncertainty map, but
a number with a real statistical guarantee behind it, tested on data it was never fit on. It's currently a research
finding (`data/sen2neon/calibration/conformal.json`) rather than a value shown live in the dashboard -- wiring a
US-benchmark-calibrated interval directly onto Indian production tiles with no reference to check against would be
extending the calibration beyond its validated domain, which this project treats as a real methodological line, not
a formality.
