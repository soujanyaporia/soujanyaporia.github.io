# Independent-learning support and app review — 19 September 2026

This release publishes the independent-learning work that was on disk but not yet documented, together with a review of the latest app against the five-area rubric.

**What the release adds.** Every question now has a “Help me with this” menu with up to three routes: *Show me how to start* (one step at a time), *Try a smaller question* (a building block, then back), and *Revisit the worked example* (a clearly labelled replay of the earlier solution, one step at a time). The question and the pupil's answer so far stay visible, and “Back to my question” returns focus to the answer box. After two wrong tries, a short “Let’s make this smaller” suggestion offers the next useful step. Every model has a “Read this picture” key explaining its words and symbols (for example, that 2x means two equal bags, not 2 + x), with read-aloud. In “Teach it back”, a pupil who needs more practice can walk through the same picture again. The ten reference lessons gain a “Choose a first step, then try it” bridge: a reasoning choice, then the same idea in a changed situation (a bus instead of counters, a circle instead of a strip, notebooks and delivery instead of bags), with a note on what the picture's objects stand for. Those ten lessons move to revision `…-v6`, so their unfinished drafts restart once.

**Verification.** Typecheck and production build passed. All 443 tests in 28 files passed in a full run with one worker, including 10 new independent-learning checks. In the browser, at 390 CSS pixels with no horizontal overflow: the P6 algebra reference lesson was followed from warm-up through prediction, the balance activity (a one-sided change is rejected with a specific message), the four-picture explanation, “Teach it back” and the new bridge. A wrong bridge answer got targeted feedback, the worked-example replay returned to the question with the earlier answer still in the box, and a correct answer after help showed “You got there”, not “Right first time”. A generated P3 lesson on start and finish times was followed from warm-up to guided practice. The home page, the Learn catalogue (search, topic filters, previews) and the lesson layout at 1280 pixels were also checked.

## Rating against the rubric

| Area | Previous | Now | Main evidence |
|---|---:|---:|---|
| UI and mobile usability | 8/10 | 8.5/10 | No horizontal overflow at 390 px on the pages checked; four clear lesson phases; help keeps the question in view and returns focus; desktop journey sidebar; catalogue search and filters. Held back by long phone pages when help, picture key and solution are all open, and a 736 kB (225 kB gzip) Learn bundle for first loads on slow phones. |
| Strongest teaching lessons | 8/10 | 9/10 | The P6 algebra reference lesson links a matched warm-up, a prediction with reasons, a balance where a one-sided change fails, the same example explained in four pictures, “Teach it back” with a model explanation only after an attempt, and a bridge to a changed context. Not yet trialled with pupils or reviewed by a teacher. |
| Teaching quality across the whole catalogue | 7/10 | 7.5/10 | All 265 lessons now have a hands-on activity and “Teach it back”, and every question has picture keys and the new help. But 186 of 204 P3–P6 lessons open with one of ten generic P1-style warm-ups (the P3 durations lesson starts with “8 counters, 3 crossed out”), and 128 of 265 worked examples show only a table rather than the lesson's picture model. |
| Exercises and feedback | 8/10 | 8/10 | Clear help routes, saved work, honest scoring and targeted feedback in the reference lessons (“Twelve belongs to both bags together…”). In the generated time lesson, all four classic errors tried got generic feedback: 13:95 and 15:45 for 14:50 − 55 min, and 14:155 and 15:35 for 14:35 + 120 min. |
| Learning unfamiliar topics independently | 6.5/10 | 7/10 | Picture keys, read-aloud, a smaller question, a worked-example replay without losing your place, and next-day reviews make self-study more realistic. The first-step-then-transfer bridge is in only 10 of 265 lessons, and the warm-ups do not diagnose missing prerequisites or send a pupil to an earlier lesson. |

Average: 8.0/10, up from 7.5.

**What would raise each score next.** (1) Replace the generic warm-ups in the 186 upper-primary lessons with one grade-appropriate prerequisite question each, and link a missed warm-up to the earlier lesson that teaches it. (2) Give the 128 table-only worked examples the lesson's own picture (timeline, bar model, place-value chart). (3) Add the time errors above, and measure feedback coverage by plausible wrong answers rather than by question. (4) Extend the first-step bridge beyond the ten reference lessons. (5) Split the Learn bundle by grade. (6) Have a qualified teacher review a sample, and run a small pupil trial before claiming learning gains.

Limits: this is one reviewer's structured judgement from representative browser journeys and catalogue counts, not an exhaustive device test or classroom evidence.

---

# Connected teaching, explanation and reliable learning evidence — 19 September 2026

This release preserves the 265-lesson catalogue and strengthens ten reference lessons across P1–P6. Seven receive coherent prediction–model–explanation–worked–variation sequences; the previous three depth lessons gain targeted explanation and transfer prompts. Every lesson now has a “Teach it back” pause tied to its actual worked question, before the learning check. Spoken/drawn/optional written explanations are compared with an example and are explicitly unmarked. See TEACHING-QUALITY.md for the reference list, design basis and human validation still needed.

Question work now persists synchronously: typed answers, wrong tries, clues, teaching steps, alternate methods and recovery use survive question navigation and reloads. Three stars require all check answers correct on the first try without optional help; two require at least 60% correct. Weak checks/reviews are due again the next day. Completion distinguishes independent answers from corrected/assisted answers and shows a path back to the lesson after a weak challenge. Historical rewards are preserved. Removed two exploration/prediction XP messages that did not correspond to recorded XP.

New mobile fixes: bond pictures visually mark the part taken away; large buttons move counters; balance pans grow with their counters instead of overlapping earlier content; ratio bars fit a phone while using the same unit width in every row; changing questions scrolls an off-screen prompt into view. Adult guides are available to guests, use readable model names, describe the actual facets in the lesson, and offer an observation rubric.

Validation: all 431 tests in 27 files pass in a full run with one worker and unchanged test timeouts. Nine new checks cover catalogue-wide reflection placement, ten reference sequences across six grades, reachable actions, deliberate variations, fraction/decimal relationships, saved unfinished evidence, stricter scoring, next-day weak reviews and relevant upper-primary prerequisites. The final prerequisite refinement passed 34 focused checks in four files, including all lesson generation and coherence checks. Earlier parallel execution exposed two outdated content assertions (corrected to respect the new authored sequences) plus host-load timeouts; the complete serial run passes. Production build/typecheck pass. The Learn bundle remains large (approximately 710 kB, 218 kB gzip); this pass does not solve that download-size limitation.

