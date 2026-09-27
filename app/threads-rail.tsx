"use client"

import { MessageSquarePlus, MessagesSquare, PanelLeftClose, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ThreadSummary } from "@/lib/threads"

function formatThreadDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

interface ThreadsRailProps {
  threads: ThreadSummary[]
  activeId: string
  collapsed: boolean
  onToggleCollapse: () => void
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  alwaysVisible?: boolean
}

export function ThreadsRail({
  threads,
  activeId,
  collapsed,
  onToggleCollapse,
  onSelect,
  onNew,
  onDelete,
  alwaysVisible = false,
}: ThreadsRailProps) {
  const visibility = alwaysVisible ? "flex" : "hidden lg:flex"
  if (collapsed && !alwaysVisible) {
    return (
      <div className="hidden w-12 shrink-0 flex-col items-center gap-2 border-r border-[hsl(var(--border))] py-3 lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNew}
          className="h-9 w-9"
          title="New research thread"
          aria-label="New research thread"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-9 w-9"
          title="Show threads"
          aria-label="Show threads"
        >
          <MessagesSquare className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`${visibility} h-full w-64 shrink-0 flex-col border-r border-[hsl(var(--border))]`}>
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
          Threads
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNew}
            className="h-7 w-7"
            title="New research thread"
            aria-label="New research thread"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7"
            title="Hide threads"
            aria-label="Hide threads"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="scroll-slim min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {threads.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-[var(--on-surface-variant)]">
            Your research threads will live here.
          </p>
        )}
        {threads.map((thread) => {
          const active = thread.id === activeId
          return (
            <div
              key={thread.id}
              className={`group flex items-center gap-1 rounded-[var(--radius-md)] pr-1 transition-colors duration-[var(--duration-fast)] ${
                active
                  ? "bg-[color-mix(in_srgb,var(--primary-accent)_12%,transparent)]"
                  : "hover:bg-[hsl(var(--accent))]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(thread.id)}
                className="focus-ring min-w-0 flex-1 rounded-[var(--radius-md)] px-2 py-2 text-left"
                aria-current={active}
              >
                <span className="block truncate text-sm font-medium text-[var(--on-surface)]">
                  {thread.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--on-surface-variant)]">
                  {formatThreadDate(thread.updatedAt)} · {Math.max(0, Math.floor(thread.messageCount / 2))} exchanges
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(thread.id)}
                className="focus-ring rounded-md p-1.5 text-[var(--on-surface-variant)] opacity-0 transition-opacity hover:text-[hsl(var(--destructive))] focus-visible:opacity-100 group-hover:opacity-100"
                title="Delete thread"
                aria-label={`Delete thread ${thread.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
