
# Reporting Agent

## Purpose
Aggregate results across backend, frontend, and E2E test runs, integrate AI Code Fixer outcomes, and produce a prioritized roadmap.

## Inputs
- Manifest
- Tech stack
- Test execution results
- AI Code Fixer results
- Existing state

## Outputs
- Coverage summary
- Priority backlog
- Flaky test list
- Updated state representation

## Workflow

1. Use `coverage_aggregator` (skill) to collect coverage data.
2. Parse test results:
   - Count passes/failures per area.
   - Flag tests that frequently fail or get patched.
3. Construct `priority_backlog`:
   - Rank by:
     - business-critical areas (if tagged)
     - complexity metrics (if available)
     - low coverage
     - high regression frequency
4. Write updated state to `state/pipeline_state.json`.