Observed browser QA, using local guest progress:
- P1 number bonds: readiness → hook → prediction → hands-on → all explanation frames → worked turns → all three guided questions → explanation/comparison/self-reflection. Numbers and part colours remain linked. The taken-away part is visibly annotated.
- Entered an incorrect answer, opened a clue, switched away/back, then reloaded. The answer and clue remained. Correcting it displayed “You got there,” not “Right first time.”
- The explanation model answer stays hidden until the pupil reports an explanation attempt. Both self-reflection choices enable continuation without awarding a mark. Optional typed explanation stays on that screen only.
- Final readiness check: P6 now opens with two equal bags sharing twelve, rather than counting two plus three. The P2–P5 reference lessons likewise check relevant earlier skills: equal groups, fraction notation, tenth/hundredth exchanges and equal sharing.
- P6 algebra: completed all five challenge facets, deliberately corrected one wrong answer after navigating away/back. Completion showed 4/5 first-try without help, two stars, a next-day review and a working “Learn this idea step by step” destination.
- At 320 CSS pixels, the algebra guide initially revealed overlapping counters. After the fix, measured pan bounds lie inside the scene and the screenshot shows clear separation from the previous model.
- Raised a ratio bar to 9 units against 2. At 320 pixels every unit measured the same width (25.55 px), with no page overflow. Checked the desktop layout at 1280 pixels too.
- Reflection checked at 320 and 390 pixels; completion at 390. No horizontal document overflow in those inspected states. These are representative browser journeys, not an exhaustive device or classroom evaluation.

Publication of the main pass: `a0f14dd`, GitHub Actions run `35421934021`, successful build and deployment. The prerequisite refinement follows this commit.

Revisions now end in `2026-09-19-v5`. Incompatible unfinished sequences start at the new first step with an explanatory message. Previous completed checks and earned rewards remain.

---

# Lesson browsing, worked feedback and fraction arrangements — 19 September 2026

This pass preserves the expanded 265-lesson catalogue and its hands-on activities.

- Learn now has grade-scoped search, topic filters with counts, concrete example previews, an empty-search recovery, and a continue card for a compatible saved attempt. Reviews follow the selected grade/path. Rewards are available in a collapsed section so lessons are easier to reach.
- Lesson orientation uses four short phase labels. Goals and previous-example recaps can be opened when needed; duplicate introductory text is suppressed. Question navigation has numbered, wrapping touch targets. Reduced-motion preferences are respected.
- Worked examples retain wrong answers and explain relevant mistakes. Generated examples reuse their existing misconception bank when the pause asks the same question. Intermediate/custom pauses can supply their own hints and mistakes. The pupil can request a clue or reveal an answer; revealing is not praised as solving. Read-aloud excludes an unrevealed equation, and equivalent numerical answers are acknowledged explicitly. Fraction/time/text answer fields use appropriate keyboards and format guidance.
- Single-strip fraction investigations (up to 12 parts) and the P2 fraction exemplar let pupils toggle individual pieces, including separated pieces. Transfer questions vary the arrangement in strips and circles. Comparison/equivalence walls retain contiguous shading because they compare lengths. Completed explorations no longer show a stale success message beside a reset or altered model.

Validation: production build and typecheck passed. The full 423-test run (26 files) had 419 passes and four timeouts while the host load average was 56.67; no assertion failed. All four timed-out checks then passed with unchanged time limits, in isolated runs: catalogue safeguards (9 tests) and lesson generation, activity generation and model rendering (14 tests). Thus all 423 checks passed across these runs. Seven new checks cover search, hidden-answer speech, worked misconceptions, answer formats, reversible individual selections, varied fraction arrangements and accessible/read-only model rendering.

Browser QA: P2 search; empty-search reset; P5 Foundation and P6 Standard filtering; compatible lesson continuation; P2 fraction notation from warm-up through explanation and exploration into a worked example. Two separated pieces failed the target, three succeeded, and keyboard selection worked. In the worked example, `2/10` remained visible with a denominator-specific explanation; equivalent `1/6` was accepted for `2/12`. P6 algebra feedback correctly explained that `45` in `5x + 6 = 51` is the value of `5x`, requiring division by 5. Layouts inspected at 320, 390 and 1280 CSS pixels. These are representative browser journeys, not an end-to-end classroom audit of all lessons.

Limits: content still needs qualified-teacher review. Existing fraction walls still shade contiguous lengths; only individual-piece investigations offer free arrangements. The Learn bundle remains above the build's 500 kB warning threshold (about 665 kB, 204 kB gzip).

---

# A hands-on activity in every lesson — 19 September 2026

All 265 lessons now include a hands-on activity (122 before). The 139 new activities are in `src/teach/depth/catalogue/activities.ts`. Each one practises its own lesson's objective with fixed, friendly numbers, and is used only where the picture sequence and the topic's own model did not already provide an activity.

- **Whole numbers**: number names, comparing and patterns on number lines (reach “seven hundred and thirty-one” from 700; continue 3410, 3420, 3430 with two +10 jumps). Odd and even: share 13 between 2 friends and see the one left over.
- **Addition and subtraction**: take 4 of 12 away, split 8 into 5 and 3 on a number bond, make 10 ≠ 8 equal on a balance, and mental jumps including compensation (2436 + 27 as +30 − 3; 83 − 29 as −30 + 1).
- **Multiplication, factors and multiples**: 6 rows of 10 for 60 ÷ 10, 8 × 6 before the addition in 5 + 8 × 6, a 12 by 12 area model for two-digit multiplication, and groups of 6 until the total is also a multiple of 8.
- **Fractions**: equivalent strips (1/3 = 2/6, 1/2 = □/8, 2/3 = □/12), a fraction of a set by sharing, 3 × 2/5 and 2 × 1 3/4 on strips, and 2/3 of 3/4.
- **Decimals**: comparing and rounding on the hundred grid (0.47 and 0.5; 0.36 to one place; 2 ÷ 3 to two places), exchanges on the place-value chart (0.38 + 0.05; 0.52 − 0.07), digit shifts (4.2 ÷ 100) and conversions (3 m 45 cm; 1 kg 250 g).
- **Measurement and time**: comparing lengths, masses and volumes; 350 ml on a litre grid; compound units on number lines; one hour and half an hour later; 90 and 75 minutes; finish times across the hour; 24-hour times through am and pm.
- **Geometry**: angle facts on the protractor (straight line, around a point, vertically opposite, triangle sum, isosceles, parallelogram and trapezium), squares, joined rectangles, matching triangles for base, height and area, cuboids for volume, tank water, missing heights and cube roots, and radius and diameter.
- **Data, percentage, rate and algebra**: picture-graph and bar-graph scales, table differences and missing values, line-graph changes, pie-chart shares, 25% blocks that rebuild a whole, a 25% discount, sharing a total to find a rate, groups for a total cost, and balances for x + 3 = 8, 3x + 2 = 14, 2x + 3x = 15 and x = 4 in 2x + 1.

