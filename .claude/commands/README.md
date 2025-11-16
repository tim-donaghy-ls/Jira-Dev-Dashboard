# Claude Code Custom Commands

## Available Commands

### `/full-pipeline`
**Complete test automation workflow**

Executes the full agent pipeline:
1. Analyzes codebase and requirements
2. Creates execution plan
3. Generates backend, frontend, and E2E tests
4. Runs all tests
5. Produces comprehensive documentation and reports

**Usage:**
```
/full-pipeline
```

This is equivalent to the original:
```
/agent MainArchitectAgent "Full pipeline run: analyze code, generate tests, run /test-runner, produce reports."
```

---

### `/run-tests`
**Quick test execution and reporting**

Runs all existing tests and generates a report:
- Backend Go tests with coverage
- Frontend React tests with coverage
- Playwright E2E tests
- Comprehensive failure analysis
- Performance metrics

**Usage:**
```
/run-tests
```

This is equivalent to the original:
```
/agent TestRunnerReporter "run all tests"
```

---

## Tips

- Use `/full-pipeline` when you want to generate new tests and run a complete analysis
- Use `/run-tests` when you just want to run existing tests and get a report
- All reports are saved to the `reports/` directory
- Generated tests are placed in `tests/backend/`, `tests/frontend/`, and `tests/e2e/`
