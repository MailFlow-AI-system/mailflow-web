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
