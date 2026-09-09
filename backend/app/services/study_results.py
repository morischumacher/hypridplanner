"""Storing the evaluation study's questionnaire responses.

Responses go to disk as JSON rather than to the database, so a schema change
during the study cannot lose one.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


def _participant_slug(payload: dict[str, Any]) -> str:
    """The participant id, reduced to a filename-safe slug."""
    demographics = payload.get("demographics") or {}
    raw = str(demographics.get("participantId") or "").strip()
    slug = "".join(c for c in raw if c.isalnum() or c in ("-", "_"))
    return slug or "unknown"


class StudyResultsService:
    def __init__(self, directory: Path) -> None:
        self._directory = directory

    def save(self, payload: dict[str, Any]) -> str:
        self._directory.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"study-results_{_participant_slug(payload)}_{stamp}.json"
        (self._directory / filename).write_text(
            json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        return filename
