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
