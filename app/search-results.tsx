"use client"

import { ExternalLink, FileText, Calendar, User, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SearchResult } from "./types"
import Image from "next/image"
import { CharacterCounter } from "./character-counter"
import { isValidImageUrl } from "@/lib/image-utils"

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
}

function SearchResultSkeleton() {
  return (
    <Card className="p-4">
      <div className="mb-3 h-32 rounded-[var(--radius-sm)] bg-[hsl(var(--muted))]" />
      <div className="mb-2 h-4 w-3/4 rounded bg-[hsl(var(--muted))]" />
      <div className="mb-2 h-3 w-full rounded bg-[hsl(var(--muted))]" />
      <div className="h-3 w-5/6 rounded bg-[hsl(var(--muted))]" />
    </Card>
  )
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading search results">
        {[1, 2, 3].map((i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <Card className="items-center gap-3 p-8 text-center">
        <FileText className="h-10 w-10 text-[var(--on-surface-variant)]" />
        <p className="text-sm text-[var(--on-surface-variant)]">No source results yet. Try broadening your query.</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {results.map((result, index) => (
        <a
          key={`${result.url}-${index}`}
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block focus-ring rounded-[var(--radius-card)]"
        >
          <Card className="h-full p-4 transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary-accent)_40%,transparent)] hover:shadow-[var(--shadow-md)]">
            {result.image && isValidImageUrl(result.image) && (
              <div className="relative mb-3 h-32 overflow-hidden rounded-[var(--radius-sm)] bg-[hsl(var(--muted))]">
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

            <div className="mb-2 flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
              {result.favicon && isValidImageUrl(result.favicon) ? (
                <Image
                  src={result.favicon}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                  }}
                />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span className="truncate">{result.siteName || new URL(result.url).hostname}</span>
            </div>

            <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[var(--on-surface)] transition-colors group-hover:text-[var(--primary-accent)]">
              {result.title}
            </h3>

            <div className="mb-2">
              <CharacterCounter
                targetCount={result.markdown?.length || result.content?.length || 0}
                duration={1400}
              />
            </div>

            {result.description && (
              <p className="mb-3 line-clamp-3 text-sm text-[var(--on-surface-variant)]">{result.description}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-[var(--on-surface-variant)]">
              {result.publishedDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(result.publishedDate).toLocaleDateString()}
                </span>
              )}
              {result.author && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {result.author}
                </span>
              )}
              <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Card>
        </a>
      ))}
    </div>
  )
}
