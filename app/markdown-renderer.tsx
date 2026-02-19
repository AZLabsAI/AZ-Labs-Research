"use client"

import React, { useMemo, useCallback } from "react"
import Streamdown from "streamdown"
import { CitationTooltip } from "./citation-tooltip-portal"
import { SearchResult } from "./types"

interface MarkdownRendererProps {
  content: string
  sources?: SearchResult[]
}

export function MarkdownRenderer({ content, sources }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    return content
      .replace(/\bCITATION_(\d+)\b/g, "___CITATION_$1___")
      .replace(/___CITATION_(\d+)___/g, "[$1]")
  }, [content])

  const processChildren = useCallback((children: any): any => {
    if (typeof children === "string") {
      const parts = children.split(/(\[\d+\])/g)
      return parts.map((part, index) => {
        const match = part.match(/\[(\d+)\]/)
        if (match) {
          return (
            <sup
              key={`citation-${match[1]}-${index}`}
              className="citation ml-0.5 cursor-pointer text-[0.65rem] text-[var(--primary-accent)] hover:text-[var(--primary-accent-strong)]"
              data-citation={match[1]}
            >
              [{match[1]}]
            </sup>
          )
        }
        return part
      })
    }

    if (Array.isArray(children)) {
      return children.map((child) => (typeof child === "string" ? processChildren(child) : child))
    }

    return children
  }, [])

  const components = useMemo(
    () => ({
      p: ({ children, ...props }: any) => (
        <p className="mb-4 last:mb-0" {...props}>
          {processChildren(children)}
        </p>
      ),
      ul: ({ children }: any) => <ul className="mb-4 last:mb-0">{children}</ul>,
      ol: ({ children }: any) => <ol className="mb-4 last:mb-0">{children}</ol>,
      li: ({ children, ...props }: any) => <li {...props}>{processChildren(children)}</li>,
      h1: ({ children }: any) => <h1 className="mb-3 mt-6 text-xl font-semibold first:mt-0">{children}</h1>,
      h2: ({ children }: any) => <h2 className="mb-3 mt-6 text-lg font-semibold first:mt-0">{children}</h2>,
      h3: ({ children }: any) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
      code: ({ children, className }: any) => {
        const inline = !className?.includes("language-")
        return inline ? (
          <code className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-sm">{children}</code>
        ) : (
          <code className={className}>{children}</code>
        )
      },
      strong: ({ children, ...props }: any) => <strong {...props}>{processChildren(children)}</strong>,
      em: ({ children, ...props }: any) => <em {...props}>{processChildren(children)}</em>,
    }),
    [processChildren]
  )

  return (
    <>
      <Streamdown parseIncompleteMarkdown={true} components={components}>
        {processedContent}
      </Streamdown>
      {sources && sources.length > 0 && <CitationTooltip sources={sources} />}
    </>
  )
}
