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
 * Two kinds are drawn, and drawn differently, because they cost a student
 * different things: an enforced ordering is refused when broken, an advisory one
 * is warned about. A student reads which is which from the edge rather than
 * having to ask. The curricula's expected prior knowledge is a third ordering
 * with no consequence at all; it is not served to this module and not drawn.
 */

const PREREQUISITE_EDGE_PREFIX = "prereq-";

const HARD_EDGE_COLOUR = "#b91c1c";
const SOFT_EDGE_COLOUR = "#b45309";

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

const STYLE_BY_KIND = {
    hard: { colour: HARD_EDGE_COLOUR, dash: undefined, label: "required before", width: 2 },
    soft: { colour: SOFT_EDGE_COLOUR, dash: "6 4", label: "recommended before", width: 2 },
};

/**
 * Build the prerequisite edges for the nodes currently laid out.
 *
 * `relations` is the service's list of { source, target, kind }; the enforced and
 * advisory ones are drawn and anything else is skipped. `visibleNodeIds` is
 * optional; when given, an edge is emitted only if both endpoints are visible, so
 * a filtered-out course does not leave an edge hanging in space.
 */
export function buildPrerequisiteEdges(relations, nodes, visibleNodeIds = null) {
    const byKey = indexCourseNodes(nodes);
    const edges = [];
    const seen = new Set();

    for (const relation of relations || []) {
        const style = STYLE_BY_KIND[relation?.kind];
        if (!style) continue;

        const sourceId = byKey.get(normaliseCourseKey(relation?.source));
        const targetId = byKey.get(normaliseCourseKey(relation?.target));
        if (!sourceId || !targetId || sourceId === targetId) continue;
        if (visibleNodeIds && (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId))) continue;

        const id = `${PREREQUISITE_EDGE_PREFIX}${relation.kind}-${sourceId}-${targetId}`;
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
                stroke: style.colour,
                strokeWidth: style.width,
                strokeDasharray: style.dash,
            },
            markerEnd: { type: "arrowclosed", color: style.colour, width: 16, height: 16 },
            label: style.label,
            labelStyle: { fill: style.colour, fontSize: 10, fontWeight: 700 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
            labelBgPadding: [3, 2],
            labelBgBorderRadius: 3,
            data: { kind: relation.kind, relation: "prerequisite" },
        });
    }

    return edges;
}

export const PREREQUISITE_EDGE_COLOURS = {
    hard: HARD_EDGE_COLOUR,
    soft: SOFT_EDGE_COLOUR,
};
