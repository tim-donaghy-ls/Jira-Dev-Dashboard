
"""Diff Scanner Skill

Responsibility:
- Compare current manifest against what is stored in state.
- Identify changed, added, or removed files for targeted processing.
"""

import os
import json
from typing import Dict, Any, List

STATE_PATH = os.path.join(os.path.dirname(__file__), "..", "state", "pipeline_state.json")

def scan_changes(manifest: Dict[str, Any]) -> Dict[str, List[Dict[str, str]]]:
    # Load last manifest from state if available
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            state = json.load(f)
        last_manifest = state.get("last_manifest", {})
    except FileNotFoundError:
        last_manifest = {}

    changes = {
        "backend": [],
        "frontend": [],
        "e2e": []
    }

    def compute_diff(current_list, last_list, area):
        last_set = set(last_list)
        curr_set = set(current_list)
        for added in curr_set - last_set:
            changes[area].append({"file": added, "change_type": "added"})
        for removed in last_set - curr_set:
            changes[area].append({"file": removed, "change_type": "removed"})
        for common in curr_set & last_set:
            changes[area].append({"file": common, "change_type": "modified"})  # Simplified

    compute_diff(
        manifest.get("backend", {}).get("backend_files", []),
        last_manifest.get("backend", {}).get("backend_files", []),
        "backend",
    )
    compute_diff(
        manifest.get("frontend", {}).get("frontend_files", []),
        last_manifest.get("frontend", {}).get("frontend_files", []),
        "frontend",
    )
    compute_diff(
        manifest.get("e2e", {}).get("e2e_files", []),
        last_manifest.get("e2e", {}).get("e2e_files", []),
        "e2e",
    )

    return changes
