
"""csharp_api_extractor.py

Minimal heuristic-based extractor for C#.
"""

import re
from typing import Dict, Any, List

CLASS_PATTERN = re.compile(r'public\s+class\s+(\w+)')
NAMESPACE_PATTERN = re.compile(r'namespace\s+([\w\.]+)')
METHOD_PATTERN = re.compile(r'public\s+(?:async\s+)?[\w<>,\[\]]+\s+(\w+)\s*\(')

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []

    for path in files:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        namespace_match = NAMESPACE_PATTERN.search(text)
        namespace = namespace_match.group(1) if namespace_match else ""

        for c in CLASS_PATTERN.finditer(text):
            class_name = c.group(1)
            class_block = text[c.start():]
            members = []
            for m in METHOD_PATTERN.finditer(class_block):
                members.append({
                    "name": m.group(1),
                    "kind": "method",
                    "visibility": "public",
                    "parameters": [],
                    "returns": "unknown",
                    "summary": ""
                })

            container = f"{namespace}.{class_name}" if namespace else class_name
            api_model.append({
                "file": path,
                "language": "csharp",
                "container": container,
                "container_kind": "class",
                "summary": "",
                "members": members
            })

    return {"api_model": api_model}
