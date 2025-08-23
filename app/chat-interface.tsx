'use client'

import { useRef, useEffect } from 'react'
import { Send, Loader2, User, Sparkles, FileText, Plus, Copy, RefreshCw, Check, Download, ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SearchResult, NewsResult, ImageResult } from './types'
import { type UIMessage } from 'ai'
import { CharacterCounter } from './character-counter'
import Image from 'next/image'
import { MarkdownRenderer } from './markdown-renderer'
import { StockChart } from './stock-chart'
import { NewsResults } from './news-results'
import { ImageResults } from './image-results'

interface MessageData {
  sources: SearchResult[]
  newsResults?: NewsResult[]
  imageResults?: ImageResult[]
  followUpQuestions: string[]
  ticker?: string
}

// Helper function to extract text content from UIMessage
function getMessageContent(message: UIMessage): string {
  if (!message.parts) return ''
  return message.parts
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text)
    .join('')
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
}

export function ChatInterface({ messages, sources, newsResults, imageResults, followUpQuestions, searchStatus, isLoading, input, handleInputChange, handleSubmit, messageData, currentTicker }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  
  // Simple theme detection based on document class
  const theme = typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  
  // Extract the current query and check if we're waiting for response
  let query = ''
  let isWaitingForResponse = false
  
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1]
    const secondLastMessage = messages[messages.length - 2]
    
    if (lastMessage.role === 'user') {
      // Waiting for response to this user message
      query = getMessageContent(lastMessage)
      isWaitingForResponse = true
    } else if (secondLastMessage?.role === 'user' && lastMessage.role === 'assistant') {
      // Current conversation pair
      query = getMessageContent(secondLastMessage)
      isWaitingForResponse = false
    }
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const defaultSteps = [
    'Queuing request',
    'Finding sources',
    'Fetching content',
    'Cross-checking',
    'Composing answer'
  ]
  const envSteps = (process.env.NEXT_PUBLIC_LOADING_STEPS || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
  const steps = envSteps.length ? envSteps : defaultSteps
  type Speed = 'slow' | 'normal' | 'fast'
  const [speed, setSpeed] = useState<Speed>('normal')
  const [cycleMs, setCycleMs] = useState<number>(1000)
  const [activeStep, setActiveStep] = useState(0)
  const [processingStartAt, setProcessingStartAt] = useState<number | null>(null)
  const [estimatedTotal, setEstimatedTotal] = useState<number>(12)
  const [eta, setEta] = useState<number>(12)
  const [progress, setProgress] = useState<number>(0)
  
  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    
    // Always scroll to bottom when new messages arrive
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }, 100)
  }, [messages, sources, followUpQuestions])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    handleSubmit(e)
    
    // Scroll to bottom after submitting
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  const handleFollowUpClick = (question: string) => {
    // Set the input and immediately submit
    handleInputChange({ target: { value: question } } as React.ChangeEvent<HTMLTextAreaElement>)
    // Submit the form after a brief delay to ensure input is set
    setTimeout(() => {
      formRef.current?.requestSubmit()
    }, 50)
  }

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const handleRewrite = () => {
    // Get the last user message and resubmit it
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      handleInputChange({ target: { value: getMessageContent(lastUserMessage) } } as React.ChangeEvent<HTMLTextAreaElement>)
      // Submit the form
      setTimeout(() => {
        formRef.current?.requestSubmit()
      }, 100)
    }
  }

  // -------- Research utilities: export and citations --------
  const getLastAssistantContent = (): string => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    return lastAssistant ? getMessageContent(lastAssistant) : ''
  }

  const exportMarkdown = () => {
    const answer = getLastAssistantContent()
    if (!query && !answer) return
    const lines: string[] = []
    if (query) lines.push(`# ${query}`)
    if (answer) {
      if (lines.length) lines.push('')
      lines.push(answer)
    }
    if (sources.length > 0) {
      lines.push('', '## Sources')
      sources.forEach((s, i) => {
        const site = s.siteName || (s.url ? new URL(s.url).hostname.replace('www.', '') : '')
        lines.push(`${i + 1}. [${s.title || s.url}](${s.url})${site ? ` — ${site}` : ''}`)
      })
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'fireplexity-research.md'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportJSON = () => {
    const data = {
      query,
      answer: getLastAssistantContent(),
      sources
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'fireplexity-research.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyCitations = () => {
    if (sources.length === 0) return
    const text = sources.map((s, i) => {
      const site = s.siteName || (s.url ? new URL(s.url).hostname.replace('www.', '') : '')
      return `${i + 1}. ${s.title || s.url}${site ? ` — ${site}` : ''}\n${s.url}`
    }).join('\n\n')
    navigator.clipboard.writeText(text)
  }

  const openAllSources = () => {
    if (sources.length === 0) return
    // Opening many tabs can be blocked; open up to 5
    sources.slice(0, 5).forEach(s => window.open(s.url, '_blank'))
  }

  const clearChat = () => {
    // Easiest reset for now
    window.location.href = '/'
  }

  // Cycle active step while waiting/streaming
  // Initialize speed from env or localStorage (env takes precedence)
  useEffect(() => {
    const envSpeed = (process.env.NEXT_PUBLIC_LOADING_SPEED as Speed | undefined) || undefined
    const ls = typeof window !== 'undefined' ? (localStorage.getItem('loading-speed') as Speed | null) : null
    const initial: Speed = envSpeed || ls || 'normal'
    setSpeed(initial)
  }, [])

  // React to speed changes
  useEffect(() => {
    const ms = speed === 'slow' ? 1400 : speed === 'fast' ? 700 : 1000
    setCycleMs(ms)
    if (typeof window !== 'undefined') localStorage.setItem('loading-speed', speed)
  }, [speed])

  useEffect(() => {
    if (!(isWaitingForResponse || isLoading)) return
    const id = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, cycleMs)
    return () => clearInterval(id)
  }, [isWaitingForResponse, isLoading, steps.length, cycleMs])

  // Estimated time + progress tracking tied to processing lifecycle
  useEffect(() => {
    const processing = isWaitingForResponse || isLoading
    if (processing && processingStartAt === null) {
      // Heuristic estimate based on query length (shorter → quicker)
      const len = (query || '').length
      const base = 8
      const extra = Math.min(10, Math.floor(len / 35)) // up to +10s
      const jitter = Math.floor(Math.random() * 3) // 0-2s
      const total = base + extra + jitter
      setEstimatedTotal(total)
      setEta(total)
      setProgress(0)
      setActiveStep(0)
      setProcessingStartAt(Date.now())
    }
    if (!processing && processingStartAt !== null) {
      // Reset after completion
      setProcessingStartAt(null)
      setEta(0)
      setProgress(1)
    }
  }, [isWaitingForResponse, isLoading, query, processingStartAt])

  useEffect(() => {
    if (processingStartAt === null) return
    const id = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - processingStartAt) / 1000)
      const remaining = Math.max(0, estimatedTotal - elapsedSec)
      setEta(remaining)
      const p = Math.min(0.95, elapsedSec / Math.max(1, estimatedTotal))
      setProgress(p)
    }, 1000)
    return () => clearInterval(id)
  }, [processingStartAt, estimatedTotal])


  return (
    <div className="flex h-full relative" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Main content area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top indeterminate progress bar while processing */}
        {(isWaitingForResponse || isLoading) && (
          <div className="pointer-events-none absolute left-0 right-0 top-0">
            <div className="mx-auto max-w-4xl px-4">
              <div className="h-[3px] rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-[width] duration-300"
                  style={{ width: `${Math.max(5, Math.floor(progress * 100))}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Top gradient overlay - removed */}
        
        {/* Scrollable content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pb-36 sm:pb-32 pt-8 scroll-smooth relative scrollbar-hide" 
          style={{ 
            scrollBehavior: 'smooth', 
            overscrollBehavior: 'contain', 
            WebkitOverflowScrolling: 'touch',
            isolation: 'isolate'
          } as React.CSSProperties}
        >
          <div className="max-w-4xl mx-auto space-y-6 pb-8">
          {/* Previous conversations */}
          {messages.length > 2 && (
            <>
              {/* Group messages in pairs (user + assistant) */}
              {(() => {
                const pairs: Array<{user: UIMessage, assistant?: UIMessage}> = []
                for (let i = 0; i < messages.length - 2; i += 2) {
                  pairs.push({
                    user: messages[i],
                    assistant: messages[i + 1]
                  })
                }
                return pairs
              })().map((pair, pairIndex) => {
                const assistantIndex = pairIndex
                const storedData = messageData?.get(assistantIndex)
                const messageSources = storedData?.sources || []
                const messageFollowUpQuestions = storedData?.followUpQuestions || []
                const messageTicker = storedData?.ticker || null
                
                return (
                  <div key={pairIndex} className="space-y-6">
                    {/* User message */}
                    {pair.user && (
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{getMessageContent(pair.user)}</h2>
                      </div>
                    )}
                    {pair.assistant && (
                      <>
                        {/* Sources - Show for each assistant response */}
                        {messageSources.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-black dark:text-white" />
                                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources</h2>
                              </div>
                              {messageSources.length > 5 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">+{messageSources.length - 5} more</span>
                                  <div className="flex -space-x-2">
                                    {messageSources.slice(5, 10).map((result, idx) => (
                                      <div key={idx} className="w-5 h-5 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                                        {result.favicon ? (
                                          <Image
                                            src={result.favicon}
                                            alt=""
                                            width={16}
                                            height={16}
                                            className="w-4 h-4 object-contain"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement
                                              target.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                          </svg>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {messageSources.slice(0, 5).map((result, idx) => (
                                <a
                                  key={idx}
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md h-28"
                                >
                                  {/* Background image */}
                                  {result.image && (
                                    <div className="absolute inset-0">
                                      <Image
                                        src={result.image}
                                        alt=""
                                        fill
                                        sizes="(max-width: 640px) 20vw, (max-width: 1024px) 16vw, 12vw"
                                        className="object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                        }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Semi-transparent overlay for text visibility */}
                                  <div className="absolute inset-0 bg-white/90 dark:bg-zinc-800/90" />
                                  
                                  {/* Content */}
                                  <div className="relative p-3 flex flex-col justify-between h-full">
                                    {/* Favicon and domain */}
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex-shrink-0 w-4 h-4 bg-white dark:bg-zinc-700 rounded flex items-center justify-center overflow-hidden">
                                        {result.favicon ? (
                                          <Image
                                            src={result.favicon}
                                            alt=""
                                            width={12}
                                            height={12}
                                            className="w-3 h-3 object-contain"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement
                                              target.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                          </svg>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-600 dark:text-gray-300 truncate flex-1 font-medium">
                                        {result.siteName || new URL(result.url).hostname.replace('www.', '')}
                                      </p>
                                    </div>
                                    
                                    {/* Title */}
                                    <h3 className="font-medium text-xs text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                                      {result.title}
                                    </h3>
                                    
                                    {/* Character count */}
                                    <div className="mt-1">
                                      <CharacterCounter 
                                        targetCount={result.markdown?.length || result.content?.length || 0} 
                                        duration={2000}
                                      />
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        
                        {/* Stock Chart - Show if ticker is available */}
                        {messageTicker && (
                          <div className="mb-6">
                            <StockChart ticker={messageTicker} theme={theme} />
                          </div>
                        )}
                        
                        {/* Answer */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-black dark:text-white" />
                              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Answer</h2>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopy(pair.assistant ? getMessageContent(pair.assistant) : '', `message-${pairIndex}`)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                title={copiedMessageId === `message-${pairIndex}` ? "Copied!" : "Copy response"}
                              >
                                {copiedMessageId === `message-${pairIndex}` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="prose prose-gray max-w-none dark:prose-invert prose-sm sm:prose-base break-words overflow-hidden">
                            <MarkdownRenderer 
                              content={pair.assistant ? getMessageContent(pair.assistant) : ''}
                              sources={messageSources}
                            />
                          </div>
                        </div>
                        
                        {/* Related Questions - Show after each assistant response */}
                        {messageFollowUpQuestions.length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="h-4 w-4 text-black dark:text-white" />
                              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Related</h2>
                            </div>
                            <div className="space-y-2">
                              {messageFollowUpQuestions.map((question, qIndex) => (
                                <button
                                  key={qIndex}
                                  onClick={() => handleFollowUpClick(question)}
                                  className="w-full text-left p-2 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md group"
                                >
                                  <div className="flex items-start gap-2">
                                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 break-words">
                                      {question}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Current conversation - always at the bottom */}
          {/* Current Query display */}
          {query && (messages.length <= 2 || messages[messages.length - 1]?.role === 'user' || messages[messages.length - 1]?.role === 'assistant') && (
            <div className="opacity-0 animate-fade-up [animation-duration:500ms] [animation-fill-mode:forwards]">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">{query}</h1>
            </div>
          )}

          {/* Status message */}
          {searchStatus && (
            <div className="opacity-0 animate-fade-up [animation-duration:300ms] [animation-fill-mode:forwards] mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{searchStatus}</span>
              </div>
            </div>
          )}

          {/* Research toolbar */}
          {(sources.length > 0 || query) && (
            <div className="opacity-0 animate-fade-up [animation-duration:400ms] [animation-delay:120ms] [animation-fill-mode:forwards] mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={exportMarkdown} className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm">
                  <Download className="h-3.5 w-3.5" /> Export MD
                </button>
                <button onClick={exportJSON} className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm">
                  <FileText className="h-3.5 w-3.5" /> Export JSON
                </button>
                {sources.length > 0 && (
                  <>
                    <button onClick={copyCitations} className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm">
                      <Copy className="h-3.5 w-3.5" /> Copy citations
                    </button>
                    <button onClick={openAllSources} className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm">
                      <ExternalLink className="h-3.5 w-3.5" /> Open top sources
                    </button>
                  </>
                )}
                <div className="ml-auto">
                  <button onClick={clearChat} className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 text-sm">
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sources, Images & News - Animated in first */}
          {(sources.length > 0 || imageResults.length > 0 || newsResults.length > 0) && !isWaitingForResponse && (
            <div className="opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:200ms] [animation-fill-mode:forwards] space-y-4">
              {/* Sources Section */}
              {sources.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-black dark:text-white" />
                      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources</h2>
                    </div>
                {sources.length > 5 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">+{sources.length - 5} more</span>
                    <div className="flex -space-x-2">
                      {sources.slice(5, 10).map((result, index) => (
                        <div key={index} className="w-5 h-5 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                          {result.favicon ? (
                            <Image
                              src={result.favicon}
                              alt=""
                              width={16}
                              height={16}
                              className="w-4 h-4 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {sources.slice(0, 5).map((result, index) => (
                  <a
                    key={index}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md h-28"
                  >
                    {/* Background image */}
                    {result.image && (
                      <div className="absolute inset-0">
                        <Image
                          src={result.image}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 20vw, (max-width: 1024px) 16vw, 12vw"
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Semi-transparent overlay for text visibility */}
                    <div className="absolute inset-0 bg-white/90 dark:bg-zinc-800/90" />
                    
                    {/* Content */}
                    <div className="relative p-3 flex flex-col justify-between h-full">
                      {/* Favicon and domain */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex-shrink-0 w-4 h-4 bg-white dark:bg-zinc-700 rounded flex items-center justify-center overflow-hidden">
                          {result.favicon ? (
                            <Image
                              src={result.favicon}
                              alt=""
                              width={12}
                              height={12}
                              className="w-3 h-3 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 truncate flex-1 font-medium">
                          {result.siteName || new URL(result.url).hostname.replace('www.', '')}
                        </p>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-medium text-xs text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                        {result.title}
                      </h3>
                      
                      {/* Character count */}
                      <div className="mt-1">
                        <CharacterCounter 
                          targetCount={result.markdown?.length || result.content?.length || 0} 
                          duration={2000}
                        />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
                </div>
              )}
              
              {/* Images Section - Grouped with Sources */}
              {imageResults.length > 0 && (
                <div className="lg:hidden">
                  <ImageResults results={imageResults} isLoading={false} />
                </div>
              )}
              
              {/* News Section - Grouped with Sources and Images */}
              {newsResults.length > 0 && (
                <div className="lg:hidden">
                  <NewsResults results={newsResults} isLoading={false} />
                </div>
              )}
            </div>
          )}


          {/* Stock Chart - Show if ticker is available */}
          {currentTicker && messages.length > 0 && messages[messages.length - 2]?.role === 'user' && (
            <div className="opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:200ms] [animation-fill-mode:forwards] mb-6">
              <StockChart ticker={currentTicker} theme={theme} />
            </div>
          )}

          {/* AI Answer - Streamed in */}
          {messages.length > 0 && messages[messages.length - 2]?.role === 'user' && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="opacity-0 animate-fade-up [animation-duration:500ms] [animation-fill-mode:forwards]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-black dark:text-white" />
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Answer</h2>
                </div>
                {!isLoading && (
                  <div className="flex items-center gap-1 opacity-0 animate-fade-in [animation-duration:300ms] [animation-delay:200ms] [animation-fill-mode:forwards]">
                    <button
                      onClick={() => handleCopy(getMessageContent(messages[messages.length - 1]), 'current-message')}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title={copiedMessageId === 'current-message' ? "Copied!" : "Copy response"}
                    >
                      {copiedMessageId === 'current-message' ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleRewrite}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Rewrite response"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <div className="prose prose-gray max-w-none dark:prose-invert prose-sm sm:prose-base prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-zinc-900 break-words overflow-hidden">
                  <MarkdownRenderer 
                    content={getMessageContent(messages[messages.length - 1])}
                    sources={sources}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Engaging processing panel while streaming */}
          {(isWaitingForResponse || isLoading) && messages[messages.length - 1]?.role === 'user' && (
            <div className="opacity-0 animate-fade-up [animation-duration:500ms] [animation-fill-mode:forwards] space-y-5">
              {/* Stepper */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Research in progress</h2>
                  </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {eta > 0 ? `~${eta}s remaining` : 'Working…'}
                  </div>
                  {((process.env.NEXT_PUBLIC_LOADING_CONTROLS || 'on') !== 'hidden') && (
                    <div className="hidden sm:flex items-center gap-1">
                      <span className="text-[10px]">Speed</span>
                      {(['slow','normal','fast'] as Speed[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpeed(s)}
                          className={`px-1.5 py-0.5 rounded border text-[10px] leading-none transition-colors ${speed === s ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'}`}
                          title={`${s} cycle`}
                        >
                          {s[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {steps.map((label, i) => (
                    <div key={label} className={`rounded-lg border text-xs px-3 py-2 transition-colors ${i === activeStep ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900'}`}>
                      {i <= activeStep ? '•' : '○'} {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources skeleton */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-black dark:text-white" />
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sources</h2>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="h-28 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 animate-shimmer" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer skeleton */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-black dark:text-white" />
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Answer</h2>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-zinc-900">
                  <div className="h-4 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 animate-shimmer mb-2" />
                  <div className="h-4 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 animate-shimmer mb-2 w-11/12" />
                  <div className="h-4 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 animate-shimmer mb-2 w-10/12" />
                  <div className="h-4 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 animate-shimmer w-7/12" />
                </div>
              </div>
            </div>
          )}

          {/* Follow-up Questions - Show after answer completes */}
          {followUpQuestions.length > 0 && !isWaitingForResponse && (
            <div className="opacity-0 animate-fade-up [animation-duration:300ms] [animation-fill-mode:forwards]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-black dark:text-white" />
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Related</h2>
              </div>
              <div className="space-y-2">
                {followUpQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleFollowUpClick(question)}
                    className="w-full text-left p-2 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md group"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {question}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed input at bottom */}
      <div className="fixed lg:absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white dark:from-zinc-900 dark:via-zinc-900 to-transparent pt-4 pb-4 sm:pt-6 sm:pb-6 z-30">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8">
          <form onSubmit={handleFormSubmit} ref={formRef}>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 focus-within:border-gray-900 dark:focus-within:border-gray-100 transition-colors">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      formRef.current?.requestSubmit()
                    }
                  }}
                  placeholder="Ask a follow-up question..."
                  className="resize-none border-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 py-2 pr-2 shadow-none focus-visible:ring-0 focus-visible:border-0"
                  rows={1}
                  style={{
                    minHeight: '36px',
                    maxHeight: '100px',
                    scrollbarWidth: 'thin',
                    boxShadow: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-0 flex items-center justify-center rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 group"
                >
                  <div className="w-[48px] h-[32px] flex items-center justify-center">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <svg 
                        fill="none" 
                        height="18" 
                        viewBox="0 0 20 20" 
                        width="18" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-white"
                      >
                        <path 
                          d="M11.6667 4.79163L16.875 9.99994M16.875 9.99994L11.6667 15.2083M16.875 9.99994H3.125" 
                          stroke="currentColor" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>
            {(isWaitingForResponse || isLoading) && (
              <div className="mt-2 flex items-center gap-3 px-1">
                <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.floor(progress * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{eta > 0 ? `~${eta}s` : '...'}</div>
              </div>
            )}
          </form>
        </div>
        
      </div>
    </div>
    
    {/* Right sidebar for news and images - Hidden on mobile, shown on large screens */}
      {(newsResults.length > 0 || imageResults.length > 0 || (isLoading && messages.length > 0)) && (
        <div className="hidden lg:block w-80 min-w-[320px] bg-transparent overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {/* Image Results - Now at the top */}
          <ImageResults results={imageResults} isLoading={isLoading && imageResults.length === 0} />
          
          {/* News Results */}
          <NewsResults results={newsResults} isLoading={isLoading && newsResults.length === 0} />
        </div>
      )}
    </div>
  )
}
