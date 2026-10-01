import type { LogoutTokenClaims } from './token-verifier.ts'

export async function resolveLogoutSubject(
  claims: LogoutTokenClaims,
  lookupSidSubjects: (sid: string) => Promise<string[]>,
): Promise<string> {
  // A verified issuer/client subject is sufficient for a tombstone, including
  // logout delivered before the local OAuth callback has created its binding.
  if (claims.sub) return claims.sub
  if (!claims.sid) throw new Error('Unknown logout binding')
  const subjects = await lookupSidSubjects(claims.sid)
  if (!subjects.length || subjects.some((subject) => subject !== subjects[0])) {
    throw new Error('Unknown logout binding')
  }
  return subjects[0]
}
