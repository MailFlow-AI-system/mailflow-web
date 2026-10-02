export type EditorBodyReader = {
  getHTML: () => string
  getJSON: () => unknown
}

function hasMeaningfulContent(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasMeaningfulContent)
  if (typeof node !== 'object' || node === null) return false

  const contentNode = node as { type?: unknown; text?: unknown; content?: unknown }
  if (contentNode.type === 'image' || contentNode.type === 'emoji') return true
  if (typeof contentNode.text === 'string' && contentNode.text.trim() !== '') return true
  return hasMeaningfulContent(contentNode.content)
}

export function getEditorBodySnapshot(editor: EditorBodyReader) {
  return {
    body: editor.getHTML(),
    hasBodyContent: hasMeaningfulContent(editor.getJSON()),
  }
}
