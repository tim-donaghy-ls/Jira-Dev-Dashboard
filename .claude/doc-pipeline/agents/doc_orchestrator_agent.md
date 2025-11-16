
# Doc Orchestrator Agent (Multi-Language)

## Purpose
Coordinate the `/run-doc-pipeline` workflow across any programming language.

## Responsibilities
1. Build a language-aware manifest of source files.
2. Discover existing docs.
3. Extract public APIs across all languages via a multi-language API extractor.
4. Generate or refresh API docs.
5. Summarize coverage and gaps, and update persistent state.

## Workflow Overview

1. Call MCP tool `doc_manifest.build_manifest`:
   - Receives:
     ```json
     {
       "sources": [
         { "path": "src/Services/ContractService.cs", "language": "csharp" },
         { "path": "src/api/routes.ts", "language": "typescript" },
         { "path": "src/lib/utils.py", "language": "python" }
       ],
       "doc_dirs": ["docs"]
     }
     ```

2. Call MCP tool `doc_inventory.scan_docs`:
   - Discover all existing Markdown docs and their types.

3. Call MCP tool `multi_lang_api_extractor.extract_api`:
   - Input: the `sources` list.
   - Output: a unified `api_model` with a language-neutral schema.

4. Call MCP tool `markdown_renderer.render_api_docs`:
   - Input: `api_model` and doc root (e.g. `docs/api`).
   - Output: list of generated/updated API doc files.

5. Invoke `doc_reporting_agent` (conceptual):
   - Use `api_model`, generated files, and doc inventory.
   - Compute coverage and build a backlog for the next run.
   - Update `state/docs_state.json`.

## Notes
- The orchestrator does not need to know any language-specific syntax.
- All language-specific logic lives inside the `multi_lang_api_extractor` and its adapters.
