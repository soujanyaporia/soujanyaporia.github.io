# Current checkpoint — exam-style papers and reusable templates, 5 November 2026

This section supersedes earlier counts. The six-paper batch is live at `03504bc9f453cde18cf88b341140c760773a89ce` (workflow `41860431766`, build/deploy success). The next exam-style release is validated and being published; `.generated/release-status.json` records the actual live commit. Source remains `/Users/poriasoujanya/Documents/Math for Primary`; release mirror remains `../GitHub/singapore-primary-maths-release/_apps/math-for-primary`.

**Latest user preference:** practice papers should follow exam-paper presentation: concise text and answer spaces, figures only where mathematically necessary (geometry, graphs, rulers, clocks, nets, counting and related models). Do not add decorative artwork for word problems. Lessons may retain richer teaching visuals. `PaperMaterials.tsx` renders numerical story cards as plain labelled facts and timelines without decorative icons; all original givens/captions/intervals remain. Counted objects and mathematical figures remain. Printing uses the same simplified materials. Preserve the single `PaperActions` finish/check flow.

**Current source inventory:** 398 activities, 270 guided lessons, 192 rich-paper task configurations. The latest pass adds 20 configurations: batch2 Early5/Upper4/Rounding2 grade placements plus batch3 Early4/Upper5. These are not 20 globally unique patterns. New renderers exist only for necessary ruler, graph and geometric layouts; batch3 reuses existing renderers and arithmetic generators. `paperImports/batch2Catalog.ts` currently registers both batches, with b2e/b2u/b2r/b3e/b3u parameter prefixes. `questions.ts`, `Picture.tsx`, `generate.ts` and the independent bank-audit dispatcher include them. Paper/daily/generator versions are **5**. The API shared copy is synced.

**Validation:** 862 tests in76files, frontend build plus289SEO/redirect checks passed. Separate bank audit:50,000 samples,24,724 distinct visible identities,25,276 repeated draws,zero failures across192 configurations. Integration audit:19,200 generated response checks,1,600 daily plans/9,600 questions,288 complete paper save/resume checks,206 grouping print/feedback checks,zero failures. Nine API tests passed. API Sites version8 deployed successfully, source `c0d3f53cd15d5ccbb62adfbba1a1783a84a1f4d0`, deployment `appgdep_6aeb57c695948191b49551b184e6f96c`. Contract version3 remains distinct from Sites version8. Local browser checked the text-only P5 rate paper and P2 subtraction-card builder; all three givens were visible and alternate873−761=112 was accepted. A pre-integration freeEntry flag that hid the cards was removed and covered by an actual renderer regression.

**Source coverage remains incomplete:** all2,406PDFs and57,336pages are local/searchable/losslessly staged. Six complete paper inventories plus22 additional partially reviewed papers.162 manually reviewed source units:159 complete, mapped and independently verified;3 source ambiguities remain. Four papers strictly fully covered;2,402 not strictly fully covered.2,400 paper sets still await full conversion, including partly reviewed papers. Global unique-pattern count is unknown. `.generated/reuse-release-accounting.json` and external `coverage/summary.json` own these counts. `scripts/corpus-partial-review-import.py` registers per-unit evidence without superseding OCR regions or granting whole-paper inventory; numerical operands may change, but mathematical constraints and essential givens must remain. Record meaningful response-format differences; do not mistake changed operands for a new pattern.

**Next parallel batch:** external `structure/3745570f8c47568c0effca712f45db5d234b50151012df46fc30d3d80910ad61/next120-review/` contains120fresh candidates,20perlevel,35papers/152pagecontexts, excluding reviewed units. Agents own P1–P2/P3–P4/P5–P6 bundles. Their `batch4Early*`, `batch4Middle*`, `batch4Upper*` files are work in progress and EXCLUDED from this release until independently verified and integrated. User wants fast reusable templates across papers, not custom artwork or a separate one-off module for every question. No public source PDFs or unreviewed OCR questions.

---

# Current checkpoint — six-paper adaptation batch, 4 November 2026

This section supersedes older checkpoints below. Source remains `/Users/poriasoujanya/Documents/Math for Primary`; publish through `../GitHub/singapore-primary-maths-release/_apps/math-for-primary`. The single Check my answers fix is LIVE at `1b4bd2faf2936e1d7ce263213d200b92def6eb7e` (run `41858541812` succeeded); browser verification completed all six responses and one click marked 6/6 correct. The six-paper content batch below is LIVE at `03504bc9f453cde18cf88b341140c760773a89ce` (run `41860431766`, build and deploy succeeded); inspect `.generated/release-status.json` for actual deployment IDs rather than inferring publication from this file.

