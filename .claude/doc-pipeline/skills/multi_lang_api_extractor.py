
"""multi_lang_api_extractor.py

Skill: extract_api

Routes files by inferred programming language and calls language-specific
adapters, then normalizes their outputs into a single `api_model`.
"""

from typing import Dict, Any, List
import os

import csharp_api_extractor
import typescript_api_extractor
import javascript_api_extractor
import python_api_extractor
import java_api_extractor
import go_api_extractor
import generic_fallback_extractor

ADAPTERS = {
    "csharp": csharp_api_extractor,
    "typescript": typescript_api_extractor,
    "javascript": javascript_api_extractor,
    "python": python_api_extractor,
    "java": java_api_extractor,
    "go": go_api_extractor
}

def extract_api(manifest: Dict[str, Any]) -> Dict[str, Any]:
    sources = manifest.get("sources", [])
    by_lang: Dict[str, List[str]] = {}
    for src in sources:
        lang = src.get("language", "unknown")
        path = src.get("path")
        if not path:
            continue
        by_lang.setdefault(lang, []).append(path)

    api_model: List[Dict[str, Any]] = []

    for lang, files in by_lang.items():
        if lang in ADAPTERS:
            adapter = ADAPTERS[lang]
        else:
            adapter = generic_fallback_extractor
        result = adapter.extract(files)
        # each adapter returns {"api_model": [...]}
        api_model.extend(result.get("api_model", []))

    return {"api_model": api_model}
