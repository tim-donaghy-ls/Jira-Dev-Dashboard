
"""Test Executor Skill

Responsibility:
- Run backend, frontend, and E2E test commands.
- Summarize results in a structured JSON format.

NOTE:
- This is a skeleton using simple subprocess calls. Adapt commands to your environment.
"""

import subprocess
from typing import Dict, Any

def run_all_tests(tech_stack: Dict[str, Any]) -> Dict[str, Any]:
    results: Dict[str, Any] = {
        "status": "completed",
        "backend": {"passed": 0, "failed": 0, "failures": []},
        "frontend": {"passed": 0, "failed": 0, "failures": []},
        "e2e": {"passed": 0, "failed": 0, "failures": []},
    }

    # Backend
    try:
        # Example command; replace with your actual test runner command
        subprocess.run(["dotnet", "test"], check=True)
        # In a real implementation, parse the output to fill passed/failed
    except Exception as exc:
        results["backend"]["failed"] += 1
        results["backend"]["failures"].append({"error": str(exc)})

    # Frontend
    if tech_stack.get("frontend", {}).get("runner") == "jest":
        cmd = ["npx", "jest", "--runInBand"]
    elif tech_stack.get("frontend", {}).get("runner") == "karma":
        cmd = ["npx", "karma", "start", "--single-run"]
    else:
        cmd = None

    if cmd:
        try:
            subprocess.run(cmd, check=True)
        except Exception as exc:
            results["frontend"]["failed"] += 1
            results["frontend"]["failures"].append({"error": str(exc)})

    # E2E
    if tech_stack.get("e2e", {}).get("framework") == "playwright":
        try:
            subprocess.run(["npx", "playwright", "test"], check=True)
        except Exception as exc:
            results["e2e"]["failed"] += 1
            results["e2e"]["failures"].append({"error": str(exc)})

    return results
