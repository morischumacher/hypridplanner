"""Tests for the prerequisite relations the graph view draws.

These need no database and no running service: the relations are data, and the
point of the module is that the checkers and the graph read the same copy of it,
namely the curriculum documents in `app/curriculum`.

Two kinds are served: the enforced relations, which the engine refuses to break,
and the advisory ones, which it warns about. The split falls between the
programmes: the Master's two are enforced, the Bachelor's two are advisory. The
expected prior knowledge the curricula state per module is a third ordering with
no consequence, and is not served.
"""
from app.curriculum import BACHELOR, MASTER, load
from app.services.prerequisites import prerequisite_relations


def _of_kind(relations, kind):
    return [r for r in relations if r["kind"] == kind]


def test_every_relation_served_carries_a_consequence():
    for code in (BACHELOR, MASTER, "033 521", "066937"):
        assert all(r["kind"] in {"hard", "soft"} for r in prerequisite_relations(code))


def test_expected_prior_knowledge_is_not_served():
    # The curricula state it per module, but it carries no consequence in the
    # compliance engine, so it is not an edge the student could act on.
    for code in (BACHELOR, MASTER):
        assert _of_kind(prerequisite_relations(code), "recommended") == []
    assert len(load(BACHELOR).recommended_prereqs) > 0, "still in the curriculum, just not drawn"


def test_the_bachelor_pairs_are_advisory_and_the_master_pairs_enforced():
    # The split is between the programmes, not within them, and it is what the
    # graph draws differently.
    bachelor = prerequisite_relations("033 521")
    assert len(bachelor) == 2
    assert all(r["kind"] == "soft" for r in bachelor)
    assert {(r["source"], r["target"]) for r in bachelor} == {
        ("Einführung in die Programmierung 1", "Einführung in die Programmierung 2"),
        ("Software Engineering", "Software Engineering Projekt"),
    }
    assert _of_kind(prerequisite_relations("066937"), "soft") == []


def test_master_relations_are_the_thesis_before_its_two_dependants():
    relations = _of_kind(prerequisite_relations("066937"), "hard")
    assert len(relations) == 2
    assert all(r["source"] == "Master Thesis" for r in relations)
    assert {r["target"] for r in relations} == {
        "Final Oral Exam / Defense",
        "Seminar for Diploma Students",
    }


def test_abbreviated_aliases_do_not_produce_duplicate_relations():
    # The curriculum accepts FOE and SDS as aliases of the written-out names; they
    # name the same two relations and must not be drawn a second time.
    targets = [r["target"] for r in prerequisite_relations("066937")]
    assert "FOE" not in targets
    assert "SDS" not in targets


def test_the_drawn_advisory_pairs_are_the_engines_own():
    # The bachelor checker warns on these and the sequence recommender reads them.
    # The graph must draw that same copy rather than a second one.
    assert {tuple(pair) for pair in load(BACHELOR).soft_prereqs} == {
        (r["source"], r["target"]) for r in _of_kind(prerequisite_relations(BACHELOR), "soft")
    }


def test_an_unknown_programme_answers_with_nothing():
    assert prerequisite_relations("999 999") == []
    assert prerequisite_relations(None) == []
