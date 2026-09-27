"use client"

import type { FormEvent } from "react"
import { useMemo, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import { SearchComponent } from "./search"
import { StarterQuestions } from "./starter-questions"
import { ChatInterface } from "./chat-interface"
import { SearchResult, NewsResult, ImageResult } from "./types"
import { useAuth } from "./contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ErrorDisplay } from "@/components/error-display"
import { getSearchHistory, recordSearch, updateLatestSourceCount } from "@/lib/search-history"
import {
  deleteThread,
  getThread,
  listThreads,
  newThreadId,
  saveThread,
  titleForMessages,
} from "@/lib/threads"
import type { ThreadSummary } from "@/lib/threads"

interface MessageData {
  sources: SearchResult[]
  newsResults?: NewsResult[]
  imageResults?: ImageResult[]
  followUpQuestions: string[]
  ticker?: string
}

interface PipelineError {
  statusCode?: number
  message?: string
}

// The server heartbeats every few seconds while work is in flight, so no new stream
// activity for this long means the connection died silently (previously an infinite
// loading loop). The watchdog aborts and surfaces a retryable timeout instead.
const STALL_TIMEOUT_MS = 30000
// Hard cap on a single research run even when chunks keep arriving.
const MAX_RUN_MS = 150000
// Signed-out visitors get this many free searches before sign-in is required.
// Signed-in users are unlimited.
const FREE_SEARCH_LIMIT = 10

function getMessageText(message: { parts?: Array<{ type?: string; text?: string }> }): string {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("")
}

function createPreviewState(previewMode: string | null) {
  const previewSources: SearchResult[] = [
    {
      url: "https://www.nvidia.com",
      title: "NVIDIA Investor Relations",
      description: "Quarterly AI datacenter momentum and product updates.",
      siteName: "NVIDIA",
    },
    {
      url: "https://www.amd.com",
      title: "AMD Datacenter & AI",
      description: "MI-series roadmap and enterprise acceleration strategy.",
      siteName: "AMD",
    },
    {
      url: "https://www.tsmc.com",
      title: "TSMC Technology Roadmap",
      description: "Advanced-node packaging and foundry capacity outlook.",
      siteName: "TSMC",
    },
  ]

  const previewNews: NewsResult[] = [
    {
      url: "https://example.com/news/ai-chip-demand",
      title: "AI accelerator demand remains elevated",
      source: "Market Desk",
      date: new Date().toISOString(),
    },
  ]

  const previewImages: ImageResult[] = [
    {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      title: "Compute cluster",
      source: "Unsplash",
    },
  ]

  if (previewMode === "chat-loading") {
    return {
      messages: [
        {
          id: "preview-loading-user",
          role: "user",
          parts: [{ type: "text", text: "What are the key AI chip trends in 2026?" }],
        },
      ],
      sources: [],
      newsResults: [],
      imageResults: [],
      followUpQuestions: [],
      searchStatus: "Collecting and ranking sources",
      isLoading: true,
      error: null,
      ticker: null,
    }
  }

  if (previewMode === "chat-error") {
    return {
      messages: [
        {
          id: "preview-error-user",
          role: "user",
          parts: [{ type: "text", text: "Summarize today’s macro market drivers" }],
        },
      ],
      sources: [],
      newsResults: [],
      imageResults: [],
      followUpQuestions: [],
      searchStatus: "",
      isLoading: false,
      error: { statusCode: 500, message: "Preview error state" },
      ticker: null,
    }
  }

  if (previewMode === "chat-ready") {
    return {
      messages: [
        {
          id: "preview-ready-user",
          role: "user",
          parts: [{ type: "text", text: "What are the key AI chip trends in 2026?" }],
        },
        {
          id: "preview-ready-assistant",
          role: "assistant",
          parts: [
            {
              type: "text",
              text:
                "AI chip momentum in 2026 is being shaped by three drivers: capacity-constrained advanced packaging, rising enterprise inference demand, and tighter power-efficiency targets. Leading vendors are balancing top-end training performance with lower-TCO inference options for broad deployment. CITATION_1 CITATION_2 CITATION_3",
            },
          ],
        },
      ],
      sources: previewSources,
      newsResults: previewNews,
      imageResults: previewImages,
      followUpQuestions: [
        "Compare NVIDIA and AMD positioning by segment",
        "Which foundry constraints matter most this quarter?",
        "How should teams size inference workloads vs training workloads?",
      ],
      searchStatus: "",
      isLoading: false,
      error: null,
      ticker: "NASDAQ:NVDA",
    }
  }

  return null
}

export default function AZLabsResearchPage() {
  const [previewMode, setPreviewMode] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setPreviewMode(params.get("preview"))
  }, [])

  const previewState = useMemo(() => createPreviewState(previewMode), [previewMode])
  const isPreview = Boolean(previewState)

  const [sources, setSources] = useState<SearchResult[]>([])
  const [newsResults, setNewsResults] = useState<NewsResult[]>([])
  const [imageResults, setImageResults] = useState<ImageResult[]>([])
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [searchStatus, setSearchStatus] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [messageData, setMessageData] = useState<Map<number, MessageData>>(new Map())
  const [currentTicker, setCurrentTicker] = useState<string | null>(null)

  const lastDataLength = useRef(0)
  const currentMessageIndex = useRef(0)
  const lastActivityAt = useRef(0)
  const loadingSince = useRef(0)

  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>("")
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false)
  const [isCheckingEnv, setIsCheckingEnv] = useState<boolean>(true)
  const [pendingQuery, setPendingQuery] = useState<string>("")
  const [input, setInput] = useState<string>("")
  const [stallError, setStallError] = useState<PipelineError | null>(null)
  const [partError, setPartError] = useState<PipelineError | null>(null)
  const [freeUsed, setFreeUsed] = useState(0)
  const [activeThreadId, setActiveThreadId] = useState<string>(() => newThreadId())
  const [threads, setThreads] = useState<ThreadSummary[]>([])

  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const { messages, sendMessage, status, error, stop, regenerate, setMessages, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/az-labs-research/search",
      body: firecrawlApiKey ? { firecrawlApiKey } : undefined,
    }),
    onError: (err) => {
      toast.error(err.message || "Research request failed")
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (isPreview) return

    if (status === "streaming" && messages.length > 0) {
      const assistantMessages = messages.filter((message) => message.role === "assistant")
      const newIndex = assistantMessages.length

      if (newIndex !== currentMessageIndex.current) {
        setSearchStatus("")
        setSources([])
        setNewsResults([])
        setImageResults([])
        setFollowUpQuestions([])
        setCurrentTicker(null)
        currentMessageIndex.current = newIndex
        lastDataLength.current = 0
      }
    }

    if (messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage.parts || lastMessage.parts.length === 0) return

    const partsLength = lastMessage.parts.length
    if (partsLength === lastDataLength.current) return
    lastDataLength.current = partsLength
    lastActivityAt.current = Date.now()

    let hasSourceData = false
    let latestSources: SearchResult[] = []
    let latestNewsResults: NewsResult[] = []
    let latestImageResults: ImageResult[] = []
    let latestTicker: string | null = null
    let latestFollowUpQuestions: string[] = []
    let latestStatus: string | null = null
    let streamError: PipelineError | null = null

    lastMessage.parts.forEach((part: any) => {
      if (part.type === "data-sources" && part.data) {
        hasSourceData = true
        if (part.data.sources) latestSources = part.data.sources
        if (part.data.newsResults) latestNewsResults = part.data.newsResults
        if (part.data.imageResults) latestImageResults = part.data.imageResults
      }

      if (part.type === "data-ticker" && part.data) {
        latestTicker = part.data.symbol
      }

      if (part.type === "data-followup" && part.data?.questions) {
        latestFollowUpQuestions = part.data.questions
      }

      if (part.type === "data-status" && part.data) {
        latestStatus = part.data.message || ""
      }

      if (part.type === "data-error" && part.data) {
        streamError = {
          statusCode: part.data.statusCode,
          message: part.data.suggestion
            ? `${part.data.error} ${part.data.suggestion}`
            : part.data.error,
        }
      }
    })

    if (hasSourceData) {
      setSources(latestSources)
      setNewsResults(latestNewsResults)
      setImageResults(latestImageResults)
      updateLatestSourceCount(latestSources.length)
    }
    if (latestTicker !== null) setCurrentTicker(latestTicker)
    if (latestFollowUpQuestions.length > 0) setFollowUpQuestions(latestFollowUpQuestions)
    if (latestStatus !== null) setSearchStatus(latestStatus)
    if (streamError !== null) {
      setPartError(streamError)
      toast.error("Research failed — see details above the chat.")
    }

    if (hasSourceData || latestTicker !== null || latestFollowUpQuestions.length > 0) {
      setMessageData((prevMap) => {
        const next = new Map(prevMap)
        const existing = next.get(currentMessageIndex.current) || { sources: [], followUpQuestions: [] }
        next.set(currentMessageIndex.current, {
          ...existing,
          ...(hasSourceData && {
            sources: latestSources,
            newsResults: latestNewsResults,
            imageResults: latestImageResults,
          }),
          ...(latestTicker !== null && { ticker: latestTicker }),
          ...(latestFollowUpQuestions.length > 0 && { followUpQuestions: latestFollowUpQuestions }),
        })
        return next
      })
    }
  }, [isPreview, status, messages])

  useEffect(() => {
    setFreeUsed(getSearchHistory().length)
    setThreads(listThreads())
  }, [])

  // Active chat owns the viewport exactly; hiding the footer removes the second
  // page scrollbar so there is exactly one scroll region to navigate.
  const isChatActive = isPreview || hasSearched || messages.length > 0
  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.classList.toggle("hide-site-footer", isChatActive && !isPreview)
    return () => document.body.classList.remove("hide-site-footer")
  }, [isChatActive, isPreview])

  useEffect(() => {
    if (isPreview) {
      setHasApiKey(true)
      setIsCheckingEnv(false)
      return
    }

    const checkApiKey = async () => {
      try {
        const response = await fetch("/api/az-labs-research/check-env")
        const data = await response.json()

        if (data.hasFirecrawlKey) {
          setHasApiKey(true)
        } else {
          const storedKey = localStorage.getItem("firecrawl-api-key")
          if (storedKey) {
            setFirecrawlApiKey(storedKey)
            setHasApiKey(true)
          }
        }
      } catch {
        // no-op
      } finally {
        setIsCheckingEnv(false)
      }
    }

    void checkApiKey()
  }, [isPreview])

  useEffect(() => {
    if (isCheckingEnv || !pendingQuery) return
    if (hasApiKey) {
      setHasSearched(true)
      setStallError(null)
      setPartError(null)
      clearError()
      sendMessage({ text: pendingQuery })
      setPendingQuery("")
      setInput("")
    } else {
      setShowApiKeyModal(true)
    }
    // sendMessage is stable for the chat instance; re-running on it would resend the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingEnv, hasApiKey, pendingQuery])

  // Dashboard "re-run" links land here as ?q=. Consume it once the key check resolves.
  const initialQuerySent = useRef(false)
  useEffect(() => {
    if (isPreview || initialQuerySent.current) return
    if (typeof window === "undefined") return
    const initial = new URLSearchParams(window.location.search).get("q")?.trim()
    if (!initial) {
      initialQuerySent.current = true
      return
    }
    if (isCheckingEnv) return
    initialQuerySent.current = true
    window.history.replaceState(null, "", window.location.pathname)
    setInput(initial)
    if (!hasApiKey) {
      setPendingQuery(initial)
      return
    }
    sendQuery(initial)
    // sendQuery identity changes per render; the ref guard makes this run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, isCheckingEnv, hasApiKey])

  // Persist the active thread (debounced) so it survives reloads and appears in the rail.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (isPreview || messages.length === 0) return
    if (typeof window === "undefined") return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const threadMessages = messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", parts: m.parts }))
    const snapshot = {
      id: activeThreadId,
      title: titleForMessages(threadMessages),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: threadMessages,
      messageData: Array.from(messageData.entries()).slice(-4),
      sources: sources.slice(0, 24),
      newsResults: newsResults.slice(0, 10),
      imageResults: imageResults.slice(0, 12),
      followUpQuestions: followUpQuestions.slice(0, 8),
      ticker: currentTicker,
    }
    saveTimer.current = setTimeout(() => {
      saveThread(snapshot)
      setThreads(listThreads())
    }, 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // Re-run on every settled message/data change; the timer debounces token churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, messages, messageData, sources, newsResults, imageResults, followUpQuestions, currentTicker, activeThreadId])

  const startNewThread = () => {
    if (isLoading) stop()
    setMessages([])
    setMessageData(new Map())
    setSources([])
    setNewsResults([])
    setImageResults([])
    setFollowUpQuestions([])
    setCurrentTicker(null)
    setActiveThreadId(newThreadId())
    currentMessageIndex.current = -1
    lastDataLength.current = 0
  }

  const selectThread = (id: string) => {
    if (id === activeThreadId) return
    if (isLoading) stop()
    const thread = getThread(id)
    if (!thread) return
    currentMessageIndex.current = -1
    lastDataLength.current = 0
    setMessages(thread.messages as typeof messages)
    setMessageData(new Map(thread.messageData as [number, MessageData][]))
    setSources(thread.sources)
    setNewsResults(thread.newsResults)
    setImageResults(thread.imageResults)
    setFollowUpQuestions(thread.followUpQuestions)
    setCurrentTicker(thread.ticker)
    setActiveThreadId(thread.id)
  }

  const removeThread = (id: string) => {
    deleteThread(id)
    setThreads(listThreads())
    if (id === activeThreadId) startNewThread()
  }

  // Watchdog: a silently-killed connection leaves useChat in streaming/submitted
  // forever. Abort it and surface a retryable timeout instead of looping forever.
  useEffect(() => {
    if (isPreview) return
    if (!isLoading) {
      loadingSince.current = 0
      return
    }
    const now = Date.now()
    if (loadingSince.current === 0) {
      loadingSince.current = now
      lastActivityAt.current = now
    }
    const timer = setInterval(() => {
      const at = Date.now()
      const idleFor = at - lastActivityAt.current
      const runningFor = at - loadingSince.current
      if (idleFor >= STALL_TIMEOUT_MS || runningFor >= MAX_RUN_MS) {
        clearInterval(timer)
        loadingSince.current = 0
        stop()
        setStallError({
          statusCode: 504,
          message:
            idleFor >= STALL_TIMEOUT_MS
              ? "The research stream stalled and was stopped. This usually clears on retry."
              : "Research took too long and was stopped. Try a narrower query.",
        })
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [isPreview, isLoading, stop])

  const clearPipelineErrors = () => {
    setStallError(null)
    setPartError(null)
    clearError()
  }

  const handleRetry = () => {
    if (isPreview || isLoading) return
    clearPipelineErrors()
    const lastMessage = messages[messages.length - 1] as
      | { role?: string; parts?: Array<{ type?: string; text?: string }> }
      | undefined
    if (lastMessage?.role === "assistant") {
      regenerate()
      return
    }
    if (lastMessage?.role === "user") {
      const text = getMessageText(lastMessage)
      if (!text.trim()) return
      setMessages(messages.slice(0, -1) as typeof messages)
      sendMessage({ text })
    }
  }

  const handleApiKeySubmit = () => {
    if (!firecrawlApiKey.trim()) return

    localStorage.setItem("firecrawl-api-key", firecrawlApiKey)
    setHasApiKey(true)
    setShowApiKeyModal(false)
    toast.success("API key saved successfully")

    if (pendingQuery) {
      clearPipelineErrors()
      sendMessage({ text: pendingQuery })
      setPendingQuery("")
    }
  }

  const sendQuery = (query: string) => {
    if (!query.trim()) return

    if (isPreview) {
      setHasSearched(true)
      return
    }

    if (!hasApiKey) {
      setPendingQuery(query)
      // Until the server key check returns, hold the query rather than asking for a key.
      if (!isCheckingEnv) setShowApiKeyModal(true)
      return
    }

    // Signed-out visitors get a few free searches, then sign-in is required.
    if (!user && !authLoading && getSearchHistory().length >= FREE_SEARCH_LIMIT) {
      toast.info("You've used your free searches — sign in to continue.")
      router.push("/auth/login?next=/")
      return
    }

    setHasSearched(true)
    clearPipelineErrors()
    recordSearch(query, 0)
    setFreeUsed(getSearchHistory().length)
    sendMessage({ text: query })
    setInput("")
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendQuery(input)
  }

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim()) return

    if (!isPreview && messages.length > 0 && sources.length > 0) {
      const assistantMessages = messages.filter((message) => message.role === "assistant")
      const lastAssistantIndex = assistantMessages.length - 1
      if (lastAssistantIndex >= 0) {
        const next = new Map(messageData)
        next.set(lastAssistantIndex, {
          sources,
          newsResults,
          imageResults,
          followUpQuestions,
          ticker: currentTicker || undefined,
        })
        setMessageData(next)
      }
    }

    sendQuery(input)
  }

  const effectiveMessages = isPreview ? (previewState!.messages as any) : (messages as any)
  const effectiveSources = isPreview ? previewState!.sources : sources
  const effectiveNews = isPreview ? previewState!.newsResults : newsResults
  const effectiveImages = isPreview ? previewState!.imageResults : imageResults
  const effectiveFollowUps = isPreview ? previewState!.followUpQuestions : followUpQuestions
  const effectiveStatus = isPreview ? previewState!.searchStatus : searchStatus
  const effectiveLoading = isPreview ? previewState!.isLoading : isLoading
  const effectiveTicker = isPreview ? previewState!.ticker : currentTicker
  const pipelineError = stallError ?? partError ?? (error as PipelineError | undefined ?? null)
  const effectiveError = isPreview ? previewState!.error : pipelineError

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${
        isChatActive && !isPreview ? "h-[calc(100dvh-5rem)]" : "min-h-[calc(100vh-6rem)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16)_0%,transparent_70%)] animate-float-slow" />
        <div className="absolute -right-28 top-20 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(138,180,248,0.2)_0%,transparent_70%)] animate-float-slower" />
      </div>

      <div className={`relative shrink-0 px-4 sm:px-6 lg:px-8 ${isChatActive ? "pb-3 pt-4" : "pb-12 pt-16"}`}>
        <div className="relative mx-auto max-w-7xl">
          {!isChatActive && (
            <div className="mx-auto max-w-4xl space-y-7 text-center animate-fade-up">
              <span className="chip mx-auto">Parent-site aligned modern research UI</span>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--on-surface)] sm:text-5xl lg:text-6xl">
                AZ Labs Research
              </h1>
              <p className="mx-auto max-w-2xl text-base text-[var(--on-surface-variant)] sm:text-lg">
                Multi-source AI research with concise answers, traceable sources, and follow-up prompts designed for rapid decision workflows.
              </p>
            </div>
          )}

          <div className={`${isChatActive ? "mt-0" : "mt-10"}`}>
            <SearchComponent
              handleSubmit={handleSearch}
              input={input}
              handleInputChange={(event) => setInput(event.target.value)}
              isLoading={effectiveLoading}
            />
            {!isPreview && !user && !authLoading && !isChatActive && (
              <div className="mt-3 flex justify-center animate-fade-in">
                {freeUsed >= FREE_SEARCH_LIMIT ? (
                  <Link
                    href="/auth/login?next=/"
                    className="chip focus-ring transition-colors hover:border-[color-mix(in_srgb,var(--primary-accent)_45%,transparent)] hover:text-[var(--on-surface)]"
                  >
                    Free searches used — sign in for unlimited research
                  </Link>
                ) : (
                  <span className="chip">
                    {FREE_SEARCH_LIMIT - freeUsed} of {FREE_SEARCH_LIMIT} free searches left
                    <Link
                      href="/auth/login?next=/"
                      className="focus-ring rounded font-semibold text-[var(--primary-accent)] hover:text-[var(--primary-accent-strong)]"
                    >
                      Sign in for unlimited
                    </Link>
                  </span>
                )}
              </div>
            )}
          </div>

          {!isChatActive && (
            <div className="mt-10 animate-fade-up">
              <StarterQuestions onSelect={sendQuery} isLoading={effectiveLoading} />
            </div>
          )}

          {!isPreview && !authLoading && user && !isChatActive && threads.length > 0 && (
            <div className="mx-auto mt-12 max-w-4xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--on-surface)]">Recent research</p>
                <Link href="/dashboard" className="text-sm font-medium text-[var(--primary-accent)] hover:underline">
                  View dashboard
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {threads.slice(0, 4).map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread.id)}
                    className="focus-ring surface-panel rounded-[var(--radius-card)] p-4 text-left transition hover:-translate-y-0.5"
                  >
                    <p className="truncate text-sm font-semibold text-[var(--on-surface)]">{thread.title}</p>
                    <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                      {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"} ·{" "}
                      {new Date(thread.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isChatActive && (
            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="surface-panel rounded-[var(--radius-card)] p-5">
                <p className="text-sm font-semibold text-[var(--on-surface)]">Fast signal extraction</p>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Answer-focused output with ranked supporting evidence.</p>
              </div>
              <div className="surface-panel rounded-[var(--radius-card)] p-5">
                <p className="text-sm font-semibold text-[var(--on-surface)]">Source-grounded responses</p>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Citations and direct links for auditability.</p>
              </div>
              <div className="surface-panel rounded-[var(--radius-card)] p-5">
                <p className="text-sm font-semibold text-[var(--on-surface)]">Follow-up acceleration</p>
                <p className="mt-1 text-sm text-[var(--on-surface-variant)]">One-click continuation questions to deepen analysis.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col">
          {effectiveError && (
            <div className="mb-4 shrink-0">
              <ErrorDisplay
                error={effectiveError as { statusCode?: number; message?: string }}
                context="Search pipeline"
                onRetry={!isPreview ? handleRetry : undefined}
              />
            </div>
          )}

          {isChatActive && (
            <div className="min-h-0 flex-1">
              <ChatInterface
                messages={effectiveMessages}
                sources={effectiveSources}
                newsResults={effectiveNews}
                imageResults={effectiveImages}
                followUpQuestions={effectiveFollowUps}
                searchStatus={effectiveStatus}
                isLoading={effectiveLoading}
                input={input}
                handleInputChange={(event) => setInput(event.target.value)}
                handleSubmit={handleChatSubmit}
                messageData={messageData}
                currentTicker={effectiveTicker}
                threads={threads}
                activeThreadId={activeThreadId}
                onSelectThread={selectThread}
                onNewThread={startNewThread}
                onDeleteThread={removeThread}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firecrawl API key required</DialogTitle>
            <DialogDescription>
              AZ Labs Research needs a Firecrawl API key for web retrieval. You can generate one at{" "}
              <a
                href="https://www.firecrawl.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary-accent)] underline"
              >
                firecrawl.dev
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Input
              placeholder="Enter your API key"
              value={firecrawlApiKey}
              onChange={(event) => setFirecrawlApiKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleApiKeySubmit()
                }
              }}
            />
            <Button onClick={handleApiKeySubmit} className="w-full">
              Save API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
