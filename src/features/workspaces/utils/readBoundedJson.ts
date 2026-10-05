import type { BoundedJsonResult } from '../types/selection'

export async function readBoundedJson(
  request: Request,
  maxBytes = 1024,
): Promise<BoundedJsonResult> {
  if (Number(request.headers.get('content-length')) > maxBytes) return { kind: 'too-large' }
  if (!request.body) return { kind: 'invalid' }
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        return { kind: 'too-large' }
      }
      text += decoder.decode(value, { stream: true })
    }
    return { kind: 'ok', body: JSON.parse(text + decoder.decode()) }
  } catch {
    return { kind: 'invalid' }
  } finally {
    reader.releaseLock()
  }
}
