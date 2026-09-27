"use client"

import React, { useRef, useEffect, useMemo, useState } from "react"
import {
  Loader2,
  Sparkles,
  FileText,
  Plus,
  Copy,
  RefreshCw,
  Check,
  Download,
  ExternalLink,
  Trash2,
  ArrowDown,
  MessagesSquare,
  PanelRightClose,
} from "lucide-react"
import Image from "next/image"
import { type UIMessage } from "ai"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { SearchResult, NewsResult, ImageResult } from "./types"
import { MarkdownRenderer } from "./markdown-renderer"
import { StockChart } from "./stock-chart"
import { NewsResults } from "./news-results"
import { ImageResults } from "./image-results"
import { LoadingAnimation } from "./loading-animation"
import { CharacterCounter } from "./character-counter"
import { AudioNarration } from "./audio-player"
import { ThreadsRail } from "./threads-rail"
import type { ThreadSummary } from "@/lib/threads"

interface MessageData {
  sources: SearchResult[]
  newsResults?: NewsResult[]
  imageResults?: ImageResult[]
  followUpQuestions: string[]
  ticker?: string
}

interface ConversationPair {
  id: string
  query: string
  answer: string
  sources: SearchResult[]
  followUps: string[]
  ticker?: string | null
}

function getMessageContent(message: UIMessage): string {
  if (!message.parts) return ""
  return message.parts
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join("")
}

function safeLinkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

function SourceTiles({
  title,
  sources,
  isLoading,
  compact = false,
}: {
  title: string
  sources: SearchResult[]
  isLoading?: boolean
  compact?: boolean
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
          <FileText className="h-4 w-4" />
          {title}
        </div>
        {sources.length > 0 && (
          <span className="text-xs text-[var(--on-surface-variant)]">{sources.length} sources</span>
        )}
      </div>

      {compact && (
        <ol className="space-y-1.5">
          {isLoading &&
            [1, 2, 3, 4].map((index) => (
              <li
                key={index}
                className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[var(--surface-container-low)] px-3 py-2.5 animate-pulse"
              >
                <div className="h-4 w-4 shrink-0 rounded bg-[hsl(var(--muted))]" />
                <div className="h-3 flex-1 rounded bg-[hsl(var(--muted))]" />
              </li>
            ))}
          {!isLoading &&
            sources.slice(0, 6).map((source, index) => (
              <li key={`${source.url}-${index}`} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring group flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[var(--surface-container-low)] px-3 py-2.5 transition-colors duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--primary-accent)_38%,transparent)]"
                >
                  <span className="font-mono text-[11px] font-semibold text-[var(--primary-accent)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--on-surface)]">
                      {source.title}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--on-surface-variant)]">
                      {source.siteName || (source.url ? safeLinkHostname(source.url) : "")}
                    </span>
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[var(--on-surface-variant)] opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            ))}
        </ol>
      )}

      {!compact && isLoading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((index) => (
            <Card key={index} className="h-28 p-3">
              <div className="mb-2 h-3 w-3/4 rounded bg-[hsl(var(--muted))]" />
              <div className="mb-2 h-3 w-full rounded bg-[hsl(var(--muted))]" />
              <div className="h-3 w-1/2 rounded bg-[hsl(var(--muted))]" />
            </Card>
          ))}
        </div>
      )}

      {!compact && !isLoading && sources.length === 0 && (
        <Card className="p-4 text-sm text-[var(--on-surface-variant)]">
          No sources were returned for this response.
        </Card>
      )}

      {!compact && !isLoading && sources.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {sources.slice(0, 5).map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring group block rounded-[var(--radius-card)] animate-fade-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <Card className="relative h-28 overflow-hidden p-3 transition-all duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--primary-accent)_38%,transparent)] hover:shadow-[var(--shadow-sm)]">
                {source.image && (
                  <div className="absolute inset-0 opacity-20">
                    <Image
                      src={source.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 50vw, 20vw"
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                      }}
                    />
                  </div>
                )}

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--on-surface-variant)]">
                    <div className="h-4 w-4 overflow-hidden rounded bg-[hsl(var(--muted))]">
                      {source.favicon && (
                        <Image
                          src={source.favicon}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                          }}
                        />
                      )}
                    </div>
                    <span className="truncate">
                      {source.siteName || new URL(source.url).hostname.replace("www.", "")}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs font-medium text-[var(--on-surface)] transition-colors group-hover:text-[var(--primary-accent)]">
                    {source.title}
                  </p>

                  <CharacterCounter
                    targetCount={source.contentLength ?? source.markdown?.length ?? source.content?.length ?? 0}
                    duration={1200}
                  />
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function FollowUpSection({
  followUps,
  onAsk,
}: {
  followUps: string[]
  onAsk: (question: string) => void
}) {
  if (followUps.length === 0) return null

  return (
    <section className="space-y-3" aria-label="Follow-up questions">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
        <Sparkles className="h-4 w-4" />
        Follow-ups
      </div>
      <div className="space-y-2">
        {followUps.map((question, index) => (
          <Button
            key={question}
            type="button"
            variant="outline"
            className="h-auto w-full justify-start rounded-[var(--radius-md)] px-3 py-2 text-left animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
            onClick={() => onAsk(question)}
          >
            <Plus className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="whitespace-normal text-sm">{question}</span>
          </Button>
        ))}
      </div>
    </section>
  )
}

