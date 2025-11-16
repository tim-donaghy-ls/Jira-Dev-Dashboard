
"""python_api_extractor.py

Minimal heuristic-based extractor for Python.
"""

import re
import os
from typing import Dict, Any, List

CLASS_PATTERN = re.compile(r'^class\s+(\w+)\s*\(', re.MULTILINE)
DEF_PATTERN = re.compile(r'^def\s+(\w+)\s*\(', re.MULTILINE)

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []

    for path in files:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        classes = CLASS_PATTERN.findall(text)
        funcs = DEF_PATTERN.findall(text)

        module_name = os.path.splitext(os.path.basename(path))[0]

        for class_name in classes:
            container = f"{module_name}.{class_name}"
            api_model.append({
                "file": path,
                "language": "python",
                "container": container,
                "container_kind": "class",
                "summary": "",
                "members": []
            })

        public_funcs = [f for f in funcs if not f.startswith("_")]
        if public_funcs:
            members = []
            for name in public_funcs:
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
                "language": "python",
                "container": module_name,
                "container_kind": "module",
                "summary": "",
                "members": members
            })

    return {"api_model": api_model}
