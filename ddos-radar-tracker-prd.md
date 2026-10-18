# Product Requirements Document (PRD)

## Project: Global DDoS Radar

**Document version:** 1.0  
**Date:** 18 October 2026  
**Status:** Ready for implementation  
**Product type:** Single-page public cyber-threat visualization  
**Frontend:** Next.js App Router, JavaScript, Tailwind CSS  
**Data source:** Cloudflare Radar API  
**Primary visual:** Aceternity UI Globe (`@aceternity/globe-demo`)

---

## 1. Product summary

Build a premium, dark, single-page web dashboard that visualizes Cloudflare Radar's aggregated DDoS-attack telemetry on an interactive 3D globe. The experience should feel like a focused cyber operations display rather than a generic analytics dashboard: a near-black canvas, deep navy globe, cyan/blue attack corridors, sparse labels, restrained typography, and compact operational status panels.

The app periodically requests Cloudflare Radar data through a server-side Next.js route handler, converts country-level origin/target pairs into globe arcs, and displays the data window, last successful refresh, top attack corridors, and high-level trend information where supported.

### Critical product truth

Cloudflare Radar provides aggregated, time-windowed telemetry. It does **not** provide this application with a continuous stream of individual attack packets or precise, live attacker coordinates. The product must therefore describe the globe as an **aggregated attack-corridor visualization**, never as a packet-level, second-by-second map of every attack. UI motion may animate the presentation of the returned aggregated data, but must not imply that each animation is a newly observed attack event.

Recommended product title: **GLOBAL DDoS RADAR**  
Tagline: **Aggregated attack activity across the Cloudflare network.**

## 2. Problem statement

People interested in cybersecurity want a fast, understandable way to see where DDoS attack activity is being reported globally. Existing API output is structured data, not an immediately understandable visual experience. The app turns Cloudflare Radar's public aggregate trends into a visually engaging globe and concise telemetry summary, while being transparent about its data window and limitations.

## 3. Goals

1. Deliver one polished, responsive page with an interactive globe as the visual focus.
2. Use Cloudflare Radar as the source of attack telemetry; do not fabricate live statistics.
3. Show aggregated source-to-target country pairs as globe arcs when the API provides them.
4. Display the observation window and the time of the last successful fetch.
5. Refresh on a measured interval without leaking credentials or overloading the API.
6. Handle loading, empty data, API failures, rate limits, and stale data clearly.
7. Be usable on desktop and mobile, including keyboard-accessible controls and reduced-motion preferences.

## 4. Non-goals for the MVP

- No raw packet capture, packet-level streaming, or websocket feed of individual attacks.
- No attacker IP addresses, threat actor attribution, exact attack launch sites, or victim IP addresses.
- No claim that a country shown as an origin identifies the human operator.
- No private customer-zone analytics or account-specific DDoS event feed.
- No response/mitigation controls, firewall editing, authentication system, database, or user accounts.
- No alerting, email reports, historical export, or multi-page analytics in the initial release.
- No fabricated attack counts. Do not convert percentages into absolute request counts unless the API explicitly returns the required denominator and documented units.

## 5. Target users and use cases

### Primary users
- Cybersecurity students and practitioners exploring DDoS trends.
- Developers who want a visual demonstration of public cyber telemetry.
- Visitors who want a quick overview of reported global attack corridors.

### Core use cases
- Open the site and immediately understand whether Radar data is loading, current, or stale.
- Observe country-to-country attack corridors on a rotating globe.
- Switch between Layer 7 (application-layer) and Layer 3 (network-layer) views.
- Inspect a top corridor in a compact list and identify its reported percentage/rank.
- Manually refresh and check the last successful update time.

## 6. Product principles

