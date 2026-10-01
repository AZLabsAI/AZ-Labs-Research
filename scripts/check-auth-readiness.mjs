#!/usr/bin/env node
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local', quiet: true })

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEARCH_SESSION_ENCRYPTION_KEY']
const blockers = required.filter((name) => !process.env[name]).map((name) => `${name} is missing`)
if (process.env.NEXT_PUBLIC_AZLABS_AUTH_MODE !== 'central') blockers.push('Central sign-in mode is not enabled')
if (process.env.RESEARCH_CENTRAL_ISSUANCE_GATE_VERIFIED !== '1') blockers.push('Central pre-issuance mapping enforcement has no reviewed approval record')
if (process.env.RESEARCH_SESSION_BINDINGS_READY !== '1') blockers.push('The local session/RLS migration is not approved as ready')
const key = process.env.RESEARCH_SESSION_ENCRYPTION_KEY || ''
if (key && (Buffer.from(key, 'base64').length !== 32 || Buffer.from(key, 'base64').toString('base64') !== key)) blockers.push('The session encryption key is not a canonical base64 32-byte key')
let schemaVerified = false
if (process.argv.includes('--check-schema') && blockers.length === 0) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/research_auth_readiness`, {
      method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: '{}', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    })
    const data = await response.json()
    schemaVerified = response.ok && data.version === 'research-session-binding-v1' && data.profilesGuarded === true && data.writesRestricted === true
    if (!schemaVerified) blockers.push('The read-only schema/RLS check failed')
  } catch { blockers.push('The read-only schema/RLS check is unavailable') }
}
process.stdout.write(JSON.stringify({
  configurationComplete: blockers.length === 0,
  schemaVerified,
  readyForControlledTest: blockers.length === 0 && schemaVerified,
  blockers,
  note: 'No secrets or account records are printed. Configuration flags do not replace the reviewed issuance/provider-policy proof. --check-schema performs a read-only policy diagnostic.',
}, null, 2) + '\n')
if (blockers.length || !schemaVerified) process.exitCode = 1
