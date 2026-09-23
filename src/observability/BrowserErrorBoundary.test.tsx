import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BrowserErrorBoundary } from './BrowserErrorBoundary'

const captureBrowserError = vi.hoisted(() => vi.fn())

vi.mock('./faro', () => ({ captureBrowserError }))

function BrokenChild(): never {
  throw new Error('private message body')
}

describe('BrowserErrorBoundary', () => {
  it('captures render errors and shows a private-content-safe fallback', async () => {
    render(
      <BrowserErrorBoundary>
        <BrokenChild />
      </BrowserErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('alert')).not.toHaveTextContent('private message body')
    await waitFor(() => expect(captureBrowserError).toHaveBeenCalledWith(expect.any(Error)))
  })
})