1. **Truthful over theatrical:** the animation is a visualization of aggregate data, not evidence of a new attack.
2. **Globe first:** the globe dominates the first viewport; controls and metrics support it without overwhelming it.
3. **Minimal interface:** nearly black background, navy globe, cyan/blue accents, subtle borders, few icons, no decorative gradients beyond the globe's atmosphere/fade where needed.
4. **Server-side secret handling:** the browser never receives the Cloudflare API token.
5. **Visible provenance:** identify Cloudflare Radar as the data source and show the selected data window.
6. **Graceful degradation:** if data cannot load, keep the page useful and clearly distinguish live API data from demo data.

## 7. Scope and release plan

### MVP / P0
- Single route `/`.
- Aceternity globe component, responsive layout, and dark theme.
- Cloudflare Radar integration using Next.js Route Handler(s).
- Layer 7 / Layer 3 view selector.
- Top source-target corridors list.
- Last updated timestamp, time-window label, refresh control, API status state.
- Loading, error, empty, stale, and demo states.
- Environment variable configuration and setup documentation.

### P1
- 24-hour trend chart, if the selected Radar timeseries endpoint and response fields provide a meaningful series for the chosen metric.
- Filters for top 5 / 10 / 20 corridors.
- Pause/resume globe auto-rotation and reduced-motion behavior.
- Corridor detail popover with source, target, rank, reported value, data window, and layer.

### Out of scope unless explicitly requested
- WebSockets, persistent storage, alerts, accounts, and an administrator dashboard.

## 8. Information architecture and page layout

The product is a single page with the following zones.

### 8.1 Top navigation / identity row

- Left: minimal shield/radar mark and `GLOBAL DDoS RADAR` wordmark.
- Secondary label: `CLOUDFLARE RADAR · PUBLIC TELEMETRY`.
- Right: API status indicator (`Connected`, `Stale`, `Unavailable`) and `Refresh` button.
- Keep this compact; avoid a multi-link marketing navbar.

### 8.2 Hero and globe stage

- Main heading: `The internet under pressure.` or `Global DDoS activity`.
- One-line explainer: `Aggregated attack corridors reported by Cloudflare Radar.`
- Globe centered in the viewport, filling most of the visual stage.
- Deep navy sphere with dotted/outlined country geometry if supported by the globe component.
- Cyan and blue arcs connecting country centroids from the API's origin and target values.
- Arc opacity/width may use a normalized scale derived from the returned values/ranks. Do not portray normalized width as an absolute packets-per-second measure.
- Hover/focus on a corridor can reveal source country, target country, rank, metric value, selected layer, and data window.
- Provide a subtle visual key: `Reported source → target corridor`.
- Keep decorative/sample arcs disabled when live data is present.

### 8.3 Compact telemetry strip

Show no more than four values across desktop; stack responsively on mobile.

Suggested items:
1. `DATA WINDOW` — for example `Last 24 hours`.
2. `TOP CORRIDORS` — number of returned source-target rows, not a number of individual attacks.
3. `LEADING ORIGIN` — highest-ranked origin in the current result, when present.
4. `LAST UPDATED` — timestamp of the last successful API response.

Do not label these cards `Attacks per second`, `Live attacks`, `Packets blocked`, or `Total attacks` unless an endpoint returns that exact metric and the product documents its meaning.

### 8.4 Layer selector and observation-window selector

- Layer control: `Application (L7)` / `Network (L3)`.
- Window control: MVP defaults to `24h`; P1 may include `7d` when the endpoint and API support it.
- Changing either control triggers a fetch or selects a correctly cached server response.
- The selected layer/window must stay visible, not hidden in a settings panel.

### 8.5 Top corridors panel

Display up to 10 source-target pairs, sorted by API rank/value.

Each row contains:
- Rank number.
- Origin country name/code.
- Arrow.
- Target country name/code.
- Value and its documented unit, e.g. percentage of mitigated requests if that is how the selected endpoint defines `value`.
- A thin proportional bar only if the value is numeric and its denominator/meaning is understood.

Selecting a row highlights its matching globe arc. If the API gives no valid coordinates for a country, the row remains available and its arc is omitted; never guess a city-level location.

