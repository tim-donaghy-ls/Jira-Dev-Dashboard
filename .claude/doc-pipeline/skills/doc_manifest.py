
"""doc_manifest.py

Skill: build_manifest

Multi-language version:
- Walks the repo and identifies source files by extension.
- Returns a `sources` list with path and inferred programming language.
"""

import os
from typing import Dict, Any, List

EXT_LANGUAGE_MAP = {
    ".cs": "csharp",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".rs": "rust",
    ".cpp": "cpp",
    ".cxx": "cpp",
    ".cc": "cpp",
    ".c": "c",
    ".kt": "kotlin",
    ".swift": "swift"
}

def infer_language_from_extension(path: str) -> str:
    _, ext = os.path.splitext(path)
    return EXT_LANGUAGE_MAP.get(ext.lower(), "unknown")

def build_manifest(root: str = ".") -> Dict[str, Any]:
    sources: List[Dict[str, str]] = []
    doc_dirs: List[str] = []

    for dirpath, dirnames, filenames in os.walk(root):
        if ".git" in dirpath or "node_modules" in dirpath or "bin" in dirpath or "obj" in dirpath:
            continue

        if os.path.basename(dirpath).lower() == "docs":
            doc_dirs.append(dirpath)

        for filename in filenames:
            rel_path = os.path.join(dirpath, filename)
            language = infer_language_from_extension(rel_path)
            if language != "unknown":
                sources.append({
                    "path": rel_path,
                    "language": language
                })

    return {
        "sources": sources,
        "doc_dirs": doc_dirs
    }