Also fixed: the ten-frame warm-up said “One full row is a ten” beside a picture whose note says each row holds five; it now says a full ten frame holds one ten. The odd-and-even lesson now warms up with pairs (two equal rows) rather than place-value tens.

Verification: a new test requires an activity in each of the 265 lessons and checks that every written activity appears in its lesson rather than being replaced by another. The existing lesson tests prove that each goal starts unmet, uses valid model states and can be reached with the on-screen controls. Before the final two text edits, 416 tests in 25 files passed and the production build succeeded. After those edits the tests were re-run while the machine was overloaded (load average 20 to 108): every failure was a timeout with no failing assertion, and the slowest test passed on its own in under 10 seconds. The user asked for the release to be pushed without waiting for another run. Commit `a7017d4` was then pushed to `master` without force, and GitHub Actions run `35407593625` ran the full suite on the final code: 416 tests in 25 files passed, the build succeeded and the site deployed. The live `screens` chunk contains the new activities and revision, and no longer contains the old ten-frame wording. In the browser, nine activity types were completed end to end at step 5 of 12 with no console errors: sharing 13 between 2, 2436 + 27 on the line, 2:30 am to 14:30, 5x = 15 on the balance, 2 × 1 3/4 on strips, 0.38 + 0.05 with an exchange, a bar with a scale of 5, a cuboid's missing height, and taking 4 from 12.

Limits: the activities are fixed examples rather than generated per attempt, and no teacher has reviewed them. Some models are stand-ins: a strip for a pie chart, ratio blocks (labelled “units”) for a bar graph, and counters for differences. The triangle model is drawn at a fixed size, not to scale. The lesson revision is now `catalogue-depth-2026-09-19-v3`, so unfinished drafts restart once. The on-demand `screens` chunk is now 656 kB (201 kB gzip). The whole-catalogue tests in `support.test.ts` now allow 30 seconds, like the other whole-catalogue tests.

---

# Grade-by-grade content pass — 18 September 2026 (round two)

A per-grade audit of the generated lessons found four weaknesses shared by every year, and one generator bug. All are addressed here.

- **“Read a picture or model” questions now need the picture.** For about 45 question types the prompt had stated every number, so the picture was optional (91% of these questions in P6 Standard, 20–49% elsewhere). The numbers now live in the model and the prompt does not repeat them: “Round the middle number to the nearest thousand” beside 16000 | 16813 | 17000, a clock face for 24-hour time, fraction strips for equivalent fractions, a hundred grid with its sum hidden, a level balance for x, ratio bars for shares, tables for conversions, factors and prices. Models never print the answer.
- **Word problems are situations.** Templates such as “A science notebook records this measurement. Calculate 56 ÷ 4, rounded …” became juice shared among jugs, a stopwatch and scoreboard, pizza slices in simplest form, two children colouring equal strips, a baker's slices as a mixed number, a fish tank in cubic centimetres, a cycling path or a bag of rice to convert, and a survey with one missing count.
- **More misconceptions for the weakest question types**: the 100-minute hour on clocks (10:55 + 20 minutes written as 10:75; 12:05 − 65 minutes as 11:40), am kept past noon, 24-hour writing (forgetting to add 12, adding 12 to a morning hour, one-digit hours), pie slices (reading everyone else, assuming equal slices), fractions (dropping the denominator, subtracting the smaller numerator instead of exchanging a whole, multiplying only the whole number of a mixed number), decimals with equal decimal places (dropped exchange, smaller digit from larger), money with notes and coins, and ratio, volume and root errors.
- **Fraction generator bug fixed.** Addition and subtraction always used numerator 1, so P2 “add and subtract like fractions” only asked 1/d + 1/d or 1/d − 1/d = 0, and P3–P5 only added unit fractions. Numerators now vary (5/12 + 7/12, 11/12 − 8/12), sums stay within one whole where the syllabus says so, differences are never zero, and P2 prompts keep their like denominators.
- **Hands-on activities matched to objectives**: 122 of 265 lessons (82 before). The clock, ruler, rectangle builder, cube solid, protractor, line tool, array, balance, place-value chart and counters are used only where they practise the objective's own relationship, and a ratio-bar activity was added for P6 ratio. Every goal is proved reachable with the controls on screen.
- **Foundation scaffolding.** P5 and P6 Foundation guided practice now starts with a smaller-number version of each question, keeping an even easier one for “I still don't get it”; independent practice returns to full size.

| Path | Activities | Targeted feedback | Easier retry of the same kind | Visual that needs no picture | Bare-calculation word problems |
| --- | ---: | ---: | ---: | ---: | ---: |
| P1 | 4 → 15 | 88% → 90% | 74% | 20% → 9% | 4% → 0% |
| P2 | 10 → 11 | 88% → 92% | 79% | 26% → 12% | 22% → 3% |
| P3 | 6 → 13 | 88% → 91% | 73% | 46% → 6% | 25% → 3% |
| P4 | 14 → 20 | 87% → 91% | 74% | 37% → 3% | 26% → 0% |
| P5 Standard | 9 → 11 | 88% → 91% | 81% | 46% → 6% | 6% → 3% |
| P5 Foundation | 11 → 17 | 84% → 88% | 75% | 46% → 3% | 22% → 2% |
| P6 Standard | 4 → 10 | 82% → 83% | 69% | 91% → 5% | 22% → 4% |
| P6 Foundation | 11 → 12 | 83% → 83% | 68% | 49% → 5% | 14% → 0% |

Activity counts are for the 252 syllabus lessons; the 13 broader lessons already had activities. CATALOGUE-COVERAGE.md is regenerated from the catalogue.

Verification: 415 tests in 25 files pass and the production build succeeds. New checks require picture-dependent prompts for the listed question types, reject the old bare-calculation story templates, require at least six lessons with activities in every year, and pin the new misconceptions by value (01:41 for 1:41 pm, 10:75, 11:40, 2 2/4 for 3 1/4 − 1 3/4, 2.32 for 2.18 + 0.24, 94 for $4 and 90 cents). In the browser, the P4 rounding check answered question 1 and showed the picture-only question 2 described above.

Limits: the lesson revision remains `catalogue-depth-2026-09-18-v2` (first published with this release), so unfinished drafts from the previous release restart once. The on-demand `screens` chunk is now 607 kB (186 kB gzip). Every earlier limit still applies: no teacher review, no classroom evidence, and misconceptions drawn from general knowledge rather than Singapore classroom data.

---