### 8.6 Footer / data disclosure

Show:
- `Source: Cloudflare Radar API` with a link to the Radar API documentation.
- The observation window and last successful update.
- A short disclosure: `Country-level aggregates, not individual attack events. Geographic attribution is approximate and varies by layer.`
- For Layer 3, add a more explicit caveat: Cloudflare notes that location attribution uses the Cloudflare data-center location because source IPs can be spoofed.

## 9. Functional requirements

### FR-01: Fetch Radar data

The app must retrieve supported attack datasets from Cloudflare Radar through a same-origin Next.js route handler. The route handler is the only part of the app allowed to read the private API token.

### FR-02: Render corridors

Transform valid country pairs into `{ startLat, startLng, endLat, endLng, color, arcAlt, value, rank, origin, target }` objects suitable for the Aceternity `World` component. Only generate arcs when both country centroids can be resolved.

### FR-03: Layer selector

Changing the layer updates the label, corridor data, data disclosure, and any chart data. It must be impossible for an L7 value to remain displayed under an L3 label after a failed fetch.

### FR-04: Observation window

MVP defaults to the last 24 hours (`dateRange=1d`). Display this clearly. P1 may add longer windows only after verifying each endpoint's supported range and aggregation interval.

### FR-05: Periodic refresh

Refresh data every 60 seconds by default, configurable through a server-side constant/environment variable. Provide a manual refresh button. Prevent overlapping requests; if one request is in progress, do not start another.

**Important:** A 60-second frontend poll is a refresh cadence, not proof that Radar's upstream dataset changes every 60 seconds. Display the API result's `meta.lastUpdated` and/or `meta.dateRange` when available. If these fields are unavailable, label the displayed time as `Fetched at`, not `Radar data updated at`.

### FR-06: Status and stale data

- `Loading`: first request in progress.
- `Connected`: most recent request succeeded and is within the app's configured freshness window.
- `Stale`: last successful dataset is being displayed after a refresh failure or is older than the freshness window.
- `Unavailable`: no usable live dataset has loaded.
- Store the last successful result in client memory for graceful temporary failures; do not require a database.

### FR-07: Loading and errors

- Show a skeleton/globe loading state on the first request.
- Show a compact, non-blocking error if background refresh fails and stale data exists.
- If no cached data exists, show `Radar data is temporarily unavailable` and a retry action.
- Do not silently replace failed live API data with sample arcs.

### FR-08: Demo mode

Optional local development demo mode may use clearly labeled sample corridors if no token has been configured. It must display a persistent `DEMO DATA — NOT LIVE` banner and must never display `Connected` or `Live attack activity`.

### FR-09: Accessibility

- All buttons, selectors, and corridor rows must be keyboard operable.
- Interactive elements need visible focus styles and accessible labels.
- Never use color alone to convey state.
- Respect `prefers-reduced-motion`; reduce or stop auto-rotation and arc animation when requested.
- Ensure adequate text contrast against the black background.

### FR-10: Responsive layout

- Desktop: globe central and largest, telemetry and top corridors placed at the sides or underneath without obscuring the globe.
- Tablet: compact telemetry strip and globe above the corridor list.
- Mobile: globe scales to the available width; controls stay reachable; list becomes full-width below the globe; avoid horizontal scrolling.

## 10. Cloudflare Radar API integration

### 10.1 Base URL and authorization

Base URL:

`https://api.cloudflare.com/client/v4/radar/`

Create a Cloudflare API token with the minimum permission required by the current Radar docs: **Account → Radar → Read**. Store it in `.env.local` as `CLOUDFLARE_RADAR_API_TOKEN`. Never prefix it with `NEXT_PUBLIC_`; never return it to the browser, put it into client bundles, or commit it to source control.

### 10.2 Primary Layer 7 endpoint

Use the endpoint for top application-layer attack pairs:

`GET /radar/attacks/layer7/top/attacks?limit=10&dateRange=1d&format=json`

