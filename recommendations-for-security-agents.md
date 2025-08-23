# Security Remediation Instructions for Agents

This document provides step-by-step instructions for security agents to fix the identified vulnerabilities in the AZ Labs Research codebase.

## Prerequisites

- Ensure you have write access to the repository
- Verify all tests pass before starting: `pnpm test` (if tests exist)
- Create a backup branch: `git checkout -b security-fixes-backup`
- Work on a new feature branch: `git checkout -b security-remediation`

## 🔴 CRITICAL - Fix Immediately (High Severity)

### 1. Restrict Image Domain Configuration

**File to modify:** `next.config.mjs`
**Current issue:** Lines 4-18 allow loading images from ANY domain

**Instructions:**
1. Open `next.config.mjs`
2. Replace the entire `remotePatterns` array with:
```javascript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'api.firecrawl.dev',
  },
  {
    protocol: 'https',
    hostname: 's3.tradingview.com',
  },
  {
    protocol: 'https',
    hostname: 'www.tradingview.com',
  },
  // Add other trusted domains as needed
],
```
3. Remove the wildcard HTTP pattern entirely
4. Test image loading functionality after changes

### 2. Remove Client-Side API Key Handling

**Files to modify:** 
- `app/api/az-labs-research/search/route.ts` (line 34)
- `app/page.tsx` (lines 41, 51, 176-177, 347)

**Instructions:**
1. In `app/api/az-labs-research/search/route.ts`:
   - Remove line 34: `const firecrawlApiKey = body.firecrawlApiKey || process.env.FIRECRAWL_API_KEY`
   - Replace with: `const firecrawlApiKey = process.env.FIRECRAWL_API_KEY`

2. In `app/page.tsx`:
   - Remove all references to `firecrawlApiKey` state
   - Remove the localStorage handling for API keys
   - Remove the API key input field from the UI
   - Update the chat hook call to not pass `firecrawlApiKey`

3. Test that the application still works with server-side API keys only

### 3. Fix Unsafe HTML Injection

**File to modify:** `components/trading-view-widget.tsx`
**Current issue:** Lines 17-24 use innerHTML without sanitization

**Instructions:**
1. Replace the innerHTML approach with React's built-in DOM methods
2. Add symbol validation at the component entry point:
```typescript
// Add at the top of the component function
if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) {
  console.warn('Invalid symbol provided to TradingView widget:', symbol)
  return <div>Invalid symbol</div>
}
```
3. Replace innerHTML usage with createElement approach or use a sanitization library like DOMPurify

## 🟡 IMPORTANT - Fix This Week (Medium Severity)

### 4. Add Input Validation

**Files to modify:**
- `app/api/az-labs-research/search/route.ts`
- `app/auth/login/page.tsx`

**Instructions:**
1. Install zod if not already installed: `pnpm add zod`
2. In `app/api/az-labs-research/search/route.ts`:
   - Add import: `import { z } from 'zod'`
   - Add schema definition:
   ```typescript
   const searchRequestSchema = z.object({
     query: z.string().min(1).max(500).trim(),
     messages: z.array(z.any()).optional().default([])
   })
   ```
   - Add validation after `await request.json()`:
   ```typescript
   const validatedBody = searchRequestSchema.parse(body)
   ```
   - Use `validatedBody` instead of `body` throughout the function

3. Add similar validation to other API endpoints and form inputs

### 5. Remove Stack Traces from Production Errors

**File to modify:** `app/api/az-labs-research/search/route.ts`
**Current issue:** Lines 395-402 expose stack traces

**Instructions:**
1. Modify the error response to remove stack trace:
```typescript
return NextResponse.json(
  { 
    error: 'Search failed', 
    message: process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred',
    // Remove: details: errorStack 
  },
  { status: 500 }
)
```
2. Add proper logging for debugging:
```typescript
console.error('Search API Error:', { errorMessage, errorStack, requestId })
```

### 6. Add Security Headers

**File to modify:** `next.config.mjs`

**Instructions:**
1. Add the following async function to the config object:
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { 
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.firecrawl.dev https://api.groq.com;"
        },
      ],
    },
  ]
}
```

## 🟢 MODERATE - Fix Next Sprint (Low Severity)

### 7. Update Dependencies

**Instructions:**
1. Run dependency audit: `npm audit`
2. Fix automatically: `npm audit fix`
3. For Next.js update, if needed: `npm audit fix --force` (test thoroughly after)
4. Commit dependency updates separately from other security fixes

### 8. Strengthen Password Requirements

**File to modify:** `supabase/config.toml`

**Instructions:**
1. Change line 139 from `minimum_password_length = 6` to `minimum_password_length = 8`
2. Change line 142 from `password_requirements = ""` to `password_requirements = "lower_upper_letters_digits"`
3. Deploy the Supabase configuration changes

### 9. Implement Rate Limiting

**Instructions:**
1. Install rate limiting library: `pnpm add @upstash/ratelimit @upstash/redis`
2. Create `lib/rate-limit.ts`:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});
```
3. Add to API routes before processing requests
4. Add environment variables to `.env.example`

## Testing Instructions

After implementing each fix:

1. **Functionality Testing:**
   - Test search functionality
   - Test authentication flow
   - Test image loading
   - Test TradingView widget

2. **Security Testing:**
   - Verify API keys are not exposed in browser network tab
   - Test that invalid inputs are rejected
   - Verify images only load from allowed domains
   - Check security headers with browser dev tools

3. **Performance Testing:**
   - Ensure no performance regression
   - Test rate limiting doesn't affect normal usage

## Deployment Checklist

- [ ] All high severity issues fixed
- [ ] Tests pass (if tests exist)
- [ ] Manual testing completed
- [ ] Security headers verified in browser
- [ ] No API keys exposed in client-side code
- [ ] Error responses don't leak sensitive information
- [ ] Dependencies updated
- [ ] Supabase configuration updated (if applicable)

## Environment Variables to Add

Add these to `.env.example` and production environment:

```bash
# Rate limiting (optional)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Commit Strategy

Create separate commits for each category:
1. `security: fix critical image domain and API key vulnerabilities`
2. `security: add input validation and remove error details`
3. `security: add security headers and strengthen auth`
4. `security: update dependencies and add rate limiting`

## Validation Commands

Run these after implementation:
```bash
# Check for remaining security issues
npm audit
# Test the application
pnpm dev
# Check for TypeScript errors
npx tsc --noEmit
# Check for linting issues
pnpm lint
```

## Additional Notes

- **Priority Order:** Fix high severity issues first, then medium, then low
- **Testing:** Test each fix individually before moving to the next
- **Documentation:** Update this file if you discover additional security concerns
- **Rollback Plan:** Keep the backup branch until all fixes are verified in production

## Questions or Issues?

If you encounter any issues during implementation:
1. Check the error logs carefully
2. Revert the specific change and try an alternative approach
3. Ensure all environment variables are properly configured
4. Test in development before deploying to production
