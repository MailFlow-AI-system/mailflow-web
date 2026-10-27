# MailFlow Web

MailFlow frontend built with React, TypeScript, TanStack Start, TanStack Query,
Nuqs, and Tailwind. Deployed to Cloudflare Workers with Static Assets.

## Local development

Requires Bun 1.4.1, Infisical CLI, and access to the `MailFlow-AI` project.

```bash
bun install --frozen-lockfile
infisical login
infisical init
bun run dev
```

Development commands load Infisical `dev` secrets from `/mailflow-web`.
Web runs at `http://localhost:3000` and requires Core at `http://localhost:8080`.
For the workspace inbox, follow the local setup below. Configuration is documented in
[.env.example](.env.example); the app does not load `.env` files.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run check` | Lint, formatting, types, tests, and build |
| `bun run test` | Run Vitest |
| `bun run test:e2e` | Run browser smoke tests |
| `bun run build:development` | Build with Infisical `dev` values |
| `bun run build:staging` / `bun run build:production` | Build for other environments |
| `bun run preview` | Preview the Worker build |
| `bun run deploy:<environment>` | Manually deploy through Wrangler |

Browser smoke tests use test-only values and install Chromium with
`bunx playwright install --with-deps chromium`. Deployment environments are
`development`, `staging`, and `production`; Infisical uses `dev`, `staging`, and `prod`.

## Structure and conventions

- `src/features/`: feature-owned components, hooks, clients, adapters, and tests.
- `src/routes/`: file-based public and authenticated routes.
- `src/config/`, `src/i18n/`, `src/observability/`: shared application configuration.

TanStack Query owns server state; Nuqs owns query parameters, using shared
parsers and the root TanStack Router adapter. React state handles local UI.
Use Tailwind and shared `@mailflow/ui` components and tokens, currently `v0.7.0`.
The Nuqs adapter is experimental: verify SSR, hydration, and navigation on upgrades.

Server adapters forward requests to Core and must not access the database or
implement business rules. `VITE_*` values are public build-time configuration;
never put secrets in them.

## Application

`/` redirects to `/inbox` or `/login` based on the session. Authentication uses
the same-origin `/api/auth/*` proxy; registration remains on Site. Protected
mail routes share the application shell. Inbox is enabled in the sidebar; other
folders remain disabled placeholders.

Inbox reads persisted messages through `/api/mail/messages`. Apply Core's Mail
migration and run its explicit seed for local sample data. Search runs on Core;
Web displays eight-item pages, prefetch, loading, empty, and retry states. Reader
and message actions are outside this feature. Virtualization remains future work.

## Local workspace setup

First follow the Core's Local workspace setup: start its disposable Postgres, apply migrations,
run `bun run db:setup:local` and `bun run dev:workspace-sample`, then seed mail with the printed workspace ID.
Set `VITE_API_BASE_URL=http://localhost:8080`, `VITE_WORKSPACE_BASE_HOST=workspace.test`
and `VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED=true`. Start with
`bunx vite dev --port 3000 --host 0.0.0.0` using those environment variables.
Add `127.0.0.1 workspace.test <printed-slug>.workspace.test` to hosts; use Windows hosts when the browser runs on Windows and the app on WSL.
Open the printed tenant host and sign in with the sample credentials. The generic host resolves membership and redirects; an inbox requires a tenant host.
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
