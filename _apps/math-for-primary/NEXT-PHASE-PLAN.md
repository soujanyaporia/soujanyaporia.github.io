# Maths for SG Primary Schools: product and engineering roadmap

Prepared 11 September 2026. Continue the current application; do not restart it.

## Starting point and product direction

The current release has 198 activities across eight year/track catalogs, a grade-first home, original guided arithmetic lessons, school accounts, self-service setup, cloud progress and class activity reports. These are useful foundations. They are not yet the complete adaptive school platform described in the brief.

The next improvement should be depth and continuity: a pupil returns to a meaningful next action, learns with a model, understands a mistake and sees a reason to return. A teacher should be able to assign that same learning and inspect the evidence. Adding more tiles without those connections would not solve the remaining product problems.

Keep the public name **Maths for SG Primary Schools** and the stable URL `/math-for-primary/`. Keep school administration behind the school navigation. Keep guest play immediate. Keep the personal website link small and in the footer.

## Release 1 — Returning feels purposeful (implemented September 2026; API v3 deployment pending)

Status, 11 September 2026: items 1–5 below are implemented and published with the frontend; evidence is in QA.md. Still open: deploy API v3 (the sessions endpoint, committed as `school-api` `6333b79`) so unfinished working and not-yet-answered activities follow pupils between devices; schedule a later revisit of repaired questions once review exists (Release 4); test on a physical iPad/Safari; observe pupils using Continue and repair before refining them.

1. **Resume an unfinished activity.** Persist a versioned session ID, activity ID, generator version, seed, question order, current position, completed results and question draft. Recover exactly after reload; authenticated sessions also recover on a second device. Explicitly distinguish a saved draft from a scored answer. Do not award duplicate answers/stars after retry, refresh or simultaneous tabs. Old sessions with incompatible generators need an honest recovery message and safe restart.
2. **Make the home a learning home.** Keep P1–P6 selection prominent, but lead with Continue when there is a real unfinished session. Show a compact recent discovery and a clear next objective. Give first-time guests a short, optional explanation of how to play. Do not render fake Teacher Tasks or invented mastery percentages.
3. **Repair an actual mistake.** Persist the original question identity and error evidence, offer a targeted explanation, then a new near-transfer question. Replaying the identical question is a memory check, not sufficient evidence of transfer. Schedule a later revisit once review exists.
4. **Reduce visual repetition.** Use topic-specific preview diagrams, clearer section rhythm and concise objective language. Preserve keyboard/touch support. Use short, restrained transitions; respect reduced motion. Avoid confetti after every answer or time pressure by default.
5. **Improve loading and recovery.** Split school screens and major game/lesson code into lazy chunks. Show useful loading, reconnect and error states. Preserve pending work during API failure. Keep the app shell usable on modest school devices.

Acceptance: return/reload restores the exact unfinished question; completed answers and stars are counted once; guest/account sessions stay separate; a second authenticated device restores saved progress; 390-pixel and iPad layouts work; existing lessons and all generator tests still pass. This release must be a functioning vertical slice, not placeholder cards.

## Release 2 — Teach the concept, not just the answer

Build six exemplar units before replicating patterns across the catalog:

| Path | Unit | Distinct interaction and reasoning |
| --- | --- | --- |
| P1 | Number bonds and make ten | Move counters into ten-frames, split a quantity, connect to an equation |
| P2 | Equal groups and first fractions | Build arrays and share objects; explain equal parts before symbols |
| P3 | Fractions and measurement | Align fraction strips; use a number line and compound-unit models |
| P4 | Decimals and area | Place-value exchange, hundred grids, build/cut composite rectangles |
| P5 | Percentage, rate and triangle area | Link fraction/decimal/percent models; choose the correct whole/base/height |
| P6 | Ratio, algebra and circles | Build proportional bars; connect a box to an unknown letter; reason about dimensions |

Each exemplar needs a short readiness check, concept exploration, reviewed worked examples, guided practice, independent practice and a transfer problem. Expose modes truthfully; do not call a quiz a full lesson. Make Foundation sequences separate in scaffolding, language, prerequisites and outcomes, rather than changing only number size.

Provide staged hints: re-read the relationship → use a representation → choose an operation → work through a step. Explain common wrong answers specifically. Never teach keyword rules such as “fewer means subtract.” Include stories where a familiar keyword requires the opposite operation and identify known/unknown quantities explicitly.

