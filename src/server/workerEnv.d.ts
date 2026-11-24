declare module 'cloudflare:workers' {
  /** Worker bindings read on the server. Secrets are set in the Cloudflare dashboard. */
  interface MailFlowWorkerEnv {
    MAILFLOW_PROXY_SECRET?: string
  }
  export const env: MailFlowWorkerEnv
}
