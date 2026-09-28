import { zodResolver } from '@hookform/resolvers/zod'
import type { Editor } from '@tiptap/react'
import { useForm } from 'react-hook-form'

import { normalizeLink } from '../editor/links'
import { linkSchema } from '../schemas/linkSchema'
import type { LinkValues } from '../types/LinkValues'

export function useLinkForm(editor: Editor, onClose: () => void) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { url: editor.getAttributes('link').href ?? '' },
  })

  const submit = handleSubmit(({ url }) => {
    const href = normalizeLink(url)
    if (!href) return
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain
        .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
        .run()
    } else chain.setLink({ href }).run()
    onClose()
  })

  return { register, errors, submit }
}
