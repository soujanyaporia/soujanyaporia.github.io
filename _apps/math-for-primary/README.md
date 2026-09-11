# Math for Primary

An interactive addition and subtraction tutor for Singapore Primary 1–3
(roughly ages 6–9). It teaches the way a patient tutor would:

**Understand → See → Try → Get feedback → Explain → Practise again**

- **Learn**: 16 lessons in 5 units. Each lesson has short concept cards,
  5 worked examples (think first, then a step-by-step animated explanation),
  and 5 guided questions with progressive hints. Mistakes add "one more like
  this" practice.
- **Practice**: pick a topic and a number range (within 5 / 10 / 20 / 50 / 100).
- **Mixed practice**: questions from everything learned so far, weighted
  towards the skills that need the most practice.
- **Word problems**: solve stories, choose the right equation, or build the
  equation from the story and then solve it.
- **Progress**: stars, day streak, badges, and a mastery meter per skill.

No accounts, no ads and no backend: progress is stored in the browser.

## Running it

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the Local URL printed by Vite (usually http://localhost:5173; the current
preview uses http://localhost:5174 because Claude has a separate server on 5173). The dev server also listens on your local
network, so you can open the printed "Network" address on an iPad on the
same Wi-Fi.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the question-quality tests |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Type-check and build static files into `dist/` |

## Architecture

```
src/
  engine/            Pure TypeScript. No React, no DOM. Fully testable.
    types.ts           The data model (Problem, Story, Explanation, VisualSpec…)
    random.ts          Seeded RNG: every question is reproducible from its seed
    levels.ts          Number ranges and fact sampling (with constraints)
    difficulty.ts      Difficulty model (range, unknown position, regrouping…)
    equation.ts        Equations, evaluation, solving, tokens for display
    generators/        1. Mathematical problem generation (one per skill)
    word/              2. Natural-language rendering of stories
    explain/           3 & 5. Visual specs, worked steps and progressive hints
    validate.ts        4. Answer checking with misconception-aware feedback
    skills.ts          Skill registry: metadata + generator per skill
    session.ts         Builds sessions without repeats
    adaptive.ts        Mastery tracking and skill selection (swappable policy)
  content/           Lessons, practice topics and badges — all data
  state/             Progress (localStorage behind a repository interface)
  visuals/           Counters/ten-frames, number line, number bond, bar model, balance
  math/              Equation display, number pad, story text, working lines
  question/          The interactive question player and worked-solution player
  lesson/            Lesson flow (intro cards, worked examples, completion)
  screens/           Home, Lessons, Practice, Mixed, Word problems, Progress
```

### How a question is made

A generator produces a structured, language-free problem, for example:

```ts
{ skill: 'add.missing_first', fact: { a: 4, op: '+', b: 3, c: 7 },
  equation: □ + 3 = 7, answer: 4, difficulty: 3.4, visual: 'counters' }
```

The same maths can then be rendered as an equation, a number bond, or a
story. Stories come from **story structures** (join, separate, part-whole,
compare — each with the unknown in different places) combined with
**frames**: short natural scenarios written as templates. There are 60+
frames with multiple scenes and wordings, 30+ names, and Singapore settings
(MRT, bus interchange, canteen, National Library, void deck) used where they
fit naturally.

Explanations are data too: a list of steps, each with a sentence, a visual
spec (e.g. "7 counters, 3 crossed out") and the working so far. The React
components only draw what the engine describes, which makes it possible to
test every explanation and, later, swap in AI-written ones.

### Adding things

- **A lesson**: add a `LessonDef` to `src/content/lessons.ts` (intro cards,
  5 example requests, 5 practice requests). No new screens needed.
- **A question shape**: add a row to `EQUATION_SKILLS` in
  `engine/generators/arithmetic.ts`, or a new generator + skill entry.
- **A story**: add a frame to `engine/word/frames-*.ts`. The tests check
  grammar (including "1 sticker" vs "2 stickers") and that the numbers match
  the maths.
- **Smarter adaptation**: implement the `AdaptivePolicy` interface in
  `engine/adaptive.ts`.
- **Cloud sync / profiles**: implement `ProgressRepository` in
  `state/progress.ts`.

## Question quality tests

`npm test` generates tens of thousands of questions across every skill and level and
checks that:

- every question has exactly one valid answer, and the checker accepts it;
- every number stays inside the level's range and nothing goes negative;
- story text contains exactly the numbers the maths expects (the answer never
  leaks into the story) and reads grammatically;
- choice questions have exactly one option that fits the story;
- every question has a worked explanation and progressive hints with valid visuals;
- generation is deterministic for a seed, and sessions never repeat a question;
- the difficulty model ranks question shapes sensibly;
- adaptive practice gives weaker skills more questions.

## Continuation status

See [QA.md](QA.md) for repairs, the 321-test result, browser checks, and the
recovery snapshot. The visible V1 curriculum is addition/subtraction only;
unfinished expansion files from the handoff are preserved but not exposed.
