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
