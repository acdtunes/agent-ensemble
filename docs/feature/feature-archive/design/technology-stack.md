# Feature Archive - Technology Stack

## Overview

This feature extends the existing NW Teams Board with archive/restore capabilities. No new technologies are introduced - the implementation leverages existing patterns and libraries.

## Backend

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Runtime | Node.js 20+ | Existing runtime |
| Framework | Express | Existing HTTP framework |
| Realtime | ws (WebSocket) | Existing notification system |
| Filesystem | `node:fs/promises` | Native async file operations |

### Filesystem Operations

```typescript
// Using native fs for atomic directory moves
import { rename, readdir, stat, mkdir } from 'node:fs/promises';

// rename() is atomic on the same filesystem (POSIX guarantee)
// This ensures archive operations are all-or-nothing
```

## Frontend

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | React 18 | Existing UI framework |
| Language | TypeScript | Existing type safety |
| State | React hooks | Existing state pattern |
| Styling | Tailwind CSS | Existing styling system |

### Hooks Pattern

Following existing codebase conventions:
- Pure helper functions extracted
- Single-responsibility hooks
- Railway-oriented error handling with `Result<T, E>`

## Shared Types

| Type System | Technology | Justification |
|-------------|-----------|---------------|
| Branded IDs | TypeScript branded types | Existing pattern for `FeatureId`, `ProjectId` |
| Error types | Discriminated unions | Existing pattern for error handling |

## No New Dependencies

This feature requires **zero new npm packages**. All functionality is achieved with:
- Native Node.js `fs/promises` module
- Existing Express routing
- Existing WebSocket infrastructure
- Existing React patterns
