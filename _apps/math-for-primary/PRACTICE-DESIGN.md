# Singapore maths practice design

Current-source review, 4 November 2026; this expansion is pending frontend publication. The app offers original learning practice informed by representative Singapore school papers. Its 6-, 12- and 18-question sample papers are short practice sets, not replicas of an official examination.

## What the new bank contains

There are **42 authored question families: seven per Standard level**. Each varies its numbers within a bounded domain, carries its givens in an original diagram or labelled illustration, and supplies an answer, hint and worked steps. Source papers were read for mathematical structures; school wording and scanned diagrams are not reproduced. The source trail is in `.generated/paper-patterns.md`, the P3 review artifacts, and the retained `CORPUS_PATTERN_SOURCES` entries in `src/primary/corpusPaperCatalog.ts`. A family is an authored template and context, not a claim of a unique mathematical strategy; several revisit the same underlying skill.

| Level | Original families | Teaching emphasis |
|---|---|---|
| P1 | Count, compare groups, missing part, join three groups, subtract crossed-out objects, equal groups, internal pattern gap | Concrete objects before symbols; one action at a time. |
| P2 | Group totals, equal sharing, work backwards, like fractions, additional shading, whole-litre capacity, unit-fraction comparison | Read the representation and choose the operation. |
| P3 | Transfers, equal gaps, whole-box capacity, bundle purchases, elapsed time, scaled bar charts, remaining juice after equal pours | Explain a second step: both collections change, spaces differ from markers, or a remainder needs another box. |
| P4 | Rounding, fraction-to-decimal conversion, reserve then share, common factors, composite perimeter, free-item offers, uniform inside-path area | Mix short foundations with applications requiring an intermediate result. |
| P5 | Measurement conversion, percentages, equivalent-fraction review, triangle area, tank capacity, shared-cost purchases, greatest common-factor gift bags | Connect units and representations; identify perpendicular height and isolate a common cost. |
| P6 | Ratio shares, percentage change, substitution, missing averages, time-block charges, redistribution, equilateral triangle on a straight line | Choose a denominator or invariant, recover a total, and interpret a partial charge. |

These are examples of computation, application and reasoning; they are not a validated allocation to SEAB assessment objectives. Some upper-level questions deliberately revisit earlier skills. Their original skill IDs remain intact: the P5 gift-bag family is P4 common-factor review, and the P6 equilateral-triangle family is P5 angle review. Foundation papers use the existing P5/P6 Foundation catalogue; Standard ratio, algebra and other unsuitable families are not relabelled as Foundation content.

The on-demand generator draws from all seven rich families in a mixed Standard paper. Its first six questions use distinct families; an 18-question mixed paper reaches all seven and includes catalogue foundations. It rejects duplicate prompt/diagram identities within one paper. Topic sizes are advertised only when a deterministic reserve bank contains enough distinct questions; tiny domains are omitted. Share codes and saved-answer fingerprints preserve the same questions on resume and reject changed generated content. Paper format and paper/daily generator versions are now 3. The wider source catalogue contains 248 activities and 270 guided lessons; daily addresses are counted separately.

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

The bounded audit generated **50,000 samples across all 42 rich families**, using actual catalogue IDs and deterministic seeds. Independent solvers reconstructed answers from the visible givens; separate checks evaluated arithmetic proof trees, accepted correct answers, rejected an answer one greater, checked choice uniqueness and reproducibility, and required diagrams and worked steps. **Zero failures** were found.

There were **17,581 distinct visible-question identities and 32,419 repeated samples**. Identity includes the prompt, essential context and diagram, but deliberately ignores answer-option variations, keys, hints and solutions. These counts describe the sampled draws, not an exhaustive domain count. The result is **not 50,000 authored or unique questions**. Small early-years domains repeat naturally: for example, the apple-counting family has ten illustrated counts, from 3 to 12. Repetition across separate papers remains possible even though a single paper is deduplicated.

Retained audit artifact: [audits/paper-bank-2026-11-04.json](audits/paper-bank-2026-11-04.json); reproducible command: `npm run test:paper-bank`. The script creates `.generated/50k-paper-audit.json` on a fresh checkout. The command also runs the independent solver tests reused by the audit. The common-factor gift-bag family has a literal proof value; its independent solver enumerates feasible bag counts and verifies the greatest one, so its correctness does not rely on that literal. Per-family sample counts, distinct counts, answer ranges and units are recorded in the artifact. This is mathematical consistency evidence, not a separate human review of every question, a UI audit or evidence of learning outcomes.

The external reference archive contains 2,406 PDFs and 57,336 extracted pages. Machine screening makes those pages searchable; it is not a reading or mathematical review of every paper. Only named sampled source pages were visually inspected before adapting patterns. OCR candidates, including merged questions and lost fraction labels, remain unverified until checked against the original page. Source scans and OCR are not shipped as app questions.

## Remaining content and assessment gaps

- **Range and coverage:** seven families per level sample a small part of the syllabus. P1 counting here reaches 12, not the full number range; equal groups reach 25; the three-addend family focuses on making ten. Other catalogue activities broaden practice, but their existence does not establish complete official subpoint coverage.
- **Official alignment:** the optional four-addend lesson and four new P1/P2 written-column lessons now address specific earlier gaps, including carrying and subtraction across zero. They do not establish coverage of every four-or-more-addend case or every written algorithm across P1–P6. Mental-calculation variation and a complete numbered-subpoint trace still need work. See [SYLLABUS-AUDIT.md](SYLLABUS-AUDIT.md) for the bounded alignment review.
- **Geometry and physical work:** broader drawing, construction, measurement, complex geometry and pupil-produced representations need further tasks and appropriate checking. A labelled illustration cannot validate a child's physical measurement or drawing.
- **Assessment authenticity:** add calibrated multi-part structured questions, working spaces, method-credit rubrics, four-option examination MCQs throughout, and verified full-paper blueprints before describing a mode as a PSLE simulation.
- **Teaching quality:** qualified Singapore primary-teacher review, child comprehension testing, accessibility review and classroom evaluation remain necessary. Automated arithmetic checks do not establish appropriate difficulty or effective explanations.

The app is not endorsed by MOE, SEAB, EPH or the schools whose public papers informed this analysis. No exhaustive syllabus coverage or learning-outcome claim is made.
