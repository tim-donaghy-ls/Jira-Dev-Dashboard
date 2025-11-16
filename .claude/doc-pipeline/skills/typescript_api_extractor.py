
"""typescript_api_extractor.py

Minimal heuristic-based extractor for TypeScript.
"""

import re
from typing import Dict, Any, List

EXPORT_CLASS = re.compile(r'export\s+class\s+(\w+)')
EXPORT_FUNC = re.compile(r'export\s+function\s+(\w+)\s*\(')

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []

    for path in files:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        classes = []
        for c in EXPORT_CLASS.finditer(text):
            classes.append(c.group(1))

        functions = []
        for fn in EXPORT_FUNC.finditer(text):
            functions.append(fn.group(1))

        for class_name in classes:
            api_model.append({
                "file": path,
                "language": "typescript",
                "container": class_name,
                "container_kind": "class",
                "summary": "",
                "members": [],
            })

        if functions:
            members = []
            for fn_name in functions:
                members.append({
                    "name": fn_name,
                    "kind": "function",
                    "visibility": "public",
                    "parameters": [],
                    "returns": "unknown",
                    "summary": ""
                })
            api_model.append({
                "file": path,
                "language": "typescript",
                "container": os.path.basename(path),
                "container_kind": "module",
                "summary": "",
                "members": members
            })

    return {"api_model": api_model}