Acceptance: a reviewer can trace each example, diagram, explanation and generated variation to an objective and an independently verified solution; each exemplar has at least two representations and a new-context transfer item. Child testing should establish whether instructions are understood without adult interpretation.

## Release 3 — Auditable curriculum depth

- Build a coverage matrix for every official objective: mapped, practice available, taught, assessed, reviewed. Track missing representations, boundary cases and cognitive demand separately. Counting activities is not a coverage score.
- Add question metadata for objective IDs, representation, cognitive demand, difficulty factors, misconception tags and generator version. Persist enough immutable information to reconstruct historical evidence after content changes.
- Audit the current 198 activities against the exact official syllabus pages. Pay particular attention to fraction denominator restrictions, grade-specific operations, Foundation volume/geometry, and prerequisite review labels. Fix mismatches before adding more activities.
- Expand missing concepts systematically: number words, mental strategies, varied missing quantities, drawing/measuring, richer tables/graphs, composite shapes, reasoning and mathematical language missions.
- Create an internal content viewer with seed replay, small batches and a “generate 100” review view. Record reviewer, version, approval and issue status. Content review must not expose pupil data.
- Add semantic tests beyond calculation: geometry constraints, actual diagram labels/scale, story quantities and relationships, units, multiple valid answer formats, intended versus accidental alternative answers.

Acceptance: all public activities have traceable objectives and reviewed samples; every mapped-but-unimplemented objective remains visibly honest. No claim of full MOE coverage until the coverage matrix and qualified curriculum review support it. Official MOE source is linked in SCHOOL-PLATFORM.md; recheck it when changing the map.

## Release 4 — Student intelligence with explainable evidence

- Replace coarse activity bands with fine-grained skill evidence: independent first attempts, hints, recency, repeated sessions, difficulty and representation diversity. Separate exposure from demonstrated mastery. Publish the rule and show evidence to teachers.
- Implement a brief adaptive beginning-of-year diagnostic with bounded length, prerequisite branching and an uncertainty state. Do not infer a whole topic from one answer.
- Add tiny unit readiness checks and neutral “Strengthen this skill” boosters. Do not embarrass pupils with a lower-grade label.
- Add Today's Review using due skills, previous errors and spaced retrieval. Avoid repeated easy questions farming rewards. Let teachers override priorities.
- Build a personal route through taught objectives with clear reasons for recommendations. Keep free exploration available where teachers allow it.

Acceptance: deterministic simulations exercise new learners, missing evidence, guessers, repeated mistakes, hints, stale performance and Foundation boundaries. A teacher can explain why a skill was selected. Do not market mastery predictions as validated until measured against an independent teacher assessment.

## Release 5 — A teacher's complete classroom loop

Start with **assign → pupil completes → teacher sees evidence → intervention**.

1. Persistent assignments to a class, private group or pupil; objective, dates, question count, seed/items, hint policy, retry rules and status. Server-enforce membership and assignment settings.
2. Student home Teacher Tasks, separate from the personal journey, containing only real assigned work.
3. Teacher home with real completion counts, missing work and actionable skill needs. Empty classrooms get setup guidance rather than sample metrics.
4. Clickable heatmap cells revealing attempts, questions, hints, common errors and chronology. Preserve missing evidence as missing; show denominators.
5. Assignment and pupil reports, feedback, CSV export, private grouping and simple three-question exit tickets.
6. Misconception summaries tied to repeated answer patterns and examples. Say “may be confusing…” and allow teacher correction; do not diagnose from a single wrong answer.
7. Question-set builder with preview, regenerate-one, reviewed edits and saved sets. Differentiate within the assigned objective; teacher controls boundaries.
8. Curriculum pacing, units taught/unlocked, revision and track settings. Add aggregate school usage without public child/class/teacher rankings.

Acceptance: an admin creates a fresh workspace and roster; an assigned teacher publishes a task; a pupil completes it on another device; the teacher sees the correct evidence and exports it. An unrelated teacher, pupil or school cannot read or change that assignment. Due dates use an explicit school timezone.

## Release 6 — Singapore mathematical reasoning

