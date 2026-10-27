# Local workspaces

`bun run dev` selects the local profile from the actual Vite dev-server context.
Open `http://localhost:3000`; membership and the saved preference select the destination.
An explicit address such as `http://luis-felipe.localhost:3000` always keeps that workspace.
No hosts-file entries are needed. `VITE_API_BASE_URL` remains the Core origin.
Injected published Web hosts are replaced only in the local dev-server profile.
Builds, previews and Cloudflare/CI execution keep their explicit deployment configuration.
Use `MAILFLOW_LOCAL_PROFILE=false` for an intentional remote dev-server profile.
The isolated `workspace.test` fixtures remain supported explicitly.

Run Core with its restricted runtime role and current schema first; see its README.
Its local runner verifies those prerequisites before enabling workspace reads and switching.
It never migrates the shared database. Owner/BYPASSRLS credentials cannot serve workspace data.

Browsers do not share a `Domain=localhost` cookie with sibling localhost hosts.
The local Vite middleware therefore keeps the real Better Auth token in server memory.
Each host receives a host-only HttpOnly browser binding through a 30-second, single-use
handoff with a destination challenge and source-browser verification. Login/logout update
the shared server session while workspace authority stays host-specific in Core.
Tokens never enter handoff URLs or browser JavaScript. Restarting Vite requires signing in again.
The middleware is absent from build and preview, and localhost workspace builds are rejected.

## Browser acceptance

Use a disposable PostgreSQL database; the harness applies migrations and creates restricted roles:

```bash
MAILFLOW_CORE_WORKTREE=../mailflow-core \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=postgresql://mailflow:mailflow@localhost:5432/mailflow \
bun run test:e2e
```

The suite uses localhost tenants, real Core authentication and database authorization,
with a controlled email provider. CI pins the compatible Core harness in `.github/workflows/ci.yml`.
Screenshots and traces are retained on failure. A separate Vite cache avoids interfering
with a developer's existing server.

## Listening

A shared localhost domain cookie was rejected after a real Chromium check showed it was
host-only. The dev-server session broker preserves shared identity and independent workspace
contexts across tabs without weakening published cookie or origin policies. Public environments
continue using their isolated HTTPS Web domains; enable their switching flags only after the
backend migration/role rollout and tenant upload CORS have been verified.
