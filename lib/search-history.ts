"use client"

import { accountStorageKey, readStoredArray, writeStoredArray } from './account-storage.ts'

export interface SearchHistoryEntry {
  query: string
  at: string // ISO timestamp
  sourceCount: number
}

const HISTORY_KEY = "azlabs-research-history-v1"
const MAX_ENTRIES = 30

function readHistory(subject: string | null): SearchHistoryEntry[] {
  return readStoredArray(accountStorageKey(HISTORY_KEY, subject)).filter(
      (entry): entry is SearchHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SearchHistoryEntry).query === "string" &&
        typeof (entry as SearchHistoryEntry).at === "string"
    )
}

export function getSearchHistory(subject: string | null): SearchHistoryEntry[] {
  return readHistory(subject)
}

export function recordSearch(subject: string | null, query: string, sourceCount: number): SearchHistoryEntry[] {
  const trimmed = query.trim()
  if (!subject || !trimmed || typeof window === "undefined") return readHistory(subject)
  const next = [{ query: trimmed, at: new Date().toISOString(), sourceCount }, ...readHistory(subject)].slice(
    0,
    MAX_ENTRIES
  )
  writeStoredArray(accountStorageKey(HISTORY_KEY, subject), next)
  return next
}

export function updateLatestSourceCount(subject: string | null, sourceCount: number): void {
  if (typeof window === "undefined") return
  const history = readHistory(subject)
  if (history.length === 0) return
  history[0] = { ...history[0], sourceCount }
  writeStoredArray(accountStorageKey(HISTORY_KEY, subject), history)
}

export function clearSearchHistory(subject: string | null): void {
  const key = accountStorageKey(HISTORY_KEY, subject)
  if (!key || typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // no-op
  }
}

export interface SearchStats {
  total: number
  thisMonth: number
  lastAt: string | null
}

export function getSearchStats(subject: string | null): SearchStats {
  const history = readHistory(subject)
  const now = new Date()
  return {
    total: history.length,
    thisMonth: history.filter((entry) => {
      const at = new Date(entry.at)
      return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth()
    }).length,
    lastAt: history.length > 0 ? history[0].at : null,
  }
}

export function hasAnonymousSearchHistory(): boolean {
  return readStoredArray(HISTORY_KEY).length > 0
}

export function importAnonymousSearchHistory(subject: string): boolean {
  const existing = readHistory(subject)
  const imported = readStoredArray(HISTORY_KEY).filter((entry): entry is SearchHistoryEntry =>
    typeof entry === 'object' && entry !== null &&
    typeof (entry as SearchHistoryEntry).query === 'string' &&
    typeof (entry as SearchHistoryEntry).at === 'string' &&
    typeof (entry as SearchHistoryEntry).sourceCount === 'number')
  const merged = [...existing, ...imported].filter((entry, index, entries) =>
    entries.findIndex((other) => other.at === entry.at && other.query === entry.query) === index)
  return writeStoredArray(accountStorageKey(HISTORY_KEY, subject), merged.slice(0, MAX_ENTRIES))
}