- A keyboard/touch accessible bar-model builder: part-whole, comparison, multiplicative comparison and before/after models. Store editable model structure, not only a screenshot.
- Structured working: equations, intermediate values, diagrams, optional pen strokes and revisions. Save the reasoning alongside the final answer.
- Multiple correct methods and method-aware feedback. Begin with constrained interpretable steps and teacher review; do not pretend freehand working can be graded perfectly.
- Problem-solving lessons on model drawing, systematic lists, working backwards, patterns, guess/check, estimation and constant relationships. Explain why a method fits the particular problem.
- Representation translation missions and light reflection prompts. Develop language and mathematical relationships together.

Acceptance: valid alternative methods remain valid; arithmetic slips are distinguished from an incorrect model where the rubric supports that distinction; uncertain work goes to review instead of fabricated marking.

## Release 7 — Upper primary and optional PSLE preparation

Build original multi-step fraction, percentage, ratio, angle, circle, volume and average problems. Increase reasoning demand and unknown positions rather than only larger numbers. Foundation has a separately reviewed path.

Verify the current applicable Standard/Foundation examination specifications directly against SEAB before defining format, timings, calculator rules or marks. Keep PSLE practice optional and separate from everyday learning. Do not reproduce unlicensed past-year questions. Support short answers, structured working, long answers and teacher-reviewed rubrics. P1/P2 use “Check What I Know,” not exam framing.

Acceptance: official format version recorded; original items reviewed; calculator/non-calculator modes correct; practice feedback and assessment behavior clearly distinct. Formal marks require an explicit marking rubric and reliable server-owned assessment state.

## Release 8 — A coherent feel across ages

| Audience | Presentation | Motivating interaction |
| --- | --- | --- |
| P1–P2 | Large targets, short instructions, concrete objects, friendly restrained character | Construct, sort, share and explain; optional voice |
| P3–P4 | Adventure map, visual models, more independent controls | Missions with strategy choices and collectible discoveries |
| P5–P6 | Cleaner typography, less decorative motion, more working space | Challenges, themes, achievement collections and reasoning milestones |
| Teachers | Compact, calm, task-oriented interface | Assign, inspect evidence and intervene |
| Administrators | Guided setup, clear roles and actual usage | Manage years, classes, membership and reporting |

Use one visual system with age-dependent density and motion. Reward effort, growth and understanding without punishing a broken streak. Make sound optional; never rely on colour or audio alone. Do not activate an unfinished currency/shop economy until persistence, earning rules and age suitability are defined.

Acceptance: keyboard-only core flows, screen-reader names/order/live feedback, 200% text zoom, reduced motion, touch targets, portrait/landscape iPad and mobile layouts. Test actual Safari/iPad, not only Chromium viewport resizing. Observe representative pupils and teachers completing tasks; fix confusion before adding decoration.

## School pilot and operational work

- Administrator recovery, verified contact changes and optional invitations need a real provider and secure token lifecycle. Do not send messages before the account owner authorises/configures the service.
- Backup and restore rehearsal, data export/deletion, retention policy, audit access, secret rotation, abuse protection, resource limits, error monitoring and documented incident ownership.
- Load and concurrency tests for realistic schools; confirm indexes, event pagination, offline conflicts and migrations. Test shared-device logout and expired sessions.
- Academic-year rollover preserving history and class membership periods; guardian access only with explicit linkage/permissions; QR access only with revocable scoped credentials.
- Privacy review and the school's required data handling process before onboarding real pupils at scale. Existing tenant tests are necessary but are not a substitute for operational readiness.
- Live lesson mode and parent summaries follow stable assignments and permissions; they must consume real data rather than synthetic dashboard placeholders.

Pilot gate: named operator, restore test passed, school permissions reviewed, recovery works, curriculum samples approved, representative device/accessibility checks passed and teacher/pupil onboarding observed.

## Delivery and verification discipline

Deliver one working slice at a time. Preserve the original guided lessons and all current routes. Keep stable activity/objective IDs or provide migrations. Test meaningful invariants, session synchronization and permissions; inspect visuals and gameplay in the actual browser. State automated, browser-observed and unverified results separately.

Publish compatible API changes before frontend changes. Use the existing backend Sites project and personal GitHub Pages repository. Never commit `.private/`, credentials, local databases, scratch workspaces or recovery archives. Keep package lockfiles tracked despite the parent repository's ignore rule. Verify the exact GitHub deployment run and public page after pushing.

Release 1 is implemented. The immediate handoff is deploying API v3 to the existing Sites project, then Release 2. Later releases are ordered work packages, not claims that all features will fit into one Claude session.
