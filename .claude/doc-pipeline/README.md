
# Run Documentation Pipeline (MCP + Claude Code) — Multi-Language V1

This package provides a **multi-language documentation pipeline** for a code repository,
implemented as a **local MCP server** that Claude Code can call.

It is designed to work across many **programming languages** (C#, TypeScript, JavaScript,
Python, Java, Go, etc.) using a language-agnostic core plus per-language adapters.

Core capabilities:
- Scan the repo and build a language-aware code manifest
- Discover existing documentation
- Extract public API information per file using language adapters
- Normalize all APIs into a single `api_model`
- Generate or update API docs using Markdown templates
- Produce a documentation coverage + gaps report

Slash command entrypoint:

- `/run-doc-pipeline` – run the full documentation workflow.

See `docs/quickstart.md` for how to run this with Claude Code.