Full URL:

`https://api.cloudflare.com/client/v4/radar/attacks/layer7/top/attacks?limit=10&dateRange=1d&format=json`

The official documentation's example response includes country-level fields such as:
- `originCountryName`
- `originCountryAlpha2`
- `targetCountryName`
- `targetCountryAlpha2`
- `value`
- `rank`
- `meta`, including date-range information where available

Cloudflare describes these values as shares of total Layer 7 attacks/mitigated requests for the selected window; respect the exact endpoint's metric semantics. Do not call `value` an absolute count without confirming that meaning from the live endpoint documentation and response.

### 10.3 Primary Layer 3 endpoint

Use the endpoint for top network-layer attack pairs:

`GET /radar/attacks/layer3/top/attacks?limit=10&dateRange=1d&format=json`

Full URL:

`https://api.cloudflare.com/client/v4/radar/attacks/layer3/top/attacks?limit=10&dateRange=1d&format=json`

Normalize its response in a separate adapter because field names and metric semantics should be verified against the Layer 3 schema rather than assumed identical to Layer 7.

**Layer 3 disclosure:** Cloudflare's documentation says that network-layer location attribution uses the Cloudflare data-center location due to IP spoofing. Therefore, the interface must not present an L3 origin as a verified physical origin of an attacker.

### 10.4 Optional Layer 7 time series (P1)

Potential endpoint for grouped hourly mitigation trends:

`GET /radar/attacks/layer7/timeseries_groups/mitigation_product?aggInterval=1h&dateRange=1d&name=attacks&format=json`

This endpoint groups mitigated traffic by mitigation product; it is not automatically a count of attacks per second. It can support a trend visualization that explains the distribution of mitigated requests by product. Confirm the exact values and normalization from the live schema before rendering units/labels.

### 10.5 Endpoint validation requirement

Before implementation is considered complete, test each chosen endpoint against a real Cloudflare token and capture its current JSON response. Verify:
- exact result keys and whether series are arrays, objects, or named result collections;
- data types (`value` may be a numeric string);
- units and normalization (`PERCENTAGE`, bytes, or another documented metric);
- `meta.dateRange` and `meta.lastUpdated` behavior;
- optional query parameter syntax and supported date ranges;
- no-data and rate-limit response shapes.

Do not assume every API response has identical keys or that all endpoints return a value that can be summed into an attack count.

## 11. Country coordinate mapping

The globe requires latitude and longitude, but Radar's top-pair endpoints provide country identifiers rather than precise coordinates. The app must map ISO alpha-2 codes to **country centroids** using a maintained local static dataset or a vetted package.

Requirements:
- Keep the mapping bundled server-side or locally; do not issue one geocoding request per country.
- Treat centroids as visual anchors, not actual attack source locations.
- If the country code is absent or unknown, preserve the table row but skip the arc.
- Do not geocode to a capital city and then imply that the capital is an attack origin.
- Document the coordinate dataset/package and its license in the repository.

## 12. Suggested application architecture

Use Next.js App Router with JavaScript (no TypeScript unless the developer later chooses it), Tailwind CSS, and client components only where interactivity is needed.

### Recommended file structure

```text
app/
  api/
    radar/
      route.js              # server-side proxy/normalization endpoint
  globals.css
  layout.js
  page.js                   # page shell and metadata
components/
  radar-dashboard.jsx       # interactive client dashboard
  radar-globe.jsx           # dynamic import wrapper around World
  telemetry-strip.jsx
  layer-switcher.jsx
  corridor-list.jsx
  status-indicator.jsx
  loading-state.jsx
lib/
  cloudflare-radar.js       # server-only upstream API client
  normalize-radar.js        # endpoint-specific response adapters
  country-centroids.js      # ISO country coordinate lookup
  radar-config.js           # constants and supported options
components/ui/
  globe.jsx                 # installed by Aceternity/shadcn registry
.env.example
README.md
```

