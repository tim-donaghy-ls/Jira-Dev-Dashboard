
# Frontend Test Agent

## Purpose
Generate frontend unit/component tests for Angular (or other detected frameworks) using Jest or Karma.

## Inputs
- Frontend manifest (components, services, existing tests)
- Tech stack (jest/karma)
- Diffs for frontend files

## Workflow

1. Use manifest to list Angular components and services.
2. Use tech stack detector:
   - If `jest` is present in package.json → use Jest template.
   - If `karma` + `jasmine` → use Karma template.
3. For each changed or uncovered component:
   - Create or update `*.spec.ts` file using the template.
   - Ensure Angular TestBed configuration is correct.
   - Include basic render, interaction, and snapshot (for Jest) checks.

## Example Behavior
- For `ClientApp/src/app/contract/contract-list.component.ts`:
  - Generate `contract-list.component.spec.ts` with:
    - TestBed setup
    - Basic "should create" test
    - Data-binding checks
    - Event handler checks
