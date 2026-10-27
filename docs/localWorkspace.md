# Local workspace setup

First follow the Core's Local workspace setup: start its disposable Postgres, apply migrations,
run `bun run db:setup:local` and `bun run dev:workspace-sample`, then seed mail with the printed workspace ID.
Set `VITE_API_BASE_URL=http://localhost:8080`, `VITE_WORKSPACE_BASE_HOST=workspace.test`
and `VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED=true`. Start with
`bunx vite dev --port 3000 --host 0.0.0.0` using those environment variables.
Add `127.0.0.1 workspace.test <printed-slug>.workspace.test` to hosts; use Windows hosts when the browser runs on Windows and the app on WSL.
Open the printed tenant host and sign in with the sample credentials. Use HTTPS for real attachment uploads on custom tenant hosts, because browser file hashing requires a secure context; plain `localhost` is also trusted. See [Chromium secure-context guidance](https://www.chromium.org/Home/chromium-security/deprecating-powerful-features-on-insecure-origins/). The generic host resolves membership and redirects; an inbox requires a tenant host.
Core needs `APP_ENV=development`, `WORKSPACE_READ_ENABLED=true`, `WORKSPACE_LOCAL_SWITCHING_ENABLED=true`,
`SITE_URL=http://workspace.test:3000` and `WEB_APP_URL=http://<printed-slug>.workspace.test:3000`.

Real-Core browser acceptance uses no auth stub:

```bash
MAILFLOW_CORE_WORKTREE=../mailflow-core \
MAILFLOW_WORKSPACE_TEST_DATABASE_URL=postgresql://mailflow:mailflow@localhost:5432/mailflow \
bun run test:e2e
```

The harness creates isolated sample memberships and seeded inboxes, resolves `workspace.test` in Chromium,
and retains traces and screenshots for failures in `test-results/`. HTML results are in `playwright-report/`.

CI runs the same browser suite against a pinned compatible revision of the public Core repository,
with a disposable PostgreSQL service. The workflow checks out `web/` and `core/` side by side,
installs both dependency trees and supplies the two harness environment variables.
When adopting a newer Core harness, update its pinned SHA in `.github/workflows/ci.yml` deliberately.
The harness applies migrations and creates its restricted role; no deployed API, shared database,
or Infisical credentials are used by this job. Browser reports and traces are uploaded as a CI artifact.
