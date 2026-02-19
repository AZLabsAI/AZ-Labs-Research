# Iteration Notes

## Iteration 1 - Evaluate
### Scope
- Compared `feat/ui-overhaul-modern-design-14943360788886134280` UI against parent site language from `/Users/TH33_ORACL3/AZ Labs/3 - Production/AZ Labs - Live`.
- Audited tokens, shared components, chat/search/results states, accessibility, and performance hot spots.

### Findings
- Design token drift:
  - `app/globals.css` has conflicting token systems (HSL + OKLCH + duplicate `:root`), inconsistent radii/shadows/motion curves.
  - Current palette leans neon gradients; parent style uses neutral surface/on-surface with restrained blue accent.
- Component parity gaps:
  - `components/ui/button.tsx`/`input.tsx`/`card.tsx` have inconsistent focus, hover, disabled behavior across variants.
  - No unified loading state pattern for buttons/controls.
- State quality gaps:
  - Search/chat/results loading and empty states are visually inconsistent and not reusable.
  - Error surfaces vary in style hierarchy and CTA affordances.
- Information hierarchy issue:
  - In `app/chat-interface.tsx`, sources frequently render before answer; follow-ups are mixed into the same visual tier.
- Accessibility gaps:
  - Focus visibility is inconsistent on custom controls.
  - Motion-heavy UI lacks robust reduced-motion fallback.
  - Some low-contrast text and non-semantic interactive patterns.
- Performance issues:
  - `app/starter-questions.tsx` runs continuous carousel animation via React state updates (`requestAnimationFrame` + rerenders).
  - `app/chat-interface.tsx` duplicates complex source rendering blocks and recalculates expensive structures repeatedly.
- Tooling gaps:
  - No full-gate automation command chaining lint/build/verification.
  - No project-level visual snapshot script/artifact path.
  - No merge-approval checkpoint artifact.

### Improve Plan
- Introduce a single parent-site-aligned token layer (surface/on-surface, spacing, radius, shadow, motion).
- Normalize button/input/card behavior with accessible focus, disabled, and loading states.
- Refactor chat layout to: answer first, then sources, then follow-ups.
- Polish empty/loading/error components for search/chat/results.
- Add reduced-motion and keyboard/focus hardening.
- Reduce rerenders in starter/question and chat sections with memoization + static rendering where practical.
- Add `npm run gate` + verification scripts and visual snapshot automation/artifacts.
- Add pre-merge approval checklist doc.

### Verify Baseline
- Baseline inspection completed; no edits applied in Iteration 1.

## Iteration 2 - Improve
### Implemented
- Design token sync:
  - Replaced conflicting token layers in `app/globals.css` with a single semantic system aligned to parent-site surface/on-surface style.
  - Added shared radius/shadow/motion variables and reduced-motion fallback.
- Component parity:
  - Refactored `components/ui/button.tsx` with unified hover/focus/disabled/loading behavior.
  - Refactored `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/card.tsx` for consistent surfaces and focus semantics.
  - Updated dialog/dropdown styling to match component state language.
- Empty/loading/error polish:
  - Reworked result components (`app/search-results.tsx`, `app/news-results.tsx`, `app/image-results.tsx`) with stronger loading and empty-state presentation.
  - Reworked error surfaces (`components/error-display.tsx`, `components/graceful-error.tsx`).
- Information hierarchy:
  - Rebuilt `app/chat-interface.tsx` so content order is answer first, then sources, then follow-ups, for both historical and current exchanges.
- Accessibility hardening:
  - Added consistent focus-ring behavior, improved contrast tokens, aria-live status messaging, dialog semantics, and reduced-motion guardrails.
- Performance cleanup:
  - Removed starter-question rAF carousel churn by replacing with static button grid in `app/starter-questions.tsx`.
  - Consolidated chat rendering paths and memoized conversation derivation.
  - Reduced animation churn in `app/loading-animation.tsx` and `app/character-counter.tsx`.
- Full-gate and artifacts:
  - Added automation scripts: `scripts/full-gate.sh`, `scripts/verify.sh`, `scripts/capture-visual-snapshots.sh`.
  - Added npm scripts: `gate`, `verify`, `snapshots`.
  - Added pre-merge checkpoint artifact: `APPROVAL_CHECKPOINT.md`.
  - Added preview states (`?preview=chat-ready|chat-loading|chat-error`) in `app/page.tsx` for deterministic visual capture.

### Verify During Iteration
- Static implementation completed; full lint/build/verify and artifact generation moved to Iteration 3.

## Iteration 3 - Verify
### Commands Executed
- `npm run gate`
  - Runs: `npm install` → `npm run lint` → `npm run build` → `npm run verify`
- `npm run verify`
  - No `npm test` script present; verification script skips tests by design.
  - Runs `npm run snapshots`.
- `npm run snapshots`
  - Starts app on `http://127.0.0.1:3210`.
  - Captures deterministic preview snapshots:
    - `output/playwright/landing-desktop.png`
    - `output/playwright/chat-loading-desktop.png`
    - `output/playwright/chat-ready-desktop.png`
    - `output/playwright/chat-error-desktop.png`
    - `output/playwright/chat-ready-mobile.png`

### Result
- Full gate passed.
- Build and lint pass with existing repository warnings (no blocking lint errors).
- Verification artifacts generated in:
  - `output/playwright/`
  - `output/verification/full-gate.log`

### Notes
- To ensure gate stability in clean environments, snapshot automation now self-installs Chromium before capture.
- Preview query states added to `app/page.tsx` provide deterministic UI states for regression captures.
