# Independent content and syllabus audit — 4 November 2026

## Result and limits

The app has 270 guided lessons and 248 activity configurations in this snapshot. All 252 curated objectives have actual lesson-stage evidence. Those counts do **not** establish complete MOE syllabus coverage. The official content tables contain 288 numbered subpoints; the matrix indexes every one, including subordinate bullet text and source-page references. Candidate links are marked as candidates, and unreviewed subpoints remain unsigned.

The local corpus contains 2,406 downloaded/digitised papers according to the project corpus audit. This content audit did not read or visually verify every paper, and it does not claim every exam pattern has been implemented. Reusing values, prompts or lesson wrappers is not counted as a new mathematical pattern.

## Programmatic verification

The reproducible finite seed set is 0, 1, 7, 31, 129, 217, 7919. Counts include repeated warm-ups and generated support/assessment items; they are **not unique-question or unique-pattern counts**.

| Check | Count | Meaning |
| --- | ---: | --- |
| Sampled items | 43,362 | Every current activity configuration and lesson is represented. |
| Independent visible-given answers | 6,918 | Solved from displayed expressions, prompts or public model values, without generator facts/proofs/answers. |
| Generator proof evaluations | 8,862 | Self-consistency of a supplied proof tree and answer; not an independent problem solution. |
| Numeric worked equalities | 44,255 | Exact arithmetic/percentage statements parsed independently with rational arithmetic. |
| Mismatches in supported checks | 0 | Zero after the fixes below; unsupported items remain explicit in JSON. |

The manifest has 299 activity/lesson/worked-frame kind labels. 64 labels have at least one independently solved sample; this does not establish complete solver coverage of that label. All 75 activity-kind labels are inventoried (74 baseline implementations plus the paper dispatcher). Each manifest row records sample counts, independent solver counts, proof-only checks, model kinds and unsupported examples. Existing rich-paper tests provide additional visible-given independent solvers; those are separate from this audit and are not double-counted here.

Equality parsing deliberately skips variables, blanks, ratio notation, powers and remainders until dedicated semantic solvers are added. Diagram geometry, visibility, ambiguity, vocabulary, age appropriateness, voices, animations and touch behaviour require separate review. This audit is not a claim that every element is fully verified.

## Fixes delivered by this audit

- **number-name-writing**: Number-name examples omitted low numbers and always used choice recognition for numeral-to-word questions. Full zero-to-cap range; alternating typed name, choice recognition and numeral writing. Standard hyphen/space/optional-and variants accepted. Validation: numberNames.test.ts: independent English-number reader; all P1 values 0–100 reached across 3000 seeds; all number-name objectives checked.
- **brackets**: Order-of-operations objectives mentioned brackets but generated no bracketed expression to solve. Both (a+b)×c and a×(b+c), plus unbracketed a+b×c; expression table and targeted correction. Validation: syllabusRegressions.test.ts: independent operator-stack evaluation across 1200 examples.
- **improper-products**: Both factors were always proper, omitting official proper×improper and (Standard) improper×improper. Required combinations cycle; Foundation excludes improper×improper. Actual improper values appear in a fraction table. Validation: syllabusRegressions.test.ts: visible numerator/denominator cross-products across 4800 examples.
- **four-digit-dividend**: A four-digit quotient was multiplied by the divisor, allowing five-digit dividends. Bound dividend to 1000–9999; quotient bounds derived from divisor. Validation: 2000 seeds per P3/P4 division objective; visible dividend range and quotient×divisor independently checked.
- **related-division-facts**: Selector recognised “divide” but not “division”; related fact objectives produced multiplication only. Division-symbol objective produces division; related multiplication/division objectives alternate. Validation: 100 seeds per related-facts objective, both operations and visible arithmetic checked.
- **percentage-equality**: Some explanations equated decimal×100 to a percentage, e.g. 0.2×100=20%, confusing a number with a percent value. Use 0.2=20/100=20%; percentage-change explanations use the fraction/decimal ratio before the percentage. Validation: Numeric worked-step audit with percent values interpreted as /100.
- **rounded-average**: Nonterminating averages such as 22÷3 were shown with exact =7.33. Use ≈ for rounded averages, = only when exact. Validation: Numeric worked-step audit parses exact equalities only.

