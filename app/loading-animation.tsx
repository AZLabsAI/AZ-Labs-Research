"use client"

import { useEffect, useMemo, useState } from "react"
import { Sparkles } from "lucide-react"

interface LoadingAnimationProps {
  speed?: "slow" | "normal" | "fast"
  estimatedTime?: number
}

const RESEARCH_STEPS = [
  "Queuing request",
  "Collecting sources",
  "Comparing evidence",
  "Drafting answer",
  "Finalizing response",
]

export function LoadingAnimation({ speed = "normal", estimatedTime = 10 }: LoadingAnimationProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  const frameDuration = speed === "slow" ? 1300 : speed === "fast" ? 600 : 900

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        key: index,
        left: `${8 + (index * 7) % 84}%`,
        top: `${10 + (index * 11) % 76}%`,
        delay: `${(index % 6) * 0.3}s`,
      })),
    []
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % RESEARCH_STEPS.length)
    }, frameDuration)
    return () => clearInterval(interval)
  }, [frameDuration])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const progress = Math.min(95, (elapsedTime / Math.max(estimatedTime, 1)) * 100)
  const eta = Math.max(0, estimatedTime - elapsedTime)

  return (
    <div className="surface-panel relative overflow-hidden rounded-[var(--radius-card)] p-4 sm:p-6 animate-fade-up" aria-live="polite">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--on-surface)]">Research in progress</p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            {RESEARCH_STEPS[activeStep]}{eta > 0 ? ` · ~${eta}s left` : ""}
          </p>
        </div>
        <Sparkles className="h-4 w-4 text-[var(--primary-accent)]" />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary-accent)] via-[#5a95ef] to-[#8ab4f8] transition-[width] duration-500"
          style={{ width: `${Math.max(8, Math.floor(progress))}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2">
        {RESEARCH_STEPS.map((step, index) => (
          <li
            key={step}
            className={`rounded-[var(--radius-sm)] border px-3 py-2 text-xs transition-colors ${
              index <= activeStep
                ? "border-[color-mix(in_srgb,var(--primary-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--primary-accent)_12%,transparent)] text-[var(--on-surface)]"
                : "border-[hsl(var(--border))] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] text-[var(--on-surface-variant)]"
            }`}
          >
            {step}
          </li>
        ))}
      </ol>

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.key}
            className="absolute h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary-accent)_45%,transparent)] animate-float"
            style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }}
          />
        ))}
      </div>
    </div>
  )
}
