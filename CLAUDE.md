# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development commands:
```bash
pnpm dev          # Start development server with Turbopack (runs on port 3000)
pnpm build        # Build production version
pnpm start        # Start production server
pnpm lint         # Run Next.js linting
```

## High-Level Architecture

**AZ Labs Research** is an advanced AI-powered research platform that provides web search results, news, and images with AI-generated responses. The application integrates multiple data sources and streams real-time responses.

### Core Technologies
- **Next.js 15.3.2** with App Router and React 19
- **AI SDK v5** for streaming responses with custom data parts
- **Firecrawl API** for web scraping and multi-source search (web, news, images)  
- **Groq AI** with Kimi K2 Instruct model for response generation
- **TradingView** integration for stock charts when company mentions are detected
- **Tailwind CSS** with shadcn/ui components for styling

### API Architecture
- **Primary search endpoint**: `/api/az-labs-research/search/route.ts` - handles all search requests and AI response streaming
- **Environment check**: `/api/az-labs-research/check-env/route.ts` - validates API key availability
- **Streaming pattern**: Uses `createUIMessageStream()` with custom data parts (`data-sources`, `data-ticker`, `data-followup`, `data-status`)

### Key Components & Data Flow
1. **Search initiation** triggers Firecrawl v2 API call with `sources: ['web', 'news', 'images']`
2. **Content intelligence** via `selectRelevantContent()` filters scraped content based on query relevance
3. **Stock detection** uses `detectCompanyTicker()` with extensive company name mappings
4. **AI streaming** sends context to Groq AI and streams markdown responses with citations
5. **Follow-up generation** creates contextual questions after response completion

### Component Structure
- **page.tsx**: Main page with state management and API integration
- **chat-interface.tsx**: Complex streaming UI with message handling, source display, and follow-up questions
- **search.tsx**: Initial search form component
- **markdown-renderer.tsx**: Processes AI responses with citation support
- **stock-chart.tsx**: TradingView integration triggered by company ticker detection
- **news-results.tsx** & **image-results.tsx**: Display search results from Firecrawl

### Environment Variables
Required API keys (stored in `.env.local`):
```
FIRECRAWL_API_KEY=fc-your-api-key  # For data collection and web scraping
GROQ_API_KEY=gsk_your-groq-api-key  # For AI response generation
```

### State Management Patterns
- **Streaming data**: Uses AI SDK's message parts system with `useChat()` hook
- **Source persistence**: `messageData` Map stores sources/follow-ups per assistant message
- **Status updates**: Transient data parts for real-time search status
- **API key handling**: Local storage fallback if environment variables unavailable

### Content Processing
- **Intelligent selection**: `content-selection.ts` extracts relevant paragraphs based on query keywords
- **Citation mapping**: Sources numbered [1], [2], etc. corresponding to search result order
- **Multi-format support**: Handles both markdown and plain text content from Firecrawl
- **Company detection**: Extensive ticker symbol mapping for stock chart integration
