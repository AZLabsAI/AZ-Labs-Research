# Technology Stack

## Framework & Runtime
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript 5**: Full type safety across the codebase
- **Node.js**: Server-side runtime

## Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework with custom design system
- **shadcn/ui**: Component library based on Radix UI primitives
- **Lucide React**: Icon library
- **next-themes**: Theme switching (dark/light mode)

## AI & Data Sources
- **Groq AI**: LLM provider using Kimi K2 Instruct model
- **AI SDK v5**: Vercel's AI SDK for streaming responses
- **Firecrawl API**: Multi-source search (web, news, images)
- **TradingView**: Stock chart widgets

## Backend & Database
- **Supabase**: Authentication, database, and real-time features
- **Next.js API Routes**: Server-side API endpoints
- **Middleware**: Authentication and route protection

## Development Tools
- **ESLint**: Code linting with Next.js config
- **pnpm**: Package manager (preferred over npm/yarn)
- **Turbopack**: Fast bundler for development

## Common Commands

### Development
```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Setup
```bash
pnpm install      # Install dependencies
cp .env.example .env.local  # Setup environment variables
```

## Environment Variables
- `FIRECRAWL_API_KEY`: Required for search functionality
- `GROQ_API_KEY`: Required for AI responses
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Key Dependencies
- `@ai-sdk/groq` & `@ai-sdk/react`: AI SDK integration
- `@mendable/firecrawl-js`: Firecrawl API client
- `@supabase/ssr` & `@supabase/supabase-js`: Supabase integration
- `react-markdown` & `remark-gfm`: Markdown rendering
- `sonner`: Toast notifications
- `zod`: Runtime type validation