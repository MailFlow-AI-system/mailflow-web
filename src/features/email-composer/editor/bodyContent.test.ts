import { describe, expect, it } from 'vitest'
import { getEditorBodySnapshot } from './bodyContent'

function editor(document: unknown, html = '<p></p>') {
  return {
    getHTML: () => html,
    getJSON: () => document,
  }
}

describe('editor body snapshot', () => {
  it('treats blank paragraphs, whitespace, non-breaking spaces, and empty nodes as empty', () => {
    expect(
      getEditorBodySnapshot(editor({ type: 'doc', content: [{ type: 'paragraph' }] }))
        .hasBodyContent,
    ).toBe(false)
    expect(
      getEditorBodySnapshot(
        editor({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: ' \u00a0\t ' }] }],
        }),
      ).hasBodyContent,
    ).toBe(false)
    expect(
      getEditorBodySnapshot(
        editor({
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'hardBreak' }] },
            {
              type: 'bulletList',
              content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
            },
          ],
        }),
      ).hasBodyContent,
    ).toBe(false)
  })

  it('treats text, inline images, and emoji nodes as body content', () => {
    for (const node of [
      { type: 'text', text: ' hello ' },
      { type: 'image', attrs: { src: 'data:image/png;base64,x' } },
      { type: 'emoji', attrs: { name: 'wave', emoji: '👋' } },
    ]) {
      expect(
        getEditorBodySnapshot(
          editor({ type: 'doc', content: [{ type: 'paragraph', content: [node] }] }),
        ).hasBodyContent,
      ).toBe(true)
    }
  })

  it('returns current editor HTML with the content result', () => {
    const html = '<p>Updated <strong>body</strong></p>'
    expect(
      getEditorBodySnapshot(
        editor(
          {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated body' }] }],
          },
          html,
        ),
      ),
    ).toEqual({ body: html, hasBodyContent: true })
  })
})
