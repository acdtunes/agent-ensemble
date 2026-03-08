"""Post-scaffold enrichment: adds fields the DES scaffold doesn't generate.

Reads a scaffolded roadmap.json, adds missing fields with TODO placeholders,
writes it back. Idempotent — skips fields that already exist.

Usage:
    python -m en.cli.enrich_roadmap ROADMAP_PATH

Run AFTER des.cli.roadmap init, BEFORE filling TODOs.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROADMAP_EXTRA_FIELDS = {
    "short_description": "TODO: feature name",
    "description": "TODO: full description of what this roadmap delivers",
}

STEP_EXTRA_FIELDS = {
    "description": "TODO: what this step does and why",
    "dependencies": [],
    "files_to_modify": [],
    "status": "pending",
}


def enrich(roadmap_data: dict) -> dict:
    """Add missing fields to scaffolded roadmap. Idempotent."""
    meta = roadmap_data.get("roadmap", {})
    for key, default in ROADMAP_EXTRA_FIELDS.items():
        if key not in meta:
            meta[key] = default

    for phase in roadmap_data.get("phases", []):
        for step in phase.get("steps", []):
            for key, default in STEP_EXTRA_FIELDS.items():
                if key not in step:
                    # Deep copy list defaults to avoid shared references
                    step[key] = list(default) if isinstance(default, list) else default

    return roadmap_data


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    if not argv:
        print("Usage: python -m en.cli.enrich_roadmap ROADMAP_PATH", file=sys.stderr)
        return 2

    path = Path(argv[0])
    if not path.exists():
        print(f"Error: file not found: {path}", file=sys.stderr)
        return 2

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON: {e}", file=sys.stderr)
        return 2

    enriched = enrich(data)
    path.write_text(json.dumps(enriched, indent=2) + "\n", encoding="utf-8")
    print(f"Enriched: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