Current catalogue: **378 activities, 270 guided lessons, 172 rich-paper task configurations**. Task configurations are response variants, not globally unique mathematical strategies. P1–P6 each have one completely inventoried source paper: 130 original response tasks in total. The corpus ledger credits 127 complete source units; P1 Q21 has two ambiguous units and P3 Q13 has one missing-diagram unit. These remain uncredited although the app has clarified original adaptations. Strict paper coverage: **4/2,406 fully covered; 2,402 not fully covered**, of which two have the three source exceptions above. **2,400 papers have not yet been converted as complete paper sets.** Never equate downloading, extraction, candidate clustering or generated variants with verified source coverage.

Validation of this batch: **833 tests in 70 files**, 52,400 independently solved variants across the six source-paper modules, zero failures in a separate 50,000-sample bank audit (22,439 distinct visible questions, 27,561 repeated draws), 17,200 response/save checks, all 1,600 daily plans (9,600 questions), 288 complete paper save/resume checks and 206 grouping print/feedback checks. Build and all 289 SEO/redirect pages pass. Server shared code was synced and all 9 API tests passed; Sites API version 7 is deployed at source `2fb1b40f000f90928b0b5fdadb84cbb30d8707b3`, deployment `appgdep_6aeb51d0ccc48191945d681c9be99f95`. API contract version 3 is distinct from Sites version 7.

## Integration contracts

- `paperImports/catalog.ts` preserves source IDs, parts, page and canonical within-paper structure IDs. All P1–P6 adapters route through `paperImports/questions.ts`; picture types through `generate.ts` and `Picture.tsx`. `scripts/audit-paper-bank.test.ts` independently dispatches visible-givens solvers.
- `answerFormat.ts`, `NumberSentence.tsx`, `groupingAnswer.ts`, `GroupingBuilder.tsx`, `answerDisplay.ts` support valid alternate equations, touch grouping with any valid partition, number names and symbolic pi. Numeric groups must not leak canonical group JSON into print/feedback. Fraction-only and improper/mixed format requirements are part of grading and session identity.
- Practice-paper format, generator and daily-plan versions are **4**. The server shared catalogue and validators must match. `dailyPlan.ts` uses a deterministic 200-day schedule to prevent newly added tasks from being starved. Paper selection spreads canonical structures before related subparts. Old incompatible unfinished sessions must never silently attach answers to changed questions.
- `PaperActions` is the only unmarked-paper navigation/finish component. The final question has one Check my answers action; incomplete confirmation replaces all other finish controls; fully answered papers mark immediately. Keep the focused regression tests.
- Source PDFs/OCR stay outside the public app. The local library has all 2,406 papers, 57,336 pages, 116,085 raw candidate regions. `scripts/corpus-structure.py` preserves exact raw bytes, page geometry and diagram references in an external staging SQLite. Its deep roundtrip audit passed with zero integrity issues; inferred subparts/clusters remain explicitly unverified. `scripts/corpus-structure-README.md` documents the batch pipeline. Source coverage remains in the separate append-only ledger.
- Preserve Voice A (`af_heart`), 270 walkthroughs/674 clips, short prompts, essential visible givens, original diagrams and `/singapore-primary-maths/` URLs. No source PDF downloads, robotic voice fallback, or complete MOE coverage claim.

## Next work

User prioritizes speed through reusable patterns across papers, not bespoke implementation per paper. Two agents are reviewing the next 60 candidates (30 P1–P3, 30 P4–P6) and adding reusable original generators in `batch2Early*` / `batch2Upper*`; these unfinished modules are EXCLUDED from this six-paper release. Another agent is preparing conservative corpus-to-template reuse proposals. Complete diagram/givens review and independent solutions before assigning coverage. Current global uniqueness count is unknown.

---

# Current source checkpoint — 4 November 2026, audited content release

This section supersedes older checkpoints below. Authoritative source: `/Users/poriasoujanya/Documents/Math for Primary`; do not resume the old Claude scratch copy. The app-improvement release is live at frontend commit `c12b865195dd651f6f627e099f0c2b3945bb0511`; GitHub workflow `41846967815` completed build and deployment successfully. Final source suite:706 tests in61files; API9 tests;289 page/redirect checks. Verify changeable deployment state when resuming; detailed checkpoint is `.generated/release-status.json`. The next phase is systematic paper-pattern adaptation; new unimported pilot files are not part of this release.

