import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: true, // Disable image optimization to prevent errors
  },
};

export default withSentryConfig(nextConfig, {
  org: 'az-labs',
  project: 'azlabs-research',
  sentryUrl: 'https://us.sentry.io',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Source maps are generated and uploaded only when SENTRY_AUTH_TOKEN is set.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: true,
  telemetry: false,
});
