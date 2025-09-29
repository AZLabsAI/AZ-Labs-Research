'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface LoadingAnimationProps {
  speed?: 'slow' | 'normal' | 'fast'
  estimatedTime?: number
}

const ASCII_FRAMES = [
  // Frame 1 - Search start
  `
    ╔════════════════════╗
    ║   🔍 SEARCHING    ║
    ║   [ ▓▓▓▓░░░░░░ ]  ║
    ╚════════════════════╝
  `,
  // Frame 2 - Finding sources
  `
    ╔════════════════════╗
    ║   📚 ANALYZING    ║
    ║   [ ▓▓▓▓▓▓░░░░ ]  ║
    ╚════════════════════╝
  `,
  // Frame 3 - Processing
  `
    ╔════════════════════╗
    ║   ⚡ PROCESSING   ║
    ║   [ ▓▓▓▓▓▓▓▓░░ ]  ║
    ╚════════════════════╝
  `,
  // Frame 4 - Composing
  `
    ╔════════════════════╗
    ║   ✨ COMPOSING    ║
    ║   [ ▓▓▓▓▓▓▓▓▓▓ ]  ║
    ╚════════════════════╝
  `
]

const MINI_ASCII = [
  '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'
]

const RESEARCH_STEPS = [
  { label: 'Initializing search', icon: '🔎', color: 'text-blue-500' },
  { label: 'Gathering sources', icon: '📡', color: 'text-cyan-500' },
  { label: 'Analyzing content', icon: '🧠', color: 'text-purple-500' },
  { label: 'Cross-referencing', icon: '🔗', color: 'text-indigo-500' },
  { label: 'Generating response', icon: '✨', color: 'text-pink-500' }
]

export function LoadingAnimation({ speed = 'normal', estimatedTime = 10 }: LoadingAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [miniSpinner, setMiniSpinner] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showAscii, setShowAscii] = useState(true)

  const frameDuration = speed === 'slow' ? 1200 : speed === 'fast' ? 400 : 800
  const miniSpinnerDuration = 80

  // Cycle through ASCII frames
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % ASCII_FRAMES.length)
    }, frameDuration)
    return () => clearInterval(interval)
  }, [frameDuration])

  // Cycle through mini spinner
  useEffect(() => {
    const interval = setInterval(() => {
      setMiniSpinner((prev) => (prev + 1) % MINI_ASCII.length)
    }, miniSpinnerDuration)
    return () => clearInterval(interval)
  }, [])

  // Cycle through research steps
  useEffect(() => {
    const stepDuration = (estimatedTime * 1000) / RESEARCH_STEPS.length
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1
        return next >= RESEARCH_STEPS.length ? prev : next
      })
    }, stepDuration)
    return () => clearInterval(interval)
  }, [estimatedTime])

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Toggle ASCII visibility for breathing effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAscii((prev) => !prev)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const progress = Math.min(95, (elapsedTime / estimatedTime) * 100)
  const remainingTime = Math.max(0, estimatedTime - elapsedTime)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Main ASCII Art Display */}
      <div className={`relative transition-opacity duration-700 ${showAscii ? 'opacity-100' : 'opacity-60'}`}>
        <div className="rounded-xl border-2 border-dashed border-blue-400/50 dark:border-blue-600/50 bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-purple-50/50 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-purple-950/30 p-8 backdrop-blur-sm">
          <pre className="font-mono text-sm text-center text-blue-700 dark:text-blue-300 leading-relaxed select-none whitespace-pre">
            {ASCII_FRAMES[currentFrame]}
          </pre>
          
          {/* Animated dots */}
          <div className="text-center mt-4">
            <span className="text-2xl tracking-widest text-blue-600 dark:text-blue-400 animate-pulse">
              {MINI_ASCII[miniSpinner]}
            </span>
          </div>
        </div>

        {/* Floating sparkles */}
        <div className="absolute -top-2 -right-2 animate-bounce">
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="absolute -bottom-2 -left-2 animate-bounce delay-300">
          <Sparkles className="h-5 w-5 text-pink-500" />
        </div>
      </div>

      {/* Progress Bar with Gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">Progress</span>
          <span className="tabular-nums">{Math.floor(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Research Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
          <span className="font-medium">Research Pipeline</span>
          {remainingTime > 0 && (
            <span className="tabular-nums">~{remainingTime}s remaining</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          {RESEARCH_STEPS.map((step, index) => (
            <div
              key={index}
              className={`
                relative rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-500
                ${
                  index <= currentStep
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 shadow-sm'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`text-base ${index === currentStep ? 'animate-bounce' : ''}`}>
                  {step.icon}
                </span>
                <span className={index <= currentStep ? step.color : 'text-gray-500 dark:text-gray-400'}>
                  {step.label}
                </span>
              </div>
              
              {/* Active indicator */}
              {index === currentStep && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-ping" />
              )}
              
              {/* Completed checkmark */}
              {index < currentStep && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fun Facts Carousel */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-zinc-900/50 p-4">
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            💡 Did you know? This AI can analyze multiple sources simultaneously...
          </p>
        </div>
      </div>

      {/* Particle Effect Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
