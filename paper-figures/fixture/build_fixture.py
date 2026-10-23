"""Build the anonymised catalogue fixture for the paper figures.

    python3 build_fixture.py real_catalog.json

`real_catalog.json` is what `GET /catalog?program_code=033 521` returns from a
locally seeded backend. Every exam subject, module and course is renamed through
mapping.json; credits, obligation types, term offering, module membership and
ordering are kept as they are. The build fails if any name or code is unmapped,
so nothing real can slip through.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main(real_path: str) -> None:
    mapping = json.loads((HERE / "mapping.json").read_text(encoding="utf-8"))
    subjects, modules, courses = mapping["examSubjects"], mapping["modules"], mapping["courses"]
    types, languages = mapping["courseTypes"], mapping["languages"]
    real = json.loads(Path(real_path).read_text(encoding="utf-8"))

    anon = []
    for subject in real:
        s = subjects[subject["exam_subject"]]
        out_subject = {
            "exam_subject": s["name"],
            "exam_subject_id": subject["exam_subject_id"],
            "exam_subject_code": s["code"],
            "modules": [],
        }
        for module in subject["modules"]:
            out_module = dict(module)
            out_module["name"] = modules[module["name"]]
            out_module["module_exam_subject"] = s["name"]
            out_module["module_exam_subject_code"] = s["code"]
            out_module["courses"] = []
            for course in module["courses"]:
                c = courses[course["code"]]
                out_course = dict(course)
                out_course["code"] = c["code"]
                out_course["title"] = c["title"]
                out_course["type"] = types[course["type"]]
                out_course["language"] = languages[course["language"]]
                out_course["tags"] = [types.get(t) or languages[t] for t in course["tags"]]
                out_module["courses"].append(out_course)
            out_subject["modules"].append(out_module)
        anon.append(out_subject)

    (HERE / "catalog.anon.json").write_text(
        json.dumps(anon, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    n_modules = sum(len(s["modules"]) for s in anon)
    n_courses = sum(len(m["courses"]) for s in anon for m in s["modules"])
    print(f"catalog.anon.json: {len(anon)} exam subjects, {n_modules} modules, {n_courses} courses")


if __name__ == "__main__":
    main(sys.argv[1])
