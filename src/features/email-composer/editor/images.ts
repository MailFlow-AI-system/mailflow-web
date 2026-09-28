const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const maxImageSize = 5 * 1024 * 1024

export async function readInlineImage(file: File): Promise<string> {
  if (!imageTypes.has(file.type)) throw new Error('Escolha uma imagem PNG, JPEG, GIF ou WebP.')
  if (file.size > maxImageSize) throw new Error('A imagem deve ter no máximo 5 MB.')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Não foi possível ler a imagem.'))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}
