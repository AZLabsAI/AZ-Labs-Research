"use client"

import { Calendar, ExternalLink, Newspaper } from "lucide-react"
import { Card } from "@/components/ui/card"
import { NewsResult } from "./types"
import Image from "next/image"
import { isValidImageUrl } from "@/lib/image-utils"

interface NewsResultsProps {
  results: NewsResult[]
  isLoading: boolean
}

export function NewsResults({ results, isLoading }: NewsResultsProps) {
  if (isLoading) {
    return (
      <section aria-label="Loading news results" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
          <Newspaper className="h-4 w-4" />
          News
        </h3>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3">
            <div className="mb-2 h-4 w-3/4 rounded bg-[hsl(var(--muted))]" />
            <div className="h-3 w-full rounded bg-[hsl(var(--muted))]" />
          </Card>
        ))}
      </section>
    )
  }

  if (results.length === 0) {
    return null
  }

  return (
    <section className="space-y-3" aria-label="News sources">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
        <Newspaper className="h-4 w-4" />
        News
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 sm:block sm:space-y-2 scrollbar-hide">
        {results.slice(0, 5).map((result, index) => (
          <a
            key={`${result.url}-${index}`}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring group block w-[280px] flex-shrink-0 rounded-[var(--radius-card)] sm:w-auto"
          >
            <Card className="h-full p-3 transition-all duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--primary-accent)_40%,transparent)] hover:shadow-[var(--shadow-sm)]">
              <div className="flex gap-3">
                {result.image && isValidImageUrl(result.image) && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[hsl(var(--muted))]">
                    <Image
                      src={result.image}
                      alt={result.title}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                      }}
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 line-clamp-2 text-sm font-medium text-[var(--on-surface)] transition-colors group-hover:text-[var(--primary-accent)]">
                    {result.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                    {result.source && <span className="truncate">{result.source}</span>}
                    {(() => {
                      const dateStr = result.publishedDate || result.date
                      if (!dateStr) return null
                      try {
                        const date = new Date(dateStr)
                        if (Number.isNaN(date.getTime())) return null
                        return (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {date.toLocaleDateString()}
                          </span>
                        )
                      } catch {
                        return null
                      }
                    })()}
                    <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </section>
  )
}
