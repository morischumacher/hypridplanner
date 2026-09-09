"""Recording hook for the response-shape contract. Capture is opt-in:

    RECORD_RESPONSE_SHAPES=1 pytest tests/api

Without the flag, an endpoint with no recorded shape skips rather than recording
whatever it returns today.
"""
from __future__ import annotations

import json
import os


def pytest_sessionfinish(session, exitstatus) -> None:
    if os.environ.get("RECORD_RESPONSE_SHAPES") != "1":
        return
    from . import test_api_contract as contract

    if not contract.OBSERVED:
        return
    merged = {**contract.EXPECTED, **contract.OBSERVED}
    contract.SHAPES.write_text(json.dumps(merged, indent=1, sort_keys=True))
    print(f"\nrecorded {len(contract.OBSERVED)} response shape(s) to {contract.SHAPES.name}")