function AnswerSection({
  answer,
  sources,
  copied,
  onCopy,
  onRewrite,
  showRewrite,
  audioKey,
}: {
  answer: string
  sources: SearchResult[]
  copied: boolean
  onCopy: () => void
  onRewrite?: () => void
  showRewrite?: boolean
  audioKey: string
}) {
  return (
    <section className="space-y-3 animate-fade-up" aria-label="Answer">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
          <Sparkles className="h-4 w-4" />
          Answer
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <AudioNarration text={answer} audioKey={audioKey} />
          <button
            onClick={onCopy}
            className="focus-ring rounded-md p-1.5 text-[var(--on-surface-variant)] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            title={copied ? "Copied" : "Copy response"}
            aria-label={copied ? "Copied" : "Copy response"}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {showRewrite && onRewrite && (
            <button
              onClick={onRewrite}
              className="focus-ring rounded-md p-1.5 text-[var(--on-surface-variant)] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              title="Rewrite response"
              aria-label="Rewrite response"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <Card className="p-4 sm:p-5">
        <div className="prose prose-sm max-w-none break-words text-[var(--on-surface)] dark:prose-invert sm:prose-base">
          <MarkdownRenderer content={answer} sources={sources} />
        </div>
      </Card>
    </section>
  )
}

interface ChatInterfaceProps {
  messages: UIMessage[]
  sources: SearchResult[]
  newsResults: NewsResult[]
  imageResults: ImageResult[]
  followUpQuestions: string[]
  searchStatus: string
  isLoading: boolean
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  messageData?: Map<number, MessageData>
  currentTicker?: string | null
  threads: ThreadSummary[]
  activeThreadId: string
  onSelectThread: (id: string) => void
  onNewThread: () => void
  onDeleteThread: (id: string) => void
}

export function ChatInterface({
  messages,
  sources,
  newsResults,
  imageResults,
  followUpQuestions,
  searchStatus,
  isLoading,
  input,
  handleInputChange,
  handleSubmit,
  messageData,
  currentTicker,
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [threadsCollapsed, setThreadsCollapsed] = useState(false)
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(false)
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)

  const theme =
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"

  const conversation = useMemo(() => {
    let query = ""
    let currentAnswer = ""
    let isWaitingForResponse = false

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const secondLastMessage = messages[messages.length - 2]

      if (lastMessage.role === "user") {
        query = getMessageContent(lastMessage)
        isWaitingForResponse = true
      } else if (secondLastMessage?.role === "user" && lastMessage.role === "assistant") {
        query = getMessageContent(secondLastMessage)
        currentAnswer = getMessageContent(lastMessage)
      }
    }

    const history: ConversationPair[] = []
    for (let i = 0; i < messages.length - 2; i += 2) {
      const user = messages[i]
      const assistant = messages[i + 1]
      if (user?.role !== "user" || assistant?.role !== "assistant") continue

      const historyIndex = history.length
      const storedData = messageData?.get(historyIndex)
      history.push({
        id: `history-${historyIndex}`,
        query: getMessageContent(user),
        answer: getMessageContent(assistant),
        sources: storedData?.sources || [],
        followUps: storedData?.followUpQuestions || [],
        ticker: storedData?.ticker || null,
      })
    }

    return {
      query,
      currentAnswer,
      isWaitingForResponse,
      history,
    }
  }, [messages, messageData])

  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current
    if (!container) return
    stickToBottomRef.current = true
    setShowJumpToLatest(false)
    container.scrollTo({ top: container.scrollHeight, behavior })
  }

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const sticking = distanceToBottom < 140
    stickToBottomRef.current = sticking
    setShowJumpToLatest(!sticking)
  }

  useEffect(() => {
    // Only follow new content while the user is already at the bottom. If they
    // scrolled up to read history, never yank them back down.
    if (!stickToBottomRef.current) return
    const container = scrollContainerRef.current
    if (!container) return
    const id = requestAnimationFrame(() => {
      const target = scrollContainerRef.current
      if (!target) return
      const distance = target.scrollHeight - target.scrollTop - target.clientHeight
      target.scrollTo({
        top: target.scrollHeight,
        behavior: distance > 1200 ? "auto" : "smooth",
      })
    })

    return () => cancelAnimationFrame(id)
  }, [messages.length, sources.length, followUpQuestions.length, newsResults.length, imageResults.length, isLoading])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    stickToBottomRef.current = true
    setShowJumpToLatest(false)
    handleSubmit(e)
  }

  const handleFollowUpClick = (question: string) => {
    handleInputChange({ target: { value: question } } as React.ChangeEvent<HTMLTextAreaElement>)
    setTimeout(() => {
      formRef.current?.requestSubmit()
    }, 40)
  }

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 1800)
  }

  const handleRewrite = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")
    if (!lastUserMessage) return

    handleInputChange({ target: { value: getMessageContent(lastUserMessage) } } as React.ChangeEvent<HTMLTextAreaElement>)
    setTimeout(() => {
      formRef.current?.requestSubmit()
    }, 80)
  }

  const getLastAssistantContent = () => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")
    return lastAssistant ? getMessageContent(lastAssistant) : ""
  }

  const exportMarkdown = () => {
    const answer = getLastAssistantContent()
    if (!conversation.query && !answer) return

    const lines: string[] = []
    if (conversation.query) lines.push(`# ${conversation.query}`)
    if (answer) {
      if (lines.length) lines.push("")
      lines.push(answer)
    }

    if (sources.length > 0) {
      lines.push("", "## Sources")
      sources.forEach((source, index) => {
        const site = source.siteName || (source.url ? new URL(source.url).hostname.replace("www.", "") : "")
        lines.push(`${index + 1}. [${source.title || source.url}](${source.url})${site ? ` — ${site}` : ""}`)
      })
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "az-labs-research.md"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportJSON = () => {
    const payload = {
      query: conversation.query,
      answer: getLastAssistantContent(),
      sources,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "az-labs-research.json"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const copyCitations = () => {
    if (sources.length === 0) return
    const text = sources
      .map((source, index) => {
        const site = source.siteName || (source.url ? new URL(source.url).hostname.replace("www.", "") : "")
        return `${index + 1}. ${source.title || source.url}${site ? ` — ${site}` : ""}\n${source.url}`
      })
      .join("\n\n")

    navigator.clipboard.writeText(text)
  }

  const openAllSources = () => {
    if (sources.length === 0) return
    sources.slice(0, 5).forEach((source) => window.open(source.url, "_blank"))
  }

  const clearChat = () => {
    onNewThread()
  }

  const defaultSteps = ["Queuing request", "Finding sources", "Fetching content", "Cross-checking", "Composing answer"]
  const envSteps = (process.env.NEXT_PUBLIC_LOADING_STEPS || "")
    .split("|")
    .map((step) => step.trim())
    .filter(Boolean)
  const steps = envSteps.length ? envSteps : defaultSteps

  type Speed = "slow" | "normal" | "fast"
  const [speed, setSpeed] = useState<Speed>("normal")
  const [cycleMs, setCycleMs] = useState<number>(1000)
  const [activeStep, setActiveStep] = useState(0)
  const [processingStartAt, setProcessingStartAt] = useState<number | null>(null)
  const [estimatedTotal, setEstimatedTotal] = useState<number>(12)
  const [eta, setEta] = useState<number>(12)
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const envSpeed = (process.env.NEXT_PUBLIC_LOADING_SPEED as Speed | undefined) || undefined
    const localSpeed =
      typeof window !== "undefined" ? (localStorage.getItem("loading-speed") as Speed | null) : null
    const initial = envSpeed || localSpeed || "normal"
    setSpeed(initial)
  }, [])

  useEffect(() => {
    const ms = speed === "slow" ? 1400 : speed === "fast" ? 700 : 1000
    setCycleMs(ms)
    if (typeof window !== "undefined") {
      localStorage.setItem("loading-speed", speed)
    }
  }, [speed])

  useEffect(() => {
    if (!(conversation.isWaitingForResponse || isLoading)) return
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, cycleMs)

    return () => clearInterval(interval)
  }, [conversation.isWaitingForResponse, isLoading, steps.length, cycleMs])

  useEffect(() => {
    const processing = conversation.isWaitingForResponse || isLoading
    if (processing && processingStartAt === null) {
      const queryLength = (conversation.query || "").length
      const total = 8 + Math.min(10, Math.floor(queryLength / 35)) + Math.floor(Math.random() * 3)
      setEstimatedTotal(total)
      setEta(total)
      setProgress(0)
      setActiveStep(0)
      setProcessingStartAt(Date.now())
    }

    if (!processing && processingStartAt !== null) {
      setProcessingStartAt(null)
      setEta(0)
      setProgress(1)
    }
  }, [conversation.isWaitingForResponse, isLoading, conversation.query, processingStartAt])

  useEffect(() => {
    if (processingStartAt === null) return
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - processingStartAt) / 1000)
      const remaining = Math.max(0, estimatedTotal - elapsed)
      setEta(remaining)
      setProgress(Math.min(0.95, elapsed / Math.max(1, estimatedTotal)))
    }, 1000)

    return () => clearInterval(interval)
  }, [processingStartAt, estimatedTotal])

  const showCurrentSections = Boolean(conversation.currentAnswer) || (!conversation.isWaitingForResponse && !isLoading)

  const evidenceCount = sources.length + newsResults.length + imageResults.length
  const showEvidence = newsResults.length > 0 || imageResults.length > 0 || sources.length > 0 || (isLoading && messages.length > 0)

  return (
    <div className="flex h-full min-h-0 gap-4">
      <ThreadsRail
        threads={threads}
        activeId={activeThreadId}
        collapsed={threadsCollapsed}
        onToggleCollapse={() => setThreadsCollapsed((value) => !value)}
        onSelect={onSelectThread}
        onNew={onNewThread}
        onDelete={onDeleteThread}
      />

      {mobileThreadsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Research threads">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileThreadsOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-slide-in-right">
            <ThreadsRail
              threads={threads}
              activeId={activeThreadId}
              collapsed={false}
              onToggleCollapse={() => setMobileThreadsOpen(false)}
              onSelect={(id) => {
                setMobileThreadsOpen(false)
                onSelectThread(id)
              }}
              onNew={() => {
                setMobileThreadsOpen(false)
                onNewThread()
              }}
              onDelete={onDeleteThread}
              alwaysVisible
            />
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {(conversation.isWaitingForResponse || isLoading) && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20">
            <div className="mx-auto max-w-4xl px-4">
              <div className="h-[3px] overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary-accent)] via-[#5a95ef] to-[#8ab4f8] transition-[width] duration-300 animate-shimmer"
                  style={{ width: `${Math.max(5, Math.floor(progress * 100))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="scroll-slim relative min-h-0 flex-1 overflow-y-auto px-1 pb-6 pt-8"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            isolation: "isolate",
          } as React.CSSProperties}
        >
          <div className="mx-auto max-w-4xl space-y-8 pb-8">
            {conversation.history.map((pair) => (
              <article key={pair.id} className="space-y-4 rounded-[var(--radius-card)] border border-[hsl(var(--border))] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] p-4 animate-fade-up sm:p-5">
                <h2 className="text-lg font-semibold text-[var(--on-surface)] sm:text-xl">{pair.query}</h2>
                <AnswerSection
                  answer={pair.answer}
                  sources={pair.sources}
                  copied={copiedMessageId === pair.id}
                  onCopy={() => handleCopy(pair.answer, pair.id)}
                  audioKey={pair.id}
                />
                {pair.ticker && <StockChart ticker={pair.ticker} theme={theme} />}
                <SourceTiles title="Sources" sources={pair.sources} />
                <FollowUpSection followUps={pair.followUps} onAsk={handleFollowUpClick} />
              </article>
            ))}

            {conversation.query && (
              <h1 className="text-2xl font-semibold text-[var(--on-surface)] sm:text-3xl">{conversation.query}</h1>
            )}

            {searchStatus && (conversation.isWaitingForResponse || isLoading) && (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] px-3 py-2 text-sm text-[var(--on-surface-variant)] animate-fade-in" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {steps[activeStep]}{searchStatus ? ` · ${searchStatus}` : ""}
                </span>
              </div>
            )}

            {(sources.length > 0 || conversation.query) && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setMobileThreadsOpen(true)}
                >
                  <MessagesSquare className="h-3.5 w-3.5" />
                  Threads
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={exportMarkdown}>
                  <Download className="h-3.5 w-3.5" />
                  Export MD
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={exportJSON}>
                  <FileText className="h-3.5 w-3.5" />
                  Export JSON
                </Button>
                {sources.length > 0 && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={copyCitations}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy citations
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={openAllSources}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open top sources
                    </Button>
                  </>
                )}
                <Button type="button" variant="destructive" size="sm" className="ml-auto" onClick={clearChat}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            )}

            {conversation.currentAnswer && (
              <AnswerSection
                answer={conversation.currentAnswer}
                sources={sources}
                copied={copiedMessageId === "current-message"}
                onCopy={() => handleCopy(conversation.currentAnswer, "current-message")}
                onRewrite={handleRewrite}
                showRewrite={!isLoading}
                audioKey={`current-${messages.length}`}
              />
            )}

            {currentTicker && conversation.currentAnswer && <StockChart ticker={currentTicker} theme={theme} />}

            {(conversation.isWaitingForResponse || isLoading) && !conversation.currentAnswer && (
              <LoadingAnimation speed={speed} estimatedTime={estimatedTotal} />
            )}

            {showCurrentSections && (
              <>
                {(sources.length > 0 || (!conversation.isWaitingForResponse && !isLoading)) && (
                  <div className="lg:hidden">
                    <SourceTiles
                      title="Sources"
                      sources={sources}
                      isLoading={Boolean((conversation.isWaitingForResponse || isLoading) && sources.length === 0)}
                    />
                  </div>
                )}

                {imageResults.length > 0 && (
                  <div className="lg:hidden">
                    <ImageResults results={imageResults} isLoading={false} />
                  </div>
                )}

                {newsResults.length > 0 && (
                  <div className="lg:hidden">
                    <NewsResults results={newsResults} isLoading={false} />
                  </div>
                )}

                <FollowUpSection followUps={followUpQuestions} onAsk={handleFollowUpClick} />
              </>
            )}

            {!conversation.currentAnswer && !conversation.isWaitingForResponse && !isLoading && sources.length === 0 && (
              <Card className="p-5 text-sm text-[var(--on-surface-variant)]">
                Your answer will appear here after you submit a query.
              </Card>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {showJumpToLatest && (
          <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center animate-fade-in">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => scrollToLatest()}
              className="pointer-events-auto rounded-full shadow-[var(--shadow-md)]"
              aria-label="Jump to latest message"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Latest
            </Button>
          </div>
        )}

        <div className="relative z-10 bg-gradient-to-t from-[var(--surface)] via-[color-mix(in_srgb,var(--surface)_88%,transparent)] to-transparent pb-4 pt-6">
          <div className="mx-auto max-w-2xl px-1">
            <form onSubmit={handleFormSubmit} ref={formRef}>
              <div className="surface-panel rounded-[var(--radius-chat)] p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        formRef.current?.requestSubmit()
                      }
                    }}
                    placeholder="Ask a follow-up question"
                    className="min-h-[38px] max-h-[112px] resize-none border-0 bg-transparent px-2 py-1.5 shadow-none"
                    rows={1}
                  />
                  <Button type="submit" loading={isLoading} disabled={!input.trim() || isLoading} className="h-10 px-4">
                    Send
                  </Button>
                </div>
              </div>

              {(conversation.isWaitingForResponse || isLoading) && (
                <div className="mt-2 flex items-center gap-3 px-1 text-[11px] text-[var(--on-surface-variant)]">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary-accent)] to-[#8ab4f8] transition-all animate-shimmer"
                      style={{ width: `${Math.floor(progress * 100)}%` }}
                    />
                  </div>
                  <div className="whitespace-nowrap">{eta > 0 ? `~${eta}s` : "..."}</div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {showEvidence && (
        evidenceCollapsed ? (
          <div className="hidden w-12 shrink-0 flex-col items-center gap-2 border-l border-[hsl(var(--border))] py-3 lg:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEvidenceCollapsed(false)}
              className="h-9 w-9"
              title="Show evidence rail"
              aria-label="Show evidence rail"
            >
              <FileText className="h-4 w-4" />
            </Button>
            {evidenceCount > 0 && (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--primary-accent)_14%,transparent)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--primary-accent)]">
                {evidenceCount}
              </span>
            )}
          </div>
        ) : (
          <aside className="scroll-slim hidden min-h-0 w-80 min-w-[320px] flex-col overflow-y-auto border-l border-[hsl(var(--border))] pb-10 pl-4 lg:flex" aria-label="Evidence">
            <div className="flex items-center justify-between pb-2 pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
                Evidence{evidenceCount > 0 ? ` · ${evidenceCount}` : ""}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEvidenceCollapsed(true)}
                className="h-7 w-7"
                title="Hide evidence rail"
                aria-label="Hide evidence rail"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6">
              <SourceTiles
                title="Sources"
                sources={sources}
                isLoading={Boolean((conversation.isWaitingForResponse || isLoading) && sources.length === 0)}
                compact
              />
              <ImageResults results={imageResults} isLoading={isLoading && imageResults.length === 0} layout="stack" />
              <NewsResults results={newsResults} isLoading={isLoading && newsResults.length === 0} layout="stack" />
            </div>
          </aside>
        )
      )}
    </div>
  )
}
