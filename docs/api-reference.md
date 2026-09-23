---
id: api-reference
title: API Reference
description: The backend's routes -- what's precomputed, what's live, and what each response carries.
sidebar_position: 7
---

# API Reference

The backend (`backend/main.py`) is deliberately thin -- it runs no ML model. Interactive Swagger docs are also served
live at `http://localhost:8000/docs` when the backend is running.

## `GET /`

Liveness check. Returns `{"status": "ok", "service": "GeoEnhance-AI backend"}`.

## `GET /demo-tiles/{usecase}`

Image URLs and metadata for one sector (`agriculture`, `disaster`, `defence`, `urban`, `forest`). Returns a
null-valued skeleton (`source: "stub"`) if that sector hasn't been processed yet -- never an invented number.

For `disaster` only, `?phase=pre` selects the pre-event tile (default is post-event), and the response includes the
change layer and its measured summary when both pre and post tiles plus the change analysis exist.

Every response carries:

| Field | Meaning |
|---|---|
| `source` | `"precomputed"`, `"stub"`, or `"live"` (see `POST /enhance` below) |
| `meta` | Everything in `meta.json` -- inference time, device, TTA passes, index values, sharpness, `psnr`/`ssim` (only non-null for `agriculture` and `disaster`, the two validated sectors) |
| `geotiff` | Download links for the georeferenced outputs, or `null` when the files don't exist |
| `trust_rank_image_url` | The per-pixel trust-rank layer, or `null` if it wasn't generated (e.g. a live upload with no TTA) |
| `change` | The disaster change layer + summary, or `null` for every other sector |

## `POST /enhance`

Accepts a live upload -- a `.zip` of the 10 Sentinel-2 band GeoTIFFs -- plus a required `usecase` field naming which
sector it's for. `usecase` is never inferred from context; it picks the spectral index formula, so a silent guess
could quietly compute the wrong one and return a plausible-looking, wrong number.

Proxies the real work to a local Tier-3 inference server (`ml/inference_server.py`) -- see
[Architecture](/architecture) -- and returns a response shaped exactly like `GET /demo-tiles/{usecase}` so the
frontend renders it through the same path, with `source: "live"`.

**Guardrails:** file-size cap, `.zip`-only content-type/filename check, single-request-at-a-time (429 if another
upload is already processing). Errors from the inference server -- a missing band, a mis-scaled input -- are relayed
with their real message, not replaced by a generic failure.

**Honest fields:** live results have no TTA by default on CPU, so `tta_passes: 1` and the confidence/trust fields are
null, exactly as they'd be for any single-pass run. `psnr`/`ssim` stay null, same as every unvalidated sector -- a
live upload has no reference to score against.
