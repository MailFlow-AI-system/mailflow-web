# MailFlow Web

Frontend application for MailFlow. The project follows the approved frontend
architecture: React and TypeScript on TanStack Start, deployed to Cloudflare
Workers with Static Assets.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The application is available at `http://localhost:3000`.

## Commands

```bash
npm run dev          # Start the local development server
npm run build        # Create the Cloudflare production build
npm run preview      # Preview the Worker build locally
npm run typecheck    # Validate TypeScript
npm run lint         # Run ESLint
npm run check        # Check formatting
npm run test         # Run unit and component tests
npm run test:e2e     # Run the Playwright browser smoke test
npm run cf-typegen   # Generate types for Cloudflare bindings
```

Before running the browser test for the first time, install its local browser and
Linux dependencies with `npx playwright install --with-deps chromium`.

`deploy` is available for manual Cloudflare deployment, but CI/CD automation is
intentionally outside this initialization task.

## Architecture boundaries

- Public pages can use SSR or prerendering.
- The authenticated application is expected to be client-heavy.
- TanStack Query owns backend server state and its cache.
- URL-visible navigation and filter state belongs in router search parameters.
- React state is the default for simple local component state.
- Server functions are presentation-edge adapters only: session bootstrap,
  backend API calls, locale, CSP, and correlation concerns. They must not contain
  domain rules or access PostgreSQL or R2 directly.
- UI and persisted application content start in English. Locale configuration is
  centralized in `src/i18n`, and timestamps are formatted in the user's timezone.

Jotai and Tiptap are approved for future complex editor state and rich-text
features, respectively. They are deliberately deferred until a feature needs
them.

## Project structure

```text
e2e/                    Playwright browser tests
src/components/ui/      shadcn/ui components backed by Base UI
src/config/             Validated client configuration
src/i18n/               Locale and timezone primitives
src/lib/                Shared application adapters
src/routes/             TanStack Router file-based routes
src/test/               Test setup and MSW network mocks
```

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

`VITE_API_BASE_URL` is the public base URL for the MailFlow backend. It defaults
to `/api`.

Only variables prefixed with `VITE_` are exposed to browser code. Never place
secrets in them.
