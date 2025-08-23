"use client"

import Link from "next/link"
import Image from "next/image"
import { Github } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Image
              src="/az-labs-logo.png"
              alt="AZ Labs Logo"
              width={280}
              height={75}
              priority
              className="h-16 w-auto sm:h-20 select-none"
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-base sm:text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              AZ Labs Research
            </span>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-none">Fireplexity — AI multi-source search</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <Github className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

