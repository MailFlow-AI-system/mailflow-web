# Workspace domains

Cloudflare account: `4b2ab2e9aea9bd23a79bc01a05b7c540`.
Zone: `mailflow-ai.online` (`f39c6b40f4a60a4283ad60186d7ebb76`).

Every workspace lives only on `{slug}.{host base}`. There is no shared entry host: login, logout
and every screen run on the workspace host itself.

| Environment | Landing (mailflow-site) | Workspaces (mailflow-web) | Core origin | Worker |
| --- | --- | --- | --- | --- |
| production | `mailflow-ai.online` | `{slug}.mailflow-ai.online` | `https://api.mailflow-ai.online` | `mailflow-web` |
| staging | `site-staging.mailflow-ai.online` | `{slug}.staging.mailflow-ai.online` | `https://api-staging.mailflow-ai.online` | `mailflow-web-staging` |
| development | `site-dev.mailflow-ai.online` | `{slug}.dev.mailflow-ai.online` | `https://api-dev.mailflow-ai.online` | `mailflow-web-development` |

Hosts served by a Web Worker that are not a workspace (the bare `dev.`/`staging.` base, the
retired `app`, `app-dev` and `app-staging` entry hosts, and reserved names such as `www`) answer
`302` to that environment's landing. Reserved slugs are kept in sync with Core's
`RESERVED_WORKSPACE_SLUGS`.

## Sessions and switching

- The browser only talks to its own workspace host. The Worker proxies `/api/auth/*` and the
  workspace APIs to Core, so the session cookie Core sets is host-only (no `Domain`).
- After login the Web checks membership of the host's workspace through Core. A non-member is
  signed out and told the account cannot open this workspace; Core answers unknown and
  unauthorized workspaces identically, so the message never reveals whether a workspace exists.
- Switching calls Core's `POST /api/auth/workspace-handoff/issue` and navigates to the returned
  `https://{slug}.{host base}/auth/handoff?code=…`. That route posts the code to Core with its
  own origin, relays the new host-only session cookie and redirects to `/inbox`. An invalid,
  used or expired code (60 seconds, single use) goes to `/login?handoff=expired`.

## Routing

Cloudflare rules that drive `wrangler.jsonc`, from the Workers routing documentation:

- When several route patterns match, **the most specific pattern wins**
  (`www.example.com/*` beats `*.example.com/*`).
- `*.example.com/*` matches every subdomain at any depth, so the production wildcard also matches
  `acme.dev.mailflow-ai.online`, `site-dev.mailflow-ai.online` and `api.mailflow-ai.online`.
- **Routes take precedence over Custom Domains on the same hostname** (a route may `fetch()` the
  Custom Domain). The common assumption that Custom Domains win is not what the documentation
  says, so a Custom Domain alone does not protect a host from the production wildcard.
- A route without a Worker negates less specific patterns. Wrangler cannot declare one; it is
  created in the dashboard or API.
- Routes only run on proxied (orange-cloud) DNS records.

Resulting configuration:

| Worker | Custom Domains | Routes |
| --- | --- | --- |
| `mailflow-web` | `app.mailflow-ai.online` | `*.mailflow-ai.online/*` |
| `mailflow-web-staging` | `staging.mailflow-ai.online`, `app-staging.mailflow-ai.online` | `staging.mailflow-ai.online/*`, `*.staging.mailflow-ai.online/*`, `app-staging.mailflow-ai.online/*` |
| `mailflow-web-development` | `dev.mailflow-ai.online`, `app-dev.mailflow-ai.online` | `dev.mailflow-ai.online/*`, `*.dev.mailflow-ai.online/*`, `app-dev.mailflow-ai.online/*` |

The explicit `dev.`/`staging.`/`app-dev.`/`app-staging.` routes are more specific than the
production wildcard, so those hosts stay on their own environment instead of being redirected to
the production landing. Custom Domains are kept for DNS records and certificates.

Hosts that must not reach any Web Worker need an infrastructure action (not in this repository):

| Host | Required when proxied | Reason |
| --- | --- | --- |
| `www.mailflow-ai.online` | Route without a Worker, or a route to its own Worker | Otherwise the production Web Worker redirects it to the landing (harmless, but not owned by Web). |
| `api.mailflow-ai.online`, `api-staging.…`, `api-dev.…` | Route without a Worker, or keep the record DNS-only | Otherwise Core traffic is captured by the production Web Worker. |
| `site-staging.mailflow-ai.online`, `site-dev.mailflow-ai.online` | Route to the matching Site Worker (`site-staging.mailflow-ai.online/*`) | Their Custom Domains lose to the production wildcard route. |
| `mailflow-ai.online` | None | `*.mailflow-ai.online/*` does not match the apex. |

TLS: Universal SSL covers `mailflow-ai.online` and `*.mailflow-ai.online` only. Workspaces on
`*.staging.mailflow-ai.online` and `*.dev.mailflow-ai.online` need certificates for those
second-level wildcards (Advanced Certificate or Total TLS). DNS needs proxied wildcard records for
`*.mailflow-ai.online`, `*.staging.mailflow-ai.online` and `*.dev.mailflow-ai.online`.

## Build variables

Vite embeds these at build time; set them in Infisical and in each Cloudflare Builds trigger.

| Variable | production | staging | development |
| --- | --- | --- | --- |
| `VITE_WORKSPACE_BASE_HOST` | `mailflow-ai.online` | `staging.mailflow-ai.online` | `dev.mailflow-ai.online` |
| `VITE_SITE_URL` (new) | `https://mailflow-ai.online` | `https://site-staging.mailflow-ai.online` | `https://site-dev.mailflow-ai.online` |
| `VITE_WORKSPACE_SWITCHING_ENABLED` | `true` at rollout | `true` at rollout | `true` at rollout |
| `VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED` | removed | removed | removed |

`VITE_API_BASE_URL` stays the Core origin. Rollout requires Core migrations `0012`/`0013`, the
handoff function grants for the runtime role, the Core variables described in Core's README, and
exact tenant origins in R2 CORS. S3 CORS must not be assumed to accept partial-host wildcards.

## Listening

A session cookie shared across `*.{host base}` was replaced with host-only cookies plus a
one-time handoff, so no other subdomain can read a workspace session. The landing redirect runs
as global request middleware, before SSR, server routes and server functions, so a non-workspace
host never renders the app. Keeping the `app*` hosts as Custom Domains (plus routes) preserves
old links while they redirect.
