export function WorkspaceMailUnavailable() {
  return (
    <section
      className="grid min-h-48 place-content-center gap-3 p-6 text-center"
      aria-labelledby="workspace-mail-title"
    >
      <h1 id="workspace-mail-title" className="text-lg font-semibold">
        Workspace mail is not available yet
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Messages will be available here after workspace isolation is implemented. No shared Inbox
        messages are loaded in this workspace.
      </p>
    </section>
  )
}