# Question support rebuilt around real misconceptions — 18 September 2026

The generated lessons' help content was rebuilt. Previously one function attached the same kind of help to every question: wrong answers came from four arithmetic rules (so “50% of 120” listed 120.5), “I still don't get it” asked a definition question, “Show me another way” was the same generic method on 1,616 of 1,780 occasions, and reasoning items were two-option questions with fixed stems.

New modules in `src/teach/depth/catalogue/`:

- `facts.ts` recognises what each generated question asks (about ninety question types, from place value and rounding to percentage change, ratio shares, durations, triangle area and graph reading) by matching the families' sentence templates.
- `mistakes.ts` computes the wrong answers children actually give for that situation, each with a specific explanation: 52 − 27 = 35 (smaller digit from larger), 47 + 38 = 75 (dropped exchange), 5.4 + 3.47 = 8.51 (tenths read as hundredths), 570 × 3 = 1570 (only the 500 multiplied), 9:45 to 10:15 = 70 minutes (hour treated as 100 minutes), 21 in 1 : 2 : 4 shared as 7 (equal shares instead of units), a ruler read from 1, the other protractor scale. A plausibility filter rejects answers no child would give (non-integers from whole-number questions, negatives, absurd magnitudes).
- `strategies.ts` supplies genuinely different methods worked with the question's own numbers (count up for subtraction, round and adjust, 10% blocks or a fraction for percentages, the percentage you pay for discounts, a common denominator or decimals for fractions, unit value or a fraction of the total for ratio).
- `assess.ts` builds every generated question. “I still don't get it” is now the same question with no number larger and a smaller total, found by searching the same generator. Reasoning items are error analysis (“Ravi works out 499 × 9 and gets 3699. What went wrong?”) whose options are the diagnoses of different mistakes. Work-backwards and missing-number questions (□ + 2.55 = 12.41) appear where the mathematics supports them, and bar-model questions with a hidden unknown provide the unfamiliar representation, so mastery covers up to seven facets.

Other content fixes: multiplication and division steps split by place value without empty parts (570 × 3 was “570 + 0”); P1–P2 questions read “What is 5 + 4?” rather than “Calculate”; ordinal multiples read “2nd”, “3rd”; “in simplest form” is now enforced for percentage and decimal conversions; the P1 “Count and represent numbers to 100” focus now matches its tens-and-ones questions; the notice options are no longer always in the same order; and the recovery panel says “an easier one like it” when that is what it shows. The lesson revision is now `catalogue-depth-2026-09-18-v2`, so unfinished drafts of changed lessons restart cleanly while recorded achievements are kept.

Measured on the same 4,519-item audit used for the previous review:

| | Before | After |
| --- | ---: | ---: |
| Items with targeted wrong-answer feedback | 63% | 83.4% |
| Generic “Start from what the picture means” methods | 1,616 | 0 |
| Distinct alternative methods | 21 | 188 |
| Recovery questions that are an easier question of the same kind | ≈0% | 73% |
| Two-option choice items | 996 | 222 |
| Reasoning items with three or more options | 0% | 84% |
| Fixed stems (“A learner is solving this…”) | 984 | 0 |
| Lessons assessing six or seven facets | 16 | 55 |

Automated verification: 411 tests in 25 files pass, and the production build succeeds. The new `support.test.ts` pins specific misconceptions by value, rejects implausible distractors, checks that every generated question offers distinct non-generic methods, that recovery questions keep the same facet and differ from the original, that at least 80% of reasoning items offer three or more options, that every missing-number answer satisfies its equation, and that no worked step splits a number into an empty part.

Browser observation (local, guest): the P3 multiplication challenge showed “Question 1 of 7”. Typing 2513 for 513 × 5 gave “Only the 500 was multiplied. Every part of 513 — 500 and 10 and 3 — is multiplied by 5.” Typing 518 gave “That adds. 513 × 5 means 5 groups of 513…”. “Show me another way” split 513 into 500 + 10 + 3 with the partial products, and “I still don't get it” offered 315 × 3 with the message “Let's try an easier one like it first.” At 375 CSS pixels the page did not overflow.

Limits. The misconception library is written from general knowledge of common errors; it has not been checked against Singapore classroom data or reviewed by a teacher. “Easier” is a numerical rule (no larger number, smaller total), not a model of cognitive difficulty. 210 lessons still assess five facets, because work-backwards and bar-model questions are offered only where the question type supports them; 16% of reasoning items and 27% of recovery questions still fall back to two options or the idea check. The on-demand `screens` chunk is 590 kB (181 kB gzip) and triggers Vite's chunk-size warning; splitting the catalogue by year would remove it. This change has not been published.

---

# Catalogue teaching expansion — 12 September 2026

Expanded flow and question support to all 265 lessons (252 syllabus lessons plus 13 broader lessons), covering P1–P6 and both Foundation paths. The three previous reference sequences remain intact. The generated sequences now begin with an earlier building block, ask what to attend to in the example, preserve a complete first explanation, announce a new worked example, and provide a conceptual support question with a return to the original item. Existing broad lessons keep their authored activities and gain explicit transitions and recovery. See CATALOGUE-COVERAGE.md for every lesson.

Content repairs include matching rates, money, percentages, fractions and decimals to their actual question values; suppressing calculated totals/equalities on assessment models; retaining required diagrams without recording them as extra help; actual fraction-product overlaps and mixed-number strips; labelled triangle/cuboid dimensions; unsorted ordering inputs; a dedicated fraction-simplification explanation through 4/8, 2/4 and 1/2; and P4 decimal-operation checks that assess sums, missing addends and change. Rate and decimal stories/explanations now identify concrete quantities and their relationships. Interactions are included in 82 lessons where the picture model supports a related task; this is not a claim of 265 bespoke investigations.

Automated verification: **402 tests across 24 files pass**, plus the production build. The new render check covers every lesson demonstration and sampled question/support models (over 10,000 renders), rejects non-finite/undefined geometry, and complements independent arithmetic/model checks. All lesson revisions, mastery support branches and exploration reachability are checked. Specific regressions cover unknown original percentages, price/quantity relationships, both money comparison amounts, fraction overlaps, simplification preserving value, hidden computed summaries and the P4 decimal-operation facets.

