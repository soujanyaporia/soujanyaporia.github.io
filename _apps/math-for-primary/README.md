# Maths for SG Primary Schools

Play at **https://soujanyaporia.github.io/math-for-primary/**.

A Singapore Primary 1–6 maths learning application. Choose a primary year to load its own activities; P5 and P6 also have separate Foundation paths. Guest play needs no account. School accounts save completed answers and learning progress across devices.

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

### Returning to learn (Release 1, September 2026)

- **Continue exactly where you stopped.** Each activity is a resumable session that records its generated questions (generator version, seed and a fingerprint for each question), the question on screen, the recorded answers and any unfinished working: the typed answer, tries so far and whether the clue was opened. Refreshing or coming back reopens that question. Unfinished working is saved, but it is never counted as an answer.
- **Counted once.** Answers, completions and stars use event IDs derived from the session and question position, so a retry, a refresh, a second tab or a second device cannot add them twice.
- **A learning home.** Continue appears only when an activity is genuinely unfinished. The home then shows the P1–P6 selector (P5 and P6 offer separate Standard and Foundation paths), the next objective in the chosen path, recent activities with their actual counts, and a short optional “How to play” note for first-time guests.
- **Mistake repair.** After an activity, “Repair tricky questions” revisits each question that was not solved first time: the original question, the answer given, a note when the error clearly fits one pattern (place value, an unfinished step, the inverse relationship, one away), the relationship to use and the worked steps. A new question on the same idea follows; the identical question is not replayed as evidence.
- **Lighter and clearer.** Topic illustrations on activity cards; the activity player, school pages and original lessons load on demand; clearer loading, offline and error screens.

Where sessions are kept: guest sessions stay in this browser. For pupils, recorded answers sync to the school account, and another signed-in device continues from the first unanswered question. Unfinished working, and activities opened but not yet answered, follow a pupil between devices once the account service's sessions endpoint (API v3) is deployed; until then they stay on the device where they were started. Signing out removes a pupil's cached sessions from a shared device.

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

- `src/primary/`: grade/track activity catalog, generators and diagrams; the learning home (`PrimaryHome.tsx`); the resumable activity player and repair flow (`PrimaryGame.tsx`); sessions (`session.ts`, `sessionQuestions.ts`, `resume.ts`, `sessionStore.ts`, `SessionContext.tsx`); topic illustrations and activity progress.
- `src/school/`: accounts, API client, school administration, MOE curriculum map, reports and learning events.
- `src/state/`: progress migration, guest/staff storage and the pupil upload queue (`cloudSync.ts`).
- `src/engine/`, `src/lesson/`, `src/question/`: original arithmetic tutoring engine and guided learning (loaded on demand).
- `school-api/`: authenticated Worker API, D1 schema/migrations, shared reducer and SQLite integration tests.

GitHub Pages builds the mirrored source in `_apps/math-for-primary/` in `soujanyaporia.github.io`. The API deploys separately. `.private/`, `.recovery/`, local databases, credentials and nested Git metadata are never published.

See [QA.md](QA.md) for verification evidence and [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) for the continuation instructions.
