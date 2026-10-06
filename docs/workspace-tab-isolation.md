# Workspace tab isolation — phase 5

The local phase-5 functional acceptance has been verified against real Core and
PostgreSQL. This is not production release approval; the operational limitations
and remaining phase-6 gates below are explicit.

## Verified behavior

The `tabIsolation.spec.ts` suite uses two pages in the same browser context, real
authentication cookies, the Core fixture server and the isolated PostgreSQL database.

- Changing the durable preference in one tab does not override the explicit host in
  another tab, including after refreshing both tabs.
- The final browser run refreshes the A/B tabs simultaneously and checks each host,
  current label and unchanged durable preference.
- Revoking membership in Northwind denies that tab after refresh without denying
  the independently authorized Acme tab.
- Logout in one tab causes the other tab to require login after refresh. After a
  different identity logs in, the old Acme host denies access instead of recovering
  the previous identity's workspace.
- These scenarios do not set a global active organization or call the global Mail
  repository.
- An unrelated explicit host denies URL and API context access instead of following
  the durable preference.
- A stale identity precondition is rejected before selection writes, even when the
  new identity is authorized for the proposed workspace.
- A real successful response retained at Chromium's network response stage is
  rejected after another tab logs out and signs in as a different identity. Both
  discovery and context responses are held to make this sequence deterministic;
  neither response is replaced with mock data.
- Session expiry and membership revocation are detected on revalidation without a
  manual page reload. The headless test explicitly dispatches the visibility event
  consumed by TanStack Query; `bringToFront` alone did not generate it reliably.
- Unit tests hydrate foreign-identity/foreign-host caches and cancel an old pending
  query; neither can replace the current workspace state.

Web's complete check passed: lint, formatting, typecheck, all 278 unit tests and
production build. Core's complete check passed with 163 tests, including mixed-identity concurrent
context reads through the restricted connection pool. The final workspace browser
suite passed all 21 tests with one worker, zero retries and no skips. Real onboarding
passed both desktop and mobile cases using Site, Core and this Web checkout. The
legacy browser suite passed all 10 cases with `--workers=1`.

## Implementation and integration contract

- Core derives `X-Workspace-Identity` only from the authenticated session. The
  optional request header is a consistency precondition, never authentication or
  tenant authority. Mismatch is a private 403 before discovery/selection work.
- Gateways preserve the identity response header, request correlation and approved
  trace context without copying unrelated upstream cookies.
- Successful context, discovery and selection responses must match the mounted
  identity. A live server-side session read after the body rejects responses delayed
  across logout/account changes. This reuses `getCurrentSession`, which does not
  forward upstream `Set-Cookie`, rather than using the cookie-mutating auth proxy.
- This adds one session read per successful workspace request; no periodic polling
  or cross-tab active-organization mutation was introduced. Include that cost in
  phase-6 capacity/rate-limit checks. The current Core does not enable cookie-cached
  session authority; changing that policy requires revalidating these guarantees.
- Identity changes cancel and clear this document's queries, then perform one
  same-origin document navigation with only an allowlisted Mail collection path.
  Old drafts/caches are not transferred to a different identity. Normal membership
  denial/outages stay in the existing error/retry state rather than forcing logout.
- Membership revocation is checked on new operations/revalidation. This is not a
  promise of instantaneous server-push invalidation for inactive tabs.
- Publish compatible Core before this Web slice: successful responses without
  identity binding fail closed. DTO request bodies and DS exports are unchanged.
- Privacy tests remove identity headers/fields from telemetry, including dotted
  header attributes, span key/value entries and embedded technical strings.

The Lovable reference consulted was `mailflow-ai-suite/src/components/app-sidebar.tsx`.
No visual classes or new primitives were introduced: the current DS selector and
existing loading/error patterns remain. The mock reference has no live session or
revocation counterpart, so no new visual parity is claimed for those states.

## Validation limitation discovered

The default six-worker legacy development-server suite failed during initial SSR
of authenticated routes with `(intermediate value) is not a function` and HTTP 500.
It failed both with this implementation and with the clean prior Web checkpoint
`f814e26` (phase-4 production code; phase-5 tests only). The prior checkpoint failed
four cases; this slice's isolated parallel rerun failed five. All ten cases passed
serially without retries. The root cause of concurrent development SSR startup has
not been resolved; no dependency upgrade, global serialization workaround, or test
skip was applied to conceal it. Production SSR concurrency still needs phase-6
verification. Successful serial UI checks do not certify that concurrency.

The onboarding fixture also retains the existing trusted-client-IP warning. External
Faro ingestion, real proxy trust and real deployment behavior are not certified by
local browser tests.

The development remote was fetched on 2026-10-06 and contains two new commits,
including DS 0.7.0 and avatar changes. This checkpoint remains on the phase 4 stack
with DS 0.6.0; those changes have not been rebased into this stack or validated here.

No deploy, push, DNS changes, shared production cookies, or external secrets were
changed. Phase 6, development-stack integration and real-environment rollout gates
remain outstanding. Local work can continue without a manual infrastructure change;
real domains/cookies/proxy trust/migrations/deployment require the agreed approvals.
