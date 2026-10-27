export class WorkspaceIdentityChangedError extends Error {
  constructor() {
    super('Workspace identity changed')
    this.name = 'WorkspaceIdentityChangedError'
  }
}
