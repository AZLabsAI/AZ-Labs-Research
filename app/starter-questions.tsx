'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { MapPin, Loader2, Clock, Thermometer, Cloud } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface StarterQuestionsProps {
  onSelect: (query: string) => void
  isLoading?: boolean
}

export function StarterQuestions({ onSelect, isLoading }: StarterQuestionsProps) {
  const [regionName, setRegionName] = useState<string>('your region')
  const [cityLabel, setCityLabel] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState('')
  
  // Dashboard state
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [weather, setWeather] = useState<{
    temp: number | null
    condition: string | null
    loading: boolean
  }>({ temp: null, condition: null, loading: false })

  // Carousel drag state
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAutoPaused, setIsAutoPaused] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 })
  const carouselRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const pauseTimeoutRef = useRef<NodeJS.Timeout>()

  const STORAGE_KEY = 'starter-city-label'
  const PROMPTED_KEY = 'starter-city-autoprompted'

  useEffect(() => {
    // Load saved label if present
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCityLabel(saved)
    } catch {}

    try {
      const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
      const tzLocale = Intl.DateTimeFormat().resolvedOptions().locale || locale
      const parts = tzLocale.split('-')
      const regionCode = parts.length > 1 ? parts[1] : undefined
      if (regionCode) {
        const dn = new Intl.DisplayNames([locale], { type: 'region' })
        const name = dn.of(regionCode)
        if (name) setRegionName(name)
      }
    } catch {
      // Fallback already set
    }
  }, [])

  // Auto-prompt once on first visit if nothing saved
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return
      const prompted = localStorage.getItem(PROMPTED_KEY)
      if (prompted) return
      localStorage.setItem(PROMPTED_KEY, '1')
      // Fire and forget; UI still shows control states
      detectCity()
    } catch {}
  }, [])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch weather when city changes
  useEffect(() => {
    if (cityLabel) {
      fetchWeather(cityLabel)
    }
  }, [cityLabel])

  const fetchWeather = async (location: string) => {
    setWeather(prev => ({ ...prev, loading: true }))
    try {
      // Using a free weather API (you may need to replace with your preferred service)
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=demo&units=metric`)
      if (response.ok) {
        const data = await response.json()
        setWeather({
          temp: Math.round(data.main?.temp || 0),
          condition: data.weather?.[0]?.main || 'Unknown',
          loading: false
        })
      } else {
        throw new Error('Weather fetch failed')
      }
    } catch (error) {
      // Fallback to mock data for demo
      setWeather({
        temp: 22,
        condition: 'Partly Cloudy',
        loading: false
      })
    }
  }

  // Auto-scroll animation
  useEffect(() => {
    if (!isDragging && !isAutoPaused && carouselRef.current) {
      const animate = () => {
        setScrollPosition(prev => {
          const maxScroll = carouselRef.current?.scrollWidth || 0
          const containerWidth = carouselRef.current?.clientWidth || 0
          const newPosition = prev + 0.5 // Smooth slow scroll
          
          // Reset when we've scrolled through half (seamless loop)
          if (newPosition >= maxScroll / 2) {
            return 0
          }
          return newPosition
        })
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDragging, isAutoPaused])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!carouselRef.current) return
    
    setIsDragging(true)
    setIsAutoPaused(true)
    setDragStart({
      x: e.pageX - carouselRef.current.offsetLeft,
      scrollLeft: scrollPosition
    })

    // Clear any existing pause timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }
  }, [scrollPosition])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return
    
    e.preventDefault()
    const x = e.pageX - carouselRef.current.offsetLeft
    const walk = (x - dragStart.x) * 2 // Scroll sensitivity
    setScrollPosition(dragStart.scrollLeft - walk)
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    
    // Resume auto-scroll after 3 seconds of inactivity
    pauseTimeoutRef.current = setTimeout(() => {
      setIsAutoPaused(false)
    }, 3000)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp()
    }
  }, [isDragging, handleMouseUp])

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!carouselRef.current) return
    
    const touch = e.touches[0]
    setIsDragging(true)
    setIsAutoPaused(true)
    setDragStart({
      x: touch.pageX - carouselRef.current.offsetLeft,
      scrollLeft: scrollPosition
    })

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }
  }, [scrollPosition])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return
    
    const touch = e.touches[0]
    const x = touch.pageX - carouselRef.current.offsetLeft
    const walk = (x - dragStart.x) * 2
    setScrollPosition(dragStart.scrollLeft - walk)
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    
    pauseTimeoutRef.current = setTimeout(() => {
      setIsAutoPaused(false)
    }, 3000)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current)
      }
    }
  }, [])

  const suggestions = useMemo(() => {
    const loc = cityLabel || regionName
    return [
      `Top news in ${loc} today`,
      `Local weather in ${loc} today`,
      'Tech news today',
      `Sports headlines in ${loc}`,
      'Stock price for AAPL',
      'Show images of aurora borealis',
      'Summarize this page: https://example.com',
      'Explain quantum computing simply'
    ]
  }, [regionName, cityLabel])

  const saveCity = (label: string) => {
    setCityLabel(label)
    try { localStorage.setItem(STORAGE_KEY, label) } catch {}
  }

  const clearCity = () => {
    setCityLabel(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const detectCity = async () => {
    if (detecting) return
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return
    setDetecting(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000
        })
      })
      const { latitude, longitude } = position.coords
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Reverse geocode failed')
      const data: any = await res.json()
      const city = data.city || data.locality || data.localityInfo?.administrative?.find((a: any) => a.order === 8)?.name
      const region = data.principalSubdivision || data.region || data.countryName
      const label = [city, region].filter(Boolean).join(', ')
      if (label) saveCity(label)
    } catch (e) {
      // Silently ignore; user keeps region fallback
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-4">
      {/* Dashboard Section */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Time & Timezone */}
        <div className="bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Local Time</span>
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
            {Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()}
          </div>
        </div>

        {/* Weather */}
        <div className="bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Weather</span>
          </div>
          {weather.loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : weather.temp !== null ? (
            <>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {weather.temp}°C
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500">
                {weather.condition}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">Set location</div>
          )}
        </div>

        {/* Date */}
        <div className="bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Date</span>
          </div>
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-500">
            {currentTime.toLocaleDateString([], { weekday: 'long' })}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">✨</span>
          Quick Start Ideas
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
          {cityLabel ? (
            <div className="inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> {cityLabel}
              </span>
              <button
                type="button"
                onClick={() => { setManualValue(cityLabel); setManualOpen(true) }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={clearCity}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-4">
              <button
                type="button"
                onClick={detectCity}
                disabled={detecting || isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/60 dark:hover:to-cyan-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm font-medium"
              >
                {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                Use current city
              </button>
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Set manually
              </button>
            </div>
          )}
        </div>
      </div>
      {manualOpen && (
        <div className="mb-3 flex items-center gap-2 p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 animate-fade-in">
          <Input
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder={`Enter city, e.g. Seattle, ${regionName}`}
            className="h-8 text-sm bg-white/80 dark:bg-slate-900/80"
          />
          <Button
            type="button"
            variant="blue"
            size="sm"
            disabled={!manualValue.trim()}
            onClick={() => { saveCity(manualValue.trim()); setManualOpen(false) }}
          >
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setManualOpen(false)}>Cancel</Button>
        </div>
      )}
      {/* Interactive draggable carousel */}
      <div className="relative overflow-hidden h-20 rounded-lg">
        <div 
          ref={carouselRef}
          className={`flex space-x-4 transition-transform duration-100 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ 
            transform: `translateX(-${scrollPosition}px)`,
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* First set */}
          {suggestions.map((q, idx) => (
            <button
              key={`first-${idx}`}
              disabled={isLoading || isDragging}
              onClick={() => !isDragging && onSelect(q)}
              className="group relative text-left p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-white/70 to-white/50 dark:from-slate-800/70 dark:to-slate-900/50 backdrop-blur-xl hover:border-cyan-300/60 dark:hover:border-cyan-600/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-100/30 dark:hover:shadow-cyan-900/20 overflow-hidden flex-shrink-0 min-w-[280px] max-w-[320px] pointer-events-auto"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative">
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors duration-300 font-medium leading-relaxed block">
                  {q}
                </span>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
          {/* Duplicate set for seamless loop */}
          {suggestions.map((q, idx) => (
            <button
              key={`second-${idx}`}
              disabled={isLoading || isDragging}
              onClick={() => !isDragging && onSelect(q)}
              className="group relative text-left p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-white/70 to-white/50 dark:from-slate-800/70 dark:to-slate-900/50 backdrop-blur-xl hover:border-cyan-300/60 dark:hover:border-cyan-600/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-100/30 dark:hover:shadow-cyan-900/20 overflow-hidden flex-shrink-0 min-w-[280px] max-w-[320px] pointer-events-auto"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative">
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors duration-300 font-medium leading-relaxed block">
                  {q}
                </span>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {/* Drag hint - subtle visual cue */}
        <div className={`absolute bottom-2 right-2 text-xs text-slate-400 dark:text-slate-500 transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-50 hover:opacity-100'}`}>
          ⟵ drag ⟶
        </div>
      </div>
    </div>
  )
}