Browser observations: opened all 265 catalogue routes through grade/course catalogue links at 390 CSS pixels; all loaded with a lesson title and no observed document overflow. Completed the P5 rate lesson through all 11 stages and five check questions, including an incorrect answer, exclusive supporting-question recovery, return to unchanged values, worked-answer gating, required-model first-try scoring, reasoning, recap and completion. Walked the P3 simplifying-fractions explanation and keyboard-operated activity into the new worked example. Walked P6 original-percentage readiness, attention prompt, full explanation and worked question, verifying that the question model shows the known share and amount without printing the unknown whole. Answered the broader P4 decimal challenge’s visual sum (6.31 + 1.64), missing addend (2.21 + □ = 4.94), and change ($10 − $7.15) questions; required models earned unassisted credit, and the bars fit at 320 CSS pixels. Inspected relevant layouts at 320/390 CSS pixels. Earlier complete reference-lesson checks remain documented below.

These observations are opening checks for the full catalogue and deeper checks for named paths, not full manual walkthroughs of every generated question. They do not constitute physical iPhone Safari testing, qualified-teacher review or classroom evidence of learning. Remaining depth work is explicit in TEACHING-QUALITY.md.

---

# Teaching depth reference lessons — 12 September 2026

Re-authored P1 `p1s-as-07`, P2 `p2s-frac-01` and P5 `p5s-area-02` as twelve connected stages: prerequisite, anchor question, prediction, purposeful interaction, explanation, worked example with a pupil contribution, guided and independent practice, story, reasoning, mixed check and recap. Other lessons keep their existing content. See `TEACHING-QUALITY.md` for the review standard and remaining work.

Shared fixes: required question pictures do not count as extra help; smaller-question recovery replaces the original answer form until return and keeps the helped flag; fraction inputs support a slash on the P1/P2 keypad; question navigation has accessible names. New counter states preserve object positions; fraction reading pictures omit printed answers and match the blue named in the text. Garden diagrams and explanations use metres consistently.

Automated verification: 389 tests across 21 files and the production build pass. New checks independently recompute generated answers, validate interaction reachability and counter conservation, check distinct visual tasks, reject invalid distractors, and verify bounded smaller-question recovery data. A passing generated-content check is not a teaching-quality judgement.

Browser-observed locally: completed all twelve stages and all five mixed-check questions in each of the three lessons. P1 checked a wrong prerequisite, arbitrary counter selection, undo, keyboard selection, incomplete target feedback, a wrong subtraction answer, exclusive smaller-question recovery and return, inverse-reasoning feedback, and completion. P2 checked keyboard shading, fraction entry with the slash keypad, swapped-number feedback, denominator and unfamiliar-circle questions, unequal-half feedback, and completion. P5 checked joining/removing/rejoining via keyboard and pointer, both worked-example answers, missing-halving feedback, required diagram questions, garden units, reverse reasoning, and completion.

Inspected desktop (1280) and phone (390 and 320 CSS pixels) layouts across the new models and relevant lesson screens; observed no document overflow in the measured views. These are browser viewport checks, not physical iPhone Safari testing, exhaustive device coverage, classroom evaluation or teacher endorsement.

---

# Counter clarity and phone layouts — 12 September 2026

Fixed the screenshot-reported counter overlap at its source: the activity picture and Foundations counter renderer shared a global `.counter-group` selector. Their layouts now have separate names. Teaching tools also have separate selectors for ten frames, bars, number lines, arrays and plates so navigation between modules cannot mix those styles.

The P1 number-bond introduction now keeps one example throughout: five blue counters and three orange counters make eight; taking the blue part away leaves three. Pictures label the parts, explain crosses, connect to a labelled number bond, and require an answer before continuing the worked example. Practice varies which quantity is missing. The learning goal is concise and collapsible, empty captions are omitted, and a changed picture is brought back into view when a phone has scrolled below it. Other counter-based teaching figures explain removed counters, equal groups and unknown parts without revealing ghost quantities.

Phone fixes also cover wrapping counter groups, narrow number-bond parts, ten-column arrays, place-value controls and percentage bars. Percentage sections share one readable key instead of repeated cramped labels.

Verification: 377 tests in 19 files passed; production compilation passed. New checks verify quantity/colour conservation across the number-bond story, hidden-quantity answers across 240 generated practice cases, and captions for subtraction, repeated groups and unknown parts. Browser checks at 320, 390, 430, 768 and 1280 CSS pixels found no document overflow in the revised number-bond lesson. At 320 pixels, inspected addition, subtraction, multiplication (including plates and array), the complete Math Lab and original Foundations addition. Exercised number-bond answer 3, the picture-step scroll behaviour, a 3-by-10 array and its rotation, and a +10 number-line jump. This is browser viewport testing, not a physical iPhone Safari test or a claim that every lesson has received a teaching-quality review.

---

# Guest setup and connected teaching — 12 September 2026

This follow-up adds a menu entry at `#/guest`: an optional nickname, P1–P6 selection, and Standard/Foundation for P5/P6. It uses the existing single browser guest record, preserves learning history, requires no email/password, and explains the local-only limit. School accounts remain separate. Nicknames are removed from exported passports by the existing anonymisation. The form checks whether its saved preferences can be read back and reports temporary storage when they cannot.

Expanded lessons now carry a visible learning goal and one anchor question through the opening, worked example and final takeaway. Topic-wide manipulative tasks that did not match the particular objective were replaced by a reasoning activity tied to the worked example. The earlier authored lessons retain their interactive models. Visual steps have readable captions; teacher notes explain model meaning, and focused fraction, triangle, clock, measurement, decimal-rounding and picture-graph introductions include prediction prompts with explanations. Learners must answer or reveal the worked question before continuing. This is an instructional improvement, not evidence of teacher-reviewed mastery of every objective.

Math Lab navigation uses separate category panels and individual links, fixing concatenated labels such as “netNumbers”.

Verification: 374 tests across 19 files passed, including preserved guest records, grade/course validation, route handling, question-to-takeaway consistency and the distinction between triangle height and area. Production compilation passed. Browser checks exercised guest creation, P5 Foundation lesson selection, the triangle picture sequence, prediction reveal, worked-answer gate and linked reasoning activity. Existing rewards remained after guest setup. Local and public visual checks are recorded in the task conversation.

The previous release evidence follows; its earlier exploration/sequence description is superseded where described above.

---

# Visual teaching and syllabus expansion — 12 September 2026

This release replaces dense conceptual paragraphs with picture sequences modelled on the existing Foundations lessons. The reusable presentation shows one illustrated step, one short explanation, read-aloud and previous/next controls. Alternative methods from the original explanation engine remain available for early arithmetic. Worked examples show the current step instead of accumulating text. Assisted exploration now displays the actual target model when the pupil asks “Show me how”; a final worked question must be answered or explicitly revealed before the stage completes.

The site name is a dedicated masthead, with navigation in a separate row. Existing activity IDs, course selection, school-account interfaces and the public URL are preserved. Updated lessons restart an incompatible unfinished local draft while retaining recorded achievements.

## Coverage

