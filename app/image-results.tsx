"use client"

import { ExternalLink, Images } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ImageResult } from "./types"
import Image from "next/image"
import { isValidImageUrl } from "@/lib/image-utils"
import { useState } from "react"
import { ImageModal } from "./image-modal"

interface ImageResultsProps {
  results: ImageResult[]
  isLoading: boolean
  layout?: "grid" | "stack"
}

export function ImageResults({ results, isLoading, layout = "grid" }: ImageResultsProps) {
  const stacked = layout === "stack"
  const [selectedImage, setSelectedImage] = useState<{ url: string; title?: string } | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())

  const markFailed = (url: string) => {
    setFailed((prev) => {
      if (prev.has(url)) return prev
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }

  if (isLoading) {
    return (
      <section aria-label="Loading image results" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
          <Images className="h-4 w-4" />
          Images
        </h3>
        <div className={stacked ? "grid grid-cols-2 gap-2" : "scroll-slim flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className={`aspect-square animate-pulse bg-[hsl(var(--muted))] ${stacked ? "w-auto" : "w-[200px] flex-shrink-0 sm:w-auto"}`} />
          ))}
        </div>
      </section>
    )
  }

  if (results.length === 0) {
    return null
  }

  return (
    <section className="space-y-3" aria-label="Image sources">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
        <Images className="h-4 w-4" />
        Images
      </h3>

      <div className={stacked ? "grid grid-cols-2 gap-2" : "scroll-slim flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3"}>
        {results.slice(0, 6).map((result, index) => {
          const thumbnail = result.thumbnail && isValidImageUrl(result.thumbnail) ? result.thumbnail : null
          const broken = !thumbnail || failed.has(thumbnail)
          return (
            <button
              key={`${result.url}-${index}`}
              type="button"
              className={`focus-ring group block rounded-[var(--radius-card)] text-left ${stacked ? "w-auto" : "w-[200px] flex-shrink-0 sm:w-auto"}`}
              onClick={() => {
                if (!broken && thumbnail) setSelectedImage({ url: thumbnail, title: result.title })
              }}
              aria-label={broken ? `${result.title || "Image result"} (preview unavailable)` : result.title || "Image result"}
            >
              <Card className="relative aspect-square overflow-hidden transition-all duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--primary-accent)_40%,transparent)] hover:shadow-[var(--shadow-sm)]">
                {!broken && thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={result.title || "Image result"}
                    fill
                    sizes="(max-width: 640px) 200px, (max-width: 1024px) 33vw, 160px"
                    className="object-cover"
                    unoptimized
                    onError={() => markFailed(thumbnail)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[hsl(var(--muted))] p-3 text-center">
                    <Images className="h-7 w-7 shrink-0 text-[var(--on-surface-variant)]" />
                    <p className="line-clamp-3 text-xs font-medium text-[var(--on-surface-variant)]">
                      {result.title || "Preview unavailable"}
                    </p>
                    {result.source && (
                      <p className="line-clamp-1 text-[11px] text-[var(--on-surface-variant)]">{result.source}</p>
                    )}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className="line-clamp-2 text-xs text-white">{result.title || "View image"}</p>
                    {result.source && <p className="mt-1 line-clamp-1 text-[11px] text-white/80">{result.source}</p>}
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring absolute right-2 top-2 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/35"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open source image"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-white" />
                  </a>
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage.url}
          title={selectedImage.title}
          isOpen={Boolean(selectedImage)}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </section>
  )
}
