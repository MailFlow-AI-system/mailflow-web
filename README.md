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
Keep both on `localhost` for authentication. Configuration is documented in
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