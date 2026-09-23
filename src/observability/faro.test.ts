import { afterEach, describe, expect, it, vi } from 'vitest'

import { initializeBrowserObservability } from './faro'

const sdk = vi.hoisted(() => ({
  initializeFaro: vi.fn(() => ({ api: { pushEvent: vi.fn(), pushError: vi.fn() } })),
}))

vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro: sdk.initializeFaro,
  ErrorsInstrumentation: class {},
  WebVitalsInstrumentation: class {},
  SessionInstrumentation: class {},
  ViewInstrumentation: class {},
  PerformanceInstrumentation: class {},
}))

vi.mock('@grafana/faro-web-tracing', () => ({ TracingInstrumentation: class {} }))

const environment = {
  VITE_FARO_COLLECTOR_URL: 'https://faro.example.test/collect',
  VITE_FARO_APP_NAME: 'mailflow-web',
  VITE_FARO_APP_ENVIRONMENT: 'test',
  VITE_FARO_APP_VERSION: '0.1.0',
}

afterEach(() => vi.unstubAllGlobals())

describe('initializeBrowserObservability', () => {
  it('is a no-op during SSR', async () => {
    vi.stubGlobal('window', undefined)

    expect(initializeBrowserObservability({ subscribe: vi.fn() }, environment)).toBeUndefined()
  })

  it('subscribes again after an unmount without initializing Faro twice', async () => {
    const callbacks: Array<(event: unknown) => void> = []
    const unsubscribers = [vi.fn(), vi.fn()]
    const router = {
      subscribe: vi.fn((_event, callback) => {
        callbacks.push(callback)
        return unsubscribers[callbacks.length - 1]
      }),
    }

    const firstCleanup = initializeBrowserObservability(router as never, environment)
    await vi.waitFor(() => expect(sdk.initializeFaro).toHaveBeenCalledTimes(1))
    firstCleanup?.()
    expect(unsubscribers[0]).toHaveBeenCalledTimes(1)

    const secondCleanup = initializeBrowserObservability(router as never, environment)
    callbacks[1]?.({
      fromLocation: { pathname: '/' },
      toLocation: { pathname: '/app' },
      pathChanged: true,
    })

    expect(sdk.initializeFaro).toHaveBeenCalledTimes(1)
    expect(sdk.initializeFaro.mock.results[0]?.value.api.pushEvent).toHaveBeenCalledWith(
      'mailflow.navigation',
      { fromRoute: '/', toRoute: '/app', pathChanged: 'true' },
    )
    secondCleanup?.()
    expect(unsubscribers[1]).toHaveBeenCalledTimes(1)
  })

  it('cleans up a failed initialization and allows a later retry', async () => {
    vi.resetModules()
    sdk.initializeFaro.mockClear()
    sdk.initializeFaro.mockImplementationOnce(() => {
      throw new Error('SDK failed to initialize')
    })
    const { initializeBrowserObservability: initializeFresh } = await import('./faro')
    const unsubscribe = vi.fn()
    const router = { subscribe: vi.fn(() => unsubscribe) }

    initializeFresh(router as never, environment)
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1))

    const cleanup = initializeFresh(router as never, environment)
    await vi.waitFor(() => expect(sdk.initializeFaro).toHaveBeenCalledTimes(2))
    cleanup?.()
    expect(unsubscribe).toHaveBeenCalledTimes(2)
  })

  it('reports a route error captured before Faro finishes initializing', async () => {
    vi.resetModules()
    sdk.initializeFaro.mockClear()
    const { captureBrowserError, initializeBrowserObservability: initializeFresh } = await import(
      './faro'
    )
    const error = new Error('private message body')

    captureBrowserError(error)
    const cleanup = initializeFresh({ subscribe: vi.fn(() => vi.fn()) }, environment)

    await vi.waitFor(() => expect(sdk.initializeFaro).toHaveBeenCalledTimes(1))
    await vi.waitFor(() =>
      expect(sdk.initializeFaro.mock.results[0]?.value.api.pushError).toHaveBeenCalledWith(error),
    )
    cleanup?.()
  })
})
