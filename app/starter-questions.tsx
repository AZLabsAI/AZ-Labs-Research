"use client"

import { useEffect, useMemo, useState } from "react"
import { MapPin, Loader2, Clock, Thermometer, Cloud } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface StarterQuestionsProps {
  onSelect: (query: string) => void
  isLoading?: boolean
}

export function StarterQuestions({ onSelect, isLoading }: StarterQuestionsProps) {
  const [regionName, setRegionName] = useState<string>("your region")
  const [cityLabel, setCityLabel] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState("")
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [weather, setWeather] = useState<{
    temp: number | null
    condition: string | null
    loading: boolean
    unavailable: boolean
  }>({ temp: null, condition: null, loading: false, unavailable: false })

  const STORAGE_KEY = "starter-city-label"

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCityLabel(saved)
    } catch {
      // no-op
    }

    try {
      const locale = typeof navigator !== "undefined" ? navigator.language : "en-US"
      const tzLocale = Intl.DateTimeFormat().resolvedOptions().locale || locale
      const parts = tzLocale.split("-")
      const regionCode = parts.length > 1 ? parts[1] : undefined
      if (regionCode) {
        const dn = new Intl.DisplayNames([locale], { type: "region" })
        const name = dn.of(regionCode)
        if (name) setRegionName(name)
      }
    } catch {
      // fallback already set
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!cityLabel) return
    void fetchWeather(cityLabel)
  }, [cityLabel])

  const suggestions = useMemo(() => {
    const loc = cityLabel || regionName
    return [
      `Top news in ${loc} today`,
      `Local weather in ${loc} today`,
      `Sports headlines in ${loc}`,
      "Latest AI model releases this week",
      "Summarize this page: https://example.com",
      "Compare NVIDIA and AMD earnings highlights",
      "Explain quantum computing simply",
      "Top cybersecurity incidents this month",
    ]
  }, [regionName, cityLabel])

  const saveCity = (label: string) => {
    setCityLabel(label)
    try {
      localStorage.setItem(STORAGE_KEY, label)
    } catch {
      // no-op
    }
  }

  const clearCity = () => {
    setCityLabel(null)
    setWeather({ temp: null, condition: null, loading: false, unavailable: false })
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // no-op
    }
  }

  const weatherCodeLabel = (code: number): string => {
    if (code === 0) return "Clear sky"
    if (code <= 3) return code === 1 ? "Mostly clear" : code === 2 ? "Partly cloudy" : "Overcast"
    if (code === 45 || code === 48) return "Foggy"
    if (code <= 57) return "Drizzle"
    if (code <= 67) return "Rain"
    if (code <= 77) return "Snow"
    if (code <= 82) return "Showers"
    if (code === 85 || code === 86) return "Snow showers"
    if (code >= 95) return "Thunderstorm"
    return "Unknown"
  }

  const fetchWeatherByCoords = async (latitude: number, longitude: number) => {
    setWeather((prev) => ({ ...prev, loading: true, unavailable: false }))
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
      )
      if (!response.ok) throw new Error("Weather fetch failed")
      const data = await response.json()
      const current = data.current
      if (typeof current?.temperature_2m !== "number") throw new Error("No weather data")
      setWeather({
        temp: Math.round(current.temperature_2m),
        condition: weatherCodeLabel(Number(current.weather_code ?? -1)),
        loading: false,
        unavailable: false,
      })
    } catch {
      setWeather({ temp: null, condition: null, loading: false, unavailable: true })
    }
  }

  const detectCity = async () => {
    if (detecting || typeof window === "undefined" || !("geolocation" in navigator)) return

    setDetecting(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 5 * 60 * 1000,
        })
      })

      const { latitude, longitude } = position.coords
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Reverse geocode failed")

      const data: any = await res.json()
      const city =
        data.city ||
        data.locality ||
        data.localityInfo?.administrative?.find((a: any) => a.order === 8)?.name
      const region = data.principalSubdivision || data.region || data.countryName
      const label = [city, region].filter(Boolean).join(", ")
      if (label) saveCity(label)
      void fetchWeatherByCoords(latitude, longitude)
    } catch {
      // no-op
    } finally {
      setDetecting(false)
    }
  }

  const fetchWeather = async (location: string) => {
    setWeather((prev) => ({ ...prev, loading: true, unavailable: false }))
    try {
      // Open-Meteo needs coordinates: geocode the saved label first (both free, keyless).
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      )
      if (!geoResponse.ok) throw new Error("Geocode failed")
      const geo = await geoResponse.json()
      const first = geo.results?.[0]
      if (typeof first?.latitude !== "number" || typeof first?.longitude !== "number") {
        throw new Error("Location not found")
      }
      await fetchWeatherByCoords(first.latitude, first.longitude)
    } catch {
      setWeather({ temp: null, condition: null, loading: false, unavailable: true })
    }
  }

  return (
    <section className="mx-auto mt-4 max-w-4xl" aria-label="Starter questions">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="surface-panel rounded-[var(--radius-md)] p-3 animate-fade-up">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--on-surface-variant)]">
            <Clock className="h-3.5 w-3.5 text-[var(--primary-accent)]" />
            Local Time
          </div>
          <div className="text-base font-semibold text-[var(--on-surface)]">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs text-[var(--on-surface-variant)]">
            {Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()}
          </div>
        </div>

        <div className="surface-panel rounded-[var(--radius-md)] p-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--on-surface-variant)]">
            <Cloud className="h-3.5 w-3.5 text-[var(--primary-accent)]" />
            Weather
          </div>
          {weather.loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--on-surface-variant)]" />
          ) : weather.temp !== null ? (
            <>
              <div className="text-base font-semibold text-[var(--on-surface)]">{weather.temp}°C</div>
              <div className="text-xs text-[var(--on-surface-variant)]">{weather.condition}</div>
            </>
          ) : weather.unavailable ? (
            <div className="text-xs text-[var(--on-surface-variant)]">Weather unavailable</div>
          ) : (
            <div className="text-xs text-[var(--on-surface-variant)]">Set location</div>
          )}
        </div>

        <div className="surface-panel rounded-[var(--radius-md)] p-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--on-surface-variant)]">
            <Thermometer className="h-3.5 w-3.5 text-[var(--primary-accent)]" />
            Date
          </div>
          <div className="text-base font-semibold text-[var(--on-surface)]">
            {currentTime.toLocaleDateString([], { month: "short", day: "numeric" })}
          </div>
          <div className="text-xs text-[var(--on-surface-variant)]">
            {currentTime.toLocaleDateString([], { weekday: "long" })}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--on-surface)]">
          <span aria-hidden="true">✨</span>
          Quick start ideas
        </div>

        {cityLabel ? (
          <div className="inline-flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[var(--surface-container)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--primary-accent)]" />
              {cityLabel}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-1 py-0.5 text-xs"
              onClick={() => {
                setManualValue(cityLabel)
                setManualOpen(true)
              }}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-1 py-0.5 text-xs text-[var(--on-surface-variant)]"
              onClick={clearCity}
            >
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={detectCity} disabled={detecting || isLoading}>
              {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
              Use current city
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
              Set manually
            </Button>
          </div>
        )}
      </div>

      {manualOpen && (
        <div className="surface-panel mb-4 flex items-center gap-2 rounded-[var(--radius-md)] p-3 animate-fade-in">
          <Input
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder={`Enter city, e.g. Seattle, ${regionName}`}
            className="h-9 bg-[var(--surface)]"
          />
          <Button
            type="button"
            size="sm"
            disabled={!manualValue.trim()}
            onClick={() => {
              saveCity(manualValue.trim())
              setManualOpen(false)
            }}
          >
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setManualOpen(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((question, index) => (
          <Button
            key={question}
            type="button"
            variant="outline"
            className="h-auto justify-start rounded-[var(--radius-md)] px-4 py-3 text-left text-sm animate-fade-up"
            style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
            disabled={isLoading}
            onClick={() => onSelect(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </section>
  )
}