Focused regressions are in `src/teach/build/numberNames.test.ts` and `src/teach/build/syllabusRegressions.test.ts`. They independently read number words, evaluate bracket expressions using an operator stack, compare fraction products by cross-products, and check division operand limits and inverses. Catalogue and rendering tests also passed for the affected families. The main agent owns the final integrated full-suite/build verification.

## Confirmed remaining teaching gaps

These are subpoint/representation gaps, not a claim that the entire named chapter is absent.

- **written-algorithms** (printed pages 35, 37, 45): Existing guided core decomposes numbers and uses counters/bars; it does not demonstrate a written column algorithm for every required grade. Next: P1/P2 addition/subtraction column extensions are now present as separately tested lessons. P3/P4 multiplication/division and P3/5F written algorithms still need dedicated instructional coverage.
- **compare-concrete-sets** (printed pages 31): Dedicated comparison objective asks symbolic numeral comparisons; number-of-objects comparison across two or more pictured sets is not established by that lesson. Next: Explicit matching/comparison of two and three object sets, including equal sets.
- **fraction-ordering** (printed pages 33, 35, 45): Comparison generates two fractions and a relation symbol. Ordering three or more fractions is not supplied by the dedicated comparison objective. Next: Order unit/like fractions in P2 and unlike fractions in P3/5F with denominators≤12, using equal wholes.
- **measuring-ordering** (printed pages 32, 34): P1 length examples read a zero-aligned ruler; P2 measurement examples subtract two stated measurements. Actual measured scale-reading and ordering three measurements need broader evidence. Next: Non-zero starts, scales for appropriate instruments, and order multiple lengths/masses/volumes within the stated level.
- **shape-composition** (printed pages 32): P1 compose/decompose generated examples ask only how many quarter-circles form a half/whole circle. Next: Compose/decompose rectangles, squares and triangles as well as circular parts with actual manipulation.
- **drawing-construction** (printed pages 32, 36, 39, 42, 47): Drawing objectives mostly assess recognition or give a paper-construction task to be checked by an adult. Recognition questions do not verify the pupil constructed the target. Next: Interactive ruler/protractor/grid construction with constraints checked, or clear practical-task coverage labelling. Existing free drawing pad alone is not mathematical assessment.
- **symmetric-grid-figure** (printed pages 39): Complete-symmetry objective asks the distance of a single reflected point from a vertical line. Next: Complete and check a whole figure on a square grid, with varied mirror-line positions.
- **composite-circles** (printed pages 44): Dedicated composite-circle generator always uses a rectangle topped by a semicircle. Next: Original composite families incorporating square/triangle/quarter-circle cases, curved boundary vs internal join reasoning, and useful diagrams.
- **cubic-metre-experience** (printed pages 42, 47): Generated volume examples use cm³ or unit cubes; objectives mention m³ but systematic m³ questions were not demonstrated in sampled lesson items. Next: Include m³ as a cubic unit at appropriate scale, explicitly excluding cm³↔m³ conversion.

There are **96 lesson→practice links without an exact objective match**. `plan.ts` chooses a related topic/strand/year activity when an exact match is unavailable. The matrix records these individually. An implemented guided lesson and an exact matching repeatable drill are different coverage claims.

## Reproduce

```sh
node scripts/export-content-audit.mjs
python3 scripts/audit-content.py
python3 scripts/build-syllabus-audit.py
npx vitest run src/teach/build/numberNames.test.ts src/teach/build/syllabusRegressions.test.ts src/teach/depth/catalogue/catalogue.test.ts src/teach/depth/catalogue/rendering.test.ts
```

The snapshot is generated locally under `.generated/content-audit/`; the durable artifacts are `audits/content-math-verification-2026-11-04.json` and `audits/syllabus-coverage-matrix-2026-11-04.json`. The maths audit exits nonzero for a supported-check mismatch. Its own parser assertions protect fraction-division precedence, mixed numbers, commas and reasoning prompts.

The matrix retains extracted source wording for traceability. Dropped approximation, root and average-division glyphs were restored after visual review of complete official PDF pages 44, 45 and 50. Other extracted source text should still be checked against its cited PDF page for an authoritative reading. The source is the October 2025 MOE Primary Mathematics syllabus, applicable to P6 from 2026.
