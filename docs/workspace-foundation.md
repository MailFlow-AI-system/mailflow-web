# Workspace foundation — phase 1

This branch replaces the Application Shell's fictitious workspace list with real
Core data. It implements discovery and authorized context, not functional
switching or persistence yet. The Select is deliberately read-only in this slice.

## Responsibilities

- `features/workspaces` owns the server gateway, validated client DTOs, query state,
  context provider/boundary, host/options utilities and presentation. Types live in
  `types.ts`; product-specific responsibilities are not moved into the DS.
- The shell composes `WorkspaceSelector`. Published `@mailflow/ui#v0.6.0` Select,
  Button and existing shell primitives are sufficient; there is no DS release.
- The local Lovable sidebar informs spacing, typography, initials and colors. The
  already-approved shell's Select/ChevronUp composition is retained rather than
  replaced by a new dropdown. No new-workspace/admin action is added.
- Queries are scoped by verified user ID and the current host. The current option
  remains present even when its discovery page has not loaded. No first-item
  fallback, local fabricated workspace or active-organization session coupling.
- Context errors deny tenant content, while loading/empty/retry are explicit.
  Existing mail routes/header/composer are preserved; no Mail backend is introduced.

## Configuration and rollout

`VITE_API_BASE_URL` remains the API origin. Optional `VITE_WORKSPACE_BASE_HOST`
contains the exact Web zone for one environment, without scheme, port or wildcard.
It is public **build-time configuration**, not a runtime secret. Unset means a
dark rollout: existing authenticated navigation remains available, and the selector
shows an unconfigured state rather than invented data.

When configured, only the exact base host or one valid child slug is recognized.
Do not configure `workspace.test` on Cloudflare: that is a test-only browser zone.
Current Wrangler configuration uses `workers.dev` and declares no real custom
workspace domain. Confirm development/staging/production zones, reserved names,
DNS/TLS, Workers routes and the cookie boundary before enabling cross-host switching.
No DNS, Cloudflare, Infisical or deployment changes are part of this branch.

The bounded same-origin GET gateway exposes only:

- `/api/v1/workspaces`, mapped to the identical authenticated Core list contract;
- `/api/workspace-context`, mapped to the slug context selected by the request URL.

Browser-supplied forwarded-host headers and alternate slug/actor query parameters
do not grant authority. Core revalidates session and membership. On the generic
base host, session verification returns `workspace: null`, not a guessed tenant.
Only filtered Better Auth cookies and trace correlation are forwarded. Requests
have a five-second bound, do not follow redirects and never accept arbitrary proxy
paths/mutations. Authenticated HTML/API responses are private/no-store. Browser
telemetry strips configured tenant hostnames and sensitive workspace/tenant keys.

## Reproduce validation

Use Bun 1.4.1, the required Node runtime, Chromium and the paired Core branch with
its dedicated PostgreSQL test database. No external provider delivery is required.

```bash
bun install --frozen-lockfile
VITE_API_BASE_URL=https://ci.invalid CLOUDFLARE_ENV=development bun run check
bunx playwright install chromium
E2E_PORT=3002 bun run test:e2e
```

The regression suite uses the pre-existing auth double and covers foundation and
composer only. It is not evidence of real workspace authorization.

In another terminal, start `bun run test:workspace:server` from the paired Core
checkout with `MAILFLOW_WORKSPACE_TEST_DATABASE_URL` pointing to the dedicated
loopback `mailflow_workspace_test` database. Then, from this Web checkout:

```bash
bun run test:workspace:e2e
```

This command starts a fresh Web server on port 3001, maps `*.workspace.test` inside
Chromium without changing computer DNS/hosts, and logs in through actual Core.
It fails when the Core/DB prerequisite is missing; there is no tenant mock fallback.
Run the browser suites sequentially in this checkout to avoid shared Vite-cache and
CPU contention. Screenshots are generated under ignored `workspace-test-results`.

## Evidence and handoff

Local validation on 2026-10-05:

- Web lint, formatting, typecheck, 118 tests and client/SSR production build passed.
- Existing foundation/composer browser suite: 10 passed.
- Workspace browser suite: desktop light/dark, collapsed/mobile sidebar, keyboard
  focus/Escape, current highlight, A/B visibility, no C visibility, private responses
  and unrelated-workspace denial. The Select popup had no detected Axe violations.

The C scenario deliberately copies a synthetic test cookie to a second local host
to exercise denial. It does **not** certify production cross-host session continuity.
The tests do not demonstrate preference, real switching, live email delivery,
Cloudflare routing or live telemetry ingestion.

Core CI gates real PostgreSQL workspace tests. Web CI retains its existing regression
suite; the coordinated workspace browser command is presently an additional manual
PR gate. Automating that cross-private-repository job needs an approved Core ref and
repository-read credential; do not mistake existing Web CI for feature acceptance.
Attach its real output to the paired PRs until that integration gate is established.

Next slices: initial-workspace onboarding, selection/preferences with a composer
discard guard, generic-host recovery, independent tabs, and operational validation.
After their review/integration, approve migrations, environment topology and rollout.
Do not advertise Workspace Management as complete or enable it for real users based
only on this foundation. No push, PR, merge or deployment is implied by local checks.
