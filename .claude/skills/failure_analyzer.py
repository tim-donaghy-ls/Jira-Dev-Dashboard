
"""Failure Analyzer Skill

Responsibility:
- Inspect test results and categorize failures into meaningful types.
"""

from typing import Dict, Any, List

def categorize_failures(test_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    categorized = []

    for area in ["backend", "frontend", "e2e"]:
        area_results = test_results.get(area, {})
        for failure in area_results.get("failures", []):
            categorized.append({
                "area": area,
                "test": failure.get("test", "unknown"),
                "type": failure.get("type", "unknown"),
                "details": failure
            })

    return categorized
