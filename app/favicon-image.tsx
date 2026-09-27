'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Globe } from 'lucide-react'

interface FaviconImageProps {
  src?: string
  alt?: string
  size?: number
  className?: string
}

export function FaviconImage({ src, alt = '', size = 16, className = '' }: FaviconImageProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <Globe
        className={`text-[var(--on-surface-variant)] ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full"
        onError={() => {
          setError(true)
        }}
        unoptimized // Skip Next.js optimization for favicons
        loading="lazy" // Lazy load to reduce initial requests
      />
    </div>
  )
}