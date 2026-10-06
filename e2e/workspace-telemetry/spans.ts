import type { CollectedSpan, WorkspaceTelemetryRecord } from './types'

export function collectSpanIds(value: unknown): CollectedSpan[] {
  if (Array.isArray(value)) return value.flatMap(collectSpanIds)
  if (typeof value !== 'object' || value === null) return []
  const record = value as Record<string, unknown>
  const own =
    typeof record.traceId === 'string' && typeof record.spanId === 'string'
      ? [{ traceId: record.traceId, spanId: record.spanId }]
      : []
  return [...own, ...Object.values(record).flatMap(collectSpanIds)]
}

export function privateTelemetryPaths(value: unknown, markers: string[], path = '$'): string[] {
  if (typeof value === 'string')
    return markers.some((marker) => value.includes(marker)) ? [path] : []
  if (Array.isArray(value))
    return value.flatMap((entry, index) =>
      privateTelemetryPaths(entry, markers, `${path}[${index}]`),
    )
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, entry]) =>
    privateTelemetryPaths(entry, markers, `${path}.${key}`),
  )
}

export function collectorCorrelates(
  output: string,
  samples: WorkspaceTelemetryRecord[],
  parents: CollectedSpan[],
): boolean {
  return samples.every((sample, index) =>
    new RegExp(
      `Trace ID\\s+: ${sample.traceId}\\s+Parent ID\\s+: ${parents[index]?.spanId}\\s+ID\\s+: ${sample.spanId}`,
    ).test(output),
  )
}
