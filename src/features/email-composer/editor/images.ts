const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const maxImageSize = 5 * 1024 * 1024

export async function readInlineImage(file: File): Promise<string> {
  if (!imageTypes.has(file.type)) throw new Error('Choose a PNG, JPEG, GIF or WebP image.')
  if (file.size > maxImageSize) throw new Error('The image must be at most 5 MB.')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('The image could not be read.'))
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(file)
  })
}