Adjust filenames to match the installed Aceternity component's generated structure. Keep API token access inside `app/api/radar/route.js` or server-only modules imported by it.

### Request lifecycle

1. Browser requests `/api/radar?layer=l7&range=1d&limit=10`.
2. Route handler validates allowed query values against an allowlist.
3. Server calls the corresponding Cloudflare Radar endpoint with the secret token.
4. Server checks HTTP status and Cloudflare's `success` flag.
5. Layer-specific adapter parses and normalizes the response into a small stable payload.
6. Route handler returns only fields required by the UI; no token or unnecessary raw API response is exposed.
7. Client updates the corridor list, globe arcs, status, and timestamps.
8. The client repeats after the refresh interval without creating overlapping requests.

### Suggested normalized response contract

```json
{
  "success": true,
  "source": "cloudflare-radar",
  "layer": "l7",
  "range": "1d",
  "fetchedAt": "2026-10-18T12:00:00.000Z",
  "upstreamLastUpdated": null,
  "dateRange": {
    "startTime": "2026-10-17T12:00:00.000Z",
    "endTime": "2026-10-18T12:00:00.000Z"
  },
  "metric": {
    "label": "Share of mitigated Layer 7 attack requests",
    "unit": "percent"
  },
  "corridors": [
    {
      "rank": 1,
      "origin": { "name": "Country A", "code": "AA", "lat": 0, "lng": 0 },
      "target": { "name": "Country B", "code": "BB", "lat": 0, "lng": 0 },
      "value": 0,
      "valueLabel": "0.0%"
    }
  ],
  "warnings": []
}
```

The values above are a schema example only, not real attack data. Build `metric.label`, `metric.unit`, and `valueLabel` based on the live endpoint's documented semantics. Do not ship the example countries or zero values as if returned by Cloudflare.

### Route-handler requirements

- Validate `layer` against `l3 | l7`.
- Validate `range` against a conservative allowlist (`1d` in MVP).
- Clamp `limit` to a safe range such as 1–20.
- Set a finite upstream timeout (for example, 8–10 seconds).
- Return appropriate HTTP status codes without leaking the bearer token or raw server exception.
- Handle network errors, non-2xx statuses, malformed JSON, `success: false`, and missing `result`.
- Consider short server-side caching (for example, 30–60 seconds) if supported by the deployment runtime, while ensuring the UI reports the correct upstream data window. Do not depend on in-memory server cache for correctness in serverless deployments.
- Add `Cache-Control` deliberately and verify Next.js caching behavior for route handlers; do not assume requests are always dynamic or always cached.

## 13. User experience states

### First load
- Header and stage render immediately.
- Globe may render as a skeleton or neutral sphere while the first data request runs.
- Status says `Connecting to Radar…`; do not show a green `Live` indicator before a successful request.

### Successful load
- `Connected` status.
- Real returned corridors render as arcs.
- `Data window` and `Last updated` metadata are visible.
- Table/rows display actual API values and appropriate units.

### Refresh in progress
- Keep existing arcs on screen.
- Show a small spinner beside `Refreshing` instead of blanking the entire dashboard.
- Disable the manual refresh button temporarily or ignore duplicate presses.

### Upstream error with prior data
- Keep the previous successful corridors.
- Change status to `Stale`.
- Show the time of the last successful fetch and a retry control.
- Do not change the old dataset's observation-window label to imply it is new.

### Upstream error without prior data
- Show a concise unavailable state and a retry control.
- If the developer explicitly enables demo mode, show demo arcs with a persistent, unmistakable `DEMO DATA — NOT LIVE` badge.

### Empty result
- Show `No corridor data returned for this window`.
- Do not fabricate points to fill the globe.

## 14. Visual design specification

### Mood
Minimal, premium, dark, technical, restrained. Inspired by the reference screenshot's centered 3D globe and sparse cyan/blue connections, but redesigned as a cyber telemetry display.

