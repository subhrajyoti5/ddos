# Global DDoS Radar

A read-only, country-level view of Cloudflare Radar DDoS attack telemetry, rendered on an
interactive 3D globe with a ranked corridor list beside it. Built with Next.js (App Router) and
Tailwind CSS. No accounts, no database, no write paths.

## What it shows (and what it never claims)

- **Application (L7)** — country → country corridors reported by
  `radar/attacks/layer7/top/attacks` (share of total mitigated L7 attack requests).
- **Network (L3)** — origin locations reported by `radar/attacks/layer3/top/attacks`.
  This endpoint returns **no target country**, so L3 rows are drawn as origin markers, never as
  invented corridors. Cloudflare attributes L3 locations to the data-center location because
  source IPs can be spoofed; a country shown as an origin is not a verified physical attacker
  location.
- All figures are **country-level aggregates**, not individual attack events, and the view is
  deliberately **not real-time** — it reflects the last dataset Cloudflare Radar published, on
  Radar's own cadence. "Last updated" only says "Radar dataset" when the API actually returns
  `meta.lastUpdated`; otherwise it is labelled "Fetched at".

## Requirements

- Node.js 20+ and npm
- A Cloudflare API token with the **Cloudflare Radar: Read** permission
  (create one at <https://dash.cloudflare.com/profile/api-tokens>; the "Read all resources"
  template or a custom token with _Cloudflare Radar → Read_ works)

## Setup

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is needed because the shadcn registry install of the Aceternity globe
> pulls `@react-three/fiber@10.0.0-alpha`, which conflicts with `@react-three/drei`'s `^9` peer
> range. This project pins the stable `@react-three/fiber@^9` instead and installs cleanly.

Create `.env.local` (git-ignored, template in `.env.example`):

```ini
CLOUDFLARE_RADAR_API_TOKEN=your-token-here
RADAR_DEMO_MODE=false
NEXT_PUBLIC_RADAR_DEMO_MODE=false
```

The token is read **server-side only** by `app/api/radar/route.js` and is never included in any
response or client bundle.

```bash
npm run dev     # http://localhost:3000
```

Production: `npm run build && npm run start`. Note that `NEXT_PUBLIC_*` values are inlined at
build time, so change them (and rebuild) rather than expecting a restart to pick them up.

## Demo mode

Without a token (or to preview the UI), enable the clearly labelled sample mode:

```ini
RADAR_DEMO_MODE=true            # server: serves deterministic sample corridors
NEXT_PUBLIC_RADAR_DEMO_MODE=true # client: renders sample rows without calling the API
```

Demo runs show a permanent, non-dismissible **DEMO DATA — NOT LIVE** banner. Failed live requests
never silently fall back to sample data.

## Architecture

| Piece | Path | Notes |
| --- | --- | --- |
| Server proxy | `app/api/radar/route.js` | Allowlists `layer`/`range`/`limit`, 9 s upstream timeout with `AbortController`, safe error codes, `Cache-Control: no-store`, best-effort 45 s in-memory cache |
| Upstream client | `lib/cloudflare-radar.js` | Single place that touches `api.cloudflare.com`; never logs credentials |
| Normalizers | `lib/normalize-radar.js` | L7/L3 adapters, rank derived from array order (the API returns no `rank`), honest unit handling |
| Client state | `hooks/use-radar-data.js` | Status machine (`loading/connected/stale/unavailable/demo`), keyed cache, no overlapping requests, polling pauses on hidden tabs |
| Globe | `components/ui/globe.jsx`, `components/radar-globe.jsx` | Aceternity globe (three.js/three-globe) behind `next/dynamic` with `ssr: false`, WebGL fallback, reduced-motion support |
| UI | `components/*.jsx` | Telemetry strip, corridor list (keyboard operable, labelled rows), status indicator, disclosures |

The browser only ever calls this app's own `/api/radar`; Cloudflare is contacted exclusively from
the server. Default cadence: client polls every 60 s (minimum 30 s), server caches upstream for
45 s.

## Data & attribution

- Country borders in the globe: Natural Earth (110m, public domain) via `world-atlas`, generated
  into `data/globe.json`.
- Country centroids used to place arcs/markers: `world-countries` (mledoze/countries, ODbL-1.0)
  generated into `lib/country-centroids.json`.
- Regenerate both with `npm run generate:data`.

## Testing

```bash
npm test        # vitest: normalizers, upstream client, route handler, hook state machine, arcs, formatting, corridor list
npm run lint
npm run build
```

## Known limitations

- Live end-to-end traffic could not be verified without a Radar token; everything except the
  upstream fetch itself is covered by tests.
- The L7 trend chart from the product plan is intentionally not implemented: its response
  semantics could not be verified against the live API, and a chart that might mislabel units
  is worse than no chart.
- `three-globe` renders arcs with identical start/end as markers; this is what makes L3 origin
  rows possible without fabricating a target.
