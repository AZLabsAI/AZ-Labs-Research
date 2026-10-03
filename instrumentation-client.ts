import * as Sentry from '@sentry/nextjs'

// Errors only: no tracing, no session replay. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
