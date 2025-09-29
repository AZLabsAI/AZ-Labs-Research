# Project Structure

## Directory Organization

### `/app` - Next.js App Router
- **Main application code using App Router architecture**
- `layout.tsx`: Root layout with providers and global components
- `page.tsx`: Home page with search interface and chat
- `globals.css`: Global styles and Tailwind configuration
- `types.ts`: Shared TypeScript interfaces

#### `/app/api` - API Routes
- `az-labs-research/search/route.ts`: Main search API endpoint
- `az-labs-research/check-env/route.ts`: Environment validation

#### `/app/auth` - Authentication Pages
- `login/page.tsx`: Login page
- `callback/route.ts`: OAuth callback handler
- `auth-code-error/page.tsx`: Error handling

#### `/app/contexts` - React Contexts
- `auth-context.tsx`: Authentication state management

#### Feature Components (in `/app`)
- `chat-interface.tsx`: Main chat UI component
- `search.tsx`: Search input component
- `search-results.tsx`: Search results display
- `news-results.tsx`: News results display
- `image-results.tsx`: Image results display
- `starter-questions.tsx`: Suggested questions
- `markdown-renderer.tsx`: Markdown content renderer

### `/components` - Reusable Components
- **Shared UI components and layouts**
- `site-header.tsx` & `site-footer.tsx`: Layout components
- `theme-toggle.tsx`: Dark/light mode switcher
- `error-display.tsx`: Error handling components

#### `/components/ui` - shadcn/ui Components
- Base UI components: `button.tsx`, `input.tsx`, `card.tsx`, etc.
- Follows shadcn/ui conventions and styling

#### `/components/ai-elements` - AI-Specific Components
- `response.tsx`: AI response rendering

### `/lib` - Utility Libraries
- **Business logic and utility functions**
- `utils.ts`: Common utilities (cn function for class merging)
- `supabase.ts`: Supabase client configuration
- `company-ticker-map.ts`: Company ticker detection
- `content-selection.ts`: Content relevance selection
- `error-messages.ts`: Error message handling
- `image-utils.ts`: Image processing utilities

### `/utils` - Framework Utilities
- `supabase/client.ts`: Client-side Supabase instance
- `supabase/server.ts`: Server-side Supabase instance

### Configuration Files
- `next.config.mjs`: Next.js configuration with image optimization
- `tailwind.config.ts`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration with path aliases
- `components.json`: shadcn/ui configuration
- `middleware.ts`: Authentication and route protection

## Naming Conventions

### Files
- **kebab-case** for component files: `chat-interface.tsx`
- **PascalCase** for component names: `ChatInterface`
- **camelCase** for utility functions and variables

### Components
- Use descriptive names that indicate purpose
- Suffix with component type when helpful: `AuthContext`, `SearchResults`
- Keep related components in the same directory

### API Routes
- Follow REST conventions where applicable
- Use descriptive endpoint names: `/api/az-labs-research/search`
- Group related endpoints in folders

## Import Patterns

### Path Aliases
- `@/` maps to project root
- `@/components` for UI components
- `@/lib` for utilities
- `@/app` for app-specific code

### Import Order
1. React and Next.js imports
2. Third-party libraries
3. Internal components and utilities
4. Type imports (with `type` keyword)

## Code Organization Principles

- **Feature-based organization**: Related functionality grouped together
- **Separation of concerns**: UI, business logic, and data access separated
- **Reusable components**: Common UI patterns extracted to `/components`
- **Type safety**: Comprehensive TypeScript usage throughout
- **Server/Client separation**: Clear distinction between server and client code