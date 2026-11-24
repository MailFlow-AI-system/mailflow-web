# Local workspaces

`bun run dev` selects the local profile from the actual Vite dev-server context: workspaces run
on `http://{slug}.localhost:3000` with `VITE_WORKSPACE_SWITCHING_ENABLED=true`, and the bare
`http://localhost:3000` (or any reserved host) redirects to the local Site at
`http://localhost:4321`. No hosts-file entries are needed; browsers resolve `*.localhost` to
loopback. The local profile replaces injected published API origins with `http://localhost:8080`
and preserves explicit HTTP loopback API ports. Builds, previews and Cloudflare/CI execution keep
their explicit deployment configuration. Use `MAILFLOW_LOCAL_PROFILE=false` for an intentional
remote dev-server profile. The isolated `workspace.test` zone remains supported explicitly.

Run Core with its restricted runtime role and current schema first; see its README. Its local
runner verifies those prerequisites (including the handoff functions) before enabling workspace
hosting. It never migrates the shared database.

Each host keeps its own host-only session cookie, exactly as in published environments. Sign in
at `http://{slug}.localhost:3000/login`; switching workspaces asks Core for a one-time handoff
code and opens `http://{other}.localhost:3000/auth/handoff?code=…`, which creates that host's
session. Logout only ends the current host's session.

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

The former dev-server session broker shared one server-side session across localhost hosts
because the published design shared a cookie across subdomains. With host-only cookies and the
Core handoff everywhere, local development follows the published flow and the broker was removed.
