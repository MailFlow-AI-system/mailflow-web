import type { Faro } from '@grafana/faro-web-sdk'
import type { AnyRouter } from '@tanstack/react-router'

import { createFaroConfig, normalizeRoute } from './config'
import { sanitizeTelemetryItem } from './privacy'

type RuntimeEnvironment = Record<string, unknown>
type RouterLike = Pick<AnyRouter, 'subscribe'>

let browserFaro: Faro | undefined
let initialization: Promise<(() => void) | undefined> | undefined

export async function initializeBrowserObservability(
  router: RouterLike,
  runtimeEnv: RuntimeEnvironment,
): Promise<(() => void) | undefined> {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (browserFaro) {
    return () => undefined
  }

  if (initialization) {
    return initialization
  }

  const config = createFaroConfig(runtimeEnv)
  if (!config) {
    return undefined
  }

  initialization = initialize(config, router)

  try {
    return await initialization
  } catch {
    initialization = undefined
    return undefined
  }
}

export function captureBrowserError(error: unknown): void {
  if (!browserFaro) return

  const normalizedError = error instanceof Error ? error : new Error('Unhandled route error')
  browserFaro.api.pushError(normalizedError)
}

async function initialize(
  config: NonNullable<ReturnType<typeof createFaroConfig>>,
  router: RouterLike,
): Promise<() => void> {
  const pendingNavigations: Array<Parameters<Parameters<RouterLike['subscribe']>[1]>[0]> = []
  let faroInstance: Faro | undefined
  const unsubscribe = router.subscribe('onResolved', (event) => {
    if (faroInstance) {
      recordNavigation(faroInstance, event)
    } else {
      pendingNavigations.push(event)
    }
  })

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
  faroInstance = faro
  pendingNavigations.forEach((event) => {
    recordNavigation(faro, event)
  })

  return () => {
    unsubscribe()
  }
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
