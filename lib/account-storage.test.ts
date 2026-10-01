import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { getSearchHistory, recordSearch, importAnonymousSearchHistory, clearSearchHistory } from './search-history.ts'
import { listThreads, getThread, saveThread, importAnonymousThreads, type ThreadData } from './threads.ts'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
} })
const thread: ThreadData = { id: 'synthetic-thread', title: 'Private research', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  messages: [{ id: 'synthetic-message', role: 'user', parts: [{ type: 'text', text: 'Synthetic question' }] }],
  messageData: [], sources: [], newsResults: [], imageResults: [], followUpQuestions: [], ticker: null }

describe('account-owned browser research', () => {
  beforeEach(() => values.clear())
  it('does not expose or mutate one account history from another account or signed-out state', () => {
    recordSearch('account-a', 'Only A', 2)
    saveThread('account-a', thread)
    assert.equal(getSearchHistory('account-a').length, 1)
    assert.equal(listThreads('account-a').length, 1)
    assert.deepEqual(getSearchHistory('account-b'), [])
    assert.deepEqual(listThreads(null), [])
    assert.equal(getThread('account-b', thread.id), null)
    clearSearchHistory('account-b')
    clearSearchHistory(null)
    assert.equal(getSearchHistory('account-a').length, 1)
  })
  it('never assigns anonymous history until explicit opt-in import and deduplicates repeated imports', () => {
    values.set('azlabs-research-history-v1', JSON.stringify([{ query: 'Earlier anonymous', at: '2026-01-01', sourceCount: 1 }]))
    values.set('azlabs-research-threads-v1', JSON.stringify([thread]))
    assert.deepEqual(getSearchHistory('account-a'), [])
    assert.deepEqual(listThreads('account-a'), [])
    assert(importAnonymousSearchHistory('account-a'))
    assert(importAnonymousThreads('account-a'))
    assert(importAnonymousSearchHistory('account-a'))
    assert(importAnonymousThreads('account-a'))
    assert.equal(getSearchHistory('account-a').length, 1)
    assert.equal(listThreads('account-a').length, 1)
    assert.deepEqual(getSearchHistory('account-b'), [])
    assert(values.has('azlabs-research-history-v1'))
  })
  it('does not store protected research under a missing subject and tolerates corrupt browser data', () => {
    recordSearch(null, 'Unsigned request', 1)
    saveThread(null, thread)
    assert.equal(values.size, 0)
    values.set('azlabs-research-history-v1:account:account-a', 'invalid JSON')
    assert.deepEqual(getSearchHistory('account-a'), [])
  })
})
