
"""markdown_renderer.py

Skill: render_api_docs

Language-agnostic API doc renderer.
"""

import os
from typing import Dict, Any, List

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "templates", "api_reference_template.md")

def load_template() -> str:
    with open(TEMPLATE_PATH, encoding="utf-8") as f:
        return f.read()

def render_api_docs(api_model: List[Dict[str, Any]], docs_root: str) -> Dict[str, Any]:
    template = load_template()
    os.makedirs(docs_root, exist_ok=True)
    generated_files: List[str] = []

    for item in api_model:
        language = item.get("language", "unknown")
        container = item.get("container", "UnknownContainer")
        container_kind = item.get("container_kind", "unknown")
        summary = item.get("summary", "")
        members = item.get("members", [])

        members_lines = []
        for m in members:
            sig = m["name"] + "(...)"
            members_lines.append(f"- `{sig}` — {m.get('summary','')}".rstrip())
        members_section = "\n".join(members_lines) if members_lines else "_No public members detected._"

        content = template
        content = content.replace("{{LANGUAGE}}", language)
        content = content.replace("{{CONTAINER}}", container)
        content = content.replace("{{CONTAINER_KIND}}", container_kind)
        content = content.replace("{{SUMMARY}}", summary or "_No summary available._")
        content = content.replace("{{MEMBERS_SECTION}}", members_section)

        safe_name = container.replace(" ", "_").replace("/", "_")
        out_path = os.path.join(docs_root, safe_name + ".md")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)

        generated_files.append(out_path)

    return {"generated_files": generated_files}
