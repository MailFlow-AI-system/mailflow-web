# Workspace operational recovery — phase 6, local checkpoint

For a step-by-step human acceptance run, use the Portuguese
[local QA guide](workspace-qa-manual.md). Its scenarios are not marked as passed
until a tester executes and records them; the evidence below is separate.

## Delivered

The workspace client distinguishes 429 responses from identity changes and
upstream failures. Retry-After is accepted only as an integer from 1 to 60 seconds,
matching the current Core budget window. Invalid or absent headers use a generic
wait message. Identity mismatches still take precedence over rate-limit feedback.

Workspace selection displays this wait time through its existing error area,
keeps the local composer draft and releases the pending-navigation state.
There is no automatic retry, polling, local authorization bypass or new timer.
Core remains the authority for enforcement; retrying early can still return 429.

## Reference and validation

Consulted the workspace trigger/menu in the read-only Lovable reference
`mailflow-ai-suite/src/components/app-sidebar.tsx`. It contains mock workspace
choices, not a real rate-limit recovery state. At the initial checkpoint, existing
Web error presentation was retained without styling, layout, icon or Design
System changes. Later development/avatar integration and contrast corrections
are documented below.

`bun run check` passed: lint, formatting, typecheck, 284 tests and production
client/server build. After adding the hook regression, lint, formatting,
typecheck and all 285 tests passed again. Six response-client cases cover valid, missing, malformed,
negative, zero and oversized Retry-After values without extra session reads.
The hook regression verifies draft preservation, explicit wait feedback and
pending-state cleanup after a rejected selection.
All 21 real workspace browser regression scenarios passed (one worker,
zero retries, 3.7 minutes), with the real Core and isolated PostgreSQL fixture.
These existing scenarios do not yet cover rate-limit feedback in the browser.

## Pending acceptance

Phase 6 remains in progress for approved environment smoke/ingestion. Real
browser-to-Core local telemetry correlation and rate-limit coverage are below.
The local HTTP workload, dev/compiled SSR probes and development integration
are recorded below (Core details live in its companion operational document).
Real DNS/TLS/cookies/deployment smoke requires the approved environment topology.
No external changes, push or production release were performed.

## Parallel SSR diagnosis and inactive-feature correction

Six-worker legacy runs reproduced the failure: 4/10, 2/10 and 5/10 failures during
diagnosis. A temporary server-side diagnostic isolated the stack to
`getWorkspaceEntryBootstrap` through TanStack `createSsrRpc.ts`, where the
resolved server function was not callable. The error happens before the
workspace API reader. It was not thrown by `getCurrentSession` in those runs.
All temporary stack logging was removed.

The authenticated route previously invoked the workspace server function even
when the workspace feature was disabled. It now resolves inactive configuration
to `passthrough` before the RPC, matching the existing server bootstrap rule.
Authentication still runs first. Configured workspace entry remains
server-authoritative; failures are not converted to passthrough. No retries,
worker-count changes, authorization fallback or dependency upgrades were added.

Five permanent adapter tests cover disabled/missing configuration, server-owned
entry and propagation of configured resolver failures. Full Web check passed:
290 tests, lint, formatting, typecheck and production build.
The legacy browser suite then passed all 10 tests with its original six workers,
zero retries and no SSR diagnostic logging (40.8 seconds).
Four targeted real-Core/PostgreSQL browser regressions also passed (45.5 seconds,
one worker, zero retries): generic fallback, no memberships, failed entry/retry
and independent explicit-host tabs with simultaneous reloads. The complete
21-case suite passed at the prior checkpoint; only these four were rerun after
the inactive-feature correction. This is not a full parallel cold-start test.

This correction does not establish the underlying TanStack resolver race as
universally fixed. Configured dev cold-start and built local Worker evidence
are recorded below, separately from legacy regression.

## Configured parallel startup

`e2e/workspace-switching/parallelStartup.spec.ts` creates a real session through
Core without warming authenticated Web routes, then opens six pages together in
one browser context, alternating between A and B. Each checks HTTP 200, the
correct workspace label and an enabled composer. Preference/selection/global
Mail/activeOrganization counters remain unchanged. The fixture uses loopback
Core, a restricted PostgreSQL pool and temporary workspace.test cookies only.

The initial default five-second visibility assertion expired while the shell
was still loading. The saved network trace showed no 5xx responses and successful
workspace context/list reads. The test's startup ceiling was made explicit at
30 seconds; retries remain zero and no application readiness behavior changed.

A fresh dev start passed: six page readiness times were 7615, 7944, 7842, 8197,
8172 and 8379 ms. An independent earlier run passed in 20.9 seconds including
harness startup. A separate 12-request cold concurrent HTML probe also returned
12 HTTP 200 responses without the serialized SSR error. Dev module compilation
and browser hydration are included in page readiness, not just API latency.

This is evidence for the tested local dev configuration, not a production
latency SLO or proof that every TanStack resolver race is eliminated.
The complete workspace browser suite passed all 22 tests after the accounting
fix and addition of this regression (3.5 minutes, one test worker, zero retries;
the startup scenario itself opens six concurrent pages).

