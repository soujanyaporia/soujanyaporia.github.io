# Continuation and verification — 11 September 2026

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
