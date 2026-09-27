"use client"

import { useEffect, useRef, useState } from "react"
import { Headphones, Loader2, Pause, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, "0")}`
}

const SPEEDS = [1, 1.25, 1.5, 2]

interface AudioNarrationProps {
  text: string
  audioKey: string
}

export function AudioNarration({ text, audioKey }: AudioNarrationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [provider, setProvider] = useState<string | null>(null)

  const revokeAudio = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }

  useEffect(() => {
    setPhase("idle")
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setProvider(null)
    revokeAudio()
    // New answer text invalidates any previous narration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioKey])

  useEffect(() => {
    return () => revokeAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generate = async () => {
    if (!text.trim() || phase === "loading") return
    setPhase("loading")
    try {
      const response = await fetch("/api/az-labs-research/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 6000) }),
        signal: AbortSignal.timeout(90000),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || `Narration failed (${response.status})`)
      }
      const blob = await response.blob()
      revokeAudio()
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audio.preload = "auto"
      audio.playbackRate = SPEEDS[speedIndex]
      audio.onloadedmetadata = () => setDuration(audio.duration || 0)
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => {
        setPhase("error")
        setPlaying(false)
      }
      audioRef.current = audio
      setProvider(response.headers.get("X-TTS-Provider"))
      setPhase("ready")
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    } catch (error) {
      setPhase("error")
      toast.error(error instanceof Error ? error.message : "Narration failed")
    }
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false)
      )
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length
    setSpeedIndex(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    const value = Number(event.target.value)
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = (value / 100) * audio.duration
    setCurrentTime(audio.currentTime)
  }

  const close = () => {
    revokeAudio()
    setPhase("idle")
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setProvider(null)
  }

  if (phase === "idle" || phase === "error") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void generate()}
        className="h-8 gap-1.5 text-xs"
        title="Listen to this answer"
      >
        <Headphones className="h-3.5 w-3.5" />
        {phase === "error" ? "Retry audio" : "Listen"}
      </Button>
    )
  }

  if (phase === "loading") {
    return (
      <div className="flex h-8 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[var(--surface-container-low)] px-3 text-xs text-[var(--on-surface-variant)] animate-fade-in">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary-accent)]" />
        Voicing answer…
      </div>
    )
  }

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className="flex h-8 max-w-full items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary-accent)_35%,transparent)] bg-[var(--surface-container-low)] py-1 pl-1 pr-2 animate-fade-in">
      <button
        type="button"
        onClick={togglePlay}
        className="focus-ring flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-accent)] text-white transition-transform hover:scale-105 active:scale-95"
        aria-label={playing ? "Pause narration" : "Play narration"}
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="ml-px h-3 w-3" />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={progress}
        onChange={seek}
        className="focus-ring h-1 w-20 cursor-pointer appearance-none rounded-full bg-[hsl(var(--muted))] accent-[var(--primary-accent)] sm:w-28"
        aria-label="Seek narration"
      />
      <span className="whitespace-nowrap font-mono text-[10px] text-[var(--on-surface-variant)]">
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>
      <button
        type="button"
        onClick={cycleSpeed}
        className="focus-ring rounded px-1 font-mono text-[10px] font-semibold text-[var(--primary-accent)] hover:text-[var(--primary-accent-strong)]"
        aria-label="Narration speed"
        title="Playback speed"
      >
        {SPEEDS[speedIndex]}×
      </button>
      {provider && (
        <span className="hidden whitespace-nowrap text-[10px] capitalize text-[var(--on-surface-variant)] md:inline">
          {provider.startsWith("elevenlabs") ? "ElevenLabs" : provider}
        </span>
      )}
      <button
        type="button"
        onClick={close}
        className="focus-ring rounded-full p-0.5 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
        aria-label="Close narration"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
