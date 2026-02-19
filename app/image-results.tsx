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
}

export function ImageResults({ results, isLoading }: ImageResultsProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; title?: string } | null>(null)

  if (isLoading) {
    return (
      <section aria-label="Loading image results" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--on-surface)]">
          <Images className="h-4 w-4" />
          Images
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="aspect-square w-[200px] flex-shrink-0 bg-[hsl(var(--muted))] sm:w-auto" />
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

      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 scrollbar-hide">
        {results.slice(0, 6).map((result, index) => (
          <button
            key={`${result.url}-${index}`}
            type="button"
            className="focus-ring group block w-[200px] flex-shrink-0 rounded-[var(--radius-card)] text-left sm:w-auto"
            onClick={() => setSelectedImage({ url: result.thumbnail || "", title: result.title })}
          >
            <Card className="relative aspect-square overflow-hidden transition-all duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--primary-accent)_40%,transparent)] hover:shadow-[var(--shadow-sm)]">
              {result.thumbnail && isValidImageUrl(result.thumbnail) ? (
                <Image
                  src={result.thumbnail}
                  alt={result.title || "Image result"}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    const parent = target.parentElement
                    if (parent) {
                      parent.classList.add("bg-[hsl(var(--muted))]")
                    }
                    target.style.display = "none"
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--muted))]">
                  <Images className="h-8 w-8 text-[var(--on-surface-variant)]" />
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
        ))}
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
