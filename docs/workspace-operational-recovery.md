# Workspace operational recovery — phase 6, local checkpoint

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
choices, not a real rate-limit recovery state. Existing Web error presentation
was retained; no styling, layout, icon or Design System changes were made.

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

Phase 6 remains in progress: measured full-HTTP capacity/latency exercise,
correlated telemetry and ingestion, browser coverage of the new rate-limit
message, parallel SSR diagnosis and integration with recent development changes.
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
fixed for enabled tenancy. Parallel cold-start validation for configured tenancy
and built local Worker remains pending, separately from legacy regression.
