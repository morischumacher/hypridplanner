# Anonymised paper figures (CSEDU 2027)

> **Internal. Do not publish this file or `fixture/mapping.json`.** They map the
> generic names in the figures back to the real curriculum and would undo the
> anonymisation. Only the PNG files are meant for the paper.

Everything in this directory is self-contained and can be deleted with the
branch. No application code, layout or styling was changed.

## Files

| File | What it is |
|---|---|
| `table_view.png` | Figure A: Table View with Parking Stage and seven semester lanes |
| `shell_graph_view_crop.png` | Figure B: filter panel, Graph View and Dashboard composed side by side |
| `panel_filters.png`, `panel_graph.png`, `panel_dashboard.png` | The three single-panel crops of Figure B |
| `fixture/mapping.json` | Real → generic names and codes (internal) |
| `fixture/build_fixture.py` | Builds `catalog.anon.json` from the real catalogue and the mapping |
| `fixture/catalog.anon.json` | The anonymised curriculum the browser is served |
| `fixture/demo_plan_state.json` | The stored demo plan (generic codes only) |
| `anonymise.mjs` | Request/response translation between generic and real names |
| `capture.mjs`, `shoot.mjs`, `compose.py` | Playwright capture, cropping and composition |
| `audit.json` | Result of the on-screen text audit of the last capture run |

## Image sizes

All PNG, white background, rendered by Chromium (Playwright) with
`deviceScaleFactor: 3`, so 1 CSS px = 3 image px.

| Image | Pixels (w × h) |
|---|---|
| `table_view.png` | 4569 × 1815 |
| `shell_graph_view_crop.png` | 3609 × 3468 |
| `panel_filters.png` | 999 × 2403 |
| `panel_graph.png` | 1209 × 3468 |
| `panel_dashboard.png` | 1329 × 3099 |

