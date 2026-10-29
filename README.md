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

[Local workspace and browser QA](docs/localWorkspace.md)

## Message reader

Inbox and Sent open persisted message details with the `message` search parameter while
preserving the list and search state. Mobile reading replaces the list and provides a back
control. The reader displays available metadata, plain text or sanitized HTML, private CID
images, and authenticated attachment downloads. Unavailable message, AI, filter, and scheduling
actions display the same warning notification through the Design System. Navigation entries
without implemented pages remain disabled; Inbox and Sent remain active.

Inbox checkboxes select messages independently of the message open in the reader. On touch
layouts, return to the list to use Select or hold a row to enter selection mode. Tapping a
row while selecting toggles its checkbox; an ordinary tap outside selection mode opens it.

## Listening

Email HTML retains its styles and table layout inside a scriptless sandboxed iframe with
DOMPurify and a restrictive content security policy. Rendering it directly in the application
would let email CSS affect the surrounding layout. Plain text uses escaped, clickable HTTP
links in the application theme. Query data is scoped by identity, workspace, folder, and message
so account or workspace transitions cannot display another scope's cached content.

Inbox and Sent select the first available message once after the list settles. Automatic
selection replaces the URL history entry, while explicit message links take precedence.
Returning to the list keeps the reader closed until another message is chosen, so mobile
users can browse without the initial selection immediately reopening the reader. Page
scrollbars use the existing border color with a thin thumb and a transparent track.

Unavailable actions use a shared Sonner warning with a stable identifier, so repeated clicks
reuse one notification. Only action placeholders are enabled; loading, validation, and
in-flight restrictions on implemented actions remain enforced. The warning does not promise
a release date or execute the unavailable operation.

Reader activity and bulk selection have separate state. Checkbox and long-press gestures
never navigate to a message, while opening a message preserves the selected set. The
selection provider remains mounted during search and reader navigation and resets when
the workspace or identity changes. This preserves both features without nested interactive
controls or treating the currently open message as selected for bulk actions.
