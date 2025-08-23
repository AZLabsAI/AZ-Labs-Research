export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="text-center sm:text-left">
          © {new Date().getFullYear()} AZ Labs Research
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-200">About</a>
          <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-200">Changelog</a>
          <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-200">Privacy</a>
        </div>
      </div>
    </footer>
  )
}