## Development integration and compiled Worker smoke

Fetched all three development branches. Core and Site had no new upstream
commits; Web added `543a80f` (DS avatars) and `7e6bc54` (@mailflow/ui v0.7.0).
The active Web branch was rebased onto development, with a local recovery branch
`feat/workspace-pre-development-20261006` retaining the prior stack. Original
dirty checkouts were untouched; nothing was pushed.

The selector conflict was reconciled by keeping the authorized feature/provider
and moving the upstream DS Avatar/AvatarFallback composition into WorkspaceAvatar.
The wrapper test now requests a selection and checks that only a supplied
authorized state changes the current label; no local mock memberships or
optimistic selection were reintroduced. DS visual primitives, upstream user and
message avatars, and the released v0.7.0 pin/lockfile were retained. `bun install
--frozen-lockfile` passed and installed package metadata confirms version 0.7.0.

Read-only Lovable reference: `src/components/app-sidebar.tsx` (size-6 workspace
Avatar, primary/15 fallback, 10px initials). No new DS release or ad-hoc CSS.
Whole-Web check after integration: 296 tests, lint, format, typecheck and build
passed, with local workspace configuration enabled in the build.

Compiled SSR reproduction (independently owned Core fixture must be running):

```sh
VITE_API_BASE_URL=http://127.0.0.1:8083 VITE_WORKSPACE_BASE_HOST=workspace.test VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED=true bun run build
VITE_API_BASE_URL=http://127.0.0.1:8083 VITE_WORKSPACE_BASE_HOST=workspace.test VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED=true bun run vite preview --port 3004 --host 127.0.0.1
bun run e2e/workspace-switching/ssrProbe.ts 3004
```

The fixed-loopback probe signs in through real Core, opens 12 explicit-host and
six generic-entry HTTP requests concurrently, and validates the authorized shell
or safe fallback redirect. It checks no selection/preference/global Mail or
activeOrganization mutation. Result: 12 HTTP 200 + six HTTP 307, zero SSR errors,
481 ms for the complete burst. Preview uses the compiled local Cloudflare Worker;
this is not deployment, DNS/TLS/cookie smoke or browser hydration in production.

## Rate-limit feedback and accessible consumer styling

The confirmation now receives the client's bounded Retry-After separately from
its generic error text. When Core returns 429, it announces the wait in Portuguese
and preserves the draft. The value is reset on new requests/cancel; no countdown,
automatic retries or client-side authorization was introduced.

The permanent rate-limit browser test exhausts the real identity budget through
a maximum of 125 list requests, observes the actual selection POST's 429 and
Retry-After, checks the alert/zero writes/unchanged host, cancels the confirmation
and restores the unchanged draft. No response mocking or disabled limiter.

Post-rebase accessibility checks caught two previously untested color states:
avatar initials on a highlighted option (3.78:1), and the destructive-colored
error paragraph in a dark dialog (4.13:1). Both were below 4.5:1 for their text
sizes. Web overrides now use semantic sidebar/dialog foreground tokens, retaining
DS primitives, avatar dimensions and primary/15 background. Sidebar errors use
the same readable semantic foreground. Roles and live announcements are retained.
No Axe rule was excluded or DS global token changed.

Targeted checks passed after correction: the mobile selector (including Axe),
and the real rate-limit dialog (including Axe and draft restoration). The palette
adjustment intentionally prioritizes readability over exact purple initial text;
layout/composition remain based on the Lovable sidebar and existing Web dialog.
The complete post-rebase workspace suite then passed all 23 scenarios (3.3
minutes, zero retries), including the real rate-limit scenario and both palette /
mobile selector accessibility checks. Six-page startup remained below the
30-second local ceiling (maximum 8737 ms on the final run).

## Final local checkpoint — 2026-10-06

- Final Web `bun run check`: lint, formatting, typecheck, 297 tests in 61 files
  and production client/server build passed. The build enabled local workspace
  configuration against the dedicated Core fixture origin.
- Final workspace browser suite: 23 passed, zero skips/retries, with real Core
  auth and isolated PostgreSQL; six concurrent pages are exercised within it.
- Legacy Web suite: 10 passed in 28.4 seconds with the original six workers,
  zero retries. The synthetic Faro endpoint is unavailable in this legacy
  harness, so transport warnings are not ingestion evidence. The intentional
  sanitized browser-error test also logs its controlled error.
- Site → Core → Web onboarding regression: two passed in 27.1 seconds,
  desktop/mobile, zero skips/retries, including light/dark Axe, signup, refresh,
  resend, OTP verification without a session, login and the workspace label.
  Auth/database are real; email delivery remains a capturing provider double.
- Companion Core `bun run check`: 169 tests plus lint, formatting, typecheck
  and build passed; its finite HTTP workload and local OTLP results are recorded
  in `mailflow-core-onboarding/docs/workspace-operational-recovery.md`.

