# Cloud save implementation

## Repository audit (before implementation)

- React 19 / TypeScript / Vite static app; Vitest runs `src/**/*.test.ts`. `npm run build` includes typechecking, SEO and redirect checks. This workspace is a source directory without `.git` metadata.
- `math-for-primary.progress.v2` (legacy fallback `.v1`) holds `ProgressState`: `primary.activities` (answer counts, sessions, best stars, recent answers, dates), `nodes` (including `learn.*`, `mission.*`), legacy XP/gems, inventory/equipped avatar, achievements, streak, settings, profile and selected primary track. Modern rewards are calculated by `learningRewards`, not separate purchases. No separately stored level.
- `math-for-primary.sessions.v1:guest`: unfinished primary activity sessions, drafts and repair work. `math-for-primary.lessons.v1:guest`: up to 40 lesson attempts. `math-for-primary.missions.v1:guest:<id>`: Math Lab mission work. `singapore-maths.practice-paper.v1:guest`: practice-paper answers and position. Scratchpad/free Math Lab tools are React memory, not persistent progress.
- School pupils/staff have distinct storage scopes and an existing school API. Cloud passes apply only to the guest scope; they never upload school records or school credentials.
- Small hash router in `src/app/router.ts`; guest setup in `src/school/GuestScreen.tsx`; navigation in `SchoolNav.tsx`; focus lesson/activity routes hide that navigation. Cloud save controls must also appear in focus routes.
- Optional motion and introductory-UI flags are device preferences, excluded from cloud payloads. No external analytics added.

## Implementation plan and protocol decisions

1. Dependency-free Web Crypto/passphrase modules; local QR rendering via bundled `qrcode`.
2. Deterministic map unions, best metrics, preference registers and checkpoint timestamps across the exact stores above. Persistent Singapore practice-date history supplements the old rolling histories. Existing weekend/shield streak policy is retained.
3. Local storage bridge emits change notifications; shared mode uses session storage for **both credentials and progress**. This is stronger than keeping school-computer progress in persistent storage: closing a tab must not expose a previous pupil's work.
4. Pull/merge/encrypt/push with atomic compare-and-swap revisions and bounded retries; edits during network requests remain dirty. A missing existing cloud account never silently recreates a deleted backup.
5. Accessible modal, focus-route status control, recovery PNG/QR, encrypted and explicit plaintext backups, fragment scrubbing before application imports.
6. Separate Worker/D1 deployment, strict payload limits, token verification, bounded per-isolate throttling, no request-body logging. Test crypto/tampering, merge algebra, lifecycle races, Worker authentication/CAS and browser interactions.

## Boundaries

The requested 256⁴ × 90 code space is ~38.5 bits, not high-entropy cryptographic identity. PBKDF2 slows guessing but a database disclosure permits offline guessing. Anyone with the full code can read/write/delete the account. Derived keys stored on a personal device are credentials; browser compromise can read them. No application email, phone, school name or password is collected by cloud passes; providers still process network metadata. This implementation is not a PDPA compliance certification.

Free plan quotas can deny requests; local learning continues. One free D1 database is limited to 500 MB (5 GB is the account total). Pricing/availability cannot be guaranteed forever. Encrypted payloads exceeding the configured ceiling are retained locally with an explicit error and export option, never truncated. Old aggregate counts cannot reconstruct independent historical answers beyond retained history; merge uses maximum counters as specified, not a claim of a complete event ledger. Shared school-account features remain separate.

## Verification on 5 November 2026

- Full app suite: 993 tests across 101 files passed. After the final checkpoint-retention edits, 69 targeted integration/storage/sync tests passed.
- Production build, frontend typecheck and Worker typecheck passed. Existing school API build and all 9 tests passed.
- Live Workers/D1 smoke test passed: encrypted creation, restoration, independent-device merge, concurrent updates, allowed-origin headers, wrong-token rejection and stale-revision conflict. The disposable cloud row was deleted after the test. No recovery code or key was logged.
- Worker deployment version: `1703bb8f-edec-437f-9405-fd470f419fc5`. Database binding and Workers Free plan were checked in the owner’s dashboard.
- Recovery-card PNG was downloaded and visually checked.
