"use client"

import { useEffect, useState } from "react"

interface CharacterCounterProps {
  targetCount: number
  duration?: number
}

export function CharacterCounter({ targetCount, duration = 1200 }: CharacterCounterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (targetCount <= 0) {
      setCount(0)
      return
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setCount(targetCount)
      return
    }

    const start = performance.now()
    let rafId = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(targetCount * eased))

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setCount(targetCount)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [targetCount, duration])

  return (
    <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
      {count.toLocaleString()} chars
    </span>
  )
}
