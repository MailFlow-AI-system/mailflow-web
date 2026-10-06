export function maskWorkspaceHosts(value: string, zone: string | undefined): string {
  if (!zone) return value
  const escapedZone = zone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tenantHost = new RegExp(
    `(^|[^a-z0-9.-])(?:[a-z0-9-]+\\.)+${escapedZone}(?=$|[^a-z0-9.-])`,
    'gi',
  )
  return value.replace(tenantHost, (_match, boundary: string) => `${boundary}${zone}`)
}
