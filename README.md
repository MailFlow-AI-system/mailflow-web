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

The application is available at `http://localhost:3000`. Keep `localhost` for
the site (`:4321`) and Core API (`:8080`) during authentication testing; the
Better Auth cookie is host-scoped and shared across these ports.

## Commands

```bash
bun run dev           # Start the local development server with Infisical
bun run build         # Create the Cloudflare production build
bun run build:development # Build with Infisical `dev` env injected
bun run build:local   # Alias for build:development
bun run build:staging # Build with Infisical `staging` env injected
bun run build:production # Build with Infisical `prod` env injected
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

`deploy` is available for manual Cloudflare deployment, but CI/CD automation is
intentionally outside this initialization task. Wrangler uses your authenticated
Cloudflare account for manual deployments and prompts for an account when needed.

## Architecture boundaries

- Public pages can use SSR or prerendering.
- The authenticated application is expected to be client-heavy.
- TanStack Query owns backend server state and its cache.
- URL-visible navigation and filter state belongs in router search parameters.
- React state is the default for simple local component state.
- Shared sidebar open and collapsed state lives in `@mailflow/ui`'s `SidebarProvider`.
- Server functions are presentation-edge adapters only: session bootstrap,
  backend API calls, locale, CSP, and correlation concerns. They must not contain
  domain rules or access PostgreSQL or R2 directly.
- UI and persisted application content start in English. Locale configuration is
  centralized in `src/i18n`, and timestamps are formatted in the user's timezone.

Tiptap is used by the Email Composer for client-side rich-text editing.
Other features should adopt it through their own feature boundaries.

## Project structure

```text
e2e/                    Playwright browser tests
src/features/auth/       Login, logout, and session adapters, schemas, and types
src/features/app-shell/ Application shell: sidebar, header, and content layout
src/features/mail-list/ Inbox message cards, search, paging, and API adapter
src/config/             Validated client configuration
src/i18n/               Locale and timezone primitives
src/routes/             TanStack Router file-based routes
src/routes/_public/     Public page layout and routes
src/routes/_authenticated/  Session-guarded pathless layout
src/routes/_authenticated/_mail/  Mail navigation layout and routes
src/test/               Shared test setup
```

## Routing

TanStack Router generates the route tree from `src/routes/`. Leading `_` segments
define pathless layouts: `_public` provides the public page shell,
`_authenticated` checks the session, and its nested `_mail` layout renders the
application shell. Neither layout name appears in the browser URL.

- `/` checks the session and redirects to `/inbox` or `/login`.
- `/login` and `/forgot-password` are public. An authenticated visit to `/login`
  redirects to `/inbox`.
- `/inbox`, `/sent`, `/drafts`, `/starred`, `/spam`, and `/trash` require a session.
  The sidebar enables Inbox; other folders remain disabled until their features
  are implemented. Direct mailbox URLs still render their placeholders.
- Unknown paths render the global 404 page. `/app` is no longer a route.

Inbox renders a paged message list. Other mailbox routes remain folder
placeholders; reader and message actions are not included. The authentication
proxy at `/api/auth/*` is a server route outside the page layouts. Session lookup
errors remain errors rather than being treated as signed-out sessions.

Inbox search debounces input for 300 ms and stores the normalized term in the
URL through Nuqs. Core searches sender names, subjects, and complete message
bodies across the dataset. The first result page starts warming alongside route session
validation and shares its cursor cache with the displayed infinite query.
The route guard still validates the session before committing navigation.

The message scroll region stays mounted while the filter changes. Eight
decorative skeleton rows cover initial loading and pending searches; loading
another page appends skeletons below existing messages. Background refreshes
and next-page prefetches keep existing cards visible. Empty and retry states
appear only after the current search finishes.

## Design system

The authenticated mail layout renders `AppShell` from `src/features/app-shell`.
That slice composes `@mailflow/ui` for the sidebar, header, and icons, and the
document root stays on the dark theme. Mail folder links live in the sidebar.
Entries without a route stay visible and disabled. Authentication stays in the
route layer; logout is passed into the shell as the user menu.

## Frontend stack validation

The initialization validates the preferred framework path described by the
MailFlow architecture:

- the official TanStack Start Cloudflare adapter builds for Workers;
- the generated Worker uses `@tanstack/react-start/server-entry`;
- static assets are emitted alongside the server bundle;
- the root route redirects according to the server-checked session;
- client navigation hydrates and opens the mail layout;
- TanStack Query uses the official Router SSR integration with a request-local
  `QueryClient`.

Query parameter state uses Nuqs with its TanStack Router adapter at the root
outlet. New query parameters should use shared Nuqs parsers for URL state and
route validation; TanStack Router continues to own navigation and session
guards. Inbox search and password reset tokens follow this convention.
Router query parsing preserves URL values as strings, so terms such as `123`
and `false` remain literal search text. Nuqs parsers own typed conversion.

If future deployment evidence invalidates this path, the approved fallback is
React Router with Vite. That fallback is not active in this repository.

## Environment

Infisical injects environment variables before a process starts. Application
code does not use the Infisical SDK or load `.env` files.

`VITE_API_BASE_URL` is the required Core API origin, without a path. It is
validated with T3 Env when the router boots and during production builds. Local
development uses `http://localhost:8080` from the `/mailflow-web` Infisical
path. The Web server uses this origin to read the current session during SSR.
The browser Better Auth client uses the Web origin, and the Web Worker forwards
authentication requests to Core. Protected pages use
`Cache-Control: private, no-store`.

The Web auth proxy supports email sign-in, session lookup, and sign-out only.
It forwards only Better Auth cookies and required auth and trace headers,
normalizes the `Referer` to its origin, streams request and response bodies,
preserves redirects and all `Set-Cookie` headers, and disables caching.
Registration remains on Site and is not available through the Web proxy. Site
redirects new users to Web login after registration.

Core's host-only session cookie reaches the browser on the Web origin through
the proxy, so Web SSR can forward that cookie to Core even when Core runs on
Railway and Web runs on a separate `workers.dev` host. No shared cookie domain
is required. Site registration calls Core directly and does not rely on that
response's cookie; users sign in on Web to establish a Web-scoped session.

Only variables prefixed with `VITE_` are exposed to browser code. Never place
secrets in them.

The inbox uses the same-origin `GET /api/mail/messages` route so host-only
Better Auth cookies reach Core. The adapter forwards only Better Auth cookies,
trace context, normalized `q`, and the optional cursor to the fixed Core endpoint
`GET /api/v1/mail/messages`; responses use `Cache-Control: private, no-store`.

Core returns up to eight `{ id, senderName, subject, body, receivedAt }` items
and a `nextCursor`. Search is literal, case-insensitive, and spans all stored
messages. The browser keeps the displayed pages in a TanStack Query infinite
query keyed by user and normalized search. It warms one next-cursor page in the
same per-page cache; that page appears only when scrolling or the accessible
load-more control advances the list. An underfilled list observes its own scroll
root and continues until it fills or reaches the end. Message cards show sender
initials, sender name, subject, and a one-line plain-text body preview. They do
not render the body as HTML.

Vite does not load `.env` files (`envDir: false`). Build validation reads
`process.env` — the same process Infisical injects into. `.env.example`
documents the contract only.

Playwright starts a local Vite server with test-only public values, so `test:e2e`
does not need Infisical. The manual `dev` command still uses Infisical. `lint`,
`test`, and `typecheck` do not need it either.

Environment-specific builds inject `/mailflow-web` before `vite build`. The
Infisical environment slugs intentionally differ from the Cloudflare environment
names: `dev` maps to Cloudflare `development`, `staging` maps to `staging`, and
`prod` maps to Cloudflare `production`.

Local production-like build (`VITE_*` from Infisical `dev`):

```bash
bun run build:local
```

## Listening

- Browser sign-in, session lookup, and sign-out use a same-origin Web proxy;
  Core remains the only session authority and database store.
- Inbox messages use a narrow same-origin adapter because Core's session cookie
  is host-only. Search text stays in the URL; list pages and warm data stay in
  TanStack Query. The adapter accepts only the messages route and a fixed Core
  destination.
- The inbox warms one cursor ahead and appends that page only when the list
  advances. It keeps the current page set without virtualization or a cache
  window; revisit that choice if measured mailbox size makes rendering costly.
- Search warms the first page in parallel with session validation to avoid
  serial request latency. It does not bypass the route guard. Loading feedback
  follows displayed-result requests rather than background prefetch activity,
  and filter changes reset scroll without remounting the list.
- Nuqs is the query parameter standard. Its official TanStack Router adapter
  is experimental and does not declare TanStack Start support; server rendering,
  hydration, query reloads, and guarded navigation must stay covered when it is
  updated. The adapter uses Router navigation instead of replacing session guards.
- Message body previews remain plain text and use frontend truncation. Core owns
  search matching and paging; the Web layer does not add mailbox filters or
  message metadata.
- `@mailflow/ui` remains pinned at `v0.6.0`; these inbox components use its
  existing controls and tokens without changing the shared design system.
- Site registration stays on Site and redirects users to Web login. The Web
  proxy rejects registration and every unsupported Better Auth path.
- Password recovery renders an unavailable state until email delivery exists;
  submitting a request without a backend would mislead users.
