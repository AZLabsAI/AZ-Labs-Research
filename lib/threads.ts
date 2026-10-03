"use client"

import type { UIMessage } from "ai"
import type { ImageResult, NewsResult, SearchResult } from "../app/types"
import { accountStorageKey, readStoredArray, writeStoredArray } from './account-storage.ts'

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

function validThreads(entries: unknown[]): ThreadData[] {
  return entries.filter(
      (entry): entry is ThreadData =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ThreadData).id === "string" &&
        Array.isArray((entry as ThreadData).messages)
    )
}

function readThreads(subject: string | null): ThreadData[] {
  return validThreads(readStoredArray(accountStorageKey(THREADS_KEY, subject)))
}

function writeThreads(subject: string | null, threads: ThreadData[]): boolean {
  const key = accountStorageKey(THREADS_KEY, subject)
  if (writeStoredArray(key, threads.slice(0, MAX_THREADS))) return true
  return writeStoredArray(key, threads.slice(0, 10))
}

export function listThreads(subject: string | null): ThreadSummary[] {
  return readThreads(subject).map((thread) => ({
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messageCount: thread.messages.length,
  }))
}

export function getThread(subject: string | null, id: string): ThreadData | null {
  return readThreads(subject).find((thread) => thread.id === id) ?? null
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

export function saveThread(subject: string | null, thread: ThreadData): void {
  if (!subject || thread.messages.length === 0) return
  const threads = readThreads(subject).filter((entry) => entry.id !== thread.id)
  const trimmed: ThreadData = {
    ...thread,
    messages: thread.messages.slice(-MAX_MESSAGES_PER_THREAD),
    updatedAt: new Date().toISOString(),
  }
  writeThreads(subject, [trimmed, ...threads])
}

export function deleteThread(subject: string | null, id: string): ThreadSummary[] {
  writeThreads(subject, readThreads(subject).filter((thread) => thread.id !== id))
  return listThreads(subject)
}

export function hasAnonymousThreads(): boolean {
  return validThreads(readStoredArray(THREADS_KEY)).length > 0
}

export function importAnonymousThreads(subject: string): boolean {
  const existing = readThreads(subject)
  const imported = validThreads(readStoredArray(THREADS_KEY))
  const merged = [...existing, ...imported].filter((entry, index, entries) =>
    entries.findIndex((other) => other.id === entry.id) === index)
  return writeThreads(subject, merged)
}
