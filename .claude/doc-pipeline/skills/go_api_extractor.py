
"""go_api_extractor.py

Minimal heuristic-based extractor for Go.
"""

import re
import os
from typing import Dict, Any, List

FUNC_PATTERN = re.compile(r'^func\s+(?:\(.*?\)\s*)?(\w+)\s*\(', re.MULTILINE)

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []

    for path in files:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        funcs = FUNC_PATTERN.findall(text)
        if not funcs:
            continue

        members = []
        for name in funcs:
            if name and name[0].isupper():
                members.append({
                    "name": name,
                    "kind": "function",
                    "visibility": "public",
                    "parameters": [],
                    "returns": "unknown",
                    "summary": ""
                })

        if not members:
            continue

        api_model.append({
            "file": path,
            "language": "go",
            "container": os.path.basename(path),
            "container_kind": "module",
            "summary": "",
            "members": members
        })

    return {"api_model": api_model}