The school API is deployed as **Sites version 6**, source `5f972b1d061d1cd297be6e8f2bb19962f8f6c4ce`, including the 248-activity catalogue and separate lesson-answer attribution. `/health` reports **API contract version 3**, which is distinct from Sites deployment numbering. New lesson answers accumulate under `learn.<lessonId>`; existing history, totals, XP and lesson completion remain. Historical mixed activity totals are not destructively reconstructed. All 96 fallback practice links are labelled “Related practice”; 174 match the lesson objectives.

## Verified current-source inventory

| Path | Activities | Guided lessons | Rich paper families |
|---|---:|---:|---:|
| P1 Standard | 31 | 32 | 7 |
| P2 Standard | 31 | 34 | 7 |
| P3 Standard | 32 | 31 | 7 |
| P4 Standard | 35 | 41 | 7 |
| P5 Standard | 32 | 35 | 7 |
| P6 Standard | 32 | 26 | 7 |
| P5 Foundation | 33 | 49 | 0 |
| P6 Foundation | 22 | 22 | 0 |
| Total | 248 | 270 | 42 |

These counts were loaded from `ACTIVITIES`, `LESSONS` and `PAPER_PATTERNS`, not inferred from documentation. The 1,600 daily addresses and on-demand papers are separate from the activity count. Foundation daily/paper sets use their actual existing catalogue; zero in the final column means no Standard-rich family was relabelled as Foundation. The 42 families are authored templates and contexts, **not 42 distinct mathematical strategies** or exhaustive syllabus coverage.

`npm run test:narration-assets` passes for all **270 walkthroughs, 674 approved Voice A (`af_heart`) clips, 76.5 MiB**. Preserve the user's selected voice, timed picture cues and captions. Dynamic questions without a reviewed recording remain caption-only. No robotic device-voice fallback or browser speech-model download.

## New content and contracts to preserve

- `corpusPaperCatalog.ts` adds six original source-informed families, one per Standard level, with exact source-page references. `corpusPaperQuestions.ts` implements internal number-pattern gaps, equal-whole unit-fraction comparison, litres-to-millilitres equal pours, uniform inside-path area, greatest common-factor gift bags and equilateral-triangle/straight-line angles. P5 gift bags explicitly review P4 factors; P6 angles explicitly review P5 geometry. `CorpusDiagram.tsx` renders faithful ribbon, rectangular-frame and equilateral-triangle geometry. Essential givens belong in visible context, not tiny captions or answer-bearing aria labels.
- The retained bank audit at `audits/paper-bank-2026-11-04.json` records **50,000 generated samples, 17,581 distinct visible-question identities, 32,419 repeat draws and zero failures**, across all 42 families. Reproduce with `npm run test:paper-bank`; output is `.generated/50k-paper-audit.json`. It is not 50,000 unique/authored questions or teacher validation. New-family solver tests read visible givens; gift-bag maximality is independently checked by enumeration rather than trusting its literal proof field.
- Paper format version, paper generator version and daily-plan version are **3**. Keep `practicePaper.ts`, `sessionQuestions.ts`, `dailyPlan.ts`, saved-answer fingerprints and the API's shared copies consistent. Six-question mixes select six distinct families from the seven available; 18-question mixed papers reach all seven. Small topic domains advertise only supported capacities. Never reattach old answers to changed generated content.
- `teach/lessons/columnLessons.ts` and pure `columnLessonMeta.ts` add `p1-written-addition`, `p1-written-subtraction`, `p2-written-addition`, and `p2-written-subtraction`. `withColumnLessons` inserts the first pair after `p1s-as-05` and the second pair after `p2s-as-01`, in both full and lightweight catalogues. P1 subtraction links to the new actual within-100 activity `p1s-subtract-large-n16`.
- The four lessons use `tools/columnArithmetic.ts` for deterministic place-value snapshots and `ColumnCalculation.tsx` (named export `ColumnArithmetic`) for the renderer. Preserve the distinct filename casing for macOS/TypeScript. Carrying, borrowing and exchanges across zero show real digit changes. Checkpoints hide only the active answer digit, retain earlier work, and omit answer-bearing narration/equations. Whole-number readiness boosters use counters, not the decimal `place` tool. Each lesson has hands-on controls, grounded reflection, five mastery facets with recovery, and three two-step challenges. The preserved revision is `catalogue-depth-written-columns-2026-11-04-v1`.

