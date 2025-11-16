
"""javascript_api_extractor.py

Minimal heuristic-based extractor for JavaScript.
"""

import re
import os
from typing import Dict, Any, List

EXPORT_FUNC = re.compile(r'export\s+function\s+(\w+)\s*\(')
EXPORT_CONST_FUNC = re.compile(r'export\s+const\s+(\w+)\s*=\s*\(')

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []

    for path in files:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        functions = []
        for fn in EXPORT_FUNC.finditer(text):
            functions.append(fn.group(1))
        for fn in EXPORT_CONST_FUNC.finditer(text):
            functions.append(fn.group(1))

        if not functions:
            continue

        members = []
        for name in functions:
            members.append({
                "name": name,
                "kind": "function",
                "visibility": "public",
                "parameters": [],
                "returns": "unknown",
                "summary": ""
            })

        api_model.append({
            "file": path,
            "language": "javascript",
            "container": os.path.basename(path),
            "container_kind": "module",
            "summary": "",
            "members": members
        })

    return {"api_model": api_model}
