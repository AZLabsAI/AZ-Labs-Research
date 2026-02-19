"use client"

import { X } from "lucide-react"
import Image from "next/image"
import { useEffect } from "react"

interface ImageModalProps {
  imageUrl: string
  title?: string
  isOpen: boolean
  onClose: () => void
}

export function ImageModal({ imageUrl, title, isOpen, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image preview"}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] animate-scale-in-content" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="focus-ring absolute -right-2 -top-10 rounded-full bg-black/35 p-2 text-white hover:bg-black/55 sm:-right-12"
          aria-label="Close image preview"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-black/10">
          <Image
            src={imageUrl}
            alt={title || "Image"}
            width={1200}
            height={800}
            className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
            unoptimized
            priority
          />

          {title && (
            <div className="bg-black/75 px-4 py-3">
              <p className="text-sm text-white">{title}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