The previous optional four-addend lesson remains immediately after `p1s-as-06`. Existing usability fixes remain: `Question.context` participates in narration/printing/fingerprints; P3 transfer shows before → give → after and names both compared children; fraction grids have complete equal cells; angle diagrams match their numerical givens; challenge evidence stays separate from mastery stars; session-cache callbacks and unsaved-draft fallback must remain stable.

## Evidence, source archive and next release steps

The latest full frontend run passed **697 tests in 59 files**, and the source build passed **289-page SEO/redirect checks** before the final reducer correction. The column/support/catalogue/quality checks passed 43 focused tests. Root owns the final validation and deployment entries in `QA.md`; rerun relevant checks after the reducer change and record the final released SHAs. Do not imply this pending frontend pass is already live.

The external archive at `../Singapore Maths Paper Library` contains **2,406 downloaded PDFs, 57,336 extracted pages and 116,085 unverified candidate regions**. This is searchable OCR plus bounded named-page visual reviews, not a review of all papers. `.generated/corpus-pattern-review.json` records a broad machine screen and seven visually inspected supplementary pages; `.generated/corpus-independent-review.json` records a separate 12,000-sample check of the six new originals. Verify source diagrams before adapting more candidates; OCR has lost fractions and merged neighbouring questions. Never publish source scans or unreviewed OCR as app questions.

Publish through the isolated `../GitHub/singapore-primary-maths-release` worktree and `_apps/math-for-primary` mirror, preserving `/singapore-primary-maths/`, the old-path redirects and the homepage **Fun project** link. Exclude `.generated`, `.tools`, private files, credentials, databases, dependencies and nested Git metadata. `README.md` and `PRACTICE-DESIGN.md` describe the source state; `SYLLABUS-AUDIT.md` and `QA.md` are maintained separately in this pass. Qualified-teacher review, child testing, full official-subpoint tracing and broader structured assessment remain open; do not turn catalogue or audit counts into learning-outcome claims.

---

# Current usability continuation — 4 November 2026, evening

This section supersedes the earlier UI descriptions below. Home/nav expose Daily practice, Create a paper and Learn. Paper setup opens directly with Continue separate; question navigation is compact and comes before the drawing pad. Essential givens are Question.context and are included in fingerprints, speech, printed questions and solutions. The user-provided badge-transfer example now has an explicit comparison and before/give/after picture.

SessionProvider uses stable cache callbacks to prevent a render/pull loop. See sessionStore.ts createSessionCache, sessionDraft.ts, playerFlow.test.ts and PracticePapers.test.ts. Changed paper semantics use version 2; incompatible saved work is not silently regraded. LessonPlayer help has a direct worked-answer route and nextUnansweredQuestion wraps to earlier work. Assisted answers remain separate evidence.

266 lessons now include p1-add-four-small-numbers, inserted after p1s-as-06 in both full and lightweight catalogues. Its independent generator/renderer tests and original four-group teaching sequence live under teach/lessons/fourAddends*. Approved Voice A narration covers all 266 walkthroughs (650 clips); do not replace it. Source corpus is fully downloaded/extracted: 2,406 files, 57,336 pages, 116,085 unverified candidate regions. Use original pages before implementing any candidate.

Publication and validation status for this pass is kept in .generated/release-status.json and QA.md; earlier commit IDs below describe earlier releases.

---

# Current continuation — daily practice and illustrated papers, 4 November 2026

This section supersedes historical deployment notes below. The frontend release `990dbb72fe09e41a115da02009310e40965fa25c` is live. GitHub Actions run `41819944126` passed both build and deployment. The school API **is deployed**, Sites version 4, source `6880262d016fa6a603d6731d619d96cee684ef7f`, including the new daily/paper catalogue. Preserve its existing public access and D1 data.

The user wants Daily Dose-style practice on a computer and authentic Singapore school question types, with less text and more useful illustration. `PRACTICE-DESIGN.md` describes the original bank, official-source comparison and limits. Do not confuse 2,406 source papers with 2,406 questions, OCR candidates with verified content, or 50,000 generated samples with 50,000 independently authored questions. The local reference archive and OCR jobs are outside this source tree at `../Singapore Maths Paper Library`; never copy them into the deployed site.