| Course | Mapped objectives with dedicated lessons |
|---|---:|
| P1 | 27 |
| P2 | 30 |
| P3 | 29 |
| P4 | 39 |
| P5 Standard | 33 |
| P6 Standard | 23 |
| P5 Foundation | 49 |
| P6 Foundation | 22 |
| Total | 252 |

There are also 13 broader exemplar units, giving 265 lessons. This counts app-mapped objectives, not independent teacher certification of full syllabus coverage. The source is the MOE Primary Mathematics syllabus updated October 2025. Nine previously omitted map entries were added without renumbering existing IDs; incorrect page references in P4 solids and Foundation topics were corrected. Construction tasks include pencil-and-paper instructions; the app does not claim to grade physical drawings.

## Verification

- Final local release check: all 369 tests in 18 files passed, and the TypeScript/Vite production build passed. Tests cover every lesson’s metadata, valid answer formats, deterministic question generation, choices, stage structure, visible explanation models and reachable exploration goals.
- The new content audit samples 120 seeds per applicable objective and independently recomputes numeric operations from their operands. P1 number limits and 12-hour time contexts have explicit checks. All six P1 shape variants are reachable across seeds.
- Browser reference inspected: Foundations → Adding within 5 → introduction cards → worked example → Show me how. The reference uses changing counters, short narration and alternative methods.
- Browser inspection: triangle area progresses from one triangle to two matching triangles filling a rectangle, with readable labels and changing narration. The P1 introduction renders the original counter models. Masthead, menu and grade selection checked at 1440 × 1000 and 390 × 844; triangle presentation also checked at the normal narrow viewport.
- Automated checks establish mathematical and structural consistency for sampled cases. They do not establish that a child understands the explanations; no classroom trial or qualified-teacher review has been conducted.
- Production payload: entry 329 kB (102 kB gzip); teaching screens 356 kB (107 kB gzip), loaded on demand. Shared Foundations visuals and styles are reused.
- A final grade review removed a fraction-strip prerequisite from P1 money, corrected the P1 picture-graph introduction to one object per symbol, and kept protractors out of the P3 right-angle introduction. Regression tests guard these boundaries. Clock exploration uses hour/minute and am/pm controls.
- Existing API v3 remains a separate pending deployment; this frontend release does not imply it has been deployed. Current production draft fallback remains in place.

## Earlier release evidence (historical)

# Continuation and verification — 12 September 2026

## Teaching release, AI statement and guest passport — 12 September 2026

**What is new.** Learn (`#/teach`): 13 micro-lessons, 169 stages, about 150 minutes, across the six exemplar topics, built as lesson *data* rendered by one generic player, with 13 interactive manipulatives that are also open for free exploration in the Math Lab (`#/lab`). Per-lesson teacher guides (`#/guide/<lesson>`) and a curriculum coverage map (`#/coverage`). Mastery spans seven facets, reviews fall due after 1, 4, 10 and 30 days, and XP, Gems, level and streak are derived from recorded learning rather than stored separately. The About page (`#/about`) carries the AI-generated-content statement and a PDPA-oriented privacy statement, and hosts the guest learning passport.

**Automated.** `npm test`: 362 tests in 17 files pass (previously 351 in 14). New suites:

- `src/teach/lessons.test.ts`: for every lesson, objectives resolve to real curriculum skills, prerequisites resolve, the linked practice activity exists, the required stage sequence is present, the mastery check spans at least five distinct facets, and the lightweight lesson index matches the full catalog. For generated items: deterministic across six seeds, an independently checked and solvable answer, unique choices and valid answer formats. For manipulatives: tool states are arithmetically consistent, explore goals start unmet, and each “what do you notice?” has exactly one correct option. Lesson prose is rejected if it teaches a keyword rule.
- `src/primary/passport.test.ts`: a passport round trip restores progress, unfinished sessions and lesson attempts; tampered, truncated and foreign-format codes are refused; invalid sessions inside an otherwise valid code are dropped.

`npm run build` passes TypeScript and Vite. The main script is 327 kB (101 kB gzip). Lesson content and manipulatives ship in the on-demand `screens` chunk (185 kB, 50 kB gzip — confirmed by locating lesson text inside `dist/assets/screens-*.js`), the About page with the passport is its own 14 kB (5 kB gzip) chunk, the activity player 32 kB, school pages 31 kB, and the original lessons 155 kB plus the 85 kB shared engine.

Backend (`school-api`): `node sync-shared.mjs`, `npm run build` and the 7 integration tests pass, including the second-device draft restore, session privacy per pupil/school/role, and the same answer and completion from two devices counting once. The resynchronised shared sources are committed as `8e0bc3e`; the worker is unchanged from `6333b79` and API v3 remains undeployed.

**Browser-observed** (local Vite app, guest, Chromium):

- P6 “Letters and balanced equations” resumed at step 3 of 13 (“Welcome back… Keep it balanced”). Pressing “Take 1 off both sides” three times moved the equation `x + 3 = 8` → `x + 2 = 7` → `x = 5`, with the beam level at every step; Check then answered “The box balances 5 weights, so x = 5. Doing the same to both sides kept the scales level all the way,” and unlocked Next. Taking a weight from one side only tips the beam and reports “not balanced any more”, which is exactly what the following stage asks pupils to explain.
- Found and fixed during these checks: a pupil who used “Take 1 off the left only” could not restore the balance with the remaining controls, so the explore stage now offers “Start again”. Verified: it restores the opening state and clears the message, and does not re-lock a goal that was already met.
- About page: the AI statement (“built with the help of AI tools”, “it can sound confident when it is wrong”, “under the guidance of a teacher, parent or another adult”, “not an official MOE resource”) and all ten privacy headings render.
- Guest passport, exercised in the browser rather than only in tests: “Create my passport” produced a 2,883-character `MFP1-` code, and checking that code back reported “2 activities explored · 0 lessons finished · 12 answers · 2 stars · 2 unfinished · saved 12 Sept 2026”, with the replace-progress warning shown before anything is applied.
- P3 “Equivalent fractions” renders at 390×844 with no horizontal overflow; the Math Lab lists all 13 manipulatives; a lesson guide renders its five sections; the coverage map reports, for P1, 3 of 27 objectives with a Learn lesson, 19 of 27 with practice activities and 8 mapped only.

**Not verified.** No child has used these lessons, and no qualified teacher has reviewed the content: the automated tests check mathematics and structure, not whether a nine-year-old understands the wording. Signed-in pupil flows were not exercised in a browser (no accounts were created and no passwords typed on the live service); authenticated behaviour rests on the API integration tests and the v2 compatibility check. Physical iPad/Safari, screen readers and 200% zoom were not tested. P5 and P6 Foundation have no lessons yet. API v3 is still not deployed, so unfinished working does not yet move between devices in production.

