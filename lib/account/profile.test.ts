import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { handleResearchProfile, type ResearchProfileDependencies } from './profile.ts'

const origin = 'https://research.azlabs.ai'
const ownProfile = { id: 'verified-local-owner', email: 'owner@synthetic.invalid', full_name: 'Owner', avatar_url: null,
  created_at: '2026-01-01', updated_at: '2026-01-01' }

function fixture() {
  const calls: Array<{ operation: string; localSubject: string; patch?: unknown }> = []
  let allowed = true
  const deps: ResearchProfileDependencies = {
    origin,
    authorize: async () => {
      if (!allowed) throw { status: 403, reason: 'access_denied' }
      return { subject: 'verified-central-owner', localSubject: ownProfile.id }
    },
    store: {
      read: async (localSubject) => { calls.push({ operation: 'read', localSubject }); return ownProfile },
      update: async (localSubject, patch) => { calls.push({ operation: 'update', localSubject, patch }); return { ...ownProfile, ...patch } },
    },
  }
  return { deps, calls, revoke: () => { allowed = false } }
}

function patch(body: unknown, requestOrigin = origin) {
  return new Request(`${origin}/api/account/profile`, { method: 'PATCH', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

describe('fresh-authorized Research profile API', () => {
  it('uses only the trusted principal for reads and allowlisted updates', async () => {
    const { deps, calls } = fixture()
    const read = await handleResearchProfile(new Request(`${origin}/api/account/profile?subject=another-owner`), deps)
    assert.equal(read.status, 200)
    assert.equal(read.headers.get('Cache-Control'), 'no-store')
    assert.equal((await read.json()).profile.id, ownProfile.id)
    const saved = await handleResearchProfile(patch({ full_name: ' New name ', avatar_url: 'https://example.com/avatar.png' }), deps)
    assert.equal(saved.status, 200)
    assert.deepEqual(calls, [{ operation: 'read', localSubject: ownProfile.id },
      { operation: 'update', localSubject: ownProfile.id, patch: { full_name: 'New name', avatar_url: 'https://example.com/avatar.png' } }])
  })
  it('denies every new read/write immediately after a grant is revoked without ending the central identity', async () => {
    const { deps, calls, revoke } = fixture()
    assert.equal((await handleResearchProfile(new Request(`${origin}/api/account/profile`), deps)).status, 200)
    revoke()
    assert.equal((await handleResearchProfile(new Request(`${origin}/api/account/profile`), deps)).status, 403)
    assert.equal((await handleResearchProfile(patch({ full_name: 'Stale authorization' }), deps)).status, 403)
    assert.equal(calls.length, 1)
  })
  it('rejects identity overrides, unallowlisted fields, invalid values and cross-origin writes without database access', async () => {
    const { deps, calls } = fixture()
    for (const body of [{ id: 'another-owner', full_name: 'x' }, { subject: 'another-owner' }, { localSubject: ownProfile.id },
      { email: 'changed@synthetic.invalid' }, { updated_at: '2026-02-01' }, { full_name: 12 }, {},
      { full_name: 'x'.repeat(201) }, { avatar_url: 'javascript:alert(1)' }, { avatar_url: 'https://name:pass@example.com/avatar.png' }]) {
      assert.equal((await handleResearchProfile(patch(body), deps)).status, 400)
    }
    assert.equal((await handleResearchProfile(patch({ full_name: 'x' }, 'https://other.example'), deps)).status, 403)
    assert.equal(calls.length, 0)
  })
  it('fails closed when the current authority is unavailable or the service returns the wrong owner', async () => {
    const { deps } = fixture()
    deps.authorize = async () => { throw new Error('offline') }
    assert.equal((await handleResearchProfile(new Request(`${origin}/api/account/profile`), deps)).status, 503)
    const second = fixture()
    second.deps.store.read = async () => ({ ...ownProfile, id: 'wrong-owner' })
    assert.equal((await handleResearchProfile(new Request(`${origin}/api/account/profile`), second.deps)).status, 503)
  })
})
