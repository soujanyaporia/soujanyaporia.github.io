# School platform release — 11 September 2026

Public app: https://soujanyaporia.github.io/math-for-primary/

Account API: https://math-for-primary-school-api.soujanya-poria.chatgpt.site

## Implemented

- Grade-first home with 198 playable activities across P1–P6 Standard and dedicated P5/P6 Foundation catalogs. Changing the exploration level does not change a pupil's school membership.
- All three curriculum strands, generated questions, interactive fraction shading/ordering, SVG diagrams, explanations, clues, session stars, activity history and replay of tricky questions.
- The original 16 guided arithmetic lessons and story reasoning remain available.
- Self-service school registration: administrator account, unique school code and current academic year are created together. There is no manual backend approval.
- School, academic year and class structure; pupil, teacher and administrator accounts; assigned-class teacher permissions; CSV roster imports of up to 50 rows with atomic validation; pupil moves and deactivation.
- Temporary-password change, teacher pupil-password resets, session revocation, school separation and persistent login throttling. Staff use an email as username; pupils do not need email.
- Cloud learning events and versioned progress. Completed answers, activity records, settings, lesson completions, first-attempt results, hints and rewards already exposed by the UI survive a fresh session on another device. Offline uploads queue per user; conflicts replay events against the server snapshot. Sign-out waits for saving.
- Real class activity heatmaps and reports; original arithmetic skill evidence; CSV export. No-answer cells are labelled as missing evidence. A separate read-only synthetic dashboard is available only as a sample.
- Versioned curriculum objective map, source pages, app-authored prerequisites, representations, vocabulary, activity links and original-lesson links.

## Important boundaries

This is a playable development release, not a completed school deployment programme. An activity label or curriculum node does not establish full teaching/assessment coverage of its objective. The new primary engine supplies practice and explanations; many activities share an interaction pattern. It does not yet give every objective a full concrete-to-abstract teaching sequence.

Partially completed sessions are not yet resumed at the exact current question. Only answers advanced past are saved. The roadmap prioritises resumable sessions. Primary practice indicators use observed attempts and first-try accuracy; they are not yet a validated fine-grained mastery model. The original arithmetic engine has richer skill evidence than the new primary engine.

Assignments, diagnostics, prerequisite remediation, spaced primary review, teacher feedback, method/partial-credit grading, parent access, live teaching, formal PSLE practice and complete curriculum teaching remain future work. Existing profile fields for XP, gems, inventory and avatars do not imply that those game systems are active in the UI.

No invitation emails, verified-school affiliation, email password recovery, academic-year rollover wizard or load-tested operations are currently provided. Schools must retain administrator credentials. A new workspace cannot access another workspace even when its displayed school name matches.

## Curriculum source

Official [2021 Primary Mathematics Syllabus, updated October 2025](https://www.moe.gov.sg/api/media/92bff26d-b2b4-4535-b868-b8415c744b91/2021-Primary-Mathematics-Syllabus-P1-to-P6-Updated-October-2025.pdf), including the P6 rollout in 2026 and separate Foundation content. `src/school/curriculum.ts` paraphrases objectives and supplies page references; prerequisite edges are our instructional graph, not official MOE sequencing. This product has no MOE endorsement. Current examination format must be checked against official SEAB sources before implementing PSLE mode.

## Account and data operation

The API uses a Cloudflare-compatible Worker and D1 SQLite with Drizzle migrations. School scope and assigned-class access are enforced server-side. Passwords use bcrypt cost 12 with a 72-byte maximum; minimum lengths are 12 for staff and 8 for pupils. Random 256-bit session tokens expire after eight hours; only their SHA-256 hashes are stored in the database. Browser tokens are sessionStorage entries. Password reset/deactivation revokes sessions.

`/api/register-school` is self-service and rate limited. `/api/bootstrap` remains a secret-protected owner provisioning route. Local owner credentials are in an ignored `.private/` file. They must never enter a Git commit, published document, client bundle or Claude prompt.

The progress API persists idempotent events with optimistic concurrency and server reducer replay. Raw events preserve history; the current primary snapshot keeps its latest 100 answer details. Question outcomes are client-reported: this is learning software, not a tamper-proof examination system. A formal assessment system needs server-owned sessions/items and separate marking.

## Deployment

Frontend source is mirrored into the personal website repository's `_apps/math-for-primary/` directory. Jekyll excludes this source; GitHub Actions builds the app and copies only `dist/` into `_site/math-for-primary/`. Hash routing supports shared activity links. A discreet side-project link belongs in the personal site footer.

The API is deployed independently through its existing Sites project, identified in `school-api/.openai/hosting.json`. Reuse that project. Run shared-source synchronization, build and integration tests before deploying relevant backend changes; deploy compatible backend changes before the frontend. Do not expose local databases or credentials in either deployment.

Before an actual school pilot: curriculum review, accessibility/device tests, recovery and retention procedures, tested backups, operational ownership, abuse/load testing and the school's data-protection process need explicit completion. See the roadmap for acceptance gates rather than treating these as already implemented.
