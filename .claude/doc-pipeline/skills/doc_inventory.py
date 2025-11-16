
"""doc_inventory.py

Skill: scan_docs

Responsibility:
- Locate existing Markdown documentation files and classify them.
"""

import os
from typing import Dict, Any, List

def scan_docs(root: str = ".") -> Dict[str, Any]:
    docs: List[Dict[str, Any]] = []

    for dirpath, dirnames, filenames in os.walk(root):
        if ".git" in dirpath:
            continue
        for filename in filenames:
            if filename.lower().endswith(".md"):
                rel_path = os.path.join(dirpath, filename)
                kind = "generic"
                normalized = rel_path.replace("\\", "/").lower()
                if "/api/" in normalized:
                    kind = "api"
                docs.append({"path": rel_path, "kind": kind})

    return {"docs": docs}
