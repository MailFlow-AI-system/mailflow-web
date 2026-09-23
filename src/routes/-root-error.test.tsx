import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RootErrorComponent } from './__root'

const captureBrowserError = vi.hoisted(() => vi.fn())

vi.mock('../observability/faro', () => ({ captureBrowserError }))

describe('RootErrorComponent', () => {
  it('reports the route error without rendering its contents', async () => {
    const error = new Error('private message body')
    const reset = vi.fn()

    render(<RootErrorComponent error={error} reset={reset} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('alert')).not.toHaveTextContent('private message body')
    await waitFor(() => expect(captureBrowserError).toHaveBeenCalledWith(error))
  })
})
