
"""Manifest Builder Skill

Responsibility:
- Walk the repository and produce a structured manifest of backend, frontend, and E2E code.
- This is a simplified skeleton; extend logic as needed for your project.
"""

import os
from typing import Dict, List, Any

def build_repo_manifest(root: str = ".") -> Dict[str, Any]:
    backend_files: List[str] = []
    frontend_files: List[str] = []
    e2e_files: List[str] = []

    for dirpath, dirnames, filenames in os.walk(root):
        # Basic heuristics; customize for your repo layout
        for filename in filenames:
            rel_path = os.path.join(dirpath, filename)
            if "node_modules" in rel_path or ".git" in rel_path:
                continue
            if rel_path.endswith(".cs"):
                backend_files.append(rel_path)
            elif "ClientApp" in rel_path or "src/app" in rel_path:
                if filename.endswith(".ts"):
                    frontend_files.append(rel_path)
            if "e2e" in rel_path.lower() and filename.endswith(".ts"):
                e2e_files.append(rel_path)

    return {
        "backend": {
            "backend_files": backend_files
        },
        "frontend": {
            "frontend_files": frontend_files
        },
        "e2e": {
            "e2e_files": e2e_files
        }
    }
