import { EditorContent } from '@tiptap/react'
import { useComposer } from '../context'

export function Editor() {
  const { editor } = useComposer()
  return (
    <div className="min-w-0 flex-1 p-4">
      <EditorContent editor={editor} />
    </div>
  )
}