## Release 1 — returning feels purposeful (evening, 11 September 2026)

This section supersedes the statements below that in-flight activity resume is not implemented.

**Automated.** `npm test`: 351 tests in 14 files pass (previously 330 in 10). New tests:

- `src/primary/session.test.ts`: stable UUID-shaped event IDs; question keys within the API's 200-character limit that rebuild the identical question for all 198 activities; exact regeneration of saved sessions and refusal of a changed generator, fingerprint or activity; strict session validation; near-transfer repair for every activity (never the identical question; the same strategy in more than 95% of 792 samples); the targeted-note rules.
- `src/primary/resume.test.ts`: a reload restores the exact question and working without scoring the working; answers, completion and stars are counted once across repeated events, full replays and a repeat with a different ID; a second device rebuilds the session from saved answer history alone; guest and account session stores never share data; incomplete history is not trusted; an older generator is reported.
- `src/state/__tests__/cloudSync.test.ts`: an event is queued once; a permanently rejected event is set aside without blocking later events; a 409 caused by another device is replayed; work and the cached snapshot survive an outage and a reload; an expired sign-in keeps work pending.
- `src/engine/__tests__/stats.test.ts`: the progress reducer's level bound equals `clampLevel` for every skill.

`npm run build` passes (TypeScript and Vite). The main script is 318 kB (98 kB gzip), down from one 606 kB bundle. The activity player (67 kB), school pages (31 kB) and original lessons (155 kB, plus an 85 kB shared engine chunk and their own CSS) load on demand, and Vite's chunk-size warning no longer appears.

Backend (`school-api` commit `6333b79`): `node sync-shared.mjs`, build and 7 integration tests pass. New checks: the health capability; a draft restored on a second device without changing progress; a stale revision refused with the stored copy returned; malformed sessions rejected; sessions private to each pupil, school and role; deactivated (401) and must-change (403) accounts refused; the same answer and completion from two devices counted once; a repeat with a different event ID recognised from saved history; a malformed `sessionId` rejected.

**Compatibility with the deployed API.** A scripted check ran the new client code (event IDs, question keys, history-based resume) against the saved build of the deployed v2 worker (`1e92699`) on an in-memory database. All new events were accepted; repeats from a second login were not recounted; the second login rebuilt the session at question 4 of 8; completion and stars were counted once; `/api/sessions` returned 404, which the app treats as “v2: keep working on this device”.

**Browser-observed** (local Vite app, guest, Chromium viewport emulation):

- 1280×900, P3 Equivalent-fraction bridge: after one answer and typed working, reload showed “Welcome back. You are on question 2 of 8, with your working restored.” A wrong check (`5`), the opened clue and a changed, unchecked answer (`4`) were restored exactly after a second reload, and progress still counted one answer. The correct answer was then recorded as not first time (1 clue, 2 tries, evidence `5`), with the explanation kept on screen and focus on Next.
- Keyboard: the answer box is focused from P3 and a real Enter key press checks the answer. The browser tool's synthetic Enter (a keydown without a keypress) does not submit forms; a typed newline does.
- Two tabs: the second tab opened the same session at the next unanswered question. After answering it there, the first tab showed that question as already recorded (input disabled). Totals stayed at 3 answers with 3 recorded event IDs.
- Completion: 8 answers, 5 first time, 2 stars and 1 completed session; reloading the completion screen added nothing.
- Repair: 3 tricky questions (clue used, wrong answer, steps shown). Each showed the original question, the evidence and the worked steps; the wrong answer 21 for 20 received “one away”; each follow-up was a different question with the same strategy; repair added 3 attempts and no stars or completions.
- Phone 390×844 (touch emulation): a P1 keypad answer, question track, coach panel and the leave dialog (focus on “Keep playing”); the home Continue card with “Also unfinished”, P5 Standard/Foundation path cards and the next objective; no horizontal overflow. Tablet 768×1024 (home, and a resumed activity with the Welcome back banner) and 1024×768 (home): no horizontal overflow.
- A fresh tab loaded curriculum, school setup, sign in, register, sample dashboard, original lessons home, lesson `add-10`, Learn, My progress, a P6 Foundation activity and an unknown activity (friendly fallback) from their on-demand chunks with no console errors.
- Found and fixed during these checks: after an answer was recorded, the history-rebuilt copy of the session moved the player past the explanation; the player now keeps its own question and only takes in answers recorded elsewhere. An activity that was opened but not touched no longer appears under Continue.

**Publication.** Commit `3b99751` was pushed to `master` without force. GitHub Actions run `34608855399` succeeded: Jekyll build, style/content/layout audits, school API tests, app tests and build, Pages upload and deploy. The public page served `index-BeoJTN20.js` and `index-MYsrsWVi.css`, identical to the local build, and the personal site footer still links the app. On the public site (guest, fresh tab), question 1 was recorded; an unchecked `7` on question 2 was restored after a reload with “Welcome back… with your working restored”; the activity player loaded as its own chunk; the home led with “Continue where you left off · P3 · Equivalent-fraction bridge · Question 2 of 8”; the 21 P1 cards showed topic illustrations; there were no console errors. This check found that outline-only shapes in six illustration families (fraction bars, fraction addition, fraction area, tenths strip, area grid, hundred grid) were filled black, hiding the drawing. They now have no fill; the fix was republished in the follow-up commit (see `git log`).

**Not verified.** Signed-in pupil flows in a browser: no accounts were created and no passwords were typed on the live service in this session. Authenticated behaviour is covered by the API integration tests, the v2 compatibility check and the upload-queue and merge tests. Physical iPad/Safari, screen readers and 200% zoom were not tested; reduced motion was checked by reviewing the CSS (the new animations and transitions are disabled under `prefers-reduced-motion`). API v3 is not deployed, so unfinished working does not yet move between devices in production.

The handoff mixed working lesson screens with incompatible newer routing,
progress, question-player, and completion APIs. `npm run build` initially failed.
The engine's existing 313 tests passed before the repairs.

## Delivered behavior

- Home, Learn, Practice, Mixed Practice, Word Problems, and Progress are connected.
- All 16 original addition/subtraction lessons use five worked examples and five
  guided questions, with up to two extra questions after mistakes.
- Question players support numbers, missing numbers, bonds, comparisons,
  true/false, equation choices, and constructing/solving story equations.
- Local progress records accuracy, tries, hints, skill levels, lesson completion,
  stars, streaks, and badges. Existing V1 progress migrates into the current store.
