/**
 * Tests for resolving enforced prerequisite relations onto graph nodes.
 *
 * No browser and no framework: the module under test is pure, which is the
 * reason it is a module rather than logic inside the view. Run with
 * `npm test` from the frontend directory.
 *
 * Only enforced relations are drawn. A relation of any other kind is data the
 * canvas has no edge for, so the tests below also pin that it is skipped rather
 * than drawn in some weaker style.
 */

import { test } from "vitest";
import assert from "node:assert/strict";

import {
    buildPrerequisiteEdges,
    indexCourseNodes,
    isPrerequisiteEdge,
    normaliseCourseKey,
} from "../../src/utils/prerequisiteEdges.js";

const courseNode = (id, courseCode, courseName, level = "course") => ({
    id,
    data: { level, courseCode, courseName, label: courseName },
});

const moduleNode = (id, label) => ({ id, data: { level: "module", label, moduleCode: null } });

const NODES = [
    { id: "root", data: { level: "root", label: "Curriculum" } },
    { id: "subject-1", data: { level: "subject", label: "Software Engineering" } },
    courseNode("c-mth", "MTH", "Master Thesis"),
    courseNode("c-foe", "FOE", "Final Oral Exam / Defense"),
    courseNode("c-sds", "SDS", "Seminar for Diploma Students"),
    courseNode("c-se", "SE", "Software Engineering"),
    courseNode("c-sep", "SEP", "Software Engineering Projekt"),
];

const MASTER_RELATIONS = [
    { source: "Master Thesis", target: "Final Oral Exam / Defense", kind: "hard" },
    { source: "Master Thesis", target: "Seminar for Diploma Students", kind: "hard" },
];

test("accents and case do not prevent a match", () => {
    assert.equal(normaliseCourseKey("Einführung  in DIE Programmierung 1"), "einfuhrung in die programmierung 1");
});

test("course and module nodes are indexed, the root is not", () => {
    const index = indexCourseNodes([...NODES, moduleNode("m-db", "▶ Datenbanksysteme")]);
    assert.equal(index.get("master thesis"), "c-mth");
    assert.equal(index.get("mth"), "c-mth");
    assert.equal(index.get("datenbanksysteme"), "m-db", "the disclosure marker is stripped");
    assert.equal(index.get("curriculum"), undefined);
});

test("a subject node sharing a course's name does not capture the relation", () => {
    // "Software Engineering" is both an exam subject and a course; the relation
    // is between courses, so the course node must win.
    const edges = buildPrerequisiteEdges(
        [{ source: "Software Engineering", target: "Software Engineering Projekt", kind: "hard" }],
        NODES
    );
    assert.equal(edges[0].source, "c-se");
});

test("a course and a module of the same name resolve to the course", () => {
    const nodes = [
        courseNode("c-se", "SE", "Software Engineering"),
        moduleNode("m-se", "Software Engineering"),
        moduleNode("m-sep", "Software Engineering Projekt"),
    ];
    const edges = buildPrerequisiteEdges(
        [{ source: "Software Engineering", target: "Software Engineering Projekt", kind: "hard" }],
        nodes
    );
    assert.equal(edges.length, 1);
    assert.equal(edges[0].source, "c-se");
});

test("both master relations resolve to edges between the right nodes", () => {
    const edges = buildPrerequisiteEdges(MASTER_RELATIONS, NODES);
    assert.equal(edges.length, 2);
    assert.deepEqual(
        edges.map((e) => [e.source, e.target]).sort(),
        [["c-mth", "c-foe"], ["c-mth", "c-sds"]].sort()
    );
    assert.ok(edges.every((e) => isPrerequisiteEdge(e)));
});

test("an enforced relation is drawn solid and labelled as required", () => {
    const [edge] = buildPrerequisiteEdges(MASTER_RELATIONS, NODES);
    assert.equal(edge.style.strokeDasharray, undefined);
    assert.equal(edge.label, "required before");
    assert.equal(edge.data.kind, "hard");
});

test("only enforced relations are drawn", () => {
    // The advisory pairs and the curriculum's expected prior knowledge are not
    // edges on this canvas, so an edge never has to be read for whether it binds.
    const others = [
        { source: "Software Engineering", target: "Software Engineering Projekt", kind: "soft" },
        { source: "Software Engineering", target: "Software Engineering Projekt", kind: "recommended" },
        { source: "Software Engineering", target: "Software Engineering Projekt" },
    ];
    assert.deepEqual(buildPrerequisiteEdges(others, NODES), []);
    const mixed = buildPrerequisiteEdges([...others, ...MASTER_RELATIONS], NODES);
    assert.equal(mixed.length, 2);
    assert.ok(mixed.every((e) => e.data.kind === "hard"));
});

test("a relation whose course is not on the canvas is not drawn", () => {
    // A course inside a collapsed module has no node. Attaching its relation to
    // the module standing in for it would assert a relation the curriculum does
    // not hold, so the edge is dropped instead.
    const collapsed = NODES.filter((n) => n.id !== "c-foe");
    const edges = buildPrerequisiteEdges(MASTER_RELATIONS, collapsed);
    assert.equal(edges.length, 1);
    assert.equal(edges[0].target, "c-sds");
});

test("a filtered-out endpoint removes the edge", () => {
    const visible = new Set(["c-mth", "c-foe"]);
    const edges = buildPrerequisiteEdges(MASTER_RELATIONS, NODES, visible);
    assert.equal(edges.length, 1);
    assert.deepEqual([edges[0].source, edges[0].target], ["c-mth", "c-foe"]);
});

test("an empty relation list draws nothing, which is a curriculum's real answer", () => {
    assert.deepEqual(buildPrerequisiteEdges([], NODES), []);
    assert.deepEqual(buildPrerequisiteEdges(null, NODES), []);
});

test("duplicate relations produce one edge", () => {
    const edges = buildPrerequisiteEdges([...MASTER_RELATIONS, ...MASTER_RELATIONS], NODES);
    assert.equal(edges.length, 2);
});

test("edge ids are stable across rebuilds, so the canvas does not remount them", () => {
    const first = buildPrerequisiteEdges(MASTER_RELATIONS, NODES).map((e) => e.id);
    const second = buildPrerequisiteEdges(MASTER_RELATIONS, NODES).map((e) => e.id);
    assert.deepEqual(first, second);
});
