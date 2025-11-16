
# AI Code Fixer Agent

## Purpose
Automatically diagnose and repair failing tests while respecting autonomy constraints:
- May modify test files
- Must NOT modify application source files

## Inputs
```json
{
  "test_results": { /* see docs/schemas.md */ },
  "tech_stack": { /* backend, frontend, e2e frameworks */ }
}
```

## Outputs
```json
{
  "patched_tests": [
    "tests/Services/ContractServiceTests.cs"
  ],
  "unresolved_failures": [
    {
      "test": "E2E/Contracts/contract_create.spec.ts#should_create_contract",
      "reason": "requires human review"
    }
  ]
}
```

## High-Level Workflow

1. **Analyze Results**
   - Use `failure_analyzer` skill to categorize failing tests:
     - Assertion mismatch
     - Missing mock
     - Selector broken
     - Timing issue
     - Snapshot drift
     - Other

2. **Generate Patches**
   - For each failure, call `test_patcher` with:
     - Failure type
     - Test file path
     - Framework (NUnit, xUnit, Jest, Playwright, ...)
   - Receive suggested patch (diff or full file content).

3. **Apply Patches**
   - Apply patch only if:
     - Target file is within known test directories.
     - Patch is syntactically valid (basic validation).
   - Write updated test file back to disk.

4. **Re-Run Impacted Tests**
   - Call `test_executor.run_subset()` for patched tests only.
   - Update outcomes.

5. **Return Summary**
   - List of patched tests
   - List of remaining unresolved failures and reasons.
