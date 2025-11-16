
import os
import sys
import json

PIPELINE_ROOT = os.environ.get("DOC_PIPELINE_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.join(PIPELINE_ROOT, "skills"))

import doc_manifest
import doc_inventory
import multi_lang_api_extractor
import markdown_renderer

def handle_request(request):
    tool = request.get("tool")
    params = request.get("params") or {}
    root = params.get("root", PIPELINE_ROOT)

    if tool == "doc_manifest.build_manifest":
        return {"manifest": doc_manifest.build_manifest(root)}

    if tool == "doc_inventory.scan_docs":
        return {"doc_inventory": doc_inventory.scan_docs(root)}

    if tool == "multi_lang_api_extractor.extract_api":
        manifest = params.get("manifest")
        if not manifest:
            manifest = doc_manifest.build_manifest(root)
        return multi_lang_api_extractor.extract_api(manifest)

    if tool == "markdown_renderer.render_api_docs":
        api_model = params.get("api_model") or []
        docs_root = params.get("docs_root", os.path.join(root, "docs", "api"))
        return markdown_renderer.render_api_docs(api_model, docs_root)

    return {"error": f"Unknown tool: {tool}"}

def main():
    print("[DOC-PIPELINE-MULTILANG-MCP] Server started.", file=sys.stderr)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            resp = handle_request(req)
        except Exception as exc:
            resp = {"error": str(exc)}
        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
