export type WorkspaceTransportOptions = {
  body?: string
  forwardIdentity?: boolean
}

export type WorkspaceResponseHeader =
  | 'Content-Type'
  | 'Retry-After'
  | 'X-Workspace-Identity'
  | 'X-Request-ID'
