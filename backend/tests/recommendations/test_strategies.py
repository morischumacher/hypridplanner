"""Structural tests for the recommendation channels: that each is a Strategy, that
its name is its toggle key, and that composing them honours the toggles.

The golden master cannot see this, since a channel that stopped being a strategy
would go silent and the corpus would record the silence as the new truth.
"""
from __future__ import annotations

import pytest

from app.recommendations.context import build_context
from app.recommendations.engine import CHANNELS, enabled_channels
from app.recommendations.strategy import Strategy

NAMES = ["interest", "similarity", "sequence", "completed", "internship", "peer"]


def context(**over):
    base = dict(
        interests=set(),
        career_direction="",
        program_code="066 937",
        toggles={},
        planned_courses=[],
        done_courses=[],
        pool=[],
        parked_courses=None,
    )
    base.update(over)
    return build_context(**base)


@pytest.mark.parametrize("channel", CHANNELS, ids=lambda c: c.name)
def test_every_channel_is_a_strategy(channel) -> None:
    assert isinstance(channel(), Strategy)


def test_channel_names_are_the_toggle_keys() -> None:
    assert [channel.name for channel in CHANNELS] == NAMES


def test_a_channel_switched_off_is_not_composed() -> None:
    for name in NAMES:
        composed = [c.name for c in enabled_channels({**{n: True for n in NAMES}, name: False})]
        assert name not in composed
        assert len(composed) == len(NAMES) - 1


def test_a_channel_not_mentioned_is_on() -> None:
    """Stored toggles predate some channels, so absence must mean enabled."""
    assert [channel.name for channel in enabled_channels({})] == NAMES


def test_a_channel_yields_nothing_when_it_has_no_evidence() -> None:
    """Every channel must tolerate a plan it can say nothing about."""
    plan = context()
    from app.recommendations.context import Course

    candidate = Course.of({"code": "X1", "title": "Nothing In Particular"})
    for channel in CHANNELS:
        assert list(channel().suggest(plan, candidate)) == []