### Color tokens
- Page background: `#030407` or similarly near-black.
- Panel background: `#080C14`.
- Primary text: `#F3F6FC`.
- Secondary text: `#9BA7B8`.
- Border: translucent cool gray, e.g. `rgba(148,163,184,0.16)`.
- Globe: deep navy, e.g. `#061535` / `#062056`.
- Arc accent: cyan `#06B6D4`.
- Secondary accent: blue `#3B82F6`.
- Success: muted green, reserved for verified successful API connectivity.
- Warning/stale: amber.
- Error/unavailable: red, used sparingly.

### Typography
Use a modern sans-serif such as Geist/Geist Sans. Use compact uppercase eyebrow labels with modest tracking for metadata. Avoid very large blocks of copy.

### Motion
- Globe auto-rotation should be subtle.
- Use arcs only from the current normalized API payload.
- Animation duration and arc travel are illustrative; do not represent them as event timestamps.
- Avoid randomized arcs changing each render. If using sample arcs during development, make them deterministic and only available in demo mode.
- Respect reduced motion.

### Globe integration
Install the requested component in an existing shadcn-configured Next.js project:

```bash
npx shadcn@latest add @aceternity/globe-demo
```

The generated component in the supplied reference uses `dynamic(() => import('../ui/globe').then((m) => m.World), { ssr: false })` and passes a `data` array to `World`. Preserve the client-only/no-SSR behavior for the Three.js globe. Replace the supplied `sampleArcs` as the normal data source with the normalized Radar corridor array. The supplied example's random color assignment and fixed sample coordinates should not be used in production live mode.

The Aceternity globe component may require additional dependencies or generated UI files depending on the current registry version. Follow the generated install output and commit the required component files and package-lock changes.

## 15. Security, privacy, and reliability

- Never expose `CLOUDFLARE_RADAR_API_TOKEN` to the client.
- Never log authorization headers or tokens.
- Keep the token out of Git; include `.env.local` in `.gitignore` and provide `.env.example` with an empty placeholder.
- Do not accept arbitrary upstream URLs from query parameters (avoid an open proxy).
- Restrict API parameters using allowlists; no user-supplied raw Cloudflare path.
- Do not collect visitors' IP addresses or personal information for the MVP.
- Treat the Cloudflare API response as untrusted input: validate fields and numeric conversions.
- Limit UI-side refresh polling and provide timeouts/retry backoff rather than tight loops.
- Keep a last-known-good response in client state while refreshes are attempted.

## 16. Error handling and telemetry

The UI should map errors to user-safe messages:
- Missing token on server: `Radar API token is not configured` (development), generic unavailable text in production.
- `401/403`: `Radar API authorization failed` without showing secret-related details.
- `429`: `Radar request limit reached. Showing last available data if possible.`
- `5xx` / network timeout: `Radar is temporarily unavailable.`
- malformed/unsupported response: `Radar returned an unexpected response.`

Server logs may include the endpoint path, status code, elapsed time, and correlation/request identifier where available, but must not contain credentials. Avoid logging raw data unnecessarily.

## 17. Performance requirements

- Route-level data payload should contain only the metadata and up to 20 corridors needed for the page.
- Avoid making one geocoding or external mapping request per country.
- Lazy-load the globe with `next/dynamic` and `ssr: false` to prevent server rendering problems from WebGL/Three.js.
- Keep the rest of the dashboard usable if WebGL is unavailable; show an explanatory fallback and the corridor list.
- Target a useful initial visual shell quickly even if the globe bundle is still loading.
- Avoid repeatedly re-mounting the globe on every successful refresh if only its data prop changed.
- Verify browser console for WebGL, hydration, and animation warnings.

## 18. Analytics and success metrics

No third-party analytics are required for the MVP. Product success can be tested manually using:
- A successful real Radar data load in a clean environment.
- Correct layer/window labels and country-pair normalization.
- No secrets visible in page source, network payloads, or client bundle.
- Correct stale state when an upstream fetch fails.
- Responsive layout at 1440px, 1024px, 768px, and 375px widths.
- No false claim that the product sees individual attacks in real time.

