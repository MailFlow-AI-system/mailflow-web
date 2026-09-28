import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { normalizeLink } from './links'

export const composerExtensions = [
  StarterKit.configure({
    trailingNode: false,
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ['mailto'],
      isAllowedUri: (url) => normalizeLink(url) !== null,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    },
  }),
  Image.configure({ allowBase64: true }),
  Placeholder.configure({ placeholder: 'Escreva sua mensagem…' }),
]
