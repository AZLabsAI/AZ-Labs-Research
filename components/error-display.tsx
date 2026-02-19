import React from "react"
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/error-messages"

interface ErrorDisplayProps {
  error: Error | { statusCode?: number; message?: string }
  onRetry?: () => void
  context?: string
}

export function ErrorDisplay({ error, onRetry, context }: ErrorDisplayProps) {
  const statusCode = "statusCode" in error && error.statusCode ? error.statusCode : 500
  const errorInfo = getErrorMessage(statusCode)
  const retryAfter = error.message?.match(/retry after (\d+)s/)?.[1]

  return (
    <div className="surface-panel rounded-[var(--radius-card)] border-[hsl(var(--destructive))/0.3] p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[hsl(var(--destructive))/0.15] p-2 text-[hsl(var(--destructive))]">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--on-surface)]">{errorInfo.title}</h3>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{errorInfo.message}</p>

          {context && <p className="mt-2 text-xs text-[var(--on-surface-variant)]">Context: {context}</p>}
          {retryAfter && (
            <p className="mt-2 text-xs text-[hsl(var(--destructive))]">Please wait {retryAfter} seconds before retrying.</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {onRetry && statusCode !== 402 && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            )}
            <a
              href={errorInfo.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[var(--primary-accent)] hover:text-[var(--primary-accent-strong)]"
            >
              {errorInfo.action}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
