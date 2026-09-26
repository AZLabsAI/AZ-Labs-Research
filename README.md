# AZ Labs Research

Advanced AI-powered research platform with multi-source search, analysis, and insights.

<img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBxbWFxamZycWRkMmVhMGFiZnNuZjMxc3lpNHpuamR4OWlwa3F4NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QbfaTCB1OmkRmIQwzJ/giphy.gif" width="100%" alt="AZ Labs Research Demo" />

## Setup

```bash
git clone [your-repository-url]
cd az-labs-research
pnpm install
```

## Configure

```bash
cp .env.example .env.local
```

Add your keys to `.env.local`:
```
FIRECRAWL_API_KEY=fc-your-api-key
META_API_KEY=your-meta-model-api-key
```

## Run

```bash
pnpm dev
```

Open http://localhost:3000

## Deploy

## Features

- Multi-source search (web, news, images)
- AI-powered response generation
- Real-time streaming responses
- Stock chart integration for company queries
- Citation-based source referencing
- Dark/light theme support

## Get API Keys

- [Firecrawl](https://firecrawl.dev) - For web scraping and multi-source search
- [Meta Model API](https://dev.meta.ai) - For AI response generation (Muse Spark)

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI/ML**: Meta Model API (Muse Spark 1.3 contributor), AI SDK v5
- **Data Sources**: Firecrawl API for web/news/image search
- **Charts**: TradingView widgets for stock data
- **UI Components**: shadcn/ui, Lucide React icons

## AZ Labs Research

Built by AZ Labs - Advanced AI research and development.

MIT License
