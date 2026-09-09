"""What a rule check returns, for both programmes and on the wire.

`ok`/`message` decide the edit the student just made; `stats` feeds the
dashboard; `missing` and `errors` are standing feedback and block nothing.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class RuleCheckResult:
    ok: bool = True
    message: str = "accepted"
    stats: Dict[str, Any] = field(default_factory=dict)
    missing: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
