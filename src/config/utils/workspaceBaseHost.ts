// A published base is an environment root such as `mailflow-ai.online` or
// `staging.mailflow-ai.online`; workspaces are one DNS label below it.
export function isRemoteWorkspaceBaseHost(host: string) {
  const labels = host.split('.')
  return (
    host.length <= 189 &&
    labels.length >= 2 &&
    !/(?:^|[.])(?:localhost|local|test|invalid)$/.test(host) &&
    labels.every(
      (label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    ) &&
    !labels.every((label) => /^[0-9]+$/.test(label))
  )
}
