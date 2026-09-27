"use client"

import type { UIMessage } from "ai"
import type { ImageResult, NewsResult, SearchResult } from "../app/types"

export interface ThreadMessageData {
  sources: SearchResult[]
  newsResults?: NewsResult[]
  imageResults?: ImageResult[]
  followUpQuestions: string[]
  ticker?: string
}

export interface ThreadData {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: UIMessage[]
  messageData: Array<[number, ThreadMessageData]>
  sources: SearchResult[]
  newsResults: NewsResult[]
  imageResults: ImageResult[]
  followUpQuestions: string[]
  ticker: string | null
}

export interface ThreadSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

const THREADS_KEY = "azlabs-research-threads-v1"
const MAX_THREADS = 20
const MAX_MESSAGES_PER_THREAD = 40

function readThreads(): ThreadData[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(THREADS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is ThreadData =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ThreadData).id === "string" &&
        Array.isArray((entry as ThreadData).messages)
    )
  } catch {
    return []
  }
}

function writeThreads(threads: ThreadData[]): void {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, MAX_THREADS)))
  } catch {
    // Quota exceeded: drop oldest threads and retry once.
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, 10)))
    } catch {
      // Storage unavailable; threads are best-effort.
    }
  }
}

export function listThreads(): ThreadSummary[] {
  return readThreads().map((thread) => ({
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messageCount: thread.messages.length,
  }))
}

export function getThread(id: string): ThreadData | null {
  return readThreads().find((thread) => thread.id === id) ?? null
}

function messageText(message: UIMessage): string {
  const parts = (message as { parts?: Array<{ type?: string; text?: string }> }).parts
  if (!parts) return ""
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("")
}

export function titleForMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user")
  const text = firstUser ? messageText(firstUser).trim() : ""
  if (!text) return "New research"
  return text.length > 44 ? `${text.slice(0, 44).trim()}…` : text
}

export function newThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function saveThread(thread: ThreadData): void {
  if (thread.messages.length === 0) return
  const threads = readThreads().filter((entry) => entry.id !== thread.id)
  const trimmed: ThreadData = {
    ...thread,
    messages: thread.messages.slice(-MAX_MESSAGES_PER_THREAD),
    updatedAt: new Date().toISOString(),
  }
  writeThreads([trimmed, ...threads])
}

export function deleteThread(id: string): ThreadSummary[] {
  writeThreads(readThreads().filter((thread) => thread.id !== id))
  return listThreads()
}