`src/primary/dailyPlan.ts` owns 200-day pacing for eight paths, six questions/day, with a review every fifth day. Daily activities are lazy catalogue addresses, not 1,600 browse cards. Source activity IDs drive relevant lesson help and mistake repair. `paperCatalog.ts` is pure metadata used by the API. `paperQuestions.ts`/`paperP3.ts` generate 36 original diagram-led families. `practicePaper.ts` produces fresh mixed/topic sets, capacity-safe sizes, versioned codes, no repeats and worked steps. `paperAttempt.ts` validates device-local saved answers; the tiny store module allows account/guest cleanup without eagerly loading question generation. `PracticePapers.tsx` provides attempting, final marking, reviewing and printing. Daily sessions retain the existing account sync; generated papers are local only.

The home now leads with daily practice. Learn and Missions show a manageable selection before expanding. Watch uses one picture card, compact playback and optional help; Voice A recordings remain. P1/P2 worked tables were reduced from 21 to 6 in the measured seed, and adult focus prompts replaced. Reflection asks one thing at a time. Challenge completion explicitly distinguishes independent success from help/revealed answers. Distinct-question wrapping now applies after actual review/challenge stage selection. The shared lesson question revision is `+q-2026-11-04-visual2` so earlier saved answers cannot attach to changed questions.

Publication still uses the isolated `../GitHub/singapore-primary-maths-release` worktree and `_apps/math-for-primary` mirror, excluding `.generated`, `.tools`, private files, secrets, dependencies, runtime stores and nested Git metadata. Preserve the homepage **Fun project** link and `/singapore-primary-maths/` base. No new backend, no full-book copying, no robotic voice fallback.

---

# Current handoff — 4 November 2026 focus layout, challenge problems, no repeats

Lesson screens follow "one screen, one job": `LessonPlayer.tsx` renders a slim `.focus-bar`, a `.focus-phase` tag, one stage card and one sticky `.stage-nav`; the sidebar and `lesson-bridge` are gone. Explain and worked stages hide the lesson's Next until complete, so their in-card navigation is the only way forward. `ItemCard` has a single "Need help?" entry; the clue and `PictureKey` live inside its menu. Keep new controls behind that entry rather than beside the question.

`depth/catalogue/challenges.ts` holds 77 multi-step problem kinds; `catalog.ts` appends one challenge stage (practice with `challenge:true`) to every lesson, always last. `LessonPlayer.stagesFor` drops it in learn and review modes and plays mastery then challenge in challenge mode. `distinct.ts` re-draws repeated questions per attempt, keyed on text, picture and answer; it relies on the player's `seed + k × 1009` stage seeding and on the challenge stage being last. Revisions carry `+q-2026-11-04`. Publishing must exclude `.tools/` (1.9 GB of TTS models), `.generated/` and `dist-legacy/`.

---

# Current handoff — 4 November 2026 duplication and consistency pass

`build/warmUp.ts` generates each lesson's readiness question from `p.skill.prerequisites[0]`, using that objective's own family spec (the specs are exported from `build/families/*`); it is applied in `build/index.ts`, so the ten hand-matched reference lessons in `depth/referenceLessons.ts` still override it. `depth/catalogue/pitfalls.ts` holds the per-objective misconception, matched by topic code then objective regex, with the family text as fallback in `sequence.ts`. `gen.ts` `numeral()` is the house rule for numbers in prose: four digits plain, commas from five.

Careful: several builders branch on objective text (`/10,? 100/`, `/tens and ones/`). Changing a title in `school/curriculum.ts` can silently move a lesson to a different branch — snapshot every lesson's stages before and after, as the 4 November title edit did. Still repetitive and worth a pass: explanation frames (53.1%), hooks (47.2%), and 55 notice questions shared by more than one objective.

---

# Current handoff — 19 September 2026 independent-learning support and review

Question help lives in `LessonPlayer.tsx` (`ItemCard`) and `LearningSupport.tsx` (`PictureKey`, `ExampleReplay`, `reflectionReplay`). `learningUi.ts` `supportRecommendation` chooses the next help route. `modelReading.ts` explains each model's notation without revealing hidden values. `depth/independence.ts` adds the “Choose a first step, then try it” bridge to the ten reference lessons (revision `…-v6`; the whitelist is in `flow.test.ts`). The review in QA.md rates the app 8.0/10 on average. Its top gaps: 186 generic upper-primary warm-ups, 128 table-only worked examples, missing time misconceptions (13:95, 15:45, 14:155, 15:35), and the bridge in only 10 lessons. Run heavy tests with one worker when the host is loaded.

---

# Current handoff — 19 September 2026 teaching quality and honest checks

