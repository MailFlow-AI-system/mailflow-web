# Workspace domains

Cloudflare account: `4b2ab2e9aea9bd23a79bc01a05b7c540`.
Zone: `mailflow-ai.online` (`f39c6b40f4a60a4283ad60186d7ebb76`).

| Environment | Web base host | Core origin | Worker |
| --- | --- | --- | --- |
| development | app-dev.mailflow-ai.online | https://api-dev.mailflow-ai.online | mailflow-web-development |
| staging | app-staging.mailflow-ai.online | https://api-staging.mailflow-ai.online | mailflow-web-staging |
| production | app.mailflow-ai.online | https://api.mailflow-ai.online | mailflow-web |

Each Web Worker has two build triggers: its published branch and branch previews.
Both now define `VITE_WORKSPACE_BASE_HOST` as the Web base host, preserving
`VITE_API_BASE_URL` as the Core origin. `VITE_WORKSPACE_SWITCHING_ENABLED` and
`VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED` remain `false` until the Core rollout is ready.
These are build variables because Vite embeds them; runtime bindings alone cannot change a built app.
Infisical and Cloudflare Builds are separate configuration stores.

Each base host retains its existing Worker Custom Domain. Tenant DNS uses a proxied
`AAAA *.BASE_HOST = 100::` and a `*.BASE_HOST/*` Worker Route to the same Web Worker.
`wrangler.jsonc` records both the base Custom Domain and tenant route for each environment.
The existing Cloudflare-managed certificates include each base and `*.BASE_HOST` explicitly;
coverage was checked with a verified TLS handshake rather than inferred from Universal SSL.
No Site domain, bucket visibility, Railway deployment or shared database migration was changed.

Rollout still requires the reconciled Core migrations through 0007, a non-owner runtime role
without SUPERUSER/BYPASSRLS, correct auth/workspace origins, and exact authorized tenant origins
in R2 CORS. S3 CORS must not be assumed to accept partial-host wildcards.
Preparing DNS/build variables does not validate the unpublished workspace implementation remotely.

## Listening

Existing environment domains were retained. Wildcard Workers Routes supply tenant routing;
Custom Domains supply the base host and their existing wildcard TLS certificate coverage.
Remote feature flags stay disabled until backend prerequisites are met. Configuration backups
are stored privately outside the repository for rollback.
