---
id: frontend-backend-engineering
title: Frontend & Backend Engineering
description: The dashboard's state machine and the slider's rendering trick; the backend's concurrency lock and upload guardrails.
sidebar_position: 9
---

# Frontend & Backend Engineering

[Architecture](/architecture) covers the system at the level of "what talks to what." This page covers the
implementation decisions inside the frontend and backend that aren't obvious from reading the API shape alone --
the ones that came from a real bug, a real constraint, or a real design tradeoff.

## Frontend: the screen state machine

`App.tsx` is built around one `Screen` union type -- `"demo" | "processing" | "live-result" | "error"` -- and almost
everything else in the component follows from it. A few decisions worth knowing:

- **Sector is explicit state, never inferred.** `pendingUpload` carries `{file, sector}` together, with `sector`
  chosen in the upload UI (defaulted to the active tab, but changeable) rather than read from whichever tab happens
  to be open when the request fires. See [Development Journey](/development-journey#building-the-real-live-upload-path)
  for the bug this specifically prevents -- forest and agriculture share the same spectral index, so an inferred
  sector can be silently wrong in exactly the plausible-looking way this project has learned to distrust.
- **All five sectors load once, up front, into memory.** A `tiles` map keyed by sector id (plus a synthetic
  `"disaster:pre"` key for the pre-event tile) is populated by one `useEffect` that fires every sector's fetch on
  mount, active tab first. Switching tabs afterward reads from that map -- zero network requests, and the interface
  never shows a stale sector's data under a new tab's label while a fetch is in flight. A per-id `inflight` ref set
  prevents a double-fetch if the effect re-runs before the first request lands.
- **A failed sector retries itself, once, when its tab is opened.** If the initial fetch failed (backend not
  running), the tab doesn't stay broken forever -- opening it re-triggers `loadSector` for that one id.
- **Image preloading is staggered, not simultaneous.** Input/output comparison images preload immediately; the four
  confidence-map variants preload after a short delay (300ms for the active tab, 1500ms for background tabs), so
  the browser prioritizes what's visible over speculative work for tabs nobody has opened yet.
- **`screen === "live-result"` reads from a separate `liveTile` state, not `tiles`.** The live-upload result is
  deliberately not merged into the demo-tile map: `Sidebar`'s `meta`, `indexType`, and `geotiff` props all
  switch between `tileData` (precomputed) and `liveTile` (just-uploaded) based on which screen is active, so a
  tab switch during a live result never silently swaps in a different sector's numbers.

## Frontend: the before/after slider

`BeforeAfterSlider.tsx` renders the raw input and the AI output as two full-size, stacked `<img>` elements and
reveals the raw one with a CSS `clip-path`, rather than resizing either image by slider position. That choice is
deliberate, not incidental -- the more obvious approach (size the raw image's container by percentage) is actually
broken in this specific stack:

Tailwind v4 ships a base style of `img { max-width: 100% }`. Without an explicit override, that rule caps the raw
layer's width as it's resized during a drag, so the image visibly shrinks and pans instead of staying aligned with
the AI layer underneath it -- confirmed by measurement, not just eyeballing: at slider positions 20/50/80%, the raw
layer showed source column `u = 0.90/0.75/0.60` while the AI layer stayed at a constant `u = 0.50`. The fix is
`max-w-none` on every layered image, kept as a hard rule in the component.

The divider's position lives in a single CSS custom property, `--pos`, written directly to the DOM from pointer
event handlers -- not React state. `requestAnimationFrame` was deliberately not used to batch these writes:
`rAF` callbacks are throttled in background browser tabs, and pointer-move events are already frame-aligned, so
adding a `rAF` layer on top would only add latency without smoothing anything.

The optional magnifier shows two lenses side by side on hover -- the raw input on the left, drawn with
nearest-neighbour scaling so it shows genuine 10m pixels rather than an interpolated blur, and the AI output on the
right, both centred on the same ground point. A faint grid overlays the raw lens once one source pixel spans at
least `GRID_MIN_CELL` (6) screen pixels, so the boundary between real pixels stays honest instead of implying more
resolution than the sensor actually captured. This is a design rule, not just an implementation detail: the raw
side of any comparison in this product is never rendered smoother than the real 10m data actually is.

## Backend: single-flight live inference

The backend stays intentionally "thin" -- no ML dependency, no torch -- and proxies live-upload requests to a
separate local process (`ml/inference_server.py`, Tier 3) over HTTP. Two guardrails sit in front of that proxy:

- **`_enhance_lock`, an `asyncio.Lock()`, allows exactly one in-flight upload at a time.** A second request while one
  is processing gets an immediate `429`, not a queue -- a CPU inference run can take a minute or more, and the
  backend has to stay responsive to ordinary `/demo-tiles/{usecase}` requests from anyone else viewing the site
  concurrently, so queuing a second heavy request isn't the right tradeoff here.
- **Two upload checks run before the file ever reaches the inference server:** a content-type/filename check that
  the upload is actually a `.zip` (`400` otherwise), and a size cap (`MAX_ENHANCE_UPLOAD_BYTES`, default 30MB,
  `413` over that). Both fail fast, before acquiring the lock, so an obviously-bad request never blocks a
  legitimate one.

When the inference server itself is unreachable, the backend returns a real `503` naming the problem
(`"Inference server unreachable (...)."`) rather than hanging or silently falling back to a fake success --
consistent with [the honest-null principle](/limitations-and-roadmap) applied to failure modes, not just missing
metrics.

## Backend: serving what's real, only when it's real

`_asset_url` looks for a `.webp` first, falls back to a `.png`-only output, and defaults to the `.webp` path when
neither exists yet (the stub state) -- and appends the file's modification time as a `?v=` query parameter, since
the server sends no cache headers and a browser would otherwise keep showing a stale image after the pipeline
regenerates one. `_geotiff_info` and `_trust_rank_url` both return `null` fields, not broken links, when the
underlying file genuinely doesn't exist -- the frontend is built to render an absent feature cleanly rather than
assume every field is always populated.

`GET /demo-tiles/{usecase}` and `POST /enhance` return the exact same response shape (`VALIDATED_USECASES`,
`SECTOR_INDEX_TYPE`, and the honest-null metadata stub are shared between both paths), specifically so the
frontend can render a live result through the identical rendering code as a precomputed one -- `source: "live"` is
the only field that distinguishes them.
