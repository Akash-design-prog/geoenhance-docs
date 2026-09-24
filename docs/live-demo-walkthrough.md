---
id: live-demo-walkthrough
title: Live Demo Walkthrough
description: What each sector shows, and how to try live upload yourself.
sidebar_position: 4
---

# Live Demo Walkthrough

Five sectors, each running the real pipeline against real Copernicus tiles on their native UTM grid, plus a live
upload path that runs the same audited pipeline on-demand.

## Agriculture

![Agriculture before/after](./img/agriculture.gif)

NDVI (vegetation vigour). The before/after slider compares the raw 10 m Sentinel-2 render against the 2.5 m
super-resolved output; the confidence overlay shows per-pixel model agreement across the 8 TTA passes.

## Disaster Response

![Disaster pre/post change](./img/disaster.gif)

NDWI (open water / flooding). The one sector with a genuine before/after **event**: a real 2026 flood, with change
layers measured against a no-event control pair on an identical grid -- see
[Disaster & Change Detection](/disaster-change-detection) for the full methodology.

## Defence

![Defence tile](./img/defence.gif)

NDVI. Terrain and vegetation monitoring at the resolution where narrow features (roads, field boundaries) start to
separate from noise.

## Urban Planning

![Urban tile](./img/urban.gif)

NDBI (built-up surface). Small structures and road networks that are effectively invisible at 10 m become
distinguishable at 2.5 m.

## Forest Monitoring

![Forest tile](./img/forest.gif)

NDVI. Canopy-level detail for a use case where the input resolution most directly limits what's visible.

## Interface controls, across every sector

**Show AI Confidence** toggles the uncertainty overlay, with a picker for RGB / NIR / Spectral / Index views (the
last labelled NDVI, NDWI, or NDBI to match the sector).

![Cycling the confidence view through RGB, NIR, Spectral, and the sector's own index](./img/confidence.gif)

**Mark least-trusted pixels** overlays the bottom N% most-distrusted pixels in the tile with an amber stripe, driven
by a percentage slider.

![Stepping the least-trusted-pixels percentage slider](./img/trust.gif)

**Magnifier** shows twin hover lenses: the raw 10 m input on the left, drawn as true pixels (nearest-neighbour, with
a faint grid once one source pixel spans enough screen pixels to show it honestly), and the AI output on the right,
both centred on the same point.

![The magnifier's twin lenses following the cursor across the tile](./img/magnifier.gif)

**Natural / Enhanced contrast** is a display-only toggle (percentile stretch vs. local-contrast CLAHE); it never
changes the underlying data, so nothing looks more edited than it is.

![Switching between Natural and Enhanced contrast rendering](./img/render-mode.gif)

## Try it yourself: live upload

Unlike the five precomputed sectors above, live upload runs real inference on demand. Click **"Download a real
sample"** next to the upload zone to get an actual 10-band tile, then drop it back in, pick which sector it's for
(explicit, never inferred from whichever tab happens to be open -- the sector picks the spectral index formula, so a
silent guess could quietly compute the wrong one), and watch it process.

![Live upload flow](./img/live-upload.gif)

No TTA runs on a live upload by default on CPU (single pass, to stay fast); the server auto-detects a GPU and runs
the full 8-pass ensemble there instead. See [Architecture](/architecture) for why.
