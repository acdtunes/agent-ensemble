# ADR-007: Folder Selection UI Strategy

## Status

Accepted

## Context

The "Add Project" flow requires the user to specify an absolute filesystem path to their project directory. In a browser environment, there are limited options for selecting filesystem directories. The board runs on localhost, which satisfies security requirements for most browser APIs.

The target user is a solo developer who knows their project paths by heart.

## Options Considered

### Option A: Text input with optional native picker (progressive enhancement)

Primary: text input field where the user types or pastes an absolute path. Secondary: "Browse" button using the File System Access API (`showDirectoryPicker()`) where supported. Falls back gracefully when the API is unavailable.

- (+) Text input works in all browsers, all environments
- (+) Developer users know their paths -- typing is often faster than navigating a file picker
- (+) File System Access API provides native OS folder picker on Chrome/Edge (localhost satisfies secure context)
- (+) Zero dependencies -- native browser APIs only
- (+) Progressive enhancement: best experience where available, functional everywhere
- (-) File System Access API not supported in Safari or Firefox as of early 2025
- (-) Text input requires the user to type the full path (mitigated: paste from terminal)

### Option B: File System Access API only

Use `showDirectoryPicker()` as the sole mechanism. Show an error message on unsupported browsers.

- (+) Native OS file picker -- familiar UX
- (+) Returns a `FileSystemDirectoryHandle` with the path
- (-) Not available in Safari or Firefox -- excludes significant browser share
- (-) If browser drops support or changes API, feature is broken
- (-) No fallback path

### Option C: `<input type="file" webkitdirectory>`

Use a standard file input with the `webkitdirectory` attribute to select directories.

- (+) Wider browser support than File System Access API
- (+) Familiar file-picker UX
- (-) Returns file entries, not a directory path -- the browser exposes relative paths within the selected directory, not the absolute path. The server cannot derive the absolute path.
- (-) Fundamentally unsuitable: the server needs the absolute filesystem path to watch and read files

### Option D: Electron or Tauri wrapper

Wrap the board in a desktop app framework with native filesystem APIs.

- (+) Full native filesystem access
- (+) Native folder picker guaranteed
- (-) Massive architectural change -- new build pipeline, new distribution mechanism
- (-) Overkill for a path input that the user can type
- (-) Introduces proprietary (Electron) or additional (Tauri) dependencies

## Decision

**Option A: Text input with optional native picker (progressive enhancement).**

## Consequences

- `AddProjectDialog` component renders a text `<input>` with a "Browse" button
- "Browse" button calls `showDirectoryPicker()` if available, populates the text input with the selected path
- If `showDirectoryPicker()` is unavailable, the "Browse" button is hidden -- text input is the sole interface
- Server validates the path on the backend (fs.access check) regardless of how it was entered
- The text input includes placeholder text showing an example path to guide the user
- Path validation errors are displayed inline below the input
