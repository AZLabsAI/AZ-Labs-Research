import { NextResponse } from 'next/server'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, generateText, createUIMessageStream, createUIMessageStreamResponse, convertToModelMessages } from 'ai'
import type { ModelMessage } from 'ai'
import { detectCompanyTicker } from '@/lib/company-ticker-map'
import { selectRelevantContent } from '@/lib/content-selection'

// NOTE: Netlify's Next.js runtime deploys this route into the Node server handler
// (there is no per-route edge function), so the stream must never stall: the proxy
// silently kills connections that go ~10s without flushed bytes, which the UI then
// shows as an infinite loading loop. Heartbeats below keep the stream alive while
// slow calls (Firecrawl, Muse reasoning) are in flight.
export const runtime = 'edge'

const DEFAULT_META_MODEL = 'muse-spark-1.3-contributor'
// Muse Spark reasons before it answers; at default effort the first token took ~19s on a
// full source set, past the Netlify function limit, so answers default to low effort.
const ANSWER_REASONING_EFFORT = process.env.META_REASONING_EFFORT || 'low'

// Flush a transient status chunk this often while awaiting slow calls. Must stay well
// under the ~10s silent-kill stall window.
const HEARTBEAT_INTERVAL_MS = 4000
// Upper bound for the Firecrawl call; exceeding it fails fast with a data-error part
// (rendered by the client) instead of hanging until the connection is killed.
const FIRECRAWL_TIMEOUT_MS = 25000
// Follow-ups are optional; skip them rather than delaying stream completion.
const FOLLOWUP_TIMEOUT_MS = 12000

let heartbeatSeq = 0

type StreamWriter = {
  write: (chunk: {
    type: `data-${string}`
    id?: string
    data: unknown
    transient?: boolean
  }) => void
}

function startHeartbeat(writer: StreamWriter, messages: string[]): () => void {
  const timer = setInterval(() => {
    try {
      heartbeatSeq += 1
      writer.write({
        type: 'data-status',
        id: `heartbeat-${heartbeatSeq}`,
        data: { message: messages[heartbeatSeq % messages.length] },
        transient: true
      })
    } catch {
      clearInterval(timer)
    }
  }, HEARTBEAT_INTERVAL_MS)
  const maybeUnref = (timer as unknown as { unref?: () => void }).unref
  if (typeof maybeUnref === 'function') maybeUnref.call(timer)
  return () => clearInterval(timer)
}

