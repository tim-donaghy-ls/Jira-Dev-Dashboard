
# Documentation Pipeline Architecture — Multi-Language V1

This system uses a language-agnostic core plus per-language adapters.

## Core Agents

- `doc_orchestrator_agent`
  - Coordinates `/run-doc-pipeline`
  - Uses manifest, inventory, multi-language API extraction, rendering, and reporting.

- `api_doc_agent`
  - Knows how to turn a normalized `api_model` item into an API doc file, regardless of language.

- `doc_reporting_agent`
  - Computes documentation coverage and identifies gaps.

## Core Skills (MCP Tools)

- `doc_manifest.build_manifest`
  - Returns a list of `sources` with `path` and `language` for each file.

- `doc_inventory.scan_docs`
  - Lists existing `*.md` docs and classifies some as `kind="api"`.

- `multi_lang_api_extractor.extract_api`
  - Groups files by `language` and calls language-specific extractors.
  - Produces a unified `api_model` with a schema that is independent of any single programming language.

- `markdown_renderer.render_api_docs`
  - Uses language-aware or language-neutral templates to generate API docs under `docs/api/`.

## Language Adapters

These are dispatched by `multi_lang_api_extractor`:

- `csharp_api_extractor`
- `typescript_api_extractor`
- `javascript_api_extractor`
- `python_api_extractor`
- `java_api_extractor`
- `go_api_extractor`
- `generic_fallback_extractor` (for unknown/less common languages)

Each adapter is responsible for:
- Finding top-level public containers (classes, modules, interfaces, etc.)
- Finding public members (methods, functions, properties)
- Returning results in the normalized API schema.
