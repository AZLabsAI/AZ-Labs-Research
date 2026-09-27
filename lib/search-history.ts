"use client"

export interface SearchHistoryEntry {
  query: string
  at: string // ISO timestamp
  sourceCount: number
}

const HISTORY_KEY = "azlabs-research-history-v1"
const MAX_ENTRIES = 30

function readHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SearchHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SearchHistoryEntry).query === "string" &&
        typeof (entry as SearchHistoryEntry).at === "string"
    )
  } catch {
    return []
  }
}

export function getSearchHistory(): SearchHistoryEntry[] {
  return readHistory()
}

export function recordSearch(query: string, sourceCount: number): SearchHistoryEntry[] {
  const trimmed = query.trim()
  if (!trimmed || typeof window === "undefined") return readHistory()
  const next = [{ query: trimmed, at: new Date().toISOString(), sourceCount }, ...readHistory()].slice(
    0,
    MAX_ENTRIES
  )
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Storage full or unavailable; history is best-effort.
  }
  return next
}

export function updateLatestSourceCount(sourceCount: number): void {
  if (typeof window === "undefined") return
  const history = readHistory()
  if (history.length === 0) return
  history[0] = { ...history[0], sourceCount }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // no-op
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // no-op
  }
}

export interface SearchStats {
  total: number
  thisMonth: number
  lastAt: string | null
}

export function getSearchStats(): SearchStats {
  const history = readHistory()
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
