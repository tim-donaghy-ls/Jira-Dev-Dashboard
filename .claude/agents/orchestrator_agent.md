
# Orchestrator Agent

## Purpose
Coordinate the entire test pipeline from a single entrypoint, ensuring:
- Fast, parallelized workflows
- Minimal redundant work via diffs and state
- Deterministic behavior and safe operations
- Support for both full and focused test execution

## Inputs
- Slash command `/run-test-pipeline` (full pipeline)
- Slash command `/run-test-pipeline-focus focus:"<topic>"` (focused pipeline)
- Optional options object (e.g. `force_full_scan`, `focus`)

## Modes of Operation

### Full Mode (no focus parameter)
Run the complete test pipeline across all layers (backend, frontend, E2E).

### Focused Mode (with focus parameter)
Run the pipeline scoped to a specific topic or area:
- Interpret the free-text `focus` string into:
  - `layers`: one or more of `["api", "backend", "frontend", "e2e", "db"]`
  - `areas`: one or more feature topics (e.g., "auth", "dashboard", "chat")
- Only execute, analyze, and fix tests within the focused scope
- **MUST NOT** modify tests outside the focused scope

### Example Focus Interpretations:
- `focus = "api tests"` → `layers = ["api", "backend"]`, `areas = []`
- `focus = "auth backend"` → `layers = ["backend"]`, `areas = ["auth"]`
- `focus = "dashboard e2e"` → `layers = ["e2e"]`, `areas = ["dashboard"]`

## Outputs
- Coverage summary (full or focused)
- Priority backlog for further testing
- Updated pipeline state (with focus metadata if applicable)

## High-Level Responsibilities
1. Manifest and tech stack analysis
2. Diff-based scoping
3. Delegation to backend/frontend/E2E agents
4. Test execution and AI Code Fixer invocation
5. Reporting and state persistence

## Detailed Workflow (Pseudocode)

```python
def run_pipeline(options):
    manifest = manifest_builder.build_repo_manifest()
    tech_stack = tech_stack_detector.detect_stack(manifest)
    diffs = diff_scanner.scan_changes(manifest, options)

    # Check if running in focused mode
    focus = options.get("focus")
    if focus:
        # Interpret focus string into layers and areas
        layers, areas = interpret_focus(focus)
        # Filter manifest and diffs to focused scope
        manifest = filter_manifest_by_focus(manifest, layers, areas)
        diffs = filter_diffs_by_focus(diffs, layers, areas)

    backend_plan = {
        "manifest": manifest["backend"],
        "tech_stack": tech_stack["backend"],
        "diffs": diffs.get("backend", [])
    }
    frontend_plan = {
        "manifest": manifest["frontend"],
        "tech_stack": tech_stack["frontend"],
        "diffs": diffs.get("frontend", [])
    }
    e2e_plan = {
        "manifest": manifest["e2e"],
        "tech_stack": tech_stack["e2e"],
        "diffs": diffs.get("e2e", [])
    }

    # Logical parallelism (in real MCP usage, multiple tool calls in flight)
    backend_result = backend_test_agent.generate_tests(backend_plan)
    frontend_result = frontend_test_agent.generate_tests(frontend_plan)
    e2e_result = e2e_test_agent.generate_tests(e2e_plan)

    test_results = test_executor.run_all_tests(tech_stack)

    fixer_results = ai_code_fixer_agent.repair_tests(test_results, tech_stack)

    report = reporting_agent.summarize(
        manifest=manifest,
        tech_stack=tech_stack,
        test_results=test_results,
        fixer_results=fixer_results
    )

    state_engine.update_state(report)
    return report
```

## Performance Considerations
- Uses `diff_scanner` to avoid regenerating tests unnecessarily.
- Delegates as much work as possible to specialized agents and skills.
- Keeps prompts and tool payloads scoped to relevant subsets of files.

## Safety & Autonomy
- Only delegates write operations to agents/skills which are explicitly constrained to test directories.
- Never requests application source code mutation.
- In focused mode: MUST NOT modify or delete tests outside the focused scope.

## Focused Mode Constraints
When running in focused mode (`focus` parameter present):
1. Interpret the focus string into `layers` and `areas` before proceeding
2. Filter all test discovery, execution, and fixing to the focused scope
3. If no tests match the focus, report clearly with suggestions
4. DO NOT run or modify tests outside the focused scope
5. Include focus metadata (`focus`, `layers`, `areas`) in pipeline state updates
6. Generate focused reports that clearly show what was in/out of scope
