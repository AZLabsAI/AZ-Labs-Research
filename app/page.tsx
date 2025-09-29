'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { SearchComponent } from './search'
import { StarterQuestions } from './starter-questions'
import { ChatInterface } from './chat-interface'
import { SearchResult, NewsResult, ImageResult } from './types'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ErrorDisplay } from '@/components/error-display'

interface MessageData {
  sources: SearchResult[]
  newsResults?: NewsResult[]
  imageResults?: ImageResult[]
  followUpQuestions: string[]
  ticker?: string
}

export default function AZLabsResearchPage() {
  const [sources, setSources] = useState<SearchResult[]>([])
  const [newsResults, setNewsResults] = useState<NewsResult[]>([])
  const [imageResults, setImageResults] = useState<ImageResult[]>([])
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [searchStatus, setSearchStatus] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const lastDataLength = useRef(0)
  const [messageData, setMessageData] = useState<Map<number, MessageData>>(new Map())
  const currentMessageIndex = useRef(0)
  const [currentTicker, setCurrentTicker] = useState<string | null>(null)
  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>('')
  const [hasApiKey, setHasApiKey] = useState<boolean>(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false)
  const [, setIsCheckingEnv] = useState<boolean>(true)
  const [pendingQuery, setPendingQuery] = useState<string>('')
  const [input, setInput] = useState<string>('')
  const [isSourcesComplete, setIsSourcesComplete] = useState<boolean>(false)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/az-labs-research/search',
      body: firecrawlApiKey ? { firecrawlApiKey } : undefined
    })
  })
  
  // Single consolidated effect for handling streaming data
  useEffect(() => {
    // Handle response start
    if (status === 'streaming' && messages.length > 0) {
      const assistantMessages = messages.filter(m => m.role === 'assistant')
      const newIndex = assistantMessages.length
      
      // Only clear if we're starting a new message
      if (newIndex !== currentMessageIndex.current) {
        setSearchStatus('')
        setSources([])
        setNewsResults([])
        setImageResults([])
        setFollowUpQuestions([])
        setCurrentTicker(null)
        setIsSourcesComplete(false)
        currentMessageIndex.current = newIndex
        lastDataLength.current = 0  // Reset data tracking for new message
      }
    }
    
    // Handle data parts from messages
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage.parts || lastMessage.parts.length === 0) return
      
      // Check if we've already processed this data
      const partsLength = lastMessage.parts.length
      if (partsLength === lastDataLength.current) return
      lastDataLength.current = partsLength
      
      // Process ALL parts to accumulate data
      let hasSourceData = false
      let latestSources: SearchResult[] = []
      let latestNewsResults: NewsResult[] = []
      let latestImageResults: ImageResult[] = []
      let latestTicker: string | null = null
      let latestFollowUpQuestions: string[] = []
      let latestStatus: string | null = null
      
      lastMessage.parts.forEach((part: any) => {
        // Handle different data part types
        if (part.type === 'data-sources' && part.data) {
          hasSourceData = true
          // Use the latest data from this part
          if (part.data.sources) latestSources = part.data.sources
          if (part.data.newsResults) latestNewsResults = part.data.newsResults
          if (part.data.imageResults) latestImageResults = part.data.imageResults
        }
        
        if (part.type === 'data-ticker' && part.data) {
          latestTicker = part.data.symbol
        }
        
        if (part.type === 'data-followup' && part.data && part.data.questions) {
          latestFollowUpQuestions = part.data.questions
        }
        
        if (part.type === 'data-status' && part.data) {
          latestStatus = part.data.message || ''
          // Check if sources are complete
          if (part.data.isComplete) {
            setIsSourcesComplete(true)
          }
        }
      })
      
      // Apply updates
      if (hasSourceData) {
        setSources(latestSources)
        setNewsResults(latestNewsResults)
        setImageResults(latestImageResults)
      }
      if (latestTicker !== null) setCurrentTicker(latestTicker)
      if (latestFollowUpQuestions.length > 0) setFollowUpQuestions(latestFollowUpQuestions)
      if (latestStatus !== null) setSearchStatus(latestStatus)
      
      // Update message data map
      if (hasSourceData || latestTicker !== null || latestFollowUpQuestions.length > 0) {
        setMessageData(prevMap => {
          const newMap = new Map(prevMap)
          const existingData = newMap.get(currentMessageIndex.current) || { sources: [], followUpQuestions: [] }
          newMap.set(currentMessageIndex.current, {
            ...existingData,
            ...(hasSourceData && { 
              sources: latestSources,
              newsResults: latestNewsResults,
              imageResults: latestImageResults
            }),
            ...(latestTicker !== null && { ticker: latestTicker }),
            ...(latestFollowUpQuestions.length > 0 && { followUpQuestions: latestFollowUpQuestions })
          })
          return newMap
        })
      }
    }
  // Fixed dependency array - only track essential values
  }, [status, messages.length])

  // Check for environment variables on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch('/api/az-labs-research/check-env')
        const data = await response.json()
        
        if (data.hasFirecrawlKey) {
          setHasApiKey(true)
        } else {
          // Check localStorage for user's API key
          const storedKey = localStorage.getItem('firecrawl-api-key')
          if (storedKey) {
            setFirecrawlApiKey(storedKey)
            setHasApiKey(true)
          }
        }
      } catch (error) {
        // Error checking environment
      } finally {
        setIsCheckingEnv(false)
      }
    }
    
    checkApiKey()
  }, [])

  const handleApiKeySubmit = () => {
    if (firecrawlApiKey.trim()) {
      localStorage.setItem('firecrawl-api-key', firecrawlApiKey)
      setHasApiKey(true)
      setShowApiKeyModal(false)
      toast.success('API key saved successfully!')
      
      // If there's a pending query, submit it
      if (pendingQuery) {
        sendMessage({ text: pendingQuery })
        setPendingQuery('')
      }
    }
  }

  const sendQuery = (query: string) => {
    if (!query.trim()) return
    // Check if we have an API key
    if (!hasApiKey) {
      setPendingQuery(query)
      setShowApiKeyModal(true)
      return
    }
    setHasSearched(true)
    sendMessage({ text: query })
    setInput('')
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendQuery(input)
  }
  
  // Wrapped submit handler for chat interface
  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Store current data in messageData before new query
    if (messages.length > 0 && sources.length > 0) {
      const assistantMessages = messages.filter(m => m.role === 'assistant')
      const lastAssistantIndex = assistantMessages.length - 1
      if (lastAssistantIndex >= 0) {
        const newMap = new Map(messageData)
        newMap.set(lastAssistantIndex, {
          sources: sources,
          newsResults: newsResults,
          imageResults: imageResults,
          followUpQuestions: followUpQuestions,
          ticker: currentTicker || undefined
        })
        setMessageData(newMap)
      }
    }
    
    // Use common sender (will handle API key & state)
    sendQuery(input)
  }

  const isChatActive = hasSearched || messages.length > 0

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 dark:from-slate-950 dark:via-gray-900 dark:to-cyan-950/30 relative overflow-hidden">
      {/* Enhanced Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-l from-purple-500/12 to-pink-500/12 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-t from-indigo-500/10 to-violet-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)] dark:bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)]"></div>
      </div>
      
      {/* Hero section */}
      <div className={`relative px-4 sm:px-6 lg:px-8 pt-8 pb-8 ${isChatActive ? 'hidden' : 'block'}`}>        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="mb-6 animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-950/60 dark:to-cyan-950/60 border border-blue-200/60 dark:border-blue-800/50 backdrop-blur-sm shadow-lg shadow-blue-100/25 dark:shadow-blue-900/25 mb-6 hover:shadow-blue-200/40 dark:hover:shadow-blue-800/40 transition-all duration-300">
              <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mr-2 animate-pulse shadow-sm shadow-emerald-500/50"></div>
              <span className="text-xs font-medium bg-gradient-to-r from-blue-700 to-cyan-700 dark:from-blue-300 dark:to-cyan-300 bg-clip-text text-transparent">
                Next-Generation Research Platform • AI-Powered
              </span>
            </div>
          </div>
          
          <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-black tracking-tight leading-[0.85] mb-8 animate-fade-up">
            <span className="block bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 dark:from-blue-400 dark:via-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 transition-all duration-700">
              AZ Labs Research
            </span>
          </h1>
          
          {/* Search Component - moved to hero */}
          <div className="animate-fade-up delay-300 mb-6">
            <SearchComponent 
              handleSubmit={handleSearch}
              input={input}
              handleInputChange={(e) => setInput(e.target.value)}
              isLoading={status === 'streaming'}
            />
          </div>
          
          {/* Starter Questions - right under search */}
          <div className="animate-fade-up delay-400 mb-6">
            <StarterQuestions 
              onSelect={sendQuery}
              isLoading={status === 'streaming'}
            />
          </div>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-full">
          {isChatActive && (
            <ChatInterface 
              messages={messages}
              sources={sources}
              newsResults={newsResults}
              imageResults={imageResults}
              followUpQuestions={followUpQuestions}
              searchStatus={searchStatus}
              isLoading={status === 'streaming'}
              input={input}
              handleInputChange={(e) => setInput(e.target.value)}
              handleSubmit={handleChatSubmit}
              messageData={messageData}
              currentTicker={currentTicker}
            />
          )}
        </div>
      </div>
      
      {/* API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Required</DialogTitle>
            <DialogDescription>
              To use AZ Labs Research, you need a Firecrawl API key for data collection. Get one for free at{' '}
              <a 
                href="https://www.firecrawl.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                firecrawl.dev
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter your API key"
              value={firecrawlApiKey}
              onChange={(e) => setFirecrawlApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleApiKeySubmit()
                }
              }}
              className="h-12"
            />
            <Button onClick={handleApiKeySubmit} variant="blue" className="w-full">
              Save API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