Latest authority is this folder, not a Claude scratch workspace. Preserve the expanded catalogue and the earlier UI/activity work. This release keeps 265 lessons. `src/teach/depth/referenceLessons.ts` replaces seven sequences, which together with the previous three depth lessons make ten reference lessons across P1–P6. `depth/quality.ts` adds one grounded `reflect` stage to every lesson, before independent practice (or before the check where needed). Reflection is self-assessed, never auto-scored; optional typed explanations are not persisted or sent.

`progress.ts` now keeps optional per-question `work` on `LessonAttempt`. ItemCard writes draft/evidence state synchronously; mistakes/help must never disappear when moving away or reloading. Three stars require every assessed item correct first try without optional help; two stars require 60% eventually correct. Weak latest checks/reviews return the due date to one day. Historical earned stars remain. Completion lists independent vs corrected/assisted evidence, and a weak challenge links into teaching.

`Tool.covered` on a number bond indicates the part taken away; visual labels/captions and large movement controls support it. Algebra pans now use content-driven height; ratio rows use a shared grid column size to preserve the unit comparison at narrow widths. Keep these mathematical and responsive invariants. Adult guides are public, use TOOL_LABEL names and include a listening/transfer/next-day rubric. Lesson revisions end in v5, so incompatible unfinished sequences restart with a message; progress events are retained.

All 431 frontend checks in 27 files passed with one worker and unchanged timeouts. The final grade-appropriate prerequisite refinement adds a ninth quality check; its 34 focused checks pass. The main publication `a0f14dd` passed GitHub Actions run `35421934021`; the prerequisite refinement follows it. See the first QA.md section for actual browser journeys, including wrong-answer persistence through reloads, reflection at 320 px, a five-question algebra check yielding two stars after one correction, and the repaired balance/ratio models. Build passes; the Learn bundle still warns at roughly 710 kB. TEACHING-QUALITY.md separates implemented work from the teacher/child evidence still needed. Do not claim these tests prove pedagogical effectiveness or that all 265 lessons now have the depth of the ten reference sequences.

---

# Latest continuation — 19 September 2026 UI and teaching support

Preserve the 18–19 September content/activity expansion. This pass adds searchable grade/topic lesson browsing (`LearnIndex.tsx`, `learningUi.ts`), compact lesson orientation and numbered question navigation. Worked pauses retain wrong input, use targeted misconception feedback and hints, distinguish revealed answers from solved answers, and keep hidden equations out of read-aloud. `RevealStep.ask` now accepts `hint`, `wrong`, `exact`, and `unit`; generated worked examples receive support through `coachWorked` in `build/sequence.ts` only when the prompt/answer match the original example.

`fraction-pieces` now supports individual toggles (shared pure transition in `tools/geometry.ts` and `moves.ts`). Single-row fraction investigations use it; comparison walls still use contiguous strips. The P2 exemplar accepts any three of four pieces; unfamiliar fraction exercises vary arrangements. Revisions: `catalogue-depth-2026-09-19-v4` and `depth-2026-09-19-v4`. Older incompatible unfinished attempts restart; earned progress remains.

See the first section of QA.md for the 423-test validation and actual browser checks. Full-catalogue tests timed out under heavy host load but passed in isolated reruns with unchanged time limits. Do not weaken those tests. Qualified-teacher review, deeper open investigations and lower initial Learn download size remain useful next work.

---

# Current handoff — 19 September 2026 hands-on activities

