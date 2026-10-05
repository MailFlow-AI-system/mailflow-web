# Workspace resumption — phase 4

## Scope and stack

Branch: `feat/workspace-resumption`, stacked on phase 3 (`b7cfcb8`). Development
(`e5c4653`) was fetched/rechecked; unpublished foundation/selection commits remain
dependencies. Core has the matching branch, including its onboarding dependency.
The original dirty checkouts were preserved. No push, PR, deploy or external
configuration change was performed. Site and Design System are unchanged.

This slice implements generic entry/login resumption, not a second selector or
preference writer. The active workspace always comes from the authorized host.
Explicit A continues to win even if the durable preference is B. Entry fallback
does not overwrite a preference or manufacture membership.

## Bootstrap and recovery

After authentication, the route resolves generic entry on the server **before**
mounting the workspace provider, shell or composer. A validated Core preference
or fallback produces a full-document redirect to its workspace host. The target
then resolves live membership itself. Explicit hosts do not call entry resolution.

Empty and operational-error outcomes do not mount tenant content or a composer.
An empty account is instructed to contact its workspace administrator; both
states retain a composed sign-out action. Operational failures offer retry.
Retry/account interactions are disabled or inert until hydration, avoiding a
clickable SSR control that loses the first action.

The BFF exposes only authenticated `GET /api/v1/workspace-entry` on the configured
generic host. It forwards only Better Auth cookies and permitted tracing headers,
uses a bounded/no-store/manual-redirect fetch, validates the discriminated DTO,
retains request-ID/Retry-After metadata, and sanitizes failures. It never relays
upstream redirect URLs, cookies or operational details. Query selectors, sibling
tenant entry calls and other environments are denied.

## Safe navigation and identity lifecycle

Destinations are constructed locally from the permitted origin and validated
summary. Only `/inbox`, `/sent`, `/drafts`, `/starred`, `/spam` and `/trash` survive;
other paths fall back to Inbox. Queries, arbitrary redirects and message selectors
are removed. HTTP redirect locations include an explicit **empty fragment** (`#`)
so browsers cannot inherit a private fragment from the source URL. A trailing
empty `#` may remain in the address; it contains no selector or token.

Expired sessions go to the same origin's login, retaining only a validated
collection via `returnTo`. Login never accepts an arbitrary host or URL. After
successful login/logout, pending queries are cancelled and identity caches are
cleared. Workspace-mode login/logout starts a fresh document instead of racing route
invalidation against another navigation. A failed sign-out retains the current
session and content. Legacy navigation behavior is retained.

## UI and architecture

Skills used: execution, clean code/SOLID and MailFlow Lovable UI reference.
Consulted the read-only Lovable `src/components/app-sidebar.tsx`: its compact
workspace rows, avatar, typography and tokens remain the selector reference.
Lovable does not define live-membership/entry failure screens; recovery reuses
the existing Web workspace-boundary presentation, login sizing and DS Button.
No claim is made that these product-specific states have a matching Lovable page.

No new DS primitive is needed; `@mailflow/ui#v0.6.0` remains pinned. Presentation,
server transport, bootstrap, destination utilities and identity lifecycle stay
separate, with types in dedicated files. The account-action slot preserves
composition. Tailwind/tokens and the existing sidebar/header/composer styling
remain unchanged. Global Mail listing/search stay blocked in workspace mode.

## Validation and reproduction

`bun run check` passed: lint, formatting, typecheck, **266 tests** (55 files),
and production build. The corresponding Core check passed with **161 tests**.
Final workspace browser run passed **13/13** (seven resumption scenarios plus
the six selection/composer scenarios). Legacy composer/auth/telemetry regression
passed **10/10** and real Site/Core/Web onboarding passed **2/2**, desktop/mobile.
Dark/light desktop and mobile empty-state screenshots were inspected; there is
no horizontal overflow, and axe found no violations in the empty-state section.

Validation exposed HTTP fragment inheritance, a clickable pre-hydration retry
and competing auth invalidation/navigation. Explicit empty fragments, hydrated
controls and one full-document auth transition address those paths. No automatic
test retries or database skips were used to declare the final run successful.
Run browser configurations sequentially when they use this same checkout with
different environment settings; isolate checkouts/caches before parallelizing.
The pre-existing onboarding trusted-IP warning remains a rollout follow-up.
Legacy telemetry fixture warnings do not certify external Faro ingestion.

With Node 24/Bun 1.4.1 and the dedicated PostgreSQL fixture available:

```bash
MAILFLOW_CORE_WORKTREE=/home/p4van772000/mentoria/mailflow-core-onboarding \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=<dedicated-local-admin-url> \
bun run test:workspace-switching:e2e

E2E_PORT=3005 bun run test:e2e
```

The switching suite now includes generic fallback, B selection/refresh/logout/
generic login, explicit A precedence, revocation, empty account, operational
retry, another real identity, expired session and pre-auth discovery. It retains
phase-3 keyboard/mobile, cookie isolation, global-Mail denial and composer
draft/attachment tests. Fixtures use real Core/Better Auth/PostgreSQL, not auth
doubles. Empty-state dark/light/mobile screenshots and axe evidence are generated
in the ignored `workspace-switching-test-results` directory.

Real Site/Core/Web onboarding regression uses the existing Site worktree command
and MAILFLOW_ONBOARDING_CORE_DIR / MAILFLOW_ONBOARDING_WEB_DIR plus the dedicated
database variable. No real Resend delivery occurs in browser fixtures.

## Pending gates

No developer action is required to continue local phase 5 with Docker available.
Production topology, DNS/TLS/Workers routes, trusted origins/proxy IP chain,
environment cookie isolation and coordinated migration/rollout approvals remain
manual gates. The local-only flag stays false by default; do not activate it on
real deployments. Phases 5/6 and real-environment evidence remain required before
declaring the entire Workspace Management feature ready for release.
