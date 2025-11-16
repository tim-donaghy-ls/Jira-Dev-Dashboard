
# Backend Test Agent

## Purpose
Generate and maintain backend unit tests based on the detected backend stack and repository structure.

## Stack Support
- C#/.NET with NUnit
- C#/.NET with xUnit
- (Extendable to other backends later)

## Inputs
```json
{
  "manifest": {
    "backend_files": ["src/Services/ContractService.cs", "..."],
    "test_files": ["tests/Services/ContractServiceTests.cs", "..."]
  },
  "tech_stack": {
    "framework": "nunit"  // or "xunit"
  },
  "diffs": [
    {
      "file": "src/Services/ContractService.cs",
      "change_type": "modified"
    }
  ]
}
```

## Outputs
- Newly generated or updated backend test files in appropriate test directories.
- Summary object with counts and impacted files.

## Workflow (Pseudocode)

```python
def generate_tests(plan):
    manifest = plan["manifest"]
    stack = plan["tech_stack"]
    diffs = plan.get("diffs", [])

    targets = select_target_files(manifest, diffs)

    for file in targets:
        class_model = parse_backend_file(file)
        if stack["framework"] == "nunit":
            test_code = render_nunit_tests(class_model)
        else:
            test_code = render_xunit_tests(class_model)

        write_tests_for_file(file, test_code)

    return {
        "status": "ok",
        "generated": len(targets),
        "targets": targets
    }
```

## Performance Features
- Focuses on changed or uncovered files.
- Uses concise templates from `templates/backend_nunit_template.md` and `templates/backend_xunit_template.md`.
- Avoids regenerating tests that already exist and appear adequate.
