/**
 * Resolves curriculum prerequisite relations, which name courses and modules,
 * into graph edges, which address nodes.
 *
 * A relation is drawn only when both endpoints are nodes currently on the
 * canvas. A course inside a collapsed module has no node, so its relation is
 * dropped rather than reattached to the module standing in for it.
 *
 * Enforced ("hard") and advisory ("soft") relations are styled differently.
 * Expected prior knowledge is a third kind with no consequence; it is not
 * served to this module and not drawn.
 */

const PREREQUISITE_EDGE_PREFIX = "prereq-";

const HARD_EDGE_COLOUR = "#b91c1c";
const SOFT_EDGE_COLOUR = "#b45309";

/** Folds case, strips accents and collapses whitespace, so "Einführung" matches "einfuhrung". */
export function normaliseCourseKey(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Indexes nodes by every name a relation might use: courses by code and name,
 * modules by code and label. First key wins, and courses are indexed before
 * modules so a shared name resolves to the more specific course node.
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

/** Collapsible node labels carry a "▶ " or "▼ " marker the curriculum does not. */
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
 * Builds prerequisite edges for the nodes currently laid out. `relations` is the
 * service's list of { source, target, kind }; kinds other than hard and soft are
 * skipped. With `visibleNodeIds`, an edge is emitted only if both endpoints are
 * visible, so a filtered-out course leaves no dangling edge.
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
