/**
 * Turning the curriculum's enforced prerequisites into graph edges.
 *
 * The relations name courses and modules; the graph addresses nodes. This module
 * resolves the first to the second and nothing else: it holds no relations of its
 * own, reads no state, and touches no framework, so it can be exercised directly.
 *
 * A relation is drawn only when both of its endpoints are nodes currently on the
 * canvas. A course inside a collapsed module has no node, so its relation is not
 * drawn rather than being attached to the module standing in for it, which would
 * assert a relation the curriculum does not hold.
 *
 * Only the enforced relations are drawn. An edge on this canvas therefore carries
 * one meaning, this ordering is required, and a student never has to ask of a
 * given edge whether it binds.
 */

const PREREQUISITE_EDGE_PREFIX = "prereq-";

const HARD_EDGE_COLOUR = "#b91c1c";

/** Fold case, strip accents and collapse whitespace, so "Einführung" matches "einfuhrung". */
export function normaliseCourseKey(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Index the nodes a relation might name, by every name it might use.
 *
 * Courses are indexed by code and by name, modules by code and label. Later nodes
 * do not displace earlier ones, so the first node carrying a given key wins and
 * the mapping is stable; courses are indexed before modules so that a course and
 * a module sharing a name resolve to the course, the more specific of the two.
 */
export function indexCourseNodes(nodes) {
    const byKey = new Map();
    const add = (candidate, id) => {
        const key = normaliseCourseKey(candidate);
        if (!key || byKey.has(key)) return;
        byKey.set(key, id);
    };
    const all = Array.isArray(nodes) ? nodes : [];
    for (const node of all) {
        const level = node?.data?.level;
        if (level !== "course" && level !== "courseDirect") continue;
        add(node?.data?.courseCode, node.id);
        add(node?.data?.courseName, node.id);
        add(node?.data?.label, node.id);
    }
    for (const node of all) {
        if (node?.data?.level !== "module") continue;
        add(node?.data?.moduleCode, node.id);
        add(stripDisclosureMarker(node?.data?.label), node.id);
    }
    return byKey;
}

/** A collapsible node's label carries a "▶ " or "▼ " marker the curriculum does not. */
function stripDisclosureMarker(label) {
    return String(label ?? "").replace(/^[▶▼]\s*/, "");
}

export function isPrerequisiteEdge(edge) {
    return typeof edge?.id === "string" && edge.id.startsWith(PREREQUISITE_EDGE_PREFIX);
}

const HARD_EDGE_STYLE = { colour: HARD_EDGE_COLOUR, label: "required before", width: 2 };

/**
 * Build the prerequisite edges for the nodes currently laid out.
 *
 * `relations` is the service's list of { source, target, kind }; only "hard"
 * relations are drawn. `visibleNodeIds` is optional; when given, an edge is
 * emitted only if both endpoints are visible, so a filtered-out course does not
 * leave an edge hanging in space.
 */
export function buildPrerequisiteEdges(relations, nodes, visibleNodeIds = null) {
    const byKey = indexCourseNodes(nodes);
    const edges = [];
    const seen = new Set();

    for (const relation of relations || []) {
        if (relation?.kind !== "hard") continue;

        const sourceId = byKey.get(normaliseCourseKey(relation?.source));
        const targetId = byKey.get(normaliseCourseKey(relation?.target));
        if (!sourceId || !targetId || sourceId === targetId) continue;
        if (visibleNodeIds && (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId))) continue;

        const id = `${PREREQUISITE_EDGE_PREFIX}hard-${sourceId}-${targetId}`;
        if (seen.has(id)) continue;
        seen.add(id);

        edges.push({
            id,
            source: sourceId,
            target: targetId,
            type: "smoothstep",
            zIndex: 1,
            animated: false,
            style: {
                stroke: HARD_EDGE_STYLE.colour,
                strokeWidth: HARD_EDGE_STYLE.width,
            },
            markerEnd: { type: "arrowclosed", color: HARD_EDGE_STYLE.colour, width: 16, height: 16 },
            label: HARD_EDGE_STYLE.label,
            labelStyle: { fill: HARD_EDGE_STYLE.colour, fontSize: 10, fontWeight: 700 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
            labelBgPadding: [3, 2],
            labelBgBorderRadius: 3,
            data: { kind: "hard", relation: "prerequisite" },
        });
    }

    return edges;
}

export const PREREQUISITE_EDGE_COLOURS = {
    hard: HARD_EDGE_COLOUR,
};
