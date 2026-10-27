# MailFlow Web

React/TypeScript frontend with TanStack Start, TanStack Query and Tailwind.
Deployed to Cloudflare Workers with Static Assets.

## Development

Requires Bun 1.4.1, Infisical CLI and the Core API.

```bash
bun install --frozen-lockfile
infisical login
infisical init
bun run dev
```

Infisical project: `MailFlow-AI`, environment `dev`, path `/mailflow-web`.
Web: `http://localhost:3000` (strict port); Core: `http://localhost:8080`.
Use `localhost` for both. Configuration: [.env.example](.env.example).

## Commands

- `bun run check`: lint, formatting, types, tests and build.
- `bun run test:e2e`: browser tests; install Chromium first.
- `bun run build:<environment>` / `bun run deploy:<environment>`: build or deploy.

Environment suffixes: `development`, `staging`, `production`.
`VITE_*` values are public. Core owns business rules, workspace authorization and storage credentials.
