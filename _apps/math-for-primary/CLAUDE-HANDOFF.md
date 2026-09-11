# Claude Code continuation handoff

Updated 11 September 2026, Singapore time. App: **Maths for SG Primary Schools**.

## Mandatory workspace instruction from the user

**CREATE A NEW Claude Code project/session using `/Users/poriasoujanya/Documents/Math for Primary`. Do not resume the old project.**

The existing Claude Desktop Code session named “Math for Primary web app” points to an obsolete scratch workspace beneath `~/Library/Application Support/Claude/scratch-workspaces/`. Its Vite server is on port 5173 and it predates the accounts and P1–P6 redesign. Leave that session alone; do not click Undo or enable its auto-continue. Do not copy its source over this folder.

Claude Desktop reported credits return at **7:50 pm Singapore time on 11 September 2026**. The Codex one-time follow-up is scheduled for that time and must use computer control to create the new project and send the task below. Do not buy extra credits. Verify that the new project is attached to the correct folder and has begun the task; otherwise report the actual blocker.

## Task to give the NEW project

Continue the existing Maths for SG Primary Schools application in `/Users/poriasoujanya/Documents/Math for Primary`. Read README.md, SCHOOL-PLATFORM.md, QA.md and NEXT-PHASE-PLAN.md. Inspect the current source before editing. Implement **Release 1: Returning feels purposeful**, beginning with durable resumable activity sessions and a real Continue action on the grade-first home. Preserve all 198 activity IDs, P1–P6 Standard and P5/P6 Foundation paths, the original 16 guided lessons, school accounts, cloud progress and school separation. Complete one coherent working release, not placeholder UI.

Persist enough versioned session information to restore the same questions and current position after refresh and on a second authenticated device. Preserve an answer draft without marking it as a scored answer. Prevent duplicate learning events and stars on retry, refresh and concurrent tabs. Keep guest and account data separate. Handle incompatible generator versions explicitly. Then refine the home hierarchy around real Continue, next learning and recent progress; improve mistake repair with a new near-transfer question; improve loading/error states and split large route bundles where practical. Do not add fake assignments, mastery, currency or teacher statistics.

Use the official MOE syllabus link and the current curriculum map, not tuition topic lists. Read the complete roadmap for later work, but prioritise and finish this slice. Check mathematics, hints, labels and touch/keyboard interaction. Run frontend and backend tests/builds and inspect desktop, phone and tablet views in the browser. Document what is implemented, tested and still missing.

The user already authorised publishing to their existing personal GitHub Pages website and adding the footer side-project link. Publish compatible backend changes to the existing backend project first, mirror the frontend source into the personal website publishing worktree, push without force and verify the actual GitHub Actions deployment plus the public URL. Preserve unrelated personal-site content. Never publish secrets or local test databases.

## Current source and deployment locations

- Authoritative app: `/Users/poriasoujanya/Documents/Math for Primary` (not itself a Git repository).
- Active preview: `http://localhost:5174/math-for-primary/`. Reuse it or start `npm run dev -- --port 5174` if absent. The `.claude/launch.json` in this folder specifies 5174.
- Public app: `https://soujanyaporia.github.io/math-for-primary/`. The user's `github.com`/`github.com`-style website wording refers to this existing GitHub Pages site; do not create a new domain or replace the whole personal website.
- Publish worktree: `/Users/poriasoujanya/Documents/GitHub/soujanya-math-publish`, branch `math-for-primary-school-platform`. Source mirror: `_apps/math-for-primary/`. Verify current Git status and remote HEAD before editing/pushing.
- Original personal checkout: `/Users/poriasoujanya/Documents/GitHub/soujanyaporia.github.io`. It may be behind the publishing worktree. Do not reset it or discard user changes.
- GitHub remote: `https://github.com/soujanyaporia/soujanyaporia.github.io.git`, published branch `master`. The workflow builds the personal Jekyll site, runs its design audits, builds the app and adds `dist/` to `_site/math-for-primary/`.
- API source: `school-api/`, with its own local Git repository and `school-api/.openai/hosting.json`. Reuse the exact existing Sites project ID in that file. Do not create another backend.
- API: `https://math-for-primary-school-api.soujanya-poria.chatgpt.site`.
- Backend v2 deployed source: `1e92699425441e8b14c026dcd7757f22b84a485d`; self-service registration and primary progress are live. Get latest deployment/status if this handoff is read after more work.

Read the latest Codex task outcome / Git log for the final frontend publishing commit; do not treat a historical SHA in this document as the required current revision.

## What exists and what does not

198 activities: P1 21, P2 23, P3 24, P4 27, P5 Standard 24, P6 Standard 24, P5 Foundation 33, P6 Foundation 22. Home grade selection really loads different catalogs. Activity progress, stars, first-try results, hints and question identities sync through school events. The original lessons are under `#/foundations`.

School setup is self-service. Administrator creates workspace/code/year, then classes, teachers and pupils. Teachers only access assigned classes. Pupils need no email. Static sample data is accessible only in a clearly labelled read-only demo. New class reports use actual primary activity records. No email invitations/recovery or manual backend approval are implied.

The new activity player currently saves an answer when the pupil advances past it. It does **not** yet resume the exact unfinished session. This is the first task. Many primary activities share quiz interactions and a single clue. Richer learning sequences, diagnostics, assignments, reviewed fine-grained mastery, full curriculum coverage, working/bar models, PSLE and operational school readiness remain roadmap work.

## Validation and source handling

Frontend: `npm test` and `npm run build`. At handoff preparation, 330 tests passed in 10 files, including 200 generated samples per activity (39,600 primary questions), deterministic generation, answer proofs, catalog boundaries and progress separation.

Backend: in `school-api/`, run `node sync-shared.mjs`, `npm run build`, `npm test` when modifying shared reducers/catalog or API. Current tests cover tenant/class permissions, auth/reset/revocation, atomic imports, progress conflicts/idempotence, primary events and self-service registration. The local adapter uses `node:sqlite`; Node 22+ is needed.

Small frontend-only presentation/hint edits may postdate the backend shared source snapshot; always synchronize it before the next backend build. Never deploy source that differs from the pushed Git SHA used to save its Sites version.

Sync source to the personal-site worktree with explicit exclusions: `node_modules/`, `dist/`, `.private/`, `.recovery/`, `.git/`, `.env*`, local databases and temporary files. Both app and backend `package-lock.json` are tracked even though the personal repo has a broad ignore rule. Source is excluded from Jekyll publishing by `_config.yml`.

`.private/` contains local provisioning/test credentials. Do not print it, put it in a prompt, or copy it into the source mirror. Use synthetic accounts for validation. Do not email teachers or pupils.

The public site footer now links the app as a side project; preserve the personal site's shared typography and visual contract. Future design should improve the app without redesigning the research website.
