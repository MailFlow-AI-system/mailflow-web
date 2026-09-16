# MailFlow Web

Frontend application for MailFlow. The project follows the approved frontend
architecture: React and TypeScript on TanStack Start, deployed to Cloudflare
Workers with Static Assets.

## Requirements

- Bun 1.4.1
- Infisical CLI
- Access to the `MailFlow-AI` project in Infisical

## Local development

```bash
bun install --frozen-lockfile
infisical login
infisical init
bun run dev
```

Select `MailFlow-AI` when prompted. Development commands read the `dev` environment and `/mailflow-web` secret path. `.infisical.json` contains project-link metadata, never secret values, and should be committed.

The application is available at `http://127.0.0.1:3000`.

## Commands

```bash
bun run dev           # Start the local development server with Infisical
bun run build         # Create the Cloudflare production build
bun run build:local   # Same build, with Infisical `dev` env injected
bun run preview       # Preview the Worker build locally
bun run typecheck     # Validate TypeScript
bun run lint          # Run Biome checks
bun run lint:fix      # Apply safe Biome fixes
bun run format        # Format the codebase with Biome
bun run check         # Run all validation checks
bun run test          # Run unit and component tests
bun run test:e2e      # Run the Playwright browser smoke test
bun run cf-typegen    # Generate types for Cloudflare bindings
```

Before running the browser test for the first time, install its local browser and
Linux dependencies with `bunx playwright install --with-deps chromium`.

`test:e2e` starts Vite directly so it does not require Infisical. CI uses port
3000. Override the port when another local service already uses it:

```bash
E2E_PORT=3001 bun run test:e2e
```

`deploy` is available for manual Cloudflare deployment, but CI/CD automation is
intentionally outside this initialization task.

## Architecture boundaries

- Public pages can use SSR or prerendering.
- The authenticated application is expected to be client-heavy.
- TanStack Query owns backend server state and its cache.
- URL-visible navigation and filter state belongs in router search parameters.
- React state is the default for simple local component state.
- Zustand is available for shared client-only state that does not belong in the URL
  or TanStack Query.
- Server functions are presentation-edge adapters only: session bootstrap,
  backend API calls, locale, CSP, and correlation concerns. They must not contain
  domain rules or access PostgreSQL or R2 directly.
- UI and persisted application content start in English. Locale configuration is
  centralized in `src/i18n`, and timestamps are formatted in the user's timezone.

Tiptap is approved for future rich-text features and is deliberately deferred
until a feature needs it.

## Project structure

```text
e2e/                    Playwright browser tests
src/config/             Validated client configuration
src/i18n/               Locale and timezone primitives
src/routes/             TanStack Router file-based routes
src/test/               Shared test setup
```

## Shared design system

The application consumes `@mailflow/ui` from the coordinated design-system commit
[`710545185e63c125ee634d3d557ec816851f81ca`](https://github.com/MailFlow-AI-system/mailflow-design-system/pull/1):

```sh
bun add '@mailflow/ui@git+https://github.com/MailFlow-AI-system/mailflow-design-system.git#710545185e63c125ee634d3d557ec816851f81ca'
```

The host imports Tailwind once and then the shared stylesheet from
`@mailflow/ui/styles.css`. Shared Button, icon, token, font, and theme
implementations stay in the package; page layouts and product behavior stay in
this repository. Vite compiles the package source for SSR through
`ssr.noExternal`.

The document applies the stored preference before first paint, defaults to dark, and wraps the route tree
with `ThemeProvider`. Users can select light, dark, or system preference from
the foundation page. The selection is persisted per origin under
`mailflow-theme`. The distributed font and component notices are available at
`/third-party-notices.txt`.

## Frontend stack validation

The initialization validates the preferred framework path described by the
MailFlow architecture:

- the official TanStack Start Cloudflare adapter builds for Workers;
- the generated Worker uses `@tanstack/react-start/server-entry`;
- static assets are emitted alongside the server bundle;
- the root public route is server-rendered;
- client navigation hydrates and opens the application shell;
- TanStack Query uses the official Router SSR integration with a request-local
  `QueryClient`.

If future deployment evidence invalidates this path, the approved fallback is
React Router with Vite. That fallback is not active in this repository.

## Environment

Infisical injects environment variables before a process starts. Application
code does not use the Infisical SDK or load `.env` files.

`VITE_API_BASE_URL` is the public base URL for the MailFlow backend. It defaults
to `/api` when unset and is validated with T3 Env when the router boots and
during production builds. Local development uses `http://localhost:8080` from
the `/mailflow-web` Infisical path.

Only variables prefixed with `VITE_` are exposed to browser code. Never place
secrets in them.

Vite does not load `.env` files (`envDir: false`). Build validation reads
`process.env` — the same process Infisical injects into. `.env.example`
documents the contract only.

Playwright starts the app with direct Vite, so `test:e2e` does not need the
Infisical CLI. `lint`, `test`, and `typecheck` do not.

Local production-like builds (`VITE_*` from Infisical `dev`):

```bash
bun run build:local
```

## Listening

This repository keeps application layouts, routing, environment validation, and
Infisical wrappers local while consuming shared UI through a full Git SHA. The
theme bootstrap is inline because it must run before first paint; its source is
package-owned. E2E defaults to port 3000 and accepts an `E2E_PORT` override; local
validation used 3001 to preserve an unrelated service.

After the design-system pull request merges, update the dependency pin to its accepted
`development` commit before merging this consumer pull request.