## 19. Acceptance criteria

### Data correctness
- [ ] With a valid API token, the app fetches real Cloudflare Radar results through `/api/radar`.
- [ ] Layer 7 and Layer 3 call their own endpoints and use endpoint-specific normalization.
- [ ] The displayed metric label and unit match the selected endpoint's documented meaning.
- [ ] Date-window and source metadata are rendered when present in the upstream response.
- [ ] Unknown country codes never crash the page or create guessed attack locations.
- [ ] The globe's arc data comes from API results in live mode.
- [ ] No invented per-second counts, individual attacks, attacker IPs, or precise locations appear anywhere in the UI.

### Security
- [ ] The token exists only in server-side environment variables.
- [ ] The token is not present in browser JavaScript, returned JSON, or logs.
- [ ] The route handler rejects unsupported layer/range/limit values.
- [ ] No arbitrary URL forwarding is possible.

### Interaction
- [ ] Manual refresh works and duplicate refresh requests are prevented.
- [ ] Layer switch updates the dataset and metadata together.
- [ ] A failed refresh preserves valid previous results and marks them stale.
- [ ] Empty data is shown as empty; sample data is shown only in explicit demo mode.
- [ ] All controls are keyboard-operable and have visible focus styles.
- [ ] Reduced-motion preference decreases motion.

### Visual and responsive
- [ ] The globe is the main visual element on desktop.
- [ ] The dashboard retains a near-black/navy palette and restrained cyan/blue accents.
- [ ] No horizontal overflow at 375px width.
- [ ] If WebGL fails, the page still provides a useful list/status fallback.

## 20. Test plan

1. **API unit tests:** test normalizer with a current captured L7 response, current captured L3 response, empty result, malformed values, and missing centroid.
2. **Route tests:** missing token, invalid query, valid response, timeout, 401/403, 429, 5xx, `success: false`, malformed JSON.
3. **Component tests:** loading, connected, stale, unavailable, empty, demo state, layer switching, manual refresh.
4. **Visual checks:** desktop, tablet, and mobile; browser zoom; long country names; no arcs returned; large returned value; WebGL unavailable.
5. **Accessibility checks:** keyboard navigation, focus, contrast, reduced motion, readable screen-reader labels.
6. **Security check:** search client build assets and browser network responses for the token string; it must not appear.

## 21. Implementation sequence

### Phase 1 — Project foundation
- Create a Next.js App Router project using JavaScript and Tailwind CSS.
- Configure shadcn/ui if it is not already configured.
- Install the requested Aceternity globe component.
- Add the dark design tokens and responsive page shell.

### Phase 2 — Verify the upstream API
- Create a Cloudflare token with Radar Read permission.
- Test L7 and L3 endpoints via curl/Postman outside the browser.
- Save sanitized sample response fixtures for tests (remove any sensitive metadata if necessary).
- Confirm units, fields, freshness metadata, and query parameter behavior.

### Phase 3 — Server integration
- Implement `lib/cloudflare-radar.js` with timeout and safe error handling.
- Implement per-layer normalization in `lib/normalize-radar.js`.
- Implement `/api/radar` with query validation and a stable response shape.
- Confirm the browser never calls the upstream Cloudflare endpoint with a token.

### Phase 4 — Globe wiring
- Add country-centroid data.
- Convert normalized pairs to arcs.
- Use API-driven arcs as the only default/live arcs.
- Add corridor row selection and arc highlighting if supported cleanly by the globe component.

### Phase 5 — Status and UX
- Add load/refresh/stale/error/empty states.
- Add the layer switcher, last updated, data window, disclosure, and refresh button.
- Add reduced-motion handling and WebGL fallback.