function safeHostname(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const body = await request.json()
    const messages = body.messages || []
    
    // Extract query from v5 message structure (messages have parts array)
    let query = body.query
    if (!query && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.parts) {
        // v5 structure
        const textParts = lastMessage.parts.filter((p: any) => p.type === 'text')
        query = textParts.map((p: any) => p.text).join(' ')
      } else if (lastMessage.content) {
        // Fallback for v4 structure
        query = lastMessage.content
      }
    }

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Use API key from request body if provided, otherwise fall back to environment variable
    const firecrawlApiKey = body.firecrawlApiKey || process.env.FIRECRAWL_API_KEY
    const metaApiKey = process.env.META_API_KEY
    const metaModel = process.env.META_MODEL || DEFAULT_META_MODEL
    
    if (!firecrawlApiKey) {
      return NextResponse.json({ error: 'Firecrawl API key not configured' }, { status: 500 })
    }
    
    if (!metaApiKey) {
      return NextResponse.json({ error: 'Meta Model API key not configured' }, { status: 500 })
    }

    // Meta Model API (Muse Spark) speaks the OpenAI chat-completions format.
    const meta = createOpenAICompatible({
      name: 'meta',
      baseURL: process.env.META_API_BASE_URL || 'https://api.meta.ai/v1',
      apiKey: metaApiKey,
    })

    // Always perform a fresh search for each query to ensure relevant results
    const isFollowUp = messages.length > 2
    
    // Extract previous conversation context for follow-ups
    let previousContext = ''
    let previousSources: Array<any> = []
    
    if (isFollowUp) {
      // Check if this looks like a contextual follow-up (contains pronouns or is short/incomplete)
      const contextualIndicators = [
        'it', 'this', 'that', 'they', 'them', 'these', 'those', 'which', 'who', 'where', 'when',
        'how', 'why', 'what about', 'and', 'also', 'more', 'further', 'additionally', 'besides',
        'can you', 'could you', 'would you', 'please', 'tell me more', 'explain', 'elaborate',
        'what else', 'anything else', 'other', 'another', 'similar', 'related', 'different'
      ]
      const isContextualFollowUp = contextualIndicators.some(indicator => 
        query.toLowerCase().includes(indicator.toLowerCase())
      ) || query.split(' ').length <= 10 // Slightly longer threshold for contextual queries
      
      console.log(`[${requestId}] Follow-up detected: ${isContextualFollowUp ? 'CONTEXTUAL' : 'NEW_TOPIC'} | Query: "${query}"`);
      
      if (isContextualFollowUp) {
        // Try to extract sources from previous messages
        const previousMessages = messages.slice(0, -1)
        for (const message of previousMessages) {
          if (message.role === 'assistant' && message.parts) {
            for (const part of message.parts) {
              if (part.type === 'data-sources' && part.data) {
                if (part.data.sources) {
                  previousSources = [...previousSources, ...part.data.sources]
                }
              }
            }
          }
        }
        
        // Create context from previous sources
        if (previousSources.length > 0) {
          console.log(`[${requestId}] Found ${previousSources.length} previous sources for contextual follow-up`);
          previousContext = previousSources
            .slice(-3) // Use last 3 previous sources to avoid token limit
            .map((source, index) => {
              const content = source.markdown || source.content || ''
              const relevantContent = selectRelevantContent(content, query, 1000)
              return `[Previous-${index + 1}] ${source.title}\nURL: ${source.url}\n${relevantContent}`
            })
            .join('\n\n---\n\n')
        } else {
          console.log(`[${requestId}] No previous sources found despite being a contextual follow-up`);
        }
      }
    }
    
    // Create a UIMessage stream with custom data parts
    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        try {
          let sources: Array<{
            url: string
            title: string
            description?: string
            content?: string
            markdown?: string
            publishedDate?: string
            author?: string
            image?: string
            favicon?: string
            siteName?: string
          }> = []
          let newsResults: Array<{
            url: string
            title: string
            description?: string
            publishedDate?: string
            source?: string
            image?: string
          }> = []
          let imageResults: Array<{
            url: string
            title: string
            thumbnail?: string
            source?: string
            width?: number
            height?: number
            position?: number
          }> = []
          let context = ''
          
          // Send status updates as transient data parts
          writer.write({
            type: 'data-status',
            id: 'status-1',
            data: { message: '🔍 Starting search...' },
            transient: true
          })
          
          writer.write({
            type: 'data-status',
            id: 'status-2',
            data: { message: '📡 Searching for relevant sources...' },
            transient: true
          })
          
          // Make direct API call to Firecrawl v2 search endpoint. Heartbeats keep the
          // stream alive while slow scrapes run; the timeout fails fast instead of
          // hanging until the connection is silently killed.
          const stopSearchHeartbeat = startHeartbeat(writer, [
            '📡 Searching for relevant sources...',
            '📡 Still searching — slow sites can take a moment...',
            '📡 Gathering and ranking sources...'
          ])
          let searchResponse: Response
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS)
            try {
              searchResponse = await fetch('https://api.firecrawl.dev/v2/search', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${firecrawlApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  query: query,
                  sources: ['web', 'news', 'images'],
                  limit: 6,
                  scrapeOptions: {
                    formats: ['markdown'],
                    onlyMainContent: true,
                    maxAge: 86400000  // 24 hours in milliseconds
                  }
                }),
                signal: controller.signal
              })
            } catch (fetchError) {
              if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                const timeoutError = new Error('Firecrawl search timed out after 25s') as Error & { statusCode?: number }
                timeoutError.statusCode = 504
                throw timeoutError
              }
              throw fetchError
            } finally {
              clearTimeout(timeout)
            }
          } finally {
            stopSearchHeartbeat()
          }

          if (!searchResponse.ok) {
            let detail = searchResponse.statusText
            try {
              const errorData = await searchResponse.json()
              detail = errorData.error || detail
            } catch {
              // Non-JSON error body; keep the status text.
            }
            const apiError = new Error(`Firecrawl API error: ${detail}`) as Error & { statusCode?: number }
            apiError.statusCode = searchResponse.status
            throw apiError
          }

          const searchResult = await searchResponse.json()
          const searchData = searchResult.data || {}
          
          // Extract results from the v2 SDK response
          const webResults = searchData.web || []
          const newsData = searchData.news || []
          const imagesData = searchData.images || []
          
          // Transform web sources metadata
          sources = webResults.map((item: any) => {
            return {
              url: item.url,
              title: item.title || item.url,
              description: item.description || item.snippet,
              content: item.content,
              markdown: item.markdown,
              favicon: item.favicon,
              image: item.ogImage || item.image || item.metadata?.ogImage,  // Add ogImage support
              siteName: safeHostname(item.url)
            };
          }).filter((item: any) => item.url) || []

          // Transform news results - now with correct schema
          newsResults = newsData.map((item: any) => {
            return {
              url: item.url,
              title: item.title,
              description: item.snippet || item.description,
              publishedDate: item.date,  // Direct API returns 'date' field
              source: item.source || safeHostname(item.url),
              image: item.imageUrl  // Direct API returns 'imageUrl' for news thumbnails
            };
          }).filter((item: any) => item.url) || []

          // Transform image results - now with correct schema from direct API
          imageResults = imagesData.map((item: any) => {
            // Verify we have the required fields
            if (!item.url || !item.imageUrl) {
              return null;
            }
            return {
              url: item.url,
              title: item.title || 'Untitled',
              thumbnail: item.imageUrl,  // Direct API returns 'imageUrl' field
              source: safeHostname(item.url),
              width: item.imageWidth,
              height: item.imageHeight,
              position: item.position
            };
          }).filter(Boolean) || []  // Filter out null entries

          // Send sources as a persistent data part. The client only renders metadata
          // (full markdown was 100-900KB per stream and is echoed back on follow-ups),
          // so send a slim payload; full content stays server-side for answer context.
          const clientSources = sources.map((source) => ({
            url: source.url,
            title: source.title,
            description: source.description?.slice(0, 400),
            favicon: source.favicon,
            image: source.image,
            siteName: source.siteName,
            contentLength: (source.markdown || source.content || '').length
          }))
          writer.write({
            type: 'data-sources',
            id: 'sources-1',
            data: {
              sources: clientSources,
              newsResults,
              imageResults
            }
          })
          
          // Small delay to ensure sources render first
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Update status
          writer.write({
            type: 'data-status',
            id: 'status-3',
            data: { message: '🧠 Analyzing sources and generating answer...' },
            transient: true
          })
          
          // Send completion status to indicate we're done loading sources
          writer.write({
            type: 'data-status',
            id: 'status-complete',
            data: { message: 'complete', isComplete: true },
            transient: true
          })
          
          
          // Detect if query is about a company
          const ticker = detectCompanyTicker(query)
          if (ticker) {
            writer.write({
              type: 'data-ticker',
              id: 'ticker-1',
              data: { symbol: ticker }
            })
          }
          
          // Prepare context from sources with intelligent content selection
          const currentContext = sources
            .map((source: { title: string; markdown?: string; content?: string; url: string }, index: number) => {
              const content = source.markdown || source.content || ''
              const relevantContent = selectRelevantContent(content, query, 2000)
              return `[${index + 1}] ${source.title}\nURL: ${source.url}\n${relevantContent}`
            })
            .join('\n\n---\n\n')
          
          // Combine previous context with current sources for follow-ups
          if (isFollowUp && previousContext) {
            context = `PREVIOUS CONVERSATION SOURCES:\n${previousContext}\n\n${'='.repeat(50)}\n\nCURRENT SEARCH SOURCES:\n${currentContext}`
          } else {
            context = currentContext
          }

          
          // Prepare messages for the AI
          let aiMessages: ModelMessage[] = []
          
          if (!isFollowUp) {
            // Initial query with sources
            aiMessages = [
              {
                role: 'system',
                content: `You are a friendly assistant that helps users find information.

                CRITICAL FORMATTING RULE:
                - NEVER use LaTeX/math syntax ($...$) for regular numbers in your response
                - Write ALL numbers as plain text: "1 million" NOT "$1$ million", "50%" NOT "$50\\%$"
                - Only use math syntax for actual mathematical equations if absolutely necessary
                
                RESPONSE STYLE:
                - For greetings (hi, hello), respond warmly and ask how you can help
                - For simple questions, give direct, concise answers
                - For complex topics, provide detailed explanations only when needed
                - Match the user's energy level - be brief if they're brief
                
                FORMAT:
                - Use markdown for readability when appropriate
                - Keep responses natural and conversational
                - Include citations inline as [1], [2], etc. when referencing specific sources
                - Citations should correspond to the source order (first source = [1], second = [2], etc.)
                - Use the format [1] not CITATION_1 or any other format`
              },
              {
                role: 'user',
                content: `Answer this query: "${query}"\n\nBased on these sources:\n${context}`
              }
            ]
          } else {
            // Follow-up question - use both previous and current sources for context
            const hasContextualSources = isFollowUp && previousContext
            aiMessages = [
              {
                role: 'system',
                content: `You are a friendly assistant continuing our conversation.

                CRITICAL FORMATTING RULE:
                - NEVER use LaTeX/math syntax ($...$) for regular numbers in your response
                - Write ALL numbers as plain text: "1 million" NOT "$1$ million", "50%" NOT "$50\\%$"
                - Only use math syntax for actual mathematical equations if absolutely necessary
                
                CONVERSATION CONTINUITY:
                - This is a follow-up question building on our previous conversation
                - The user may refer to previous topics using pronouns like "it", "this", "that"
                - Connect the current question to the previous context naturally
                - Use both previous and current sources to provide comprehensive answers
                
                ${hasContextualSources ? `SOURCE ORGANIZATION:
                - Sources marked [Previous-1], [Previous-2], etc. are from our earlier conversation
                - Sources marked [1], [2], etc. are from the current search
                - When citing, use the appropriate format: [Previous-1] or [1]
                - Feel free to reference both types of sources to build comprehensive answers` : ''}
                
                STYLE:
                - Keep the same conversational tone from before
                - Build on previous context naturally
                - Match the user's communication style
                - Use markdown when it helps clarity
                - Provide complete answers that don't assume the user remembers everything`
              },
              // Include conversation context - convert UIMessages to ModelMessages
              ...convertToModelMessages(messages.slice(0, -1)),
              // Add the current query with combined sources
              {
                role: 'user',
                content: hasContextualSources 
                  ? `This is a follow-up question: "${query}"\n\nReference both the previous conversation sources and new search results as needed:\n\n${context}`
                  : `Answer this query: "${query}"\n\nBased on these sources:\n${context}`
              }
            ]
          }
          
          // Muse reasons before the first token; heartbeat until tokens flow so the
          // stream never stalls long enough to be silently killed.
          const stopAnswerHeartbeat = startHeartbeat(writer, [
            '🧠 Analyzing sources and generating answer...',
            '🧠 Reasoning over the evidence...',
            '🧠 Drafting your answer...'
          ])
          const result = streamText({
            model: meta(metaModel),
            messages: aiMessages,
            temperature: 0.7,
            maxRetries: 2,
            providerOptions: { meta: { reasoningEffort: ANSWER_REASONING_EFFORT } },
            onChunk: () => stopAnswerHeartbeat()
          })

          // Merge the AI stream into our UIMessage stream
          writer.merge(result.toUIMessageStream())

          // Get the full answer for follow-up generation
          let fullAnswer = ''
          try {
            fullAnswer = await result.text
          } finally {
            stopAnswerHeartbeat()
          }

          // Generate follow-up questions (optional: skipped on failure or slowness so
          // the stream still completes promptly with the answer already delivered).
          const stopFollowUpHeartbeat = startHeartbeat(writer, [
            '✨ Preparing follow-up questions...'
          ])
          try {
            const followUpResponse = await Promise.race([
              generateText({
                model: meta(metaModel),
                messages: [
                  {
                    role: 'system',
                    content: `Generate 5 natural follow-up questions based on the query and answer.\n                \n                ONLY generate questions if the query warrants them:\n                - Skip for simple greetings or basic acknowledgments\n                - Create questions that feel natural, not forced\n                - Make them genuinely helpful, not just filler\n                - Focus on the topic and sources available\n                \n+                If the query doesn't need follow-ups, return an empty response.
                  ${isFollowUp ? 'Consider the full conversation history and avoid repeating previous questions.' : ''}
                  Return only the questions, one per line, no numbering or bullets.`
                  },
                  {
                    role: 'user',
                    content: `Query: ${query}\n\nAnswer provided: ${fullAnswer.substring(0, 500)}...\n\n${sources.length > 0 ? `Available sources about: ${sources.map((s: { title: string }) => s.title).join(', ')}\n\n` : ''}Generate 5 diverse follow-up questions that would help the user learn more about this topic from different angles.`
                  }
                ],
                temperature: 0.7,
                maxRetries: 2,
                providerOptions: { meta: { reasoningEffort: 'minimal' } }
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('followup-timeout')), FOLLOWUP_TIMEOUT_MS)
              )
            ])

            // Process follow-up questions
            const followUpQuestions = followUpResponse.text
              .split('\n')
              .map((q: string) => q.trim())
              .filter((q: string) => q.length > 0)
              .slice(0, 5)

            // Send follow-up questions as a data part
            writer.write({
              type: 'data-followup',
              id: 'followup-1',
              data: { questions: followUpQuestions }
            })
          } catch {
            // Follow-ups are optional; the answer was already delivered.
          } finally {
            stopFollowUpHeartbeat()
          }
          
        } catch (error) {
          
          // Handle specific error types
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const statusCode = error && typeof error === 'object' && 'statusCode' in error 
            ? error.statusCode 
            : error && typeof error === 'object' && 'status' in error
            ? error.status
            : undefined
          
          // Provide user-friendly error messages
          const errorResponses: Record<number, { error: string; suggestion?: string }> = {
            401: {
              error: 'Invalid API key',
              suggestion: 'Please check your Firecrawl API key is correct.'
            },
            402: {
              error: 'Insufficient credits',
              suggestion: 'You\'ve run out of Firecrawl credits. Please upgrade your plan.'
            },
            429: {
              error: 'Rate limit exceeded',
              suggestion: 'Too many requests. Please wait a moment and try again.'
            },
            504: {
              error: 'Request timeout',
              suggestion: 'The search took too long. Try a simpler query or fewer sources.'
            }
          }
          
          const errorResponse = statusCode && errorResponses[statusCode as keyof typeof errorResponses] 
            ? errorResponses[statusCode as keyof typeof errorResponses]
            : { error: errorMessage }
          
          writer.write({
            type: 'data-error',
            id: 'error-1',
            data: {
              error: errorResponse.error,
              ...(errorResponse.suggestion ? { suggestion: errorResponse.suggestion } : {}),
              ...(statusCode ? { statusCode } : {})
            },
            transient: true
          })
        }
      }
    })
    
    return createUIMessageStreamResponse({ stream })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    return NextResponse.json(
      { error: 'Search failed', message: errorMessage, details: errorStack },
      { status: 500 }
    )
  }
}

