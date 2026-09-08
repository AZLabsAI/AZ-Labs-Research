import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[color-mix(in_srgb,var(--outline)_45%,transparent)]" role="contentinfo">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--on-surface-variant)] sm:flex-row sm:px-6 lg:px-8">
        <div className="text-center sm:text-left">© {new Date().getFullYear()} AZ Labs Research</div>
        <div className="flex items-center gap-4">
          <Link href="/" className="focus-ring rounded px-1 py-0.5 hover:text-[var(--on-surface)]">
            Home
          </Link>
          <a href="https://azlabs.ai/products/research" className="focus-ring rounded px-1 py-0.5 hover:text-[var(--on-surface)]">
            AZ Labs directory
          </a>
          <Link href="/auth/login" className="focus-ring rounded px-1 py-0.5 hover:text-[var(--on-surface)]">
            Sign In
          </Link>
          <a href="https://www.firecrawl.dev" target="_blank" rel="noopener noreferrer" className="focus-ring rounded px-1 py-0.5 hover:text-[var(--on-surface)]">
            Firecrawl
          </a>
        </div>
      </div>
    </footer>
  )
}
