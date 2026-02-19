"use client"

import type { ChangeEvent, FormEvent } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchComponentProps {
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  input: string
  handleInputChange: (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
}

const QUICK_HINTS = ["AI market outlook", "Latest robotics research", "SEC filing summary"]

export function SearchComponent({
  handleSubmit,
  input,
  handleInputChange,
  isLoading,
}: SearchComponentProps) {
  const canSubmit = input.trim().length > 0 && !isLoading

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl" aria-label="Research search form">
      <div className="surface-panel rounded-[var(--radius-chat)] p-2 sm:p-3">
        <div className="flex items-center gap-2">
          <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] sm:flex">
            <Search className="h-4 w-4" />
          </div>
          <Input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything. Try latest AI breakthroughs, explain quantum computing, or summarize a source."
            className="h-12 border-0 bg-transparent px-2 text-base shadow-none sm:text-[1.02rem]"
            disabled={isLoading}
            aria-label="Ask a research question"
          />
          <Button
            type="submit"
            loading={isLoading}
            disabled={!canSubmit}
            className="h-11 min-w-[88px]"
          >
            Search
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--on-surface-variant)]" aria-hidden="true">
        <span className="font-medium">Popular:</span>
        {QUICK_HINTS.map((hint) => (
          <span key={hint} className="chip">
            {hint}
          </span>
        ))}
      </div>
    </form>
  )
}