- Active topics, mixed practice, story actions, equation tiles, number-bond games,
  and additive feedback stay within addition and subtraction.
- Existing expansion source is preserved for future use, but multiplication,
  division, and the unfinished game navigation are not exposed in the V1 app.
- Session generation retries constrained assignments instead of silently repeating
  a question. Requests with insufficient unique questions fail explicitly.
- Story transitions ignore repeated submissions while advancing. Dialogs trap
  keyboard focus, support Escape, and prevent background question shortcuts.

## Automated verification

`npm run build`: TypeScript and production build pass.

`npm test`: 321 tests across seven files pass. These include the original
mathematical invariants, story grammar/metadata, explanations, seeded generation,
and adaptation tests, plus:

- every visible route and malformed URL handling;
- every original lesson across 50 seeds: 8,000 generated questions;
- every active skill across all five requested levels;
- ten-question sessions for every active topic and level across ten seeds;
- additive-only story tiles/actions and mistake feedback;
- answer totals, revealed-answer accounting, badges, reload, and V1 migration.

## Observed browser checks

Using the actual local Vite app:

- Completed Addition within 10: intro, all five worked examples, five guided
  questions plus one adaptive question, completion, stars, and badges.
- Submitted an incorrect answer; observed a hint and correction without a reveal.
- Reloaded Progress: six answers, 83% first-try accuracy, three stars, and one
  completed lesson persisted.
- Built `1 + 4 = ?` from story tiles, then solved it with keyboard input.
- Inspected all four hints for `8 − ? = 3`, including crossed-out counters,
  then opened the worked solution. Verified Tab focus wrap and Escape dismissal.
- Inspected layouts at 1440×900, 1024×768, 768×1024, and 390×844.
  Fixed narrow story-details columns, an overlapping mobile control panel, and
  equation slots wrapping across two rows.

These are browser viewport checks, not a physical iPad/Safari test. Speech and
sound depend on the device's browser and installed voices; audio quality has
not been assessed. Test progress remains on the preview's localhost:5174 origin.

## Local preview and recovery

Run `npm run dev` and use the Local URL printed by Vite. The tested app uses
http://localhost:5174/ because port 5173 belongs to Claude's separate scratch copy.
The existing scratch server was left alone.

The original workspace handoff is preserved in `.recovery/claude-handoff.tar.gz`.

## P1–P6 and school release — 11 September 2026

This section supersedes the V1-only scope above. The current app is named
**Maths for SG Primary Schools** and has 198 playable activities: P1 21, P2 23,
P3 24, P4 27, P5 Standard 24, P6 Standard 24, P5 Foundation 33 and P6 Foundation 22.
The original guided lessons remain available.

Automated: `npm test` passes 330 tests in 10 files. Primary generation checks
200 seeds per activity (39,600 primary questions), independent evaluation of
numerical answer proofs, deterministic generation, unique choices, valid answer
formats, curriculum references, grade/track boundaries and separated progress.
`npm run build` passes TypeScript and production bundling. The approximately
606 kB JavaScript bundle triggers a size warning; route splitting is roadmap work.

Backend build and 3 integration tests pass, with assertions for tenant/class
isolation, mandatory password change, resets/session revocation, deactivation,
atomic roster import, replay/idempotence/concurrency, primary activity events,
Foundation boundaries, login throttling and isolated self-service registration.
Backend v2 was deployed successfully and its public health endpoint is available.

Browser-observed: the actual local app loads different year catalogs and separate
P6 Foundation activities; P2 fraction shading accepts the intended selection;
P6 fraction division accepts `10/9` for `5/9 ÷ 3/6` and explains the reciprocal
calculation. New mobile registration and gameplay screens were inspected at
390×844. A synthetic school was created through the actual registration UI
against the live API: school code, current academic year, empty real dashboard
and next setup instructions appeared immediately without manual approval.
Earlier live pupil sign-in required a password change; an original arithmetic
answer saved and was retrieved through a separate authenticated session.

These checks do not establish exhaustive pedagogical coverage, a physical
Safari/iPad test, full accessibility compliance or school-scale load capacity.
See NEXT-PHASE-PLAN.md for remaining work and acceptance criteria. In-flight
activity resume is explicitly not yet implemented.

Final live verification: GitHub Actions run `34585224897` succeeded for commit
`b46ff95190c00667a1b9bbb21ded973a905b2f88`, including personal-site audits,
backend tests, app tests/build and Pages deployment. Public HTML references the
renamed app and current asset hashes; the personal site's live footer contains
the side-project link. A pupil completed all four Shape safari questions in the
browser; a separate authenticated API login retrieved the four answer records,
one completed primary session and three stars (progress version 6). The synthetic
pupil was signed out and deactivated after testing.

## Connected lesson flow — 12 September 2026

The shared Learn player now names each stage's purpose and next action. Generated
lessons introduce the actual picture example first, retain that question during
its explanation, and announce the separate worked example before changing values.
The first method is taught in order; alternative methods are optional after it,
explain their purpose, and retain their individual step positions. Intermediate
arithmetic equations and inverse-check pictures remain attached to their steps.
Readiness clues use their own question's values. Picture-reading questions show
the required picture without treating it as extra help. Recaps annotate their
check pictures. Older unfinished drafts restart under the new lesson revision;
earned progress is retained.

Reviewed the objective-to-demonstration mapping for the 252 syllabus entries.
Added focused explanations where the inherited primer taught a different topic:
seconds, clock notation, table reading, factors/multiples, decimal place value and
conversions, like-fraction arithmetic, sharing as a fraction, money, measurement
units, shape construction, angle notation, ratios, and rectilinear perimeter.
Time-question reasoning and given-information pictures now use the actual unit.
This is a mapping review, not a claim that every lesson received a full teaching
quality review or a complete browser walkthrough.

Automated: 383 tests in 20 files pass; TypeScript and the production build pass.
Tests check stage purposes across the entire Learn catalog, picture/worked-example
connections, all model arithmetic, generated question validity, intermediate and
inverse equations, readiness clue alignment, and topic-specific regressions.
Decimal bar totals use a small numerical tolerance for floating-point arithmetic.

Browser-observed locally: completed all 11 stages of p1s-as-07, including worked
answers, explanation choices, practice, story problems, inverse checks, mastery
and the completion screen. Checked optional method switching/resume and the
explicit 13 − 5 to 17 − 3 transition. Sampled P2 fractions, P3 time, P4 decimals,
P5 triangle area and P6 ratio sequences. Rechecked the corrected P3 seconds
sequence through its new worked example, including its units and reasoning.
Inspected mobile layouts at 390 px and 320 px, including a complete grid-copy
picture sequence. These are browser viewport checks, not a physical iPhone test.
