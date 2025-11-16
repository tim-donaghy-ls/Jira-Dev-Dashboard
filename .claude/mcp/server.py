
"""Local MCP Server Skeleton

This is a conceptual skeleton to show how MCP tool calls could be wired
to the Python skills in this package. Adapt to your actual MCP runtime.
"""

import os
import sys
import json
from typing import Any, Dict

# Set up paths BEFORE importing skills
PIPELINE_ROOT = os.environ.get("PIPELINE_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
SKILLS_PATH = os.path.join(PIPELINE_ROOT, ".claude", "skills")
sys.path.insert(0, SKILLS_PATH)

import manifest_builder
import tech_stack_detector
import diff_scanner
import test_executor
import coverage_aggregator

def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    tool = request.get("tool")
    params = request.get("params", {})

    if tool == "manifest_builder.build":
        manifest = manifest_builder.build_repo_manifest(PIPELINE_ROOT)
        return {"manifest": manifest}

    if tool == "tech_stack_detector.detect":
        stack = tech_stack_detector.detect_stack(PIPELINE_ROOT)
        return {"tech_stack": stack}

    if tool == "diff_scanner.scan":
        manifest = params.get("manifest") or manifest_builder.build_repo_manifest(PIPELINE_ROOT)
        diffs = diff_scanner.scan_changes(manifest)
        return {"diffs": diffs}

    if tool == "test_executor.run_all":
        tech_stack = params.get("tech_stack") or tech_stack_detector.detect_stack(PIPELINE_ROOT)
        results = test_executor.run_all_tests(tech_stack)
        return {"test_results": results}

    if tool == "coverage_aggregator.aggregate":
        coverage = coverage_aggregator.aggregate_coverage()
        return {"coverage": coverage}

    return {"error": f"Unknown tool: {tool}"}

def main():
    print("[TEST-PIPELINE-MCP] Server starting...", file=sys.stderr)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except Exception as exc:
            err = {"error": str(exc)}
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
