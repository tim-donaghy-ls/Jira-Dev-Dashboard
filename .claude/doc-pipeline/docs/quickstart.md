
# Documentation Pipeline QuickStart (Multi-Language V1)

This pipeline is language-agnostic at its core and uses per-language adapters
to support different programming languages.

## 1. Unpack and Open

1. Unzip this package into a directory, e.g.:

   ```bash
   mkdir -p ~/claude/doc-pipeline-multilang
   cd ~/claude/doc-pipeline-multilang
   unzip doc_pipeline_mcp_multilang_v1.zip
   ```

2. Open this folder in Claude Code.

## 2. Configure the MCP Server

Use the example config in:

- `mcp/mcp-config.example.json`

It expects:

- Command: `python`
- Args: `["mcp/server.py"]`

You can start the MCP server manually:

```bash
cd mcp
python server.py
```

## 3. Run the Documentation Pipeline

From Claude Code, run:

```text
/run-doc-pipeline
```

The orchestrator should:

1. Call `doc_manifest.build_manifest`:
   - Build a `sources` list with `{path, language}` for each source file.
2. Call `doc_inventory.scan_docs`:
   - Discover existing Markdown docs.
3. Call `multi_lang_api_extractor.extract_api`:
   - Route files by `language` and call the appropriate language adapter(s).
   - Merge results into a unified `api_model` using a normalized schema.
4. Call `markdown_renderer.render_api_docs`:
   - Generate/refresh API docs under `docs/api/` for any public container (class/module/etc.).
5. Call `doc_reporting_agent` (conceptual agent):
   - Compute coverage and gaps.
   - Update `state/docs_state.json`.

You can extend or refine the per-language adapters over time without changing the core pipeline.
