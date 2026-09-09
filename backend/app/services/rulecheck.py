"""Use case around the rule sets in `app/rules`, wrapping their failures in a
domain error the API can answer with."""
from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

from ..domain.errors import RuleEvaluationFailed
from ..rules import checker_for


class RuleCheckService:
    def evaluate(self, payload: dict[str, Any]) -> dict[str, Any]:
        checker = checker_for(payload.get("programCode"))
        try:
            result = checker.evaluate(payload)
        except Exception as error:  # noqa: BLE001 - reported to the caller
            raise RuleEvaluationFailed(f"Rulecheck evaluation failed: {error}") from error

        if is_dataclass(result):
            return asdict(result)
        if isinstance(result, dict):
            return result
        if hasattr(result, "model_dump"):
            return result.model_dump()
        return {"ok": True, "message": str(result)}
