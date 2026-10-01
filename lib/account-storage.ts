export function accountStorageKey(base: string, subject: string | null): string | null {
  if (!subject || subject.length > 256 || /[\u0000-\u001f]/.test(subject)) return null
  return `${base}:account:${encodeURIComponent(subject)}`
}

export function readStoredArray(key: string | null): unknown[] {
  if (!key || typeof window === 'undefined') return []
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function writeStoredArray(key: string | null, value: unknown[]): boolean {
  if (!key || typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
