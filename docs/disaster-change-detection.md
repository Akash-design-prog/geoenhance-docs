---
id: disaster-change-detection
title: Disaster & Change Detection
description: How the pre/post change layers are measured, and why they're reported next to a no-event background.
sidebar_position: 6
---

# Disaster & Change Detection

The disaster sector is the one place this project compares two dates of the same ground rather than one -- and it's
built around a rule the rest of the interface doesn't need: **never report a change number without also reporting
what "no change" looks like on the same pixels.**

## The event

The disaster tile covers a real 2026 flood event. In line with this project's own reporting rules, this documentation
does not name casualty figures or frame the change layer as anything more than indicative -- see
[Limitations & Roadmap](/limitations-and-roadmap).

## Methodology

`ml/change_analysis.py` compares two super-resolved dates on an identical pixel grid:

- **Vegetation loss** from the NDVI drop between dates.
- **Bare-ground exposure** from the bare-soil index (BSI) rise between dates.
- Each is **gated by the TTA spread of both dates** -- a pixel where the model disagrees with itself about either
  date doesn't get counted as "changed," it gets counted as "uncertain."
- **Cloud and snow are excluded**, not detected as change. Thin haze and cloud shadow are explicitly *not* caught by
  this exclusion -- stated as a real, named limitation in `change.json`, not glossed over.

## The no-event background

The same rules are applied to **two dates before the event** (a control pair with no known event in between) and
reported next to the event figures, so the reader can see what the method reports for ground that genuinely didn't
change. In the live dashboard, this is what "the measured background" refers to.

Real measured numbers from this project: event-date vegetation-loss and bare-ground-exposure rates run roughly
13-25x the same measure on the no-event control pair -- a real, defensible signal, not an assumption. The exact
current numbers are in `data/demo_tiles/disaster/change.json`.

## What this is, and isn't

- **These are indicators of surface change, not damage measurements.** The interface says "indicative," not
  "detected" or "confirmed."
- **Not an early-warning system.** The change layer runs on already-available post-event imagery; it doesn't predict
  or detect an event as it happens.
- The uncertainty gate uses TTA spread, which is a measure of *model disagreement* (epistemic uncertainty), not a
  complete statistical error budget -- using it as a full significance test would overstate what it actually
  measures. This is named as a limitation in the module's own docstring and in `change.json`, not just here.

## Interface

The dashboard's Disaster tab has a pre-event / post-event switch. In the post-event view, a "Show change" overlay
displays four categories with their measured shares: vegetation loss, bare-ground exposure, uncertain (model
disagreement), and not-assessed (cloud/snow) -- next to the same measure computed on the no-event control pair. The
sharpness card is hidden on this sector specifically, because that metric is unreliable on cloud-affected scenes.
