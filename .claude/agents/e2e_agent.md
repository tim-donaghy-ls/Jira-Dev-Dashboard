
# E2E Test Agent (Playwright)

## Purpose
Generate stable Playwright E2E tests using a Page Object Model (POM) pattern.

## Inputs
- E2E manifest (routes/pages of interest)
- Tech stack (Playwright TS configuration)
- Diffs (e.g., key pages changed)

## Workflow

1. Identify important routes from manifest (e.g. `/contracts`, `/login`, `/dashboard`).
2. For each route, generate:
   - A Page Object file in `e2e/pages/`.
   - One or more scenario tests in `e2e/specs/`.
3. Use:
   - `page.goto()`
   - `page.waitForLoadState('networkidle')`
   - Data-test-id selectors when available.
4. Avoid:
   - Hard-coded timeouts when possible.
   - Flaky selectors (prefer role-based or data attributes).

## Output
- POM files and spec files ready to run with `npx playwright test`.
