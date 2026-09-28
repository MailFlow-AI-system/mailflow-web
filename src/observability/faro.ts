import type { Faro } from '@grafana/faro-web-sdk'
import type { AnyRouter } from '@tanstack/react-router'

import { createFaroConfig, normalizeRoute } from './config'
import { sanitizeTelemetryItem } from './privacy'

type RuntimeEnvironment = Record<string, unknown>
type RouterLike = Pick<AnyRouter, 'subscribe'>
type AuthTransportOperation = 'sign_in' | 'sign_out'
type AuthDurationBucket = 'under_100ms' | '100_499ms' | '500_999ms' | '1_4_9s' | '5s_or_more'
type AuthFailureAttributes = {
  operation: AuthTransportOperation
  result: 'unavailable'
  durationBucket: AuthDurationBucket
}

let browserFaro: Faro | undefined
let initialization: Promise<Faro> | undefined
const pendingErrors: Error[] = []
const pendingAuthFailures: AuthFailureAttributes[] = []

export function initializeBrowserObservability(
  router: RouterLike,
  runtimeEnv: RuntimeEnvironment,
): (() => void) | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const config = createFaroConfig(runtimeEnv)
  if (!config) {
    return undefined
  }

  const pendingNavigations: Array<Parameters<Parameters<RouterLike['subscribe']>[1]>[0]> = []
  let faroInstance = browserFaro
  let active = true
  const unsubscribe = router.subscribe('onResolved', (event) => {
    if (faroInstance) {
      recordNavigation(faroInstance, event)
    } else {
      pendingNavigations.push(event)
    }
  })

  if (!faroInstance) {
    initialization ??= initialize(config).catch((error: unknown) => {
      initialization = undefined
      throw error
    })
    void initialization
      .then((faro) => {
        if (!active) return
        faroInstance = faro
        for (const event of pendingNavigations) recordNavigation(faro, event)
        pendingNavigations.length = 0
        for (const event of pendingAuthFailures.splice(0)) recordAuthFailure(faro, event)
      })
      .catch(() => {
        cleanup()
      })
  }

  return cleanup

  function cleanup(): void {
    if (!active) return
    active = false
    pendingNavigations.length = 0
    unsubscribe()
  }
}

export function captureBrowserError(error: unknown): void {
  const normalizedError = error instanceof Error ? error : new Error('Unhandled route error')
  if (browserFaro) {
    browserFaro.api.pushError(normalizedError)
    return
  }

  pendingErrors.push(normalizedError)
  if (pendingErrors.length > 10) pendingErrors.shift()
}

export function recordAuthTransportFailure(
  operation: AuthTransportOperation,
  durationMs: number,
): void {
  const event: AuthFailureAttributes = {
    operation,
    result: 'unavailable',
    durationBucket: getAuthDurationBucket(durationMs),
  }
  if (browserFaro) {
    recordAuthFailure(browserFaro, event)
    return
  }

  pendingAuthFailures.push(event)
  if (pendingAuthFailures.length > 10) pendingAuthFailures.shift()
}

async function initialize(config: NonNullable<ReturnType<typeof createFaroConfig>>): Promise<Faro> {
  const [sdk, tracing] = await Promise.all([
    import('@grafana/faro-web-sdk'),
    import('@grafana/faro-web-tracing'),
  ])

  const faro = sdk.initializeFaro({
    url: config.collectorUrl,
    app: {
      name: config.appName,
      environment: config.environment,
      version: config.version,
    },
    instrumentations: [
      new sdk.ErrorsInstrumentation(),
      new sdk.WebVitalsInstrumentation(),
      new sdk.SessionInstrumentation(),
      new sdk.ViewInstrumentation(),
      new sdk.PerformanceInstrumentation(),
      new tracing.TracingInstrumentation({
        instrumentationOptions: {
          propagateTraceHeaderCorsUrls: [config.tracePropagationPattern],
        },
        omitTraceContextForUnsampledSessions: true,
      }),
    ],
    ignoreErrors: [
      /^ResizeObserver loop limit exceeded$/,
      /^ResizeObserver loop completed with undelivered notifications$/,
      /^Script error\.$/,
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],
    beforeSend: sanitizeTelemetryItem,
    batching: {
      sendTimeout: 1000,
      itemLimit: 20,
    },
    pageTracking: {
      generatePageId: (location) => normalizeRoute(location.pathname),
    },
    sessionTracking: {
      enabled: true,
      persistent: false,
      samplingRate: 1,
    },
    webVitalsInstrumentation: {
      reportAllChanges: false,
      trackAttributionSources: false,
    },
    trackGeolocation: false,
    preventGlobalExposure: true,
  })

  browserFaro = faro
  for (const error of pendingErrors.splice(0)) faro.api.pushError(error)
  return faro
}

function recordNavigation(
  faro: Faro,
  event: Parameters<Parameters<RouterLike['subscribe']>[1]>[0],
): void {
  faro.api.pushEvent('mailflow.navigation', {
    fromRoute: normalizeRoute(event.fromLocation?.pathname ?? '/'),
    toRoute: normalizeRoute(event.toLocation.pathname),
    pathChanged: String(event.pathChanged),
  })
}

function recordAuthFailure(faro: Faro, event: AuthFailureAttributes): void {
  faro.api.pushEvent('mailflow.auth.operation', event)
}

function getAuthDurationBucket(durationMs: number): AuthDurationBucket {
  if (durationMs < 100) return 'under_100ms'
  if (durationMs < 500) return '100_499ms'
  if (durationMs < 1_000) return '500_999ms'
  if (durationMs < 5_000) return '1_4_9s'
  return '5s_or_more'
}