The onboarding harness emitted Better Auth's trusted-client-IP fallback warning
for proxied signup. No untrusted browser IP header was forwarded and no limiter
was disabled. A verified proxy chain/IP configuration is an environment gate;
these successful isolated tests do not certify abuse protection in deployment.

Original dirty checkouts are preserved. Work is checkpointed locally on
`feat/workspace-operational-recovery`, not pushed or deployed. Phase 6 is still
open for the approved-environment gates (including DNS/TLS, cookies, email,
proxy trust and remote telemetry). The next checkpoint below closes the local
browser correlation gap.

## Real browser telemetry checkpoint — 2026-10-06

The dedicated `playwright.workspace-telemetry.config.ts` starts real Core/DB,
Web and a loopback HTTP Faro receiver. No Playwright route interception, mocked
SDK, fabricated traceparent, disabled limiter or remote credentials are used.
The existing instrumentation already propagates trace context for same-origin
workspace BFF calls; no expansion of cross-origin propagation was necessary.

The Core test caught missing operation/result dimensions for middleware's early
429. That regression was fixed and covers early 401/429/503 too. The real Faro
payload then caught tenant names in `httpHost` and `server.address` (including
OTel key/value arrays), which URL-only sanitization had not covered. A failing
privacy regression plus a dedicated masking utility now remove configured
tenant hostname prefixes from plain technical values, preserving the base zone,
port and trace IDs. Arbitrary identities/credentials continue to be blocked.
These are telemetry/privacy changes; no UI/DS component or visual behavior changed.

Final dedicated browser test: one passed in 28.1 seconds, zero retries/skips.
It observes five real HTTP outcomes: success, denial, injected failure, injected
control outage and actual identity budget exhaustion. For each, the actual Faro
fetch span ID/trace ID is ingested by the HTTP receiver, linked through the BFF
response request ID to the Core completion, and matched to Collector output's
trace/Core-span/browser-parent IDs. Both workspace count/duration metrics appear
in actual Collector output, not only mocked exporter assertions.

The complete received Faro payloads contain none of the fixture email/password,
identity/workspace IDs, tenant hostnames, control key or seeded composer
subject/body. The composer draft remains unchanged after the workload. The
receiver accepts only local workspace origins on port 3003, bounds decompressed
payloads and in-memory retention, and exposes snapshots only to requests without
a browser Origin. Core completion snapshots require the test control key.

The harness initially rejected Faro's real session/idempotency CORS headers;
adding those exact allowed headers corrected the test receiver, not application
code or production CORS. It also supports bounded gzip payloads. The real OTLP
Collector must be running; missing collector/DB/CLI is a failure, never a skip.

Reproduction in this WSL/Docker Desktop setup, with the independently provisioned
`mailflow-workspace-otel-local` Collector using Core's committed local config:

```sh
# Node 24 / Bun 1.4.1; reuse the existing dedicated local Collector, no deletion.
'/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe' --context desktop-linux start mailflow-workspace-otel-local
MAILFLOW_CORE_WORKTREE=/absolute/path/to/compatible/core \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL='<isolated-local-owner-url>' \
MAILFLOW_WORKSPACE_DOCKER_COMMAND='/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe' \
bun run playwright test --config playwright.workspace-telemetry.config.ts --reporter=line
```

Run browser configs/builds sequentially in this Web checkout. This suite uses
ports 3003/8083/14319 and the fixed OTLP port 14318. Collector logs and ignored
Playwright attachments retain only synthetic local evidence. This verifies a
local Faro receiver and real Core OTLP ingestion, not remote Faro/Grafana service
behavior or a new BFF server-span implementation.

Updated full checks passed: Web 299 tests in 62 files, lint, formatting,
typecheck and workspace-enabled production build; Core 173 tests in 39 files,
lint, formatting, typecheck and build, with the isolated real PostgreSQL suites.

Final real workspace regression: 23 passed in 3.3 minutes, zero skips/retries;
six-page startup maximum 8739 ms. Legacy regression: 10 passed in 22.3 seconds
with the original six workers and zero retries. Site onboarding was unchanged
and its two real cross-repository scenarios passed at the preceding checkpoint;
they were not rerun for these telemetry-only changes.

One intermediate workspace run had 22 successes / one delayed-identity failure.
This was test-run interference: editing this document at 17:12:20.087 (-03:00)
triggered Vite reloads in both tabs during logout; the network trace shows the
background tab requesting Inbox at 17:12:20.171, then redirecting to login before
the new sign-in completed. The trace was preserved locally outside Git. A fresh
complete run with no file edits while Vite was active passed all 23 scenarios.
No application change, longer assertion timeout or enabled retry was used for it.
Do not edit even documentation in the watched checkout while a browser suite runs.

Core/Web changes are committed locally. The temporary Collector was stopped
again, retaining its logs/container; the dedicated test database remains running.
No external configuration, push, deploy, tag or release was performed.

The final real-environment stage is intentionally deferred per the developer's
request. [Manual rollout checklist](workspace-rollout-manual.md) documents the
information/approvals needed and the remaining host/session adaptation; local
flags must not be enabled on deployed applications.
