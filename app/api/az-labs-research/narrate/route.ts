import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Narration for generated answers. Chain: ElevenLabs keys in quota order, then
// Fish Audio (free OpenRouter route) as the final fallback. Keys stay server-side.
const NARRATE_MAX_CHARS = 3000
const ATTEMPT_TIMEOUT_MS = 45000
const ELEVENLABS_MODEL = process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5'
const ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE_ID || ''
const FISH_MODEL = process.env.FISH_TTS_MODEL || 'fish-audio/s2.1-pro-free:free'
const FISH_VOICE = process.env.FISH_VOICE_ID || 'alloy'

function elevenLabsKeys(): string[] {
  const list = (process.env.ELEVENLABS_API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
  const single = (process.env.ELEVENLABS_API_KEY || '').trim()
  if (single && !list.includes(single)) list.push(single)
  return [...new Set(list)]
}

// Strip markdown/formatting so the voice reads clean prose, not syntax.
function cleanForSpeech(markdown: string): string {
  let text = markdown
  text = text.replace(/```[\s\S]*?```/g, ' ') // fenced code
  text = text.replace(/`([^`]*)`/g, '$1') // inline code
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep text
  text = text.replace(/^#{1,6}\s+/gm, '') // headings
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
  text = text.replace(/(\*|_)(.*?)\1/g, '$2') // italic
  text = text.replace(/\[Previous-\d+\]/g, '') // previous-source citations
  text = text.replace(/\[(\d+(?:,\s*\d+)*)\]/g, '') // numeric citations
  text = text.replace(/^\s*[-*+]\s+/gm, '') // bullets
  text = text.replace(/^\s*\d+[.)]\s+/gm, '') // numbered lists
  text = text.replace(/\|/g, ' ') // tables
  text = text.replace(/<[^>]*>/g, ' ') // html
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

function truncateAtSentence(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('\n\n')
  )
  if (lastEnd > max * 0.5) return slice.slice(0, lastEnd + 1).trim()
  return `${slice.trim()}…`
}

async function tryElevenLabs(text: string, apiKey: string): Promise<Response> {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      output_format: 'mp3_44100_128'
    }),
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS)
  })
}

async function tryFish(text: string, openRouterKey: string): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://research.azlabs.ai',
      'X-Title': 'AZ Labs Research'
    },
    body: JSON.stringify({
      model: FISH_MODEL,
      input: text,
      voice: FISH_VOICE,
      response_format: 'mp3'
    }),
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS)
  })
}

function audioResponse(buffer: ArrayBuffer, provider: string): Response {
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-TTS-Provider': provider,
      'Cache-Control': 'private, max-age=86400'
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const rawText = typeof body?.text === 'string' ? body.text : ''
    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const text = truncateAtSentence(cleanForSpeech(rawText), NARRATE_MAX_CHARS)
    if (!text) {
      return NextResponse.json({ error: 'Nothing readable to narrate' }, { status: 400 })
    }

    const failures: string[] = []

    // 1. ElevenLabs keys in quota order.
    if (ELEVENLABS_VOICE) {
      for (const [index, apiKey] of elevenLabsKeys().entries()) {
        const label = `elevenlabs#${index + 1}`
        try {
          const res = await tryElevenLabs(text, apiKey)
          if (res.ok) {
            return audioResponse(await res.arrayBuffer(), label)
          }
          failures.push(`${label}:${res.status}`)
          // 400/422 means the request itself is bad; other keys won't help.
          if (res.status === 400 || res.status === 422) break
        } catch (error) {
          failures.push(`${label}:${error instanceof Error ? error.name : 'error'}`)
        }
      }
    } else {
      failures.push('elevenlabs:no-voice-configured')
    }

    // 2. Fish Audio fallback (free OpenRouter route).
    const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim()
    if (openRouterKey) {
      try {
        const res = await tryFish(text, openRouterKey)
        if (res.ok) {
          return audioResponse(await res.arrayBuffer(), 'fish')
        }
        failures.push(`fish:${res.status}`)
      } catch (error) {
        failures.push(`fish:${error instanceof Error ? error.name : 'error'}`)
      }
    } else {
      failures.push('fish:no-key-configured')
    }

    return NextResponse.json(
      { error: 'All narration providers failed', detail: failures.join(', ') },
      { status: 502 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Narration failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
