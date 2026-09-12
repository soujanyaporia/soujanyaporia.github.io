# Maths for SG Primary Schools

Play at **https://soujanyaporia.github.io/math-for-primary/**.

A Singapore Primary 1–6 maths learning application. Choose a primary year to load its own activities; P5 and P6 also have separate Foundation paths. Guest play needs no account. School accounts save completed answers and learning progress across devices.

**Made with the help of AI.** The questions, explanations, hints, diagrams and code were produced with AI assistance, and AI can be confidently wrong. Automated tests check the mathematics, but a teacher has not reviewed every item. Use this as a learning resource alongside a teacher or parent, and check anything that looks wrong. See [About, privacy and AI](https://soujanyaporia.github.io/math-for-primary/#/about) in the app.

## Available now

| Path | Playable activities |
| --- | ---: |
| P1 Standard | 21 |
| P2 Standard | 23 |
| P3 Standard | 24 |
| P4 Standard | 27 |
| P5 Standard | 24 |
| P6 Standard | 24 |
| P5 Foundation | 33 |
| P6 Foundation | 22 |
| Total | 198 |

Activities include counting, place value, operations, fractions, decimals, money, measurement, time, geometry, graphs, percentages, rate, ratio and algebra. Questions are generated deterministically, with numerical/choice answers, fraction shading, ordering and visual diagrams. The original 16 addition/subtraction lessons remain under **Original guided lessons**, including worked examples, progressive hints and story-to-equation practice.

### Learn: lessons that teach the idea first

**Learn** (`#/teach`) is a teaching mode, not a worksheet. Each micro-lesson runs a full cycle: a readiness check with a quick booster when something is missing, a story hook, hands-on exploration with a manipulative, “what do you notice?”, a concrete → pictorial → abstract ladder, an explanation with a **Why does this work?** answer, interactive worked examples that ask the pupil to complete steps, guided practice, independent practice, a word problem, a reasoning question, a mastery check and a discovery moment.

- **13 micro-lessons, about 150 minutes of teaching, across the six exemplar topics:** P1 missing numbers (two lessons), P2 multiplication and division, P3 equivalent fractions and simplest form, P4 decimal place value and decimal addition, P5 percentage and percentage of a quantity, P6 ratio, sharing in a ratio, and letters and balanced equations.
- **13 interactive manipulatives:** ten frames, number bonds with draggable counters, bar models, number lines, equal groups, arrays, a sharing board, a fraction wall, a place-value chart, a hundred grid, a percentage bar, ratio bars and an algebra balance. All of them are open for free exploration in the **Math Lab** (`#/lab`).
- **Help that changes, not repeats:** staged clues, **Teach me** (a step-by-step mini-lesson that leaves the last step to the pupil), **Show me another way** (a second strategy), and **I still don’t get it** (an easier question on the same idea, plus a different representation).
- **Mastery means more than repetition:** the mastery check asks one question per facet — calculate, read a model, work backwards, find a missing quantity, solve a story, use an unfamiliar representation, and explain or spot a mistake. Three stars need every facet correct with at most one needing help. A quick review then falls due after 1, 4, 10 and 30 days.
- **Rewards for learning, not speed:** XP, Math Gems, a level and the day streak are derived from recorded learning (answers, finished lessons, mastery and reviews), so they agree on every device.
- **No rules before meaning:** division is “how many groups fit”, equivalent fractions come from splitting every part, decimals are place value, and equations keep a balance level. The app never teaches that a keyword such as “altogether” means a particular operation.

Teachers get a **lesson guide** for each lesson (`#/guide/<lesson>`): objectives with their MOE references and page numbers, prerequisites, the teaching sequence, example generated questions, expected misconceptions, mastery criteria and every manipulative used, plus “preview as a student”. The **coverage map** (`#/coverage`) shows, objective by objective, what exists: Learn lessons currently cover 25 of the 243 mapped objectives (P1 3, P2 4, P3 3, P4 4, P5 4, P6 7; Foundation lessons are not written yet), while 163 objectives have practice activities. Gaps are shown as gaps.

### Returning to learn

- **Continue exactly where you stopped.** Each activity is a resumable session that records its generated questions (generator version, seed and a fingerprint for each question), the question on screen, the recorded answers and any unfinished working: the typed answer, tries so far and whether the clue was opened. Refreshing or coming back reopens that question. Unfinished working is saved, but it is never counted as an answer. Lessons resume at the step you left.
- **Counted once.** Answers, completions and stars use event IDs derived from the session and question position, so a retry, a refresh, a second tab or a second device cannot add them twice.
- **A learning home.** Continue appears only when an activity is genuinely unfinished. The home then shows the P1–P6 selector (P5 and P6 offer separate Standard and Foundation paths), a Learn card, the next objective, recent activities with their actual counts, and a short optional “How to play” note for first-time guests.
- **Mistake repair.** After an activity, “Repair tricky questions” revisits each question that was not solved first time: the original question, the answer given, a note when the error clearly fits one pattern (place value, an unfinished step, the inverse relationship, one away), the relationship to use and the worked steps. A new question on the same idea follows; the identical question is not replayed as evidence.
- **Lighter and clearer.** Topic illustrations on activity cards; the activity player, Learn, school pages and original lessons load on demand; clearer loading, offline and error screens.

### Guest learning passport

Guests need no account and nothing is stored on our servers. To carry on somewhere else, the **learning passport** (`#/about/passport`) packs progress, unfinished activities and lesson positions into a code or a small file that the guest keeps; opening it on another browser restores everything. It contains learning records only — no name and no account details. The same page removes all guest data from a browser.

For pupils with a school account, recorded answers sync to the account and another signed-in device continues from the first unanswered question. Unfinished working, and activities opened but not yet answered, follow a pupil between devices once the account service's sessions endpoint (API v3) is deployed; until then they stay on the device where they were started. Signing out removes a pupil's cached sessions from a shared device.

The curriculum map references the official MOE syllabus, updated October 2025. Activities cover selected objectives; this is neither exhaustive audited coverage nor an MOE-endorsed assessment. See [SCHOOL-PLATFORM.md](SCHOOL-PLATFORM.md) for the release boundary and [NEXT-PHASE-PLAN.md](NEXT-PHASE-PLAN.md) for the development roadmap.

## School setup

1. Select **School setup → Create a school workspace**. The administrator enters a school name, their name, staff email and password. A school code is generated immediately; no manual backend approval is required.
2. Create classes in the current academic year. Select P1–P6 and, where applicable, Standard/Foundation.
3. Add teachers and assign classes. Add pupils individually or import a CSV roster. Share generated sign-in details privately.
4. Teachers and pupils use their school code, username and temporary password. First sign-in requires a new password. Pupils do not need email accounts.

The app does not send invitation emails or support administrator email recovery yet. Each new registration creates an isolated workspace; it cannot claim an existing school's records. The sample teacher dashboard is clearly labelled and separate from real accounts.

## Development

Node.js 22 or newer is recommended (the local backend test adapter uses `node:sqlite`).

```sh
npm ci
npm run dev -- --port 5174
```

Visit `http://localhost:5174/math-for-primary/`. Port 5173 belongs to an outdated Claude scratch copy; the authoritative project is this folder.

```sh
npm test
npm run build
```

Backend in `school-api/`: `npm ci`, `npm run build`, `npm test`. Before deploying backend changes, run `node sync-shared.mjs` there and rebuild/test so its shared reducer, session validation and activity registry match the app. For local API work use a local `BOOTSTRAP_SECRET`, run `npm run dev` in that directory, and configure frontend `VITE_SCHOOL_API=http://localhost:8788`. Never put secrets in frontend environment variables.

## Source layout

- `src/primary/`: grade/track activity catalog, generators and diagrams; the learning home (`PrimaryHome.tsx`); the resumable activity player and repair flow (`PrimaryGame.tsx`); sessions (`session.ts`, `sessionQuestions.ts`, `resume.ts`, `sessionStore.ts`, `SessionContext.tsx`); the guest passport; topic illustrations and activity progress.
- `src/teach/`: the teaching engine — the lesson content model (`model.ts`), lesson modules (`lessons/p1.ts` … `lessons/p6.ts`), the generic lesson player, interactive manipulatives (`tools/`), lesson progress and the review schedule, derived rewards, Learn index, Math Lab, teacher guide and coverage map.
- `src/school/`: accounts, API client, school administration, MOE curriculum map, reports, learning events, and the About/privacy/AI page.
- `src/state/`: progress migration, guest/staff storage and the pupil upload queue (`cloudSync.ts`).
- `src/engine/`, `src/lesson/`, `src/question/`: original arithmetic tutoring engine and guided learning (loaded on demand).
- `school-api/`: authenticated Worker API, D1 schema/migrations, shared reducer and SQLite integration tests.

GitHub Pages builds the mirrored source in `_apps/math-for-primary/` in `soujanyaporia.github.io`. The API deploys separately. `.private/`, `.recovery/`, local databases, credentials and nested Git metadata are never published.

See [QA.md](QA.md) for verification evidence and [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) for the continuation instructions.
