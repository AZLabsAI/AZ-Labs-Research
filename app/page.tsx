"use client"

import type { FormEvent } from "react"
import { useMemo, useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import { SearchComponent } from "./search"
import { StarterQuestions } from "./starter-questions"
import { ChatInterface } from "./chat-interface"
import { SearchResult, NewsResult, ImageResult } from "./types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ErrorDisplay } from "@/components/error-display"

interface MessageData {
  sources: SearchResult[]
  newsResults?: NewsResult[]
  imageResults?: ImageResult[]
  followUpQuestions: string[]
  ticker?: string
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

  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>("")
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false)
  const [, setIsCheckingEnv] = useState<boolean>(true)
  const [pendingQuery, setPendingQuery] = useState<string>("")
  const [input, setInput] = useState<string>("")

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/az-labs-research/search",
      body: firecrawlApiKey ? { firecrawlApiKey } : undefined,
    }),
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

    let hasSourceData = false
    let latestSources: SearchResult[] = []
    let latestNewsResults: NewsResult[] = []
    let latestImageResults: ImageResult[] = []
    let latestTicker: string | null = null
    let latestFollowUpQuestions: string[] = []
    let latestStatus: string | null = null

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
    })

    if (hasSourceData) {
      setSources(latestSources)
      setNewsResults(latestNewsResults)
      setImageResults(latestImageResults)
    }
    if (latestTicker !== null) setCurrentTicker(latestTicker)
    if (latestFollowUpQuestions.length > 0) setFollowUpQuestions(latestFollowUpQuestions)
    if (latestStatus !== null) setSearchStatus(latestStatus)

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

  const handleApiKeySubmit = () => {
    if (!firecrawlApiKey.trim()) return

    localStorage.setItem("firecrawl-api-key", firecrawlApiKey)
    setHasApiKey(true)
    setShowApiKeyModal(false)
    toast.success("API key saved successfully")

    if (pendingQuery) {
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
      setShowApiKeyModal(true)
      return
    }

    setHasSearched(true)
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
  const effectiveError = isPreview ? previewState!.error : error

  const isChatActive = isPreview || hasSearched || effectiveMessages.length > 0

  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16)_0%,transparent_70%)] animate-float-slow" />
        <div className="absolute -right-28 top-20 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(138,180,248,0.2)_0%,transparent_70%)] animate-float-slower" />
      </div>

      <div className={`relative px-4 sm:px-6 lg:px-8 ${isChatActive ? "pb-4 pt-8" : "pb-12 pt-16"}`}>
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
          </div>

          {!isChatActive && (
            <div className="mt-10 animate-fade-up">
              <StarterQuestions onSelect={sendQuery} isLoading={effectiveLoading} />
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

      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto h-full max-w-7xl">
          {effectiveError && (
            <div className="mb-4">
              <ErrorDisplay
                error={effectiveError as { statusCode?: number; message?: string }}
                context="Search pipeline"
                onRetry={!isPreview ? () => window.location.reload() : undefined}
              />
            </div>
          )}

          {isChatActive && (
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
            />
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
