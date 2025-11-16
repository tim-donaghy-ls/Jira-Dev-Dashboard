
# Documentation Reporting Agent (Multi-Language)

## Purpose
Provide a language-agnostic summary of documentation coverage and gaps.

## Inputs (Conceptual)

- `api_model`: list of containers and members across all languages.
- `generated_docs`: list of API doc paths created/updated this run.
- `doc_inventory`: list of all docs with their paths and kinds.
- `previous_state`: contents of `state/docs_state.json`.

## Outputs

```json
{
  "summary": "Generated 10 new API docs, updated 3 existing docs.",
  "doc_coverage": {
    "api_items_documented": 42,
    "api_items_total": 50
  },
  "doc_priority_backlog": [
    {
      "container": "MyApp.Legacy.LegacyService",
      "language": "csharp",
      "reason": "public container with no API doc"
    }
  ],
  "updated_state": { ... }
}
```

## Behavior (Narrative)

1. Count total containers in `api_model` as `api_items_total`.
2. Determine which containers have at least one corresponding doc file:
   - e.g. by checking for `docs/api/<normalized_container>.md` in `doc_inventory`.
3. Set `api_items_documented` accordingly.
4. Build `doc_priority_backlog` with:
   - Containers that lack docs.
   - Optionally, containers with many members but very short summaries.
5. Construct an updated state object and write to `state/docs_state.json`.

Language does not matter at this level; all decisions are made on the normalized `api_model`.
