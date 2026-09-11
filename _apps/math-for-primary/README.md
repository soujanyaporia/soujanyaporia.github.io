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

Backend in `school-api/`: `npm ci`, `npm run build`, `npm test`. Before deploying backend changes, run `node sync-shared.mjs` there and rebuild/test so its shared state reducer and activity registry match the app. For local API work use a local `BOOTSTRAP_SECRET`, run `npm run dev` in that directory, and configure frontend `VITE_SCHOOL_API=http://localhost:8788`. Never put secrets in frontend environment variables.

## Source layout

- `src/primary/`: grade/track activity catalog, generators, diagrams, game/home screens and activity progress.
- `src/school/`: accounts, school administration, MOE curriculum map, reports and learning events.
- `src/state/`: progress migration, guest storage and cloud synchronization.
- `src/engine/`, `src/lesson/`, `src/question/`: original arithmetic tutoring engine and guided learning.
- `school-api/`: authenticated Worker API, D1 schema/migrations, shared reducer and SQLite integration tests.

GitHub Pages builds the mirrored source in `_apps/math-for-primary/` in `soujanyaporia.github.io`. The API deploys separately. `.private/`, `.recovery/`, local databases, credentials and nested Git metadata are never published.

See [QA.md](QA.md) for verification evidence and [CLAUDE-HANDOFF.md](CLAUDE-HANDOFF.md) for the continuation instructions.
