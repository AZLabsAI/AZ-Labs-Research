import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[color-mix(in_srgb,var(--outline)_45%,transparent)]" role="contentinfo">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--on-surface-variant)] sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/az-mark.png"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="h-5 w-5 opacity-70 brightness-0 dark:invert"
          />
          <span>© {new Date().getFullYear()} AZ Labs Research</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="focus-ring rounded px-1 py-0.5 transition-colors hover:text-[var(--on-surface)]">
            Home
          </Link>
          <Link href="/dashboard" className="focus-ring rounded px-1 py-0.5 transition-colors hover:text-[var(--on-surface)]">
            Dashboard
          </Link>
          <a href="https://azlabs.ai/products/research" className="focus-ring rounded px-1 py-0.5 transition-colors hover:text-[var(--on-surface)]">
            AZ Labs directory
          </a>
          <a href="https://www.firecrawl.dev" target="_blank" rel="noopener noreferrer" className="focus-ring rounded px-1 py-0.5 transition-colors hover:text-[var(--on-surface)]">
            Firecrawl
          </a>
        </div>
      </div>
    </footer>
  )
}
