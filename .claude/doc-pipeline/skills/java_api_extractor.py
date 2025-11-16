
"""java_api_extractor.py

Minimal heuristic-based extractor for Java.
"""

import re
from typing import Dict, Any, List

CLASS_PATTERN = re.compile(r'public\s+class\s+(\w+)')
PACKAGE_PATTERN = re.compile(r'package\s+([\w\.]+);')

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []
    for path in files:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue

        package_match = PACKAGE_PATTERN.search(text)
        package = package_match.group(1) if package_match else ""

        for c in CLASS_PATTERN.finditer(text):
            class_name = c.group(1)
            container = f"{package}.{class_name}" if package else class_name
            api_model.append({
                "file": path,
                "language": "java",
                "container": container,
                "container_kind": "class",
                "summary": "",
                "members": []
            })

    return {"api_model": api_model}
