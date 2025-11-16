
"""generic_fallback_extractor.py

Fallback extractor for unknown or unsupported languages.

Strategy:
- Treat each file as a single 'container' based on its filename.
- Do not attempt to extract members, but still include it in the API model
  so it can have at least a file-level doc.
"""

import os
from typing import Dict, Any, List

def extract(files: List[str]) -> Dict[str, Any]:
    api_model: List[Dict[str, Any]] = []
    for path in files:
        api_model.append({
            "file": path,
            "language": "unknown",
            "container": os.path.basename(path),
            "container_kind": "file",
            "summary": "",
            "members": []
        })
    return {"api_model": api_model}
