export function isRemoteWorkspaceBaseHost(host: string) {
  const labels = host.split('.')
  return (
    host.length <= 189 &&
    labels.length >= 3 &&
    !/(?:^|[.])(?:localhost|local|test|invalid)$/.test(host) &&
    labels.every(
      (label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    ) &&
    !labels.every((label) => /^[0-9]+$/.test(label))
  )
}
