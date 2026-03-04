# Multi-Project Selector -- Technology Stack

## Principle

No new dependencies. This feature is achieved entirely by extending existing modules and adding new pure-function modules within the current stack. The existing technology choices are validated and reused.

## Existing Dependencies (Reused)

### Server

| Dependency | Version | License | Role in This Feature |
|------------|---------|---------|---------------------|
| express | ^4.x | MIT | HTTP routes for project add/remove, feature endpoints |
| ws | ^8.x | MIT | WebSocket: extended ProjectSummary in project_list messages |
| chokidar | ^3.x | MIT | File watching: existing project-level state watchers (unchanged) |
| js-yaml | ^4.x | MIT | YAML parsing: reused for feature-level roadmap.yaml and execution-log.yaml |
| typescript | ^5.x | Apache-2.0 | Type system: new algebraic types for features, manifest, extended routes |

### Client

| Dependency | Version | License | Role in This Feature |
|------------|---------|---------|---------------------|
| react | ^18.x | MIT | New components: FeatureCard, ProjectFeatureView, ContextDropdowns, etc. |
| vite | ^5.x | MIT | Dev server and build (unchanged) |
| react-markdown | ^9.x | MIT | Reused for feature-scoped doc rendering (unchanged) |

### Dev Dependencies

| Dependency | Version | License | Role |
|------------|---------|---------|------|
| vitest | ^2.x | MIT | Unit tests for new pure functions and components |
| @testing-library/react | ^14.x | MIT | Component tests for new UI components |

## New Dependencies

**None required.**

Rationale:
- **Manifest persistence**: `JSON.stringify`/`JSON.parse` + `node:fs` -- no library needed for a single JSON file
- **Path resolution**: `node:path` (built-in) -- join, resolve, basename
- **Directory scanning**: `node:fs/promises` (built-in) -- readdir, access, stat
- **Form handling (Add Project dialog)**: Native HTML `<input type="text">` for path entry. Browser File System Access API (`showDirectoryPicker()`) as progressive enhancement -- no polyfill, graceful fallback to text input
- **Dropdown selectors**: Native HTML `<select>` elements -- no component library needed at this scale

## Technology Decisions

### Manifest Format: JSON (not YAML)

The project manifest (`~/.nwave/projects.json`) uses JSON, not YAML.
- The manifest is machine-written/machine-read, never user-edited
- JSON has zero-dependency serialize/deserialize in Node.js
- YAML would add js-yaml as a dependency for a file that does not benefit from YAML's human-readability advantages
- See ADR-004

### Feature Artifact Discovery: On-Demand Scan (not Cached)

Feature lists are computed fresh on each API request by scanning `docs/feature/` directories.
- At 1-5 features per project, a readdir + 2 YAML reads per feature takes <10ms
- Caching adds invalidation complexity (filesystem changes between requests)
- On-demand scan is simpler and correct by construction
- See ADR-005

### Feature State Delivery: HTTP Fetch (not WebSocket)

Feature-level board data is fetched via HTTP, not WebSocket subscriptions.
- Feature boards are viewed one at a time, minutes apart
- WebSocket subscription model would require significant extension (feature-level subscriptions, multiplexed watchers)
- HTTP fetch on navigation is sufficient; manual refresh button covers the rare case of needing live updates while viewing
- See ADR-006

### Folder Selection: Text Input with Optional Native Picker

The "Add Project" dialog uses a text input field as the primary interface, with progressive enhancement via the File System Access API (`showDirectoryPicker()`) on supporting browsers.
- File System Access API provides native OS folder picker but requires HTTPS or localhost (our case -- satisfied)
- Not all browsers support it (Safari lacks support as of 2025)
- Text input is universally supported and the developer knows their project paths
- See ADR-007

## License Compliance

All dependencies are MIT or Apache-2.0. No copyleft licenses. No proprietary dependencies. No new dependencies introduced.