### Phase 6 — Quality and deployment
- Run API and component tests.
- Verify responsive sizes and token handling.
- Configure the production environment variable in the hosting platform.
- Deploy and verify upstream access/rate behavior.

## 22. Environment configuration

`.env.example`:

```bash
# Server-side only. Do not rename with NEXT_PUBLIC_.
CLOUDFLARE_RADAR_API_TOKEN=

# Optional refresh interval in milliseconds; start with 60000.
RADAR_REFRESH_INTERVAL_MS=60000

# Optional explicit demo mode for local development only.
NEXT_PUBLIC_RADAR_DEMO_MODE=false
```

The refresh interval may be controlled in client code as a public UI setting, but the Cloudflare token must remain server-only. If demo mode is enabled, the UI must show the persistent demo banner regardless of whether sample arcs are visible.

## 23. Deployment assumptions

- The target host supports Next.js Route Handlers and server-side environment variables.
- If deployed on a serverless platform, do not rely on an in-memory cache persisting between invocations.
- Set an upstream timeout lower than the platform's request timeout.
- Verify CORS is not an issue by making upstream Radar calls only from the server.
- Observe Cloudflare's current API plan, acceptable-use policy, and rate limits before public launch; do not assume unlimited polling.

## 24. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Users interpret arcs as live individual attacks | Misleading security claims | Always disclose aggregates and selected time window; avoid per-second counts |
| Layer 3 geography is misunderstood | Misattribution of origin | Explain data-center location attribution and IP spoofing caveat |
| API response schema changes | Broken charts/globe | Endpoint-specific adapters, validation, captured fixtures, graceful empty/error states |
| Token leaks into browser | Credential compromise | Server-only route and env var; security test of build and network responses |
| Rate limiting or temporary outage | Stale/blank dashboard | Moderate polling, server timeout, stale state, manual retry, bounded caching |
| Unknown country code/centroid | Missing arc | Skip arc but keep corridor row; no guessed coordinates |
| WebGL unavailable | Globe disappears | List and status fallback, clear message |
| Globe dependencies change | Build failures | Follow generated shadcn/Aceternity output; pin and verify dependency lockfile |

## 25. Open implementation decisions

These should be resolved during implementation, not block the PRD:

1. **Globe dependency output:** use the exact component and dependency versions generated by the current Aceternity/shadcn registry command.
2. **Country-centroid source:** choose a maintained ISO alpha-2 centroid package/dataset with a compatible license and document it.
3. **P1 time series:** decide whether the product needs mitigation-product composition or a Layer 3 attack trend; select labels only after verifying metric semantics.
4. **Caching:** choose a server-side cache implementation only if necessary and compatible with the deployment target.
5. **Visual layout:** choose sidebar versus bottom corridor list after testing the reference globe's usable height and mobile layout.

## 26. Definition of done

The MVP is complete when a new developer can clone the project, configure a server-side Cloudflare Radar token, start the Next.js app, and see actual API-derived country corridors on the globe; switch between Layer 7 and Layer 3; identify the current data window and last successful fetch; use the app on mobile; and encounter explicit, accurate failure/demo states without leaked secrets or fabricated live events.

## 27. Official references

- Cloudflare Radar — Make your first API request: https://developers.cloudflare.com/radar/get-started/first-request/
- Cloudflare Radar — Application layer attacks: https://developers.cloudflare.com/radar/investigate/application-layer-attacks/
- Cloudflare Radar — Network layer attacks: https://developers.cloudflare.com/radar/investigate/network-layer-attacks/
- Cloudflare Radar API reference: https://developers.cloudflare.com/api/resources/radar/
- Cloudflare Radar — Layer 7 top attack pairs: https://developers.cloudflare.com/api/resources/radar/subresources/attacks/subresources/layer7/subresources/top/methods/attacks/
- Cloudflare Radar — Layer 3 top attack pairs: https://developers.cloudflare.com/api/resources/radar/subresources/attacks/subresources/layer3/subresources/top/methods/attacks/
