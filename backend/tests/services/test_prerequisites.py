"""Tests for the enforced prerequisite relations the graph view draws.

These need no database and no running service: the relations are data, and the
point of the module is that the checkers and the graph read the same copy of it,
namely the curriculum documents in `app/curriculum`.

Only enforced relations are served. The advisory pairs the bachelor checker warns
on stay in the curriculum, because the engine and the sequence recommender read
them; they are simply not edges.
"""
from app.curriculum import BACHELOR, MASTER, load
from app.services.prerequisites import prerequisite_relations


def test_every_relation_served_is_enforced():
    for code in (BACHELOR, MASTER, "033 521", "066937"):
        assert all(r["kind"] == "hard" for r in prerequisite_relations(code))


def test_bachelor_encodes_no_enforced_course_to_course_relation():
    # Its two pairs are advisory, and the engine reports them as warnings rather
    # than rejections, so nothing is drawn. An empty list is a real answer.
    assert prerequisite_relations("033 521") == []


def test_master_relations_are_the_thesis_before_its_two_dependants():
    relations = prerequisite_relations("066937")
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


def test_the_advisory_pairs_stay_in_the_curriculum_for_the_engine():
    # The bachelor checker warns on these and the sequence recommender reads them.
    # Cutting them from the drawn edges must not cut them from the curriculum.
    assert len(load(BACHELOR).soft_prereqs) == 2
    assert {tuple(pair) for pair in load(BACHELOR).soft_prereqs} == {
        ("Einführung in die Programmierung 1", "Einführung in die Programmierung 2"),
        ("Software Engineering", "Software Engineering Projekt"),
    }


def test_an_unknown_programme_answers_with_nothing():
    assert prerequisite_relations("999 999") == []
    assert prerequisite_relations(None) == []