Figure A: viewport 1600 × 1000 CSS px, sidebar hidden, board at React Flow's
minimum zoom (0.5), cropped to the Parking Stage and lanes 1–7 down to the
lowest card. Figure B: viewport 1600 × 1250 CSS px (taller so the Dashboard
fits without scrolling), Graph View with "Algorithms and Programming" and
"Software Engineering" expanded (plus the two-course module "Introduction to
Programming", so all four levels show), fitted to view. The three panels are
cropped to their own content and composed top-aligned with a 36 px (12 CSS px)
gap. The Dashboard crop ends below *Warnings*. Scrollbars and the text caret
are hidden by an injected stylesheet. The application's page grey `#f9fafb`
is mapped to white in all crops. The pointer is parked outside the crops, so
no hover state shows.

## How the fixture was made

1. **Source.** The curriculum is imported by the SQL migrations in
   `backend/sql/` (`202602091010_bachelor_catalog.sql` and later) and served by
   `GET /catalog?program_code=033 521` as programme → exam subject → module →
   course, with credits, obligation category, term offering and teaching format.
   The rule engine reads `backend/app/curriculum/bachelor.json`.
2. **Mapping.** `fixture/mapping.json` gives every exam subject (13), module
   (70) and course (84) a generic English name, and every course a
   neutral code (`CS101`, `SE210`, `MATH112`, …). Teaching formats are also
   translated (VU → LEX, VO → LEC, UE → EXC, PR → PRJ, SE → SEM), and the language tag `de` becomes `en`.
3. **Build.** `python3 fixture/build_fixture.py real_catalog.json` copies the
   real catalogue through the mapping. Credits, obligation categories,
   winter/summer offering, module membership, ordering and the two prerequisite
   relations stay as they are. The build fails on any unmapped name or code.
4. **Serving.** `capture.mjs` intercepts the browser's API calls. `/catalog`
   is answered with `catalog.anon.json`. `/rulecheck`, `/recommendations` and
   `/curriculum/prerequisites` are translated generic → real, answered by the
   unmodified backend and rule engine, and translated back. Names and codes are
   swapped, and the rule engine's German messages are rewritten in English (e.g.
   "Wahlmodule der engen Wahl (+): mindestens 7 Module nötig" → "Core elective
   modules (+): at least 7 modules required"). So the Dashboard figures are the
   real rule engine's output for the demo plan.
5. **Fixed UI strings.** A few interface strings are hard-coded and German or
   differ from the paper's terms. These are replaced in the rendered page only,
   never in the source: "Course Catalog" → "Course Catalogue", "Planner
   Dashboard" → "Dashboard", "Enge Wahl (+)" → "Core Elective (+)", "Breite
   Wahl (*)" → "Elective (*)", "StEOP" → "Introductory Phase", "N Kurse" → "N
   courses", programme code/name → "Bachelor in Computer Science". The browser
   tab title becomes "Study Planner". "Table View", "Graph View" and "Parking
   Stage" are the application's own labels.

## Demo plan

Built through the real UI by `node paper-figures/capture.mjs build` (drag and
drop from the Course Catalogue, then *Mark as done*), stored as
`fixture/demo_plan_state.json`. Start: winter term. Seven semesters of 26 / 31 /
26 / 24 / 24 / 18 / 19 ECTS (168 planned, 57 done in semesters 1–2). Three
courses are in the Parking Stage (Software Project, Distributed Systems,
Computer Graphics). The Dashboard lists three missing requirements (6 of 7 core
elective modules, 0 of 6 transferable-skills ECTS, 12 ECTS short of 180) and
three warnings (semester 2 above the recommended load, plus two
thesis-category notes the rule engine emits for the thesis courses).

Three courses (MATH112, MATH122, MATH212) were written into the stored plan
directly instead of dragged. The frontend recognises the "lecture + exercise
vs. integrated course" modules only by their German names, so under the
generic names their catalogue tiles would drag every variant at once.

## Reproduce

```bash
eval "$(./scripts/dev-db.sh up)"                         # seeded database
(cd backend && uvicorn app.main:app --port 8000) &       # API
(cd frontend && npx vite --port 5173) &                  # interface
node paper-figures/capture.mjs shoot                     # figures + audit.json
node paper-figures/capture.mjs build                     # only to rebuild the demo plan
```

Playwright uses the preinstalled Chromium (`CHROMIUM_PATH`, default
`/opt/pw-browsers/chromium`); no `playwright install` is needed. Python with
Pillow is needed for `compose.py`.

## Known deviations from the real UI (for the authors)

- The root node of the Graph View is labelled "Curriculum" by the application;
  it was left as is.
- Exam-subject colours are derived by the application from the subject names,
  so they differ from those a real user sees.
- The Dashboard's introductory-phase section matches courses by their German
  titles in the frontend, so with generic titles it would report 0 ECTS. It was
  moved to the bottom of the Dashboard and is outside the crop.

## Anonymity checklist

Checked automatically by `capture.mjs`, which scans the complete page text,
every `title` / `aria-label` / `placeholder` / `alt` attribute and the tab
title of both views. It searches for German words and umlauts, every real
subject/module/course name that differs from its generic name, every real
course code of three or more characters, and "TU Wien", "Vienna", "033 521",
"Bachelor Informatics", "Informatik", "StEOP". It also checks every API reply
for German text. Result in `audit.json`: no hits in either view. The images
were also checked by eye, including the short codes the scan skips.

| Check | Table View (A) | Graph View shell (B) |
|---|---|---|
| No German text | ✅ | ✅ |
| No institution name | ✅ | ✅ |
| No real course code (all codes are generic, e.g. CS101, SE210) | ✅ | ✅ |
| No personal / participant / persona name (account is a random `student-…` user; username not on screen) | ✅ | ✅ |
| No browser chrome, scrollbars, cursor or hover state | ✅ | ✅ |
| Tab title generic ("Study Planner"; not in the images anyway) | ✅ | ✅ |

## Mapping (internal)

### Programme

| Real | Generic |
|---|---|
| Bachelor Informatics (033 521) | Bachelor in Computer Science |

### Exam subjects

| Real | Generic |
|---|---|
| Algorithmen und Programmierung | Algorithms and Programming |
| Computergraphik und Visual Computing | Visual Computing |
| Computersysteme | Computer Systems |
| Freie Wahlfächer und Transferable Skills | Free Electives and Transferable Skills |
| Human-Centered Computing | Human-Computer Interaction |
| Information Engineering | Data Engineering |
| Logik | Machine Learning and Logic |
| Medizinische Informatik | Health Informatics |
| Software Engineering | Software Engineering |
| Security | Security |
| Strukturwissenschaften | Mathematics and Statistics |
| Bachelorarbeit | Bachelor Thesis |
| Theoretische Informatik | Theoretical Computer Science |

### Modules

| Real | Generic |
|---|---|
| Algorithmen und Datenstrukturen | Algorithms and Data Structures |
| Effiziente Algorithmen | Advanced Algorithms |
| Einführung in die Programmierung | Introduction to Programming |
| Funktionale Programmierung | Functional Programming |
| Logikprogrammierung und Constraints | Logic Programming |
| Programmierparadigmen | Programming Paradigms |
| Audio and Video Production | Digital Media Production |
| Computermusik | Sound and Music Computing |
| Creative Media Production | Interactive Media Design |
| Einführung in Visual Computing | Introduction to Visual Computing |
| Grundlagen der Computer Vision | Computer Vision |
| Grundlagen der Computergraphik | Computer Graphics |
| Grundlagen der Visualisierung | Data Visualisation |
| Multimedia | Multimedia Systems |
| Programmiertechniken für Visual Computing | Graphics Programming |
| Abstrakte Maschinen | Virtual Machines |
| Betriebssysteme | Operating Systems |
| Computersysteme | Computer Systems |
| Grundzüge digitaler Systeme | Digital Systems |
| Parallel Computing | Parallel Programming |
| Zuverlässige Echtzeitsysteme | Embedded and Real-Time Systems |
| Übersetzerbau | Compiler Construction |
| Freie Wahlfächer und Transferable Skills | Free Electives and Transferable Skills |
| Access Computing | Accessible Computing |
| Denkweisen der Informatik | Computational Thinking |
| Design und Fertigung | Digital Fabrication |
| Interface und Interaction Design | Interaction Design |
| Menschzentrierte Künstliche Intelligenz | Human-Centred AI |
| Sozio-technische Systeme | Socio-Technical Systems |
| Usability Engineering and Mobile Interaction | Usability Engineering |
| Datenbanksysteme | Database Systems |
| Einführung in Information Retrieval | Information Retrieval |
| Einführung in wissensbasierte Systeme | Knowledge-Based Systems |
| Semistrukturierte Daten | Semi-Structured Data |
| Web Engineering | Web Application Development |
| Argumentieren und Beweisen | Proof Techniques |
| Deklaratives Problemlösen | Declarative Problem Solving |
| Einführung in Artificial Intelligence | Introduction to Artificial Intelligence |
| Einführung in Machine Learning | Machine Learning |
| Logic and Reasoning in Computer Science | Logic in Computer Science |
| Logik für Wissensrepräsentation | Knowledge Representation |
| Logik und Grundlagen der Mathematik | Mathematical Logic |
| Bio-Medical Visualization and Visual Analytics | Medical Visualisation |
| Design und Entwicklung von Anwendungen im Gesundheitswesen | Health Software Design |
| Human Augmentation | Assistive Technologies |
| Informationssysteme des Gesundheitswesens | Health Information Systems |
| Methods for Data Generation and Analytics in Medicine and Life Sciences | Biomedical Data Analytics |
| Programm- und Systemverifikation | Software Verification |
| Software Engineering | Software Engineering |
| Software Engineering Projekt | Software Project |
| Software-Qualitätssicherung | Software Quality Assurance |
| Verteilte Systeme | Distributed Systems |
| Attacks and Defenses in Computer Security | Offensive Security |
| Daten- und Informatikrecht | IT Law and Ethics |
| Einführung in Security | Introduction to Security |
| Foundations of System and Application Security | System Security |
| Privacy-Enhancing Technologies | Privacy Engineering |
| Algebra und Diskrete Mathematik | Discrete Mathematics |
| Analysis | Calculus |
| Computational Statistics | Computational Statistics |
| Datenanalyse | Data Analysis |
| Mathematisches Arbeiten | Mathematical Reasoning |
| Methoden der Angewandten Statistik | Applied Statistics |
| Multivariate Statistik | Multivariate Statistics |
| Numerical Computation | Numerical Methods |
| Statistik und Wahrscheinlichkeitstheorie | Probability and Statistics |
| Bachelorarbeit | Bachelor Thesis |
| Einführung in Quantencomputing | Quantum Computing |
| Introduction to Cryptography | Cryptography |
| Theoretische Informatik | Theoretical Computer Science |

### Courses

| Real code | Real title | Generic code | Generic title |
|---|---|---|---|
| AD | Algorithmen und Datenstrukturen | ALG110 | Algorithms and Data Structures |
| EA | Effiziente Algorithmen | ALG310 | Advanced Algorithms |
| EIDI1 | Einführung in die Programmierung 1 | CS101 | Programming 1 |
| EIDI2 | Einführung in die Programmierung 2 | CS102 | Programming 2 |
| FP | Funktionale Programmierung | ALG320 | Functional Programming |
| LPC | Logikprogrammierung und Constraints | ALG330 | Logic Programming |
| PPAR | Programmierparadigmen | ALG210 | Programming Paradigms |
| AVP | Audio and Video Production | VC310 | Digital Media Production |
| CMUS | Computermusik | VC320 | Sound and Music Computing |
| CMP | Creative Media Production | VC330 | Interactive Media Design |
| EHVC | Einführung in Visual Computing | VC110 | Introduction to Visual Computing |
| GCV | Grundlagen der Computer Vision | VC340 | Computer Vision |
| GCG | Grundlagen der Computergraphik | VC350 | Computer Graphics |
| GVIS | Grundlagen der Visualisierung | VC360 | Data Visualisation |
| MM | Multimedia | VC370 | Multimedia Systems |
| PTVC | Programmiertechniken für Visual Computing | VC380 | Graphics Programming |
| AM | Abstrakte Maschinen | SYS310 | Virtual Machines |
| BS | Betriebssysteme | SYS210 | Operating Systems |
| CS | Computersysteme | SYS220 | Computer Systems |
| GGDS | Grundzüge digitaler Systeme | SYS110 | Digital Systems |
| PC | Parallel Computing | SYS320 | Parallel Programming |
| DSYS | Dependable Systems | SYS330 | Fault-Tolerant Systems |
| RTS | Echtzeitsysteme | SYS331 | Real-Time Systems |
| UB | Übersetzerbau | SYS340 | Compiler Construction |
| ACC | Access Computing | HCI310 | Accessible Computing |
| DI | Denkweisen der Informatik | HCI110 | Computational Thinking |
| OIW | Orientierung Informatik und Wirtschaftsinformatik | HCI100 | Study Orientation |
| DUF | Design und Fertigung | HCI320 | Digital Fabrication |
| IID | Interface und Interaction Design | HCI210 | Interaction Design |
| MKAI | Menschzentrierte Künstliche Intelligenz | HCI330 | Human-Centred AI |
| STS | Sozio-technische Systeme | HCI340 | Socio-Technical Systems |
| UEMI | Usability Engineering and Mobile Interaction | HCI350 | Usability Engineering |
| DBS | Datenbanksysteme | DE110 | Database Systems |
| IR | Einführung in Information Retrieval | DE310 | Information Retrieval |
| EWS | Einführung in wissensbasierte Systeme | DE320 | Knowledge-Based Systems |
| SSD | Semistrukturierte Daten | DE330 | Semi-Structured Data |
| WEBE | Web Engineering | DE340 | Web Application Development |
| AUB | Argumentieren und Beweisen | AI310 | Proof Techniques |
| DPR | Deklaratives Problemlösen | AI320 | Declarative Problem Solving |
| EHAI | Einführung in Artificial Intelligence | AI210 | Introduction to Artificial Intelligence |
| EML | Einführung in Machine Learning | AI330 | Machine Learning |
| LRCS | Logic and Reasoning in Computer Science | AI220 | Logic in Computer Science |
| LWR | Logik für Wissensrepräsentation | AI340 | Knowledge Representation |
| LGM | Logik und Grundlagen der Mathematik (VO) | AI350 | Mathematical Logic (Lecture) |
| LGMUE | Logik und Grundlagen der Mathematik (UE) | AI351 | Mathematical Logic (Exercise) |
| BMVVA | Bio-Medical Visualization and Visual Analytics | HI310 | Medical Visualisation |
| DEAG | Design und Entwicklung von Anwendungen im Gesundheitswesen | HI320 | Health Software Design |
| HAUG | Human Augmentation | HI330 | Assistive Technologies |
| ISG | Informationssysteme des Gesundheitswesens | HI340 | Health Information Systems |
| MDGAM | Methods for Data Generation and Analytics in Medicine and Life Sciences | HI350 | Biomedical Data Analytics |
| PSV | Programm- und Systemverifikation | SE310 | Software Verification |
| SE | Software Engineering | SE210 | Software Engineering |
| SEP | Software Engineering Projekt | SE220 | Software Project |
| SQS | Software-Qualitätssicherung | SE320 | Software Quality Assurance |
| VS | Verteilte Systeme | SE230 | Distributed Systems |
| ADCS | Attacks and Defenses in Computer Security | SEC310 | Offensive Security |
| DIR | Daten- und Informatikrecht | SEC210 | IT Law and Ethics |
| EHS | Einführung in Security | SEC110 | Introduction to Security |
| FSAS | Foundations of System and Application Security | SEC320 | System Security |
| PET | Privacy-Enhancing Technologies | SEC330 | Privacy Engineering |
| ADM | Algebra und Diskrete Mathematik (VO) | MATH110 | Discrete Mathematics (Lecture) |
| ADMUE | Algebra und Diskrete Mathematik (UE) | MATH111 | Discrete Mathematics (Exercise) |
| ADMVU | Algebra und Diskrete Mathematik (VU) | MATH112 | Discrete Mathematics (Integrated) |
| ANL | Analysis (VO) | MATH120 | Calculus (Lecture) |
| ANLUE | Analysis (UE) | MATH121 | Calculus (Exercise) |
| ANLVU | Analysis (VU) | MATH122 | Calculus (Integrated) |
| CSTAT | Computerstatistik | MATH310 | Statistical Programming |
| SCOMP | Statistical Computing | MATH311 | Statistical Computing |
| SIM | Statistische Simulation und computerintensive Methoden | MATH312 | Simulation Methods |
| DA | Datenanalyse | MATH320 | Data Analysis |
| MA | Mathematisches Arbeiten | MATH100 | Mathematical Reasoning |
| MAS | Methoden der Angewandten Statistik (VO) | MATH330 | Applied Statistics (Lecture) |
| MASUE | Methoden der Angewandten Statistik (UE) | MATH331 | Applied Statistics (Exercise) |
| MVS | Multivariate Statistik (VO) | MATH340 | Multivariate Statistics (Lecture) |
| MVSUE | Multivariate Statistik (UE) | MATH341 | Multivariate Statistics (Exercise) |
| NUMC | Numerical Computation | MATH350 | Numerical Methods |
| SWT | Statistik und Wahrscheinlichkeitstheorie (VO) | MATH210 | Probability and Statistics (Lecture) |
| SWTUE | Statistik und Wahrscheinlichkeitstheorie (UE) | MATH211 | Probability and Statistics (Exercise) |
| SWTVU | Statistik und Wahrscheinlichkeitstheorie (VU) | MATH212 | Probability and Statistics (Integrated) |
| BA | Bachelorarbeit für Informatik und Wirtschaftsinformatik | THE390 | Bachelor Thesis |
| WA | Wissenschaftliches Arbeiten | THE380 | Scientific Writing |
| EQC | Einführung in Quantencomputing | TCS310 | Quantum Computing |
| ITC | Introduction to Cryptography | TCS320 | Cryptography |
| TI | Theoretische Informatik | TCS210 | Theoretical Computer Science |