Every lesson has an explore stage. `sequence.ts` uses `investigation(p,guide) ?? topicExplore(p,spec.explore) ?? lessonActivity(p)`; `src/teach/depth/catalogue/activities.ts` holds the 139 objective-specific tasks, keyed by lesson id. Tool controls are modelled in `tools/moves.ts` and `geometryMoves` (number inputs and sliders set any value; the clock's hour, minute and am/pm controls). Line goals must need six presses or fewer, because the reachability search stops at 40,000 states. Lesson revision: `catalogue-depth-2026-09-19-v3` (add any new revision to the whitelist in `flow.test.ts`). The heavy whole-catalogue tests time out when the machine is overloaded; run a file on its own before assuming a real failure.

---

# Current handoff — 18 September 2026 question-support rebuild

Help for generated questions is built in `src/teach/depth/catalogue/`: `facts.ts` classifies a question from its family template, `mistakes.ts` and `strategies.ts` supply situation-specific misconceptions and methods, and `assess.ts` builds every facet (including easier recovery questions, error analysis, work-backwards and bar-model items). `sequence.ts` calls `itemFactory`; the old `supportFor` is gone. When a family's question wording changes, update the matching rule in `facts.ts` or its questions lose their targeted feedback (they fall back safely, but silently). Bump `result.revision` in `sequence.ts` whenever generated item content changes, and add the new value to the whitelist in `flow.test.ts`. Round two (same day) added model-dependent visual prompts (`modelReading` in `questions.ts`), story contexts in the families, more misconceptions, varied fraction numerators, objective-matched activities (`topicExplore` in `investigations.ts`) and gentle Foundation practice (`itemFactory(...).gen(mode, gentle)`). Evidence and limits are in the first two sections of QA.md.

---

# Current handoff — 12 September 2026 visual revision

The source in this folder now includes the syllabus expansion and the user-requested Foundations-style teaching rework. Do not resume the old paragraph-and-table expansion plan. Read the current README and the first section of QA.md before editing.

- 252 mapped objectives each have a dedicated sequence, plus 13 retained exemplar lessons.
- Core teaching authoring: `src/teach/build/guides.ts`, `focusedGuides.ts`, and family question builders. Keep demonstrations short, concrete and mathematically faithful. Do not use a coverage count as proof of teaching quality.
- `src/teach/tools/LessonScene.tsx` draws the new visual demonstrations. `VisualExplanation` in LessonPlayer displays one picture and one short explanation at a time. Early arithmetic reuses the Foundations explanation engine.
- The site title is now a masthead above the menu.
- Source folder remains authoritative. Publishing worktree and source mirror are described below. API v3 is still pending separately.

---

# Claude Code continuation handoff

Updated 12 September 2026, Singapore time. App: **Maths for SG Primary Schools**.

## Where things stand

Release 1 (“Returning feels purposeful”) and the first teaching release are implemented in this folder. README.md summarises the features, SCHOOL-PLATFORM.md the boundaries and data handling, QA.md the evidence and NEXT-PHASE-PLAN.md the roadmap.

- Every activity is a resumable session (schema 1): session ID, activity ID, generator version, seed, per-question fingerprints, question on screen, scored results and an unscored draft. Reload restores the exact question and working; changed generators get an honest restart. Guests keep sessions per browser; staff and pupils have separate local scopes.
- Answers and completions use event IDs derived from session and position, and the shared reducer ignores repeats, so retries, refreshes, tabs and devices cannot add answers, completions or stars twice.
- Pupils' answers carry their session and position in the question key, so another signed-in device continues from the first unanswered question with the deployed API v2.
- The home leads with Continue only for real unfinished work, then P1–P6 (P5/P6 Standard/Foundation path cards), a Learn card, the next objective and recent activities; mistake repair explains the original error and asks a near-transfer question; route bundles are split with loading, offline and error screens.
- **`src/teach/` is the teaching engine.** Lessons are data (`model.ts`, `lessons/p1.ts`…`p6.ts`), rendered by one generic player (`LessonPlayer.tsx`) with 13 interactive manipulatives (`tools/`). 13 lessons, 169 stages, about 150 minutes, covering the six exemplar topics. Lesson answers are recorded as ordinary `primary_answer` events against the lesson's practice activity, and completion as a `session` event with `lessonId = learn.<id>`, so mastery, spaced review and derived rewards work on the deployed v2 API with no new event kinds. Mastery spans seven facets; reviews fall due after 1, 4, 10 and 30 days; XP, Gems, level and streak are derived from recorded learning (`rewards.ts`), not stored separately.
- **AI statement and privacy.** `src/school/AboutScreen.tsx` (`#/about`) carries the AI-generated-content statement and the PDPA-oriented privacy statement, and hosts the guest **learning passport** (`src/primary/passport.ts`): progress, unfinished sessions and lesson attempts packed into a `MFP1-` code (deflate-raw + base64url) that the guest keeps. Nothing is uploaded; the same page removes all guest data from the browser.

**API v3 is built and tested but not deployed.** `school-api` commit `6333b79` adds `GET /api/sessions`, `POST /api/sessions/:activityId` (compare-and-swap revisions), migration `0001_primary_sessions`, validation of `sessionId`/`position` and `/health` version 3. The Sites connector that deployed v2 (`mcp__codex_apps__sites`: `sites.save_site_version`, `sites.deploy_site_version`, `sites.get_deployment_status`) exists only in Codex and was not available to Claude Code. No other backend was created. The published frontend was verified against the v2 build; it treats a 404 from `/api/sessions` as “keep drafts on this device” and uses v3 automatically once deployed.

## Next task

1. Deploy API v3 to the existing Sites project (project ID in `school-api/.openai/hosting.json`): in `school-api`, run `node sync-shared.mjs && npm run build && npm test`, confirm a clean tree at `6333b79` or a later commit, save a Sites version from that SHA, deploy it (both migrations are copied to `dist/.openai/drizzle`), then check `/health` reports version 3 with `primary-sessions-1`. Verify with a synthetic pupil that a typed draft appears on a second signed-in device, then deactivate that pupil.
2. Extend Learn across the curriculum. 25 of 243 mapped objectives have a lesson; P5/P6 Foundation have none and should come first, because those pupils need the teaching most. Add lessons by writing data in `src/teach/lessons/`, not new components: `lessons.test.ts` enforces real objective IDs, resolvable prerequisites, an existing activity, the required stage sequence, at least five distinct mastery facets, deterministic and solvable generated items, arithmetically consistent tool states, and no keyword rules. Reuse the existing manipulatives; add a new one to `tools/` with geometry helpers and tests only when a topic genuinely needs it.
3. Teacher-assignable lessons need the account API (a new endpoint plus a capability flag). Do not fake it in the UI: the teacher guide is a preview, and the app must not display assignments that cannot be stored.
4. Keep the Release 1 invariants: stable activity IDs, deterministic event IDs, per-scope storage and the generator version map in `src/primary/sessionQuestions.ts` (bump a kind's version whenever its questions change for an existing seed).

## Current source and deployment locations

- Authoritative app: `/Users/poriasoujanya/Documents/Math for Primary` (not itself a Git repository). Do not use the old scratch workspace under `~/Library/Application Support/Claude/scratch-workspaces/` (its Vite server is on port 5173).
- Local preview: `http://localhost:5174/math-for-primary/` (`.claude/launch.json`, `npm run dev -- --port 5174`).
- Public app: `https://soujanyaporia.github.io/math-for-primary/`. Publishing worktree: `/Users/poriasoujanya/Documents/GitHub/soujanya-math-publish`, branch `math-for-primary-school-platform` tracking `origin/master`; source mirror `_apps/math-for-primary/`. The original checkout `/Users/poriasoujanya/Documents/GitHub/soujanyaporia.github.io` may be behind; do not reset it or discard user changes.
- GitHub remote: `https://github.com/soujanyaporia/soujanyaporia.github.io.git`, published branch `master`. The workflow builds the personal Jekyll site, runs its audits, tests the API, tests/builds the app and copies `dist/` into `_site/math-for-primary/`.
- API source: `school-api/` with its own local Git repository (no remote). API: `https://math-for-primary-school-api.soujanya-poria.chatgpt.site`, deployed from `1e92699` (v2).

## Validation and source handling

Frontend: `npm test` (362 tests in 17 files, including 200 generated samples per activity and the lesson validation suite) and `npm run build`. Backend: in `school-api/`, `node sync-shared.mjs`, `npm run build`, `npm test` (7 integration tests; Node 22+ for `node:sqlite`). Always resynchronise `school-api/shared` before a backend build; the worker imports the shared reducer and session validation.

Browser checks can use guest mode freely. Do not type real credentials; for signed-in checks use a synthetic school/pupil created for the test and deactivate it afterwards.

Two browser-tool traps cost time in this session, both tool artefacts rather than app faults. Chromium's synthetic Enter key (a keydown without a keypress) does not submit forms; type a newline instead. And clicks are delivered in CSS pixels at the position current **when the click runs**: a `ref` resolved before the page scrolled, or a stale screenshot, silently lands somewhere else, and with the mobile/touch viewport emulation active no click reached the page at all. Clear the emulation (`resize_window` preset `desktop`), read each button's live centre with `getBoundingClientRect()`, then click, and confirm the effect through the DOM rather than assuming the click landed.

Sync source to the publishing worktree with explicit exclusions: `node_modules/`, `dist/`, `.private/`, `.recovery/`, `.git/` (including `school-api/.git`), `.claude/`, `.env*`, `*.sqlite*`, `.wrangler/`, logs and archives. Run `rsync -an --delete --itemize-changes` first and read the list before syncing for real. Both app and backend `package-lock.json` files are tracked even though the personal repo has a broad ignore rule. Jekyll excludes `_apps`.

`.private/` contains local provisioning/test credentials. Do not print it, put it in a prompt, or copy it into the source mirror. Do not email teachers or pupils. Preserve the personal site's footer side-project link and its shared typography and visual contract.

## Publication evidence

See the end of QA.md for the publishing commit, GitHub Actions run and public-site checks of this release. Inspect current remote status before the next push; do not treat a SHA recorded here as the required current revision.
