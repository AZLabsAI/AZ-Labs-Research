import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export const DELEGATION_COOKIE = 'azlabs-research-delegation'

export interface ResearchDelegation {
  accessToken: string
  subject: string
  sessionId: string
  localSubject: string
  localSessionId: string
  expiresAt: number
}

function key(value: string): Buffer {
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length !== 32 || bytes.toString('base64') !== value) throw new Error('Research session encryption is not configured.')
  return bytes
}

export function sealDelegation(session: ResearchDelegation, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  cipher.setAAD(Buffer.from(DELEGATION_COOKIE))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()])
  const sealed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')
  if (sealed.length > 3800) throw new Error('The delegated session exceeds the cookie size limit.')
  return sealed
}

export function openDelegation(value: string | undefined, secret: string, now = Date.now()): ResearchDelegation | null {
  if (!value || value.length > 3800) return null
  try {
    const bytes = Buffer.from(value, 'base64url')
    if (bytes.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', key(secret), bytes.subarray(0, 12))
    decipher.setAAD(Buffer.from(DELEGATION_COOKIE))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const plaintext = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()])
    const session: unknown = JSON.parse(plaintext.toString('utf8'))
    if (typeof session !== 'object' || session === null) return null
    const candidate = session as ResearchDelegation
    if (['accessToken', 'subject', 'sessionId', 'localSubject', 'localSessionId'].some((field) =>
      typeof candidate[field as keyof ResearchDelegation] !== 'string' || !candidate[field as keyof ResearchDelegation])) return null
    if (!Number.isInteger(candidate.expiresAt) || candidate.expiresAt * 1000 <= now) return null
    return candidate
  } catch { return null }
}
