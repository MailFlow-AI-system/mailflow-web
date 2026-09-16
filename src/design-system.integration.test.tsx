import { Button } from '@mailflow/ui/button'
import { Label } from '@mailflow/ui/label'
import { ThemeProvider, useTheme } from '@mailflow/ui/theme'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function ThemeProbe() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  return (
    <div>
      <output data-testid="selected-theme">{theme}</output>
      <output data-testid="resolved-theme">{resolvedTheme}</output>
      <Button onClick={() => setTheme('light')}>Use light theme</Button>
      <Button onClick={() => setTheme('system')}>Use system theme</Button>
    </div>
  )
}

function renderThemeProbe() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )
}

describe('shared design system integration', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'mailflow-theme',
        newValue: null,
        storageArea: localStorage,
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('defaults to dark and applies the resolved theme to the document', () => {
    renderThemeProbe()

    expect(screen.getByTestId('selected-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('persists a light theme selection across provider remounts', async () => {
    const user = userEvent.setup()
    const firstRender = renderThemeProbe()

    await user.click(screen.getByRole('button', { name: 'Use light theme' }))

    expect(localStorage.getItem('mailflow-theme')).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    firstRender.unmount()
    renderThemeProbe()

    expect(screen.getByTestId('selected-theme')).toHaveTextContent('light')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
  })

  it('persists system preference and follows operating-system theme changes', async () => {
    let prefersDark = true
    let mediaQueryListener: EventListener = () => undefined
    const mediaQuery = {
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn((_: string, listener: EventListener) => {
        mediaQueryListener = listener
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mediaQuery),
    )

    const user = userEvent.setup()
    renderThemeProbe()
    await user.click(screen.getByRole('button', { name: 'Use system theme' }))

    expect(localStorage.getItem('mailflow-theme')).toBe('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')

    prefersDark = false
    Object.defineProperty(mediaQuery, 'matches', { configurable: true, value: prefersDark })
    await act(async () => {
      mediaQueryListener(new Event('change'))
    })

    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
  })

  it('uses shared Button and Label components with native form controls', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

    render(
      <ThemeProvider>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="recipient">Recipient</Label>
          <input id="recipient" />
          <Button type="submit">Send</Button>
        </form>
      </ThemeProvider>,
    )

    expect(screen.getByLabelText('Recipient')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(handleSubmit).toHaveBeenCalledOnce()
  })
})
