'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto mt-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Try a quick start</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          {cityLabel ? (
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Using location: {cityLabel}
              </span>
              <button
                type="button"
                onClick={() => { setManualValue(cityLabel); setManualOpen(true) }}
                className="text-blue-600 hover:text-blue-700"
              >
                Change
              </button>
              <button
                type="button"
                onClick={clearCity}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-3">
              <button
                type="button"
                onClick={detectCity}
                disabled={detecting || isLoading}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                Use current city
              </button>
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Set manually
              </button>
            </div>
          )}
        </div>
      </div>
      {manualOpen && (
        <div className="mb-3 flex items-center gap-2">
          <Input
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder={`Enter city, e.g. Seattle, ${regionName}`}
            className="h-9"
          />
          <Button
            type="button"
            variant="blue"
            disabled={!manualValue.trim()}
            onClick={() => { saveCity(manualValue.trim()); setManualOpen(false) }}
          >
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>Cancel</Button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((q, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => onSelect(q)}
            className="text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-colors"
          >
            <span className="text-sm text-gray-800 dark:text-gray-200">{q}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
