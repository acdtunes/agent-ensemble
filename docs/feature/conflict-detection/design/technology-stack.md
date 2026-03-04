# Technology Stack: Conflict Detection

## No New Technologies

This feature uses only existing stack components:

| Layer | Technology | Already Used | Change |
|-------|------------|--------------|--------|
| CLI | Python 3.11+ | Yes | Extend existing functions |
| YAML parsing | ruamel.yaml | Yes | No change (preserves comments) |
| Types | TypeScript | Yes | Add 2 optional fields |
| UI | React | Yes | Add badge + tooltip |
| Styling | Tailwind CSS | Yes | Use existing badge classes |

## File Changes Summary

### Python (CLI)

| File | Change Type | LOC Estimate |
|------|-------------|--------------|
| `src/agent_ensemble/cli/team_state.py` | Modify | +30 |

New functions:
- `_get_conflicting_step_ids()` — ~10 lines
- Conflict write logic in `cmd_start_step` — ~10 lines
- Conflict cleanup in `cmd_complete_step` — ~10 lines

### TypeScript (Board)

| File | Change Type | LOC Estimate |
|------|-------------|--------------|
| `board/shared/types.ts` | Modify | +2 |
| `board/src/utils/statusMapping.ts` | Modify | +3 |
| `board/src/components/StepCard.tsx` | Modify | +15 |

### Tests

| File | Change Type | LOC Estimate |
|------|-------------|--------------|
| `tests/test_team_state.py` | Modify | +40 |
| `board/src/__tests__/statusMapping.test.ts` | Modify | +20 |
| `board/src/__tests__/StepCard.test.tsx` | Modify | +30 |

## Total Estimated Impact

- **Python**: ~30 new lines
- **TypeScript**: ~20 new lines
- **Tests**: ~90 new lines
- **Total**: ~140 lines

This is a small, focused change leveraging existing infrastructure.
