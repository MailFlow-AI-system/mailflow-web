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
mail routes share the application shell. Inbox and Sent are enabled in the sidebar; other
folders remain disabled placeholders.

Inbox reads persisted messages through `/api/mail/messages`. Apply Core's Mail
migration and run its explicit seed for local sample data. Search runs on Core;
Web displays eight-item pages, prefetch, loading, empty, and retry states. Reader
and message actions are outside this feature. Virtualization remains future work.

## Private attachment storage

Composer keeps selected files and local images in tab memory until sending.
During delivery it requests an authenticated upload reservation from Core,
uploads directly to a short-lived private R2 URL, and waits for Core to verify
and scan the immutable file. The send request contains attachment ids and
optional inline content ids, never file bytes or storage credentials. Local
images become deduplicated CID attachments; remote image URLs remain unchanged.

Limits are 10 MB per file, 20 MB in total, and ten files per message, including
inline images (MB means 1,000,000 bytes). The existing local image picker retains
its stricter 5 MiB editing limit. Upload and verification progress appears in the
Composer status and toast. Files remain available in the draft after a failure;
rejected files must be removed or replaced. Short-lived upload URLs may require
the R2 bucket CORS policy to allow the current Web origin.

The same-origin attachment routes proxy only fixed Core paths. Core owns upload
permissions, verification, malware scanning, persistence, and authorized
retrieval. The Web Worker never reads R2 credentials or talks to the database.
No R2 secret belongs in a `VITE_*` variable. Message opening remains unavailable;
the download proxy prepares the authenticated route for a future reader.

## Listening

Attachment reservations belong to one Composer session and authenticated user.
Unchanged retries reuse clean upload ids, and a transient verification failure
retries completion without creating another object. The cache is cleared after
success or discard; account changes remount the Composer. Changed file bytes
produce a new reservation. This preserves Core's immutable delivery snapshot
and avoids a second upload identity after an uncertain send result. There is no
global upload cache or browser persistence of file bytes and signed URLs.

Upload URL expiry and the 24-hour unattached-file lifetime are separate. Before
any send attempt, Core-confirmed expired or missing uploads can be replaced
from the files still held in memory. After a send attempt, retries preserve the
original attachment and message ids even if the outcome is uncertain. Associated
clean files remain usable after that lifetime; missing or expired references
require checking Sent before attempting a different delivery. This avoids
replacing an attachment while an earlier send may still be committing.
