import * as Sentry from '@sentry/nextjs'

// Errors only. No-op when SENTRY_DSN is unset.
const dsn = process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
})
