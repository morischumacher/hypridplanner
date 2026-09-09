/**
 * The catalogue of the programme on screen, plus the lookups built from it.
 *
 * A programme switch keeps the previous catalogue until the next request
 * resolves; only a failure clears it, so the sidebar never blinks empty.
 */

import { useEffect, useMemo, useState } from "react";

import { normalizeCatalog } from "../../domain/catalogue.ts";
import type { Catalogue } from "../../domain/types.ts";
import { fetchCatalog } from "../../lib/api.js";
import { createExamSubjectColorMap } from "../../utils/examSubjectColors.js";

/** The module a course card carries. Only modules with two or more courses get one. */
export interface CatalogueModuleMeta {
    id: string;
    title: string;
    code: string | null;
    ects: number | null;
    examSubject: string | null;
    category: string;
    courseCodes: string[];
}

/**
 * A catalogue course as read when placing a card. Course-less modules appear
 * here too, keyed by the module's own code, since they are placed the same way.
 */
export interface CatalogueCourseEntry {
    code: string;
    name: string;
    type: string | null;
    ects: number | null;
    category: string;
    examSubject: string | null;
    moduleMeta?: CatalogueModuleMeta | null;
}

export interface UseCatalogueInput {
    programCode: string;
}

export interface UseCatalogueResult {
    catalog: Catalogue;
    loadingCatalog: boolean;
    catalogError: string;
    /** One colour per exam subject, keyed by the subject's name. */
    subjectColors: Record<string, string>;
    catalogCourseByCode: Map<string, CatalogueCourseEntry>;
}

export function useCatalogue({ programCode }: UseCatalogueInput): UseCatalogueResult {
    const [catalog, setCatalog] = useState<Catalogue>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [catalogError, setCatalogError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingCatalog(true);
            setCatalogError("");
            try {
                const raw = await fetchCatalog(programCode);
                if (cancelled) return;
                setCatalog(normalizeCatalog(raw));
            } catch (e) {
                if (cancelled) return;
                console.error(e);
                setCatalog([]);
                setCatalogError(String((e as Error)?.message || e));
            } finally {
                if (!cancelled) setLoadingCatalog(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [programCode]);

    const subjectColors = useMemo<Record<string, string>>(
        () => createExamSubjectColorMap((catalog || []).map((pf) => pf?.pruefungsfach).filter(Boolean)),
        [catalog]
    );

    const catalogCourseByCode = useMemo(() => {
        const byCode = new Map<string, CatalogueCourseEntry>();
        const subjects = Array.isArray(catalog) ? catalog : [];
        subjects.forEach((subject, subjectIdx) => {
            const modules = Array.isArray(subject?.modules) ? subject.modules : [];
            modules.forEach((module, moduleIdx) => {
                const standaloneCode = String(module?.code || `MOD-${subjectIdx + 1}-${moduleIdx + 1}`).trim();
                const moduleCourses = Array.isArray(module?.courses) ? module.courses : [];
                const moduleCourseCodes = moduleCourses
                    .map((course) => String(course?.code || "").trim())
                    .filter(Boolean);
                const moduleId = `mod-cat-${subjectIdx + 1}-${moduleIdx + 1}-${standaloneCode || "module"}`;
                const moduleMeta: CatalogueModuleMeta | null = moduleCourseCodes.length >= 2
                    ? {
                        id: moduleId,
                        title: module?.name || "Module",
                        code: module?.code ?? null,
                        ects: module?.ects ?? null,
                        examSubject: subject?.pruefungsfach ?? null,
                        category: module?.category ?? "unknown",
                        courseCodes: moduleCourseCodes,
                    }
                    : null;
                if (moduleCourses.length === 0 && standaloneCode && !byCode.has(standaloneCode)) {
                    byCode.set(standaloneCode, {
                        code: standaloneCode,
                        name: module?.name || standaloneCode,
                        type: module?.category || null,
                        ects: module?.ects ?? null,
                        category: module?.category ?? "unknown",
                        examSubject: subject?.pruefungsfach ?? null,
                    });
                }
                for (const course of moduleCourses) {
                    const code = String(course?.code || "").trim();
                    if (!code || byCode.has(code)) continue;
                    byCode.set(code, {
                        code,
                        name: course?.name || code,
                        type: course?.type || null,
                        ects: course?.ects ?? null,
                        category: module?.category ?? "unknown",
                        examSubject: subject?.pruefungsfach ?? null,
                        moduleMeta,
                    });
                }
            });
        });
        return byCode;
    }, [catalog]);

    return {
        catalog,
        loadingCatalog,
        catalogError,
        subjectColors,
        catalogCourseByCode,
    };
}
