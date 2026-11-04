# Singapore maths practice design

Reviewed 4 November 2026. The app offers original learning practice informed by representative Singapore school papers. Its 6-, 12- and 18-question sample papers are short practice sets, not replicas of an official examination.

## What the new bank contains

There are **36 authored question families: six per Standard level**. Each varies its numbers within a bounded domain, carries its givens in an original diagram or labelled illustration, and supplies an answer, hint and worked steps. Source papers were read for mathematical structures; school wording and scanned diagrams are not reproduced. The page-by-page source trail is in `.generated/paper-patterns.md` and the P3 source review artifacts.

| Level | Original families | Teaching emphasis |
|---|---|---|
| P1 | Count, compare groups, missing part, join three groups, subtract crossed-out objects, equal groups | Concrete objects before symbols; one action at a time. |
| P2 | Group totals, equal sharing, work backwards, like fractions, additional shading, whole-litre capacity | Read the representation and choose the operation. |
| P3 | Transfers, equal gaps, whole-box capacity, bundle purchases, elapsed time, scaled bar charts | Explain a second step: both collections change, spaces differ from markers, or a remainder needs another box. |
| P4 | Rounding, fraction-to-decimal conversion, reserve then share, common factors, composite perimeter, free-item offers | Mix short foundations with applications requiring an intermediate result. |
| P5 | Measurement conversion, percentages, equivalent-fraction review, triangle area, tank capacity, shared-cost purchases | Connect units and representations; identify perpendicular height and isolate a common cost. |
| P6 | Ratio shares, percentage change, substitution, missing averages, time-block charges, redistribution | Choose a denominator or invariant, recover a total, and interpret a partial charge. |

These are examples of computation, application and reasoning; they are not a validated allocation to SEAB assessment objectives. Some upper-level questions deliberately revisit earlier skills. Their original skill IDs remain intact. Foundation papers use the existing P5/P6 Foundation catalogue; Standard ratio, algebra and other unsuitable families are not relabelled as Foundation content.

The on-demand generator prioritises the six rich families in a mixed Standard paper, then adds catalogue foundations in longer sets. It rejects duplicate prompt/diagram identities within one paper. Topic sizes are advertised only when a deterministic reserve bank contains enough distinct questions; tiny domains are omitted. Share codes and saved-answer fingerprints preserve the same questions on resume and reject changed generated content.

## Daily practice and the Daily Dose comparison

The public description of **EPH Primary 5 Daily Dose of Maths, third edition** specifies 200 practices over four terms: **135 topical and 65 revision**, with worked solutions. [Product description](https://popular.com.sg/collections/eph-primary-math-topical-practice/products/primary-5-daily-dose-of-maths).

This app adopts the general idea of short, regular practice with review. Its actual plan is **200 days of six questions: 160 topical days and 40 review days**, arranged as four topical days followed by one review day across 40 weeks. It is not the EPH sequence, question bank or 135/65 balance. Earlier-grade prerequisites are treated explicitly as review, and current-topic application questions are introduced after the corresponding baseline material. This pacing is an implementation choice, not a classroom-validated learning schedule.

## Official PSLE formats from 2026

The revised formats below were checked against the PDFs linked from [SEAB’s 2026 examination page](https://www.seab.gov.sg/psle/psle-formats-examined-in-2026/).

| Course | Paper 1 — no calculator | Paper 2 — calculator allowed | Total |
|---|---|---|---|
| Standard Mathematics 0008 | 18 MCQ + 12 short-answer; 50 marks; 70 minutes | 5 short-answer + 10 structured/long-answer; 50 marks; 80 minutes | 45 questions, 100 marks, 150 minutes. [SEAB specification](https://isomer-user-content.by.gov.sg/334/fe51f29b-04ae-4fcb-a907-8db04c028510/0008_y26_sy.pdf) |
| Foundation Mathematics 0038 | 20 MCQ + 8 short-answer; 46 marks; 60 minutes | 10 short-answer + 4 structured; 34 marks; 45 minutes | 42 questions, 80 marks, 105 minutes. [SEAB specification](https://isomer-user-content.by.gov.sg/334/5c51824e-16d2-47cf-bf64-ea5774beca04/0038_y26_sy.pdf) |

Both specifications use four-option MCQs and require working for structured answers; they also provide for method credit in relevant short-answer questions. The app currently checks final answers and presents worked solutions. It does not assess handwritten working or award official method marks. Its shorter sets do not reproduce the official item counts, marks, timing, calculator sections or topic weighting. Some learning MCQs have three options. No single PSLE format should be imposed on P1–P5 practice.

## What was verified

The bounded audit generated **50,000 samples across all 36 rich families**, using actual catalogue IDs and deterministic seeds. Independent solvers reconstructed answers from the visible givens; separate checks evaluated arithmetic proof trees, accepted correct answers, rejected an answer one greater, checked choice uniqueness and reproducibility, and required diagrams and worked steps. **Zero failures** were found.

There were **16,609 distinct prompt/diagram identities and 33,391 repeated samples**. Identity deliberately ignores answer-option variations, keys, hints and solutions. These counts describe the sampled draws, not an exhaustive domain count. The result is **not 50,000 authored or unique questions**. Small early-years domains repeat naturally: for example, the apple-counting family has ten illustrated counts, from 3 to 12. Repetition across separate papers remains possible even though a single paper is deduplicated.

Retained audit artifact: [audits/paper-bank-2026-11-04.json](audits/paper-bank-2026-11-04.json); reproducible command: `npm run test:paper-bank`. The script creates `.generated/50k-paper-audit.json` on a fresh checkout. That run passed 41 tests, including the existing independent solver tests reused by the audit. Per-family sample counts, distinct counts, answer ranges and units are recorded in the artifact. This is mathematical consistency evidence, not a separate human review of every question, a UI audit or evidence of learning outcomes.

## Remaining content and assessment gaps

- **Range and coverage:** six families per level sample a small part of the syllabus. P1 counting here reaches 12, not the full number range; equal groups reach 25; the three-addend family focuses on making ten. Other catalogue activities broaden practice, but their existence does not establish complete official subpoint coverage.
- **Official alignment:** [SYLLABUS-AUDIT.md](SYLLABUS-AUDIT.md) still identifies four-or-more-addend extension, written column algorithms and exchanges, mental-calculation variation, and a full numbered-subpoint trace as outstanding. The new bank does not close those issues.
- **Geometry and physical work:** broader drawing, construction, measurement, complex geometry and pupil-produced representations need further tasks and appropriate checking. A labelled illustration cannot validate a child's physical measurement or drawing.
- **Assessment authenticity:** add calibrated multi-part structured questions, working spaces, method-credit rubrics, four-option examination MCQs throughout, and verified full-paper blueprints before describing a mode as a PSLE simulation.
- **Teaching quality:** qualified Singapore primary-teacher review, child comprehension testing, accessibility review and classroom evaluation remain necessary. Automated arithmetic checks do not establish appropriate difficulty or effective explanations.

The app is not endorsed by MOE, SEAB, EPH or the schools whose public papers informed this analysis. No exhaustive syllabus coverage or learning-outcome claim is made.
