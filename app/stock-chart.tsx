"use client"

import dynamic from "next/dynamic"

const TradingViewWidget = dynamic(() => import("@/components/trading-view-widget"), {
  ssr: false,
  loading: () => (
    <div className="surface-panel flex h-[300px] w-full items-center justify-center rounded-[var(--radius-card)]">
      <p className="text-sm text-[var(--on-surface-variant)]">Loading chart...</p>
    </div>
  ),
})

interface StockChartProps {
  ticker: string
  theme?: "light" | "dark"
}

function isValidTicker(ticker: string): boolean {
  const tickerPattern = /^(NYSE|NASDAQ|AMEX|XETR|HKEX|LSE|TSE|ASX|NSE|BSE):[A-Z0-9.]{1,5}$/
  return tickerPattern.test(ticker)
}

export function StockChart({ ticker, theme = "light" }: StockChartProps) {
  if (!isValidTicker(ticker)) {
    // keep rendering - TradingView can resolve many symbol aliases
  }

  return (
    <div className="mb-2 w-full">
      <TradingViewWidget symbol={ticker} theme={theme} />
    </div>
  )
}
