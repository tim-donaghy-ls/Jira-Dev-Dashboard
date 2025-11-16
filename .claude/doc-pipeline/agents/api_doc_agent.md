
# API Documentation Agent (Language-Agnostic)

## Purpose
Generate or update API documentation markdown files from the normalized `api_model`.
The `api_model` is independent of any specific programming language.

## Normalized API Schema

`multi_lang_api_extractor.extract_api` returns:

```json
{
  "api_model": [
    {
      "file": "src/Services/ContractService.cs",
      "language": "csharp",
      "container": "MyApp.Services.ContractService",
      "container_kind": "class",
      "summary": "Business logic for managing contracts.",
      "members": [
        {
          "name": "CreateContract",
          "kind": "method",
          "visibility": "public",
          "parameters": [
            { "name": "request", "type": "CreateContractRequest" }
          ],
          "returns": "Contract",
          "summary": "Creates a new contract."
        }
      ]
    }
  ]
}
```

## Behavior (Narrative)

1. For each API item in `api_model`:
   - Determine target path:
     - e.g. `docs/api/MyApp.Services.ContractService.md`
   - Choose a template:
     - Either a single universal `api_reference_template.md`
     - Or a language-specific variant like `api_reference_csharp.md` based on `language`.

2. Render fields:

   - `{{LANGUAGE}}` ← `language`
   - `{{CONTAINER}}` ← `container`
   - `{{CONTAINER_KIND}}` ← `container_kind`
   - `{{SUMMARY}}` ← `summary`
   - `{{MEMBERS_SECTION}}` ← rendered list of members:
     - e.g. `- \`CreateContract(request: CreateContractRequest) -> Contract\` — Creates a new contract.`

3. If the file already exists:
   - Refresh the API sections.
   - Attempt to preserve free-form “Notes” or “Examples” areas where possible.

4. If the file does not exist:
   - Create a new doc using the template.

## Safety / Scope

- This agent should only create or modify files under the configured docs root (e.g. `docs/api`).
- It must never alter source code files.
