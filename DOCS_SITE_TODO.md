# geoenhance-docs -- task tracker

Not committed to sidebar/nav, just a working list so nothing raised in conversation gets lost. Update as items
land or new ones come up.

## Tier A -- done, verified working

- [x] 12 content pages: getting-started, architecture, ml-pipeline-internals, validation-results,
      live-demo-walkthrough, trust-and-uncertainty, disaster-change-detection, api-reference,
      frontend-backend-engineering, test-coverage, development-journey, limitations-and-roadmap.
- [x] Homepage: hero, results-at-a-glance stats, three "why" cards.
- [x] Deploy workflow exists and content is ready to deploy (moved to Tier B below -- this checkbox was marked
      done prematurely; confirmed 2026-09-28 by navigating to the live URL directly, which 404s: "Site not
      found · GitHub Pages"). The site has never actually gone live.
- [x] Real dataset credits (SEN2NEON, SEN2VENuS v2, opensr-test) added to Licence and credits.
- [x] 10 real GIFs captured via Playwright (5 sectors + confidence/magnifier/trust/render-mode/live-upload),
      agriculture and defence re-shot in Enhanced Contrast mode for visibility.
- [x] Dark-mode palette softened (neon #00d4ff -> muted #4cc9e0 teal, background lifted off near-black).
- [x] Real typography: Fraunces headings (matches the live dashboard's own hero font) + Inter body, via Google
      Fonts stylesheet in docusaurus.config.ts.
- [x] Icon badges + shadow/depth + hover-fill treatment on the homepage's feature and stat cards.
- [x] Hero button hierarchy (solid primary, ghost secondary/tertiary, GitHub icon).
- [x] Default Docusaurus mascot logo removed from navbar (was never replaced, just never noticed).
- [x] Local search (@easyops-cn/docusaurus-search-local) -- required the tuple-config form plus an explicit
      `docsRouteBasePath: '/'` since docs live at the site root, not under `/docs/`; the plugin silently
      indexed zero pages without that option, no error anywhere. Root-caused and fixed, not worked around.
- [x] `README.md` -- this list itself was stale; it's already a real, project-specific README, not the
      Docusaurus scaffold default. Nothing to do here.
- [x] `npm audit` (21 vulnerabilities, 20 moderate/1 high) -- evaluated, not fixed, on purpose. Both are in
      Docusaurus's own build tooling (`serialize-javascript` via webpack's `copy-webpack-plugin`, `uuid` via
      `webpack-dev-server`) -- build-time and local-dev-server only, never shipped to the deployed static site
      or run in a visitor's browser. The only available fix (`npm audit fix --force`) downgrades
      `@docusaurus/core` from 3.10.2 to 3.5.2, a real breaking change risking the search config just fixed,
      to address vulnerabilities nothing a judge or visitor touches is exposed to. Not worth the trade.

## Tier B -- real, not yet done

- [ ] Actually deploy: flip this repo public, then re-run the Pages workflow (or push a new commit) -- GitHub
      Pages cannot deploy from a private repo on a free account, and flipping visibility alone does not
      retroactively deploy anything already "succeeded" silently. Test the live link in an incognito window
      right after.
- [ ] Confirm `data/demo_tiles/agriculture_feb2026_backup/` in the main repo (the pre-swap agriculture tile) is
      intentionally being kept as a revert path, or clean it up once the July tile is confirmed final.

## Tier C -- ideas raised, not committed to

- [ ] A defence tile with more real structural texture (installations/roads) -- needs a fresh Copernicus Browser
      export from the user, not something fixable with already-downloaded data (Krishna-Godavari and Nilgiris
      were both tested for agriculture and didn't beat the current tile on the honest number + visual fit).
- [ ] Whether to keep this site private until submission day (currently the plan, matching the main repo) --
      remember GitHub Pages built from a private repo is also private to anonymous visitors; test the live
      link in an incognito window right after flipping it public.
