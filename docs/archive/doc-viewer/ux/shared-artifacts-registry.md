# Shared Artifacts Registry: Documentation Viewer

## Artifacts

### projectId
- **Source of truth**: URL hash parameter (`#/projects/{id}/...`)
- **Consumers**: Board view URL, Doc viewer URL, API endpoint for doc tree, API endpoint for doc content
- **Owner**: Router (useRouter hook)
- **Integration risk**: HIGH -- if projectId is wrong, all doc API calls fail
- **Validation**: projectId from board URL must carry over unchanged to docs URL

### projectPath
- **Source of truth**: Project registry (server-side, filesystem path where project lives)
- **Consumers**: Doc tree API (to scan filesystem), Doc content API (to read files)
- **Owner**: ProjectRegistry (server)
- **Integration risk**: HIGH -- incorrect path means no docs found
- **Validation**: Path must resolve to the project's configured documentation root directory

### docTree
- **Source of truth**: `GET /api/projects/{projectId}/docs/tree` (auto-discovered from filesystem)
- **Consumers**: Sidebar navigation, Document count summary, Search filter
- **Owner**: Doc tree API endpoint (server)
- **Integration risk**: MEDIUM -- stale tree hides newly created docs
- **Validation**: Tree must reflect actual filesystem structure at time of request

### selectedDocPath
- **Source of truth**: URL query parameter or tree click event (`?path={relativePath}`)
- **Consumers**: Content panel header, Copy button, API request for content, Browser URL
- **Owner**: Doc viewer component (client)
- **Integration risk**: HIGH -- path mismatch between UI display and clipboard copy breaks AI agent workflow
- **Validation**: Path shown in UI, path in URL, and path copied to clipboard must be identical

### docContent
- **Source of truth**: `GET /api/projects/{projectId}/docs/content?path={docPath}` (raw markdown from filesystem)
- **Consumers**: Content panel body (rendered markdown)
- **Owner**: Doc content API endpoint (server)
- **Integration risk**: MEDIUM -- serving wrong content or stale content breaks trust
- **Validation**: Content returned must match the file at the requested path on disk

### docTitle
- **Source of truth**: First `#` heading in markdown content; fallback to filename without extension
- **Consumers**: Content panel header, Search results, Tree item display (optional)
- **Owner**: Client-side parser (derived from docContent)
- **Integration risk**: LOW -- cosmetic, not functional
- **Validation**: If first heading exists, use it; otherwise use filename

### copiedPath
- **Source of truth**: Same value as `selectedDocPath`
- **Consumers**: User's clipboard (consumed externally by AI agent prompts)
- **Owner**: Copy button click handler (client)
- **Integration risk**: HIGH -- if this path is wrong, the AI agent reads/modifies the wrong file
- **Validation**: Must be a valid relative path from project root that resolves when used with `Read`, `cat`, or similar tools

## Integration Checkpoints

| Checkpoint | Artifacts Involved | Validation |
|------------|-------------------|------------|
| Board-to-Docs navigation | projectId | Same ID in both routes |
| Doc tree accuracy | projectPath, docTree | Tree reflects actual filesystem |
| Doc content accuracy | selectedDocPath, docContent | Content matches file at path |
| Copy path correctness | selectedDocPath, copiedPath | Identical values, valid relative path |
| Docs root resolution | projectPath, docTree | Configured documentation root is correctly resolved |
