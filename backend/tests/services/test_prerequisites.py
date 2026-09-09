"""The prerequisite relations the graph view draws, read from `app/curriculum` so the
checkers and the graph share one copy.

Two kinds are served: enforced (Master) and advisory (Bachelor). The expected prior
knowledge the curricula state per module carries no consequence and is not served.
"""
from app.curriculum import BACHELOR, MASTER, load
from app.services.prerequisites import prerequisite_relations


def _of_kind(relations, kind):
    return [r for r in relations if r["kind"] == kind]


def test_every_relation_served_carries_a_consequence():
    for code in (BACHELOR, MASTER, "033 521", "066937"):
        assert all(r["kind"] in {"hard", "soft"} for r in prerequisite_relations(code))


def test_expected_prior_knowledge_is_not_served():
    # No consequence in the compliance engine, so not an edge a student can act on.
    for code in (BACHELOR, MASTER):
        assert _of_kind(prerequisite_relations(code), "recommended") == []
    assert len(load(BACHELOR).recommended_prereqs) > 0, "still in the curriculum, just not drawn"


def test_the_bachelor_pairs_are_advisory_and_the_master_pairs_enforced():
    # The split is between the programmes, and the graph draws the two differently.
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
    assert all(r["source"] in {"Master Thesis", "MTH"} for r in relations)
    assert {r["target"] for r in relations} == {
        "Final Oral Exam / Defense",
        "Seminar for Diploma Students",
        "FOE",
        "SDS",
    }


def test_both_spellings_of_a_master_relation_are_served():
    # The catalogue titles these three courses in German, so only the code form
    # resolves to a node. Serving the written-out form alone drew nothing.
    relations = prerequisite_relations("066937")
    pairs = {(r["source"], r["target"]) for r in relations}
    assert ("MTH", "FOE") in pairs
    assert ("Master Thesis", "Final Oral Exam / Defense") in pairs
    assert len(relations) == 4


def test_the_drawn_advisory_pairs_are_the_engines_own():
    # The bachelor checker warns on these and the sequence channel reads them, so
    # the graph must draw that same copy.
    assert {tuple(pair) for pair in load(BACHELOR).soft_prereqs} == {
        (r["source"], r["target"]) for r in _of_kind(prerequisite_relations(BACHELOR), "soft")
    }


def test_an_unknown_programme_answers_with_nothing():
    assert prerequisite_relations("999 999") == []
    assert prerequisite_relations(None) == []
