import { act, waitFor } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { usePasswordRecoveryCooldown } from './usePasswordRecoveryCooldown'

const RECOVERY_COOLDOWN_KEY = 'mailflow.password-recovery.cooldown-until'

function CooldownProbe() {
  const { cooldownSeconds } = usePasswordRecoveryCooldown()
  return <p>{cooldownSeconds > 0 ? `${cooldownSeconds} seconds` : 'ready'}</p>
}

describe('usePasswordRecoveryCooldown', () => {
  afterEach(() => window.sessionStorage.clear())

  it('restores saved cooldown after hydration without changing server markup', async () => {
    window.sessionStorage.setItem(RECOVERY_COOLDOWN_KEY, String(Date.now() + 12_000))
    const container = document.createElement('div')
    container.innerHTML = renderToString(<CooldownProbe />)
    const hydrationErrors: unknown[] = []
    let root: Root

    expect(container.textContent).toBe('ready')

    await act(async () => {
      root = hydrateRoot(container, <CooldownProbe />, {
        onRecoverableError: (error) => hydrationErrors.push(error),
      })
    })

    await waitFor(() => expect(container.textContent).toMatch(/seconds/))
    expect(hydrationErrors).toEqual([])

    await act(async () => root.unmount())
  })
})
