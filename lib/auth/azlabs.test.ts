import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildAuthCallbackUrl, safeNext } from './azlabs.ts'

describe('AZ Labs auth helpers', () => {
  it('keeps only same-origin relative destinations', () => {
    assert.equal(safeNext('/dashboard?tab=saved#top'), '/dashboard?tab=saved#top')
    assert.equal(safeNext('https://evil.example/steal'), '/')
    assert.equal(safeNext('//evil.example/steal'), '/')
  })

  it('preserves the safe destination in the callback URL', () => {
    assert.equal(
      buildAuthCallbackUrl('https://research.azlabs.ai', '/dashboard'),
      'https://research.azlabs.ai/auth/callback?next=%2Fdashboard',
    )
    assert.equal(
      buildAuthCallbackUrl('https://research.azlabs.ai', null),
      'https://research.azlabs.ai/auth/callback',
    )
  })
})
