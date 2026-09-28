import { describe, expect, it } from 'vitest'
import { readInlineImage } from './images'

describe('local inline images', () => {
  it('reads a supported local image without uploading it', async () => {
    const file = new File(['image'], 'example.png', { type: 'image/png' })
    expect(await readInlineImage(file)).toBe('data:image/png;base64,aW1hZ2U=')
  })
  it('rejects unsupported and excessive files before reading', async () => {
    await expect(
      readInlineImage(new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('PNG')
    await expect(
      readInlineImage(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
      ),
    ).rejects.toThrow('5 MB')
  })
})
