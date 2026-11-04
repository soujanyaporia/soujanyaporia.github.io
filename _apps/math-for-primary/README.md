# Singapore Primary Maths

New app path: **`/singapore-primary-maths/`**. The release includes `dist-legacy/` redirects for `/math-for-primary/`, preserving saved hash routes and search parameters. Deploy `dist/` at the new path and `dist-legacy/` at the old path together.

A Singapore Primary 1–6 maths learning application. Choose a primary year to load its own activities; P5 and P6 also have separate Foundation paths. Guest play needs no sign-in. The **Create guest account** menu entry saves an optional nickname and chosen level on this browser, preserving existing progress. School accounts save completed answers and learning progress across devices.

**Made with the help of AI.** The questions, explanations, hints, diagrams and code were produced with AI assistance, and AI can be confidently wrong. Automated tests check the mathematics, but a teacher has not reviewed every item. Use this as a learning resource alongside a teacher or parent, and check anything that looks wrong. See [About, privacy and AI](https://soujanyaporia.github.io/singapore-primary-maths/#/about) in the app.

## Daily practice and fresh papers — November 2026

The home screen and phone navigation put **Daily practice**, **Create a paper**, and **Learn** first. Paper setup opens directly, with a separate Continue button for saved work. Questions show essential givens above the diagram, and Previous/Next/Finish sit beside the answer flow before the optional drawing area. Lessons provide an immediate worked-answer route through Help and return to any unanswered question.

The main path is now **Daily practice** (`#/daily`): 200 days for each of the six Standard levels and the two Foundation paths, with six questions per day. Four topical days are followed by a cumulative review. Topics introduce activities gradually, then include related paper-style applications.

**Create a paper** (`#/papers`) generates 6-, 12- or 18-question sets by level and topic. Every set has a reusable code, no repeated visible questions, saved answers on this device, end-of-paper marking, worked steps, and printing with optional illustrated solutions. Small question domains offer only sizes they can fill. Practice papers do not yet sync to school accounts or travel in guest passports.

The catalogue adds **36 original illustrated question families**, six per Standard level, plus six mixed picture activities. The reference collection is stored outside the app; source PDFs and unreviewed OCR are not public question-bank content. See [practice design and evidence](PRACTICE-DESIGN.md).

## Redesigned learning experience — November 2026

The home, lessons, practice player, missions, Math Lab and progress views share a responsive adventure design, illustrated scenes, optional sound effects, animation controls and reduced-motion support. Touch interactions have keyboard/button alternatives; the scratchpad supports fingers, pens and a mouse.

- **48 new missions:** six for each P1–P6 Standard level, plus six for P5 Foundation and six for P6 Foundation. Each mission has four generated rounds, hints, resumable working and completion rewards.
- **23 Math Lab tools**, including subtraction counters, fraction pieces, triangle transformations, solids, rulers and interactive nets.
- **Watch & learn** offers animated explanations linked to the existing 266 lessons. The current question's worked solution is available after answering/revealing in practice. The picture-first player has continuous narration, pause, replay, speed controls and captions, with small discovery questions after supported models. Captions remain available when audio cannot play.
- Progress combines lessons, activities and missions. Mission drafts travel in guest passports, and pupil drafts are cleared on school sign-out. Mission drafts remain device-local for school accounts; recorded completions sync through the event service.

**Child-focused teaching pass:** P1 counting now groups the same 32 counters into tens over five pictures. Adding three numbers joins two coloured groups first, keeps the third visibly waiting, then asks the child for the total. A dedicated Three-group picnic activity follows the same method. An optional fourth-group lesson follows it, with preserved counter colours, subtotal checkpoints, five assessment facets and three challenges. Every activity recommends an exact-skill guided lesson. See [the syllabus review](SYLLABUS-AUDIT.md) for what the 252-objective inventory establishes and what still needs verification.

### Narration status

The user selected **Voice A (`af_heart`)** after reviewing the samples. All 266 lesson walkthroughs now have continuous Voice A narration with word-timed picture cues. Shared examples, counting solutions and individual coaching excerpts bring the served library to 650 clips (73.5 MiB). Only the requested clip is loaded on play. There is **no automatic device-voice fallback**, no browser model download and no pupil data sent for synthesis. This is synthetic narration, not a human recording.

Run `npm run test:narration-assets` to verify every lesson has a matching approved recording and valid picture cues. The local generator, `scripts/generate-natural-narration.py`, uses Kokoro through MLX Audio in the local `.tools/natural-voice` environment. Run `node scripts/export-narration.mjs` before regenerating; both the environment and working audio are excluded from publication. Public reviewed MP3s and their manifest are included.

An optional ElevenLabs pipeline keeps credentials outside the browser, renders one continuous recording per picture sequence, and uses character timestamps for picture changes. Its default is a single staged sample. The current export has 160 distinct continuous scripts (shared sequences serve multiple lessons). Run the plan command for current character counts.

```sh
npm run narration:plan
npm run test:narration
# Configure ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID privately in .env.voice.local.
# Never prefix secrets with VITE_. The file is ignored and excluded from publication.
node --env-file=.env.voice.local scripts/generate-premium-narration.mjs
# Only after the sample voice is accepted:
node --env-file=.env.voice.local scripts/generate-premium-narration.mjs --all
node scripts/generate-premium-narration.mjs --all --publish-reviewed
```

Samples are written under `.generated/premium-narration/`. No pupil data enters the public narration scripts. The API adapter has mocked contract tests; a real paid-provider request has not been run. Dynamic questions without a reviewed recording currently retain captions only.

## Available now

| Path | Playable activities |
| --- | ---: |
| P1 Standard | 29 |
| P2 Standard | 30 |
| P3 Standard | 31 |
| P4 Standard | 34 |
| P5 Standard | 31 |
| P6 Standard | 31 |
| P5 Foundation | 33 |
| P6 Foundation | 22 |
| Total | 241 |

The 1,600 daily addresses and generated practice papers are separate from this catalogue count.

Activities include counting, place value, operations, fractions, decimals, money, measurement, time, geometry, graphs, percentages, rate, ratio and algebra. Questions are generated deterministically, with numerical/choice answers, fraction shading, ordering and visual diagrams. The original 16 addition/subtraction lessons remain under **Original guided lessons**, including worked examples, progressive hints and story-to-equation practice.

### Learn: lessons that teach the idea first

The teaching presentation follows **Original guided lessons / Foundations**: a large picture, a short spoken explanation, and one step at a time. The picture changes as the idea develops. Authored demonstrations include joining counters, place-value exchanges, equal fraction strips, fraction-area overlaps, decimal grids, percentage bars, triangles paired into rectangles, rearranged circle sectors, fair-sharing averages, timelines and algebra bags. Existing early-number explanation strategies are reused, with alternative methods where available. Worked examples now show the current step instead of an accumulating wall of text.

The new sequences introduce an idea with a deliberately small visual example, then practise the selected objective using deterministic question generators. Broad objectives may share an introductory demonstration; the examples and questions target their individual objective. Content still needs classroom and qualified-teacher review.


**Learn** (`#/teach`) is a teaching mode, not a worksheet. Each micro-lesson runs a full cycle: a readiness check with a quick booster when something is missing, a story hook, hands-on exploration with a manipulative, “what do you notice?”, a concrete → pictorial → abstract ladder, an explanation with a **Why does this work?** answer, interactive worked examples that ask the pupil to complete steps, guided practice, independent practice, a word problem, a reasoning question, a mastery check and a discovery moment.

- **265 lessons across P1–P6:** 252 dedicated objective sequences plus 13 broader exemplar lessons. P5 and P6 have separate Standard and Foundation paths. The source map follows the MOE syllabus updated in October 2025.
- **Visual teaching tools:** ten frames, number bonds with draggable counters, bar models, number lines, equal groups, arrays, a sharing board, a fraction wall, a place-value chart, a hundred grid, a percentage bar, ratio bars and an algebra balance. All of them are open for free exploration in the **Math Lab** (`#/lab`).
- **Help that changes, not repeats:** staged clues, **Teach me** (a step-by-step mini-lesson that leaves the last step to the pupil), **Show me another way** (a second strategy), and **I still don’t get it** (an easier question on the same idea, plus a different representation).
- **Mastery means more than repetition:** the mastery check asks one question per facet — calculate, read a model, work backwards, find a missing quantity, solve a story, use an unfamiliar representation, and explain or spot a mistake. Three stars need every facet correct with at most one needing help. A quick review then falls due after 1, 4, 10 and 30 days.
- **Rewards for learning, not speed:** XP, Math Gems, a level and the day streak are derived from recorded learning (answers, finished lessons, mastery and reviews), so they agree on every device.
- **No rules before meaning:** division is “how many groups fit”, equivalent fractions come from splitting every part, decimals are place value, and equations keep a balance level. The app never teaches that a keyword such as “altogether” means a particular operation.

Teachers get a **lesson guide** for each lesson (`#/guide/<lesson>`): objectives with their MOE references and page numbers, prerequisites, the teaching sequence, example generated questions, expected misconceptions, mastery criteria and every manipulative used, plus “preview as a student”. The **coverage map** (`#/coverage`) shows, objective by objective, what exists: Every one of the 252 mapped objectives now has a lesson sequence. The map links each objective to its lesson and available practice activity. This is coverage of the app’s paraphrased objective map, not certification of complete syllabus mastery. Drawing and construction objectives include paper tasks that need a teacher or adult to check.

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

Visit `http://localhost:5174/singapore-primary-maths/`. Port 5173 belongs to an outdated Claude scratch copy; the authoritative project is this folder.

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

## Search visibility

The production build creates readable HTML at `/lessons/`, eight primary-year paths, nine topic paths and one page per lesson. Lesson pages reuse the live catalogue and read-only diagrams, with real links into the existing interactive hash routes. The homepage includes the same public directory for people and crawlers. No accounts or pupil records enter these pages.

`src/seo/metadata.ts` provides concise search labels for long curriculum titles without changing the lesson content. `src/seo/pages.tsx` owns the reading views; `scripts/build-seo.mjs` creates the HTML and `/singapore-primary-maths/sitemap.xml`. `scripts/check-seo.py` checks the built link graph, canonical URLs, unique titles, structured data, required metadata, assets and sitemap coverage. `npm run build` runs both scripts and requires Python 3 in addition to Node. The host's root `robots.txt` advertises the maths sitemap, and the existing site-wide sitemap builder discovers all public reading pages.

These changes make the content available for crawling; Google decides whether and where to show it. Do not claim that generating a sitemap, passing checks or requesting indexing guarantees search ranking.
