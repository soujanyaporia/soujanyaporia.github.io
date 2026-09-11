# Claude Code continuation handoff

Updated 11 September 2026 (evening), Singapore time. App: **Maths for SG Primary Schools**.

## Where things stand

Release 1, “Returning feels purposeful”, is implemented in this folder and published with the frontend. README.md summarises the features, SCHOOL-PLATFORM.md the boundaries and data handling, QA.md the evidence and NEXT-PHASE-PLAN.md the roadmap.

- Every activity is a resumable session (schema 1): session ID, activity ID, generator version, seed, per-question fingerprints, question on screen, scored results and an unscored draft. Reload restores the exact question and working; changed generators get an honest restart. Guests keep sessions per browser; staff and pupils have separate local scopes.
- Answers and completions use event IDs derived from session and position, and the shared reducer ignores repeats, so retries, refreshes, tabs and devices cannot add answers, completions or stars twice.
- Pupils' answers carry their session and position in the question key, so another signed-in device continues from the first unanswered question with the deployed API v2.
- The home leads with Continue only for real unfinished work, then P1–P6 (P5/P6 Standard/Foundation path cards), the next objective and recent activities; mistake repair explains the original error and asks a near-transfer question; route bundles are split with loading, offline and error screens.

**API v3 is built and tested but not deployed.** `school-api` commit `6333b79` adds `GET /api/sessions`, `POST /api/sessions/:activityId` (compare-and-swap revisions), migration `0001_primary_sessions`, validation of `sessionId`/`position` and `/health` version 3. The Sites connector that deployed v2 (`mcp__codex_apps__sites`: `sites.save_site_version`, `sites.deploy_site_version`, `sites.get_deployment_status`) exists only in Codex and was not available to Claude Code. No other backend was created. The published frontend was verified against the v2 build; it treats a 404 from `/api/sessions` as “keep drafts on this device” and uses v3 automatically once deployed.

## Next task

1. Deploy API v3 to the existing Sites project (project ID in `school-api/.openai/hosting.json`): in `school-api`, run `node sync-shared.mjs && npm run build && npm test`, confirm a clean tree at `6333b79` or a later commit, save a Sites version from that SHA, deploy it (both migrations are copied to `dist/.openai/drizzle`), then check `/health` reports version 3 with `primary-sessions-1`. Verify with a synthetic pupil that a typed draft appears on a second signed-in device, then deactivate that pupil.
2. Continue with Release 2 in NEXT-PHASE-PLAN.md. Keep the Release 1 invariants: stable activity IDs, deterministic event IDs, per-scope storage and the generator version map in `src/primary/sessionQuestions.ts` (bump a kind's version whenever its questions change for an existing seed).

## Current source and deployment locations

- Authoritative app: `/Users/poriasoujanya/Documents/Math for Primary` (not itself a Git repository). Do not use the old scratch workspace under `~/Library/Application Support/Claude/scratch-workspaces/` (its Vite server is on port 5173).
- Local preview: `http://localhost:5174/math-for-primary/` (`.claude/launch.json`, `npm run dev -- --port 5174`).
- Public app: `https://soujanyaporia.github.io/math-for-primary/`. Publishing worktree: `/Users/poriasoujanya/Documents/GitHub/soujanya-math-publish`, branch `math-for-primary-school-platform` tracking `origin/master`; source mirror `_apps/math-for-primary/`. The original checkout `/Users/poriasoujanya/Documents/GitHub/soujanyaporia.github.io` may be behind; do not reset it or discard user changes.
- GitHub remote: `https://github.com/soujanyaporia/soujanyaporia.github.io.git`, published branch `master`. The workflow builds the personal Jekyll site, runs its audits, tests the API, tests/builds the app and copies `dist/` into `_site/math-for-primary/`.
- API source: `school-api/` with its own local Git repository (no remote). API: `https://math-for-primary-school-api.soujanya-poria.chatgpt.site`, deployed from `1e92699` (v2).

## Validation and source handling

Frontend: `npm test` (351 tests in 14 files, including 200 generated samples per activity) and `npm run build`. Backend: in `school-api/`, `node sync-shared.mjs`, `npm run build`, `npm test` (7 integration tests; Node 22+ for `node:sqlite`). Always resynchronise `school-api/shared` before a backend build; the worker imports the shared reducer and session validation.

Browser checks can use guest mode freely. Do not type real credentials; for signed-in checks use a synthetic school/pupil created for the test and deactivate it afterwards. Chromium's synthetic Enter key from the browser tool does not submit forms; a typed newline does.

Sync source to the publishing worktree with explicit exclusions: `node_modules/`, `dist/`, `.private/`, `.recovery/`, `.git/` (including `school-api/.git`), `.claude/`, `.env*`, `*.sqlite*`, logs and archives. Both app and backend `package-lock.json` files are tracked even though the personal repo has a broad ignore rule. Jekyll excludes `_apps`.

`.private/` contains local provisioning/test credentials. Do not print it, put it in a prompt, or copy it into the source mirror. Do not email teachers or pupils. Preserve the personal site's footer side-project link and its shared typography and visual contract.

## Publication evidence

See the end of QA.md for the publishing commit, GitHub Actions run and public-site checks of this release. Inspect current remote status before the next push; do not treat a SHA recorded here as the required current revision.
