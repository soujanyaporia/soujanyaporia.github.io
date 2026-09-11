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
