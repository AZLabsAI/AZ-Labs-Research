export const AZLABS_AUTH_PROVIDER =
  process.env.NEXT_PUBLIC_AZLABS_AUTH_PROVIDER?.trim() || 'custom:azlabs';

export function isCentralAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AZLABS_AUTH_MODE === 'central';
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  try {
    const parsed = new URL(value, 'https://azlabs-research.invalid');
    if (parsed.origin !== 'https://azlabs-research.invalid') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function buildAuthCallbackUrl(origin: string, next: string | null | undefined): string {
  const callback = new URL('/auth/callback', origin);
  const safeDestination = safeNext(next);
  if (safeDestination !== '/') callback.searchParams.set('next', safeDestination);
  return callback.toString();
}
