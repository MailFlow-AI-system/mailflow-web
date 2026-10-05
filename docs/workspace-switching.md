# Workspace switching — phase 3, local acceptance

## Stack and responsibility

Branch: `feat/workspace-switching`, based on `origin/development` (`e5c4653`),
with the unpublished foundation rebased as `6b86afa`. The latest Inbox and composer
changes from development are preserved. Core's matching branch contains the
foundation/onboarding stack plus phase 3; coordinate the contracts when reviewing.
No push or deploy was performed. Site and Design System were not changed.

The shell retains its existing DS Select styling/composition and authorized
workspace bootstrap. The local Lovable sidebar was consulted as the visual
reference; workspace transport, persistence and confirmation are product-specific.
Select, AlertDialog and Button already exist in `@mailflow/ui#v0.6.0`, so this
integration needs no new DS primitives, version or release. Types remain in type
files, transport/controller/presentation/utilities have separate responsibilities,
and UI styling uses Tailwind/DS tokens.

## Flow

1. The selector requests a listed target without marking it as active locally.
2. If the composer contains any local draft, even saved/closed/minimized content
   or attachments, a DS confirmation opens with cancel as the initial focus.
3. Cancel retains message, files, origin and preference, with no selection request.
4. Confirmation freezes composer editing while the authenticated write is pending.
5. Only after an authorized committed response is the local draft discarded and
   the browser navigated to the target subdomain. Write/revalidation errors retain
   the original draft and workspace, with an accessible retry/error state.
6. The destination performs its own context bootstrap; a stored preference is
   not membership and cannot suppress an unavailable result after revocation.

Empty composition can navigate directly. Duplicate submissions are ignored and
unmount aborts stale client requests. Collection routes `/inbox`, `/sent`,
`/drafts`, `/starred`, `/spam` and `/trash` are preserved; routes with IDs or other
features fall back to `/inbox`. Queries and fragments never cross tenant contexts.
URLs are constructed from the current permitted origin and the validated Core
summary; the browser cannot provide an actor ID or arbitrary redirect.

## Transport and temporary Inbox limitation

The BFF exposes only `POST /api/v1/workspace-selection`, bounds the body to 1024
bytes, accepts only the selector and Better Auth cookies, checks exact same-origin
submission, restricts upstream requests, rejects redirects and has a bounded fetch.
Same-site sibling subdomains are not treated as same-origin. Operational details
and upstream Set-Cookie/redirects are not relayed by selection. Responses are
private/no-store. The current workspace name remains tied to the current host.

The Inbox introduced in development is currently global. With a workspace base
configured, this Web deliberately does not mount its list or search and blocks
direct BFF listing with 503. Core independently blocks its global Mail route when
workspace mode is installed. This temporary unavailable state was explicitly
approved; tenant-aware email data/backfill is not part of Workspace Management.
The dark/legacy application retains its Inbox and existing composer behavior.

Attachment IDs use the existing randomUUID API on secure origins, with a random
bytes fallback for local HTTP subdomains where randomUUID is unavailable. These
IDs are only in-memory UI identifiers, not credentials or security tokens.

## Flags, continuity and deployment gate

`VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED=false` by default. The local browser
harness enables it only with `VITE_WORKSPACE_BASE_HOST=workspace.test`. The
corresponding Core local flag is also off by default. Core opts into HttpOnly,
SameSite=Lax cookies scoped only to this synthetic local zone after validating
local development auth origins. The harness uses real login/browser cookies, not
manual cookie copying, to demonstrate A → B continuity. Published cookie defaults
and real domains were not changed.

Do not enable this local flag on deployed applications. Confirm the real base
domains per environment, exact tenant-origin trust, DNS/TLS, environment cookie
isolation, privileged migration owner and restricted runtime grants before the
coordinated rollout. Core documents migrations `0008`/`0009` and the explicit
function EXECUTE grant; never weaken RLS or publish fixture controls.

## Reproduce validation

Use the pinned Node 24/Bun 1.4.1 toolchain and the dedicated local test DB:

```bash
MAILFLOW_CORE_WORKTREE=<core-phase-3-checkout> \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=<isolated-local-admin-url> \
bun run test:workspace-switching:e2e
```

The harness starts loopback Core 8083 and Web 3003, validates/migrates only the
isolated database, supplies known exact A/B origins, and keeps real authentication
and rate limiting enabled. Core/DB fixture controls and no-op email delivery are
identified test-only doubles; authentication, selection, cookie navigation,
PostgreSQL authorization and preference writes are real.

Run `VITE_API_BASE_URL=<api-origin> bun run check` for Web lint, formatting,
typecheck, unit tests and dark build. Run the ordinary `bun run test:e2e` suite
for legacy shell/composer/auth/telemetry regression coverage; that suite uses its
existing auth double and excludes the separate real-Core workspace harnesses.

Browser acceptance covers refresh, preference write, no global active organization,
Core/BFF Inbox denial, local cookie-zone isolation, origin rejection, live membership
loss before/after selection, cancellation without writes, saved draft and attachment
retention, explicit discard, failures, route sanitation, keyboard/mobile and Axe.
Screenshot evidence is generated in ignored `workspace-switching-test-results`.

Recorded validation: Web `bun run check` passed (52 files, 238 unit tests, dark
production build). Core `bun run check` passed (33 files, 152 tests with all real
DB integration suites enabled). Real switching E2E passed 6/6, legacy composer/
auth/telemetry E2E passed 10/10, and real Site/Core/Web onboarding regression
passed 2/2 (desktop/mobile). Desktop light/dark and mobile screenshots were
inspected; the selector retained the existing DS/shell styling. The pre-existing
auth proxy/client-IP warning remains a coordinated rollout follow-up, not hidden
by disabling rate limiting or trusting client-supplied IP headers in production.

Phase 4 still owns reading the preference at generic login/entry; phases 5–6 own
independent-tab/deep-link acceptance and the coordinated real-environment rollout.
Network failures after a server commit can leave the durable preference changed
while the browser remains on the original host. Retrying selection is idempotent;
the explicit authorized host remains authoritative, and a network timeout alone
must never be described as proof that the server rolled back.
