export class WorkspaceRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number | null) {
    super('Workspace request rate limited')
    this.name = 'WorkspaceRateLimitedError'
  }
}
