# Encrypted Cloud Pass deployment

Production Worker (deployed 5 November 2026): [https://sg-primary-maths-sync.sg-primary-maths-sync.workers.dev](https://sg-primary-maths-sync.sg-primary-maths-sync.workers.dev/api/v1/health). The database is `sg-primary-maths-db` on the owner’s Workers Free account.

This frontend stays on GitHub Pages. The independent Worker stores opaque encrypted profiles in D1. School-account infrastructure is separate and unchanged.

## 1. Install and authenticate

From the app root:

```sh
cd cloudflare-worker
npm ci
npx wrangler login
```

Use a Cloudflare account on **Workers Free**. Do not enable a paid subscription or paid add-ons. This implementation does not configure billing or automatically upgrade plans.

## 2. Create D1

```sh
npx wrangler d1 create sg-primary-maths-db
```

Copy the returned database UUID into `cloudflare-worker/wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`. Keep the binding named `DB` and database name `sg-primary-maths-db`. The UUID is configuration, not a secret. Never place Cloudflare API tokens in frontend environment variables.

## 3. Apply the schema

Run from `cloudflare-worker/`:

```sh
npx wrangler d1 execute sg-primary-maths-db --local --file=./schema.sql
npx wrangler d1 execute sg-primary-maths-db --remote --file=./schema.sql
```

Local development:

```sh
npm run dev
```

In a second terminal at the app root:

```sh
VITE_CLOUD_SYNC_URL=http://localhost:8787 npm run dev
```

The frontend normally runs at `http://localhost:5174/singapore-primary-maths/`. Allowed development origins include ports 5173, 5174, 4173 and localhost:3000. Use localhost for browser Web Crypto during development; an ordinary HTTP LAN IP is not a secure context.

## 4. Validate and deploy the Worker

From the app root, run `npm test` and `npm run build`. Then:

```sh
cd cloudflare-worker
npm run typecheck
npx wrangler deploy
```

Wrangler returns a URL like `https://sg-primary-maths-sync.YOUR-SUBDOMAIN.workers.dev`. Check it:

```sh
curl --fail 'https://sg-primary-maths-sync.YOUR-SUBDOMAIN.workers.dev/api/v1/health'
```

Expected response: `{"ok":true,"service":"sg-primary-maths-sync"}`. For data endpoint tests, include an allowed `Origin` header. Production origin must be **`https://soujanyaporia.github.io`**, with no path or Markdown syntax. Once development is complete, the production allowlist can be narrowed to that origin. CORS is a browser control, not authentication; the write token protects mutation.

## 5. Build and publish the static frontend

At the app root, create `.env.production.local` (ignored by Git) containing:

```dotenv
VITE_CLOUD_SYNC_URL=https://sg-primary-maths-sync.YOUR-SUBDOMAIN.workers.dev
```

Then:

```sh
npm run build
```

Publish the resulting **`dist/`**, including `sw.js` and `assets/`, through the existing GitHub Pages workflow. This project's existing release repository mirrors source under `_apps/math-for-primary/` in `soujanyaporia.github.io`; if GitHub Actions builds that source, set `VITE_CLOUD_SYNC_URL` in the build job's environment (a repository variable is sufficient). Copying an ignored local `.env` is not necessary or recommended. Do not publish `.private/`, `.recovery/`, `.wrangler/`, databases, credentials or `node_modules/`.

The URL is embedded at build time, not read dynamically by GitHub Pages. A missing URL deliberately leaves cloud activation disabled while local learning, backup-file export and import remain usable. There is no guessed production API fallback.

Test the deployed page with a disposable code: create → earn progress → restore in another browser → merge → shared-device logout. Check the recovery QR stays under `#/guest?restore=...` and is immediately scrubbed to `#/guest`. Do not post a real recovery code, key or backup contents in an issue, screenshot or support message.

## Free-plan limits and operating behavior

Checked 5 November 2026 against [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/):

- Workers Free: 100,000 requests/day; D1 Free: 5 million rows read/day and 100,000 rows written/day.
- D1 storage: **500 MB per free database**, **5 GB total across the account**. This deployment uses one database, so its limit is 500 MB. Index maintenance also counts toward D1 writes/storage.
- Hitting free limits can reject requests. The app retains personal-device changes, shows that cloud saving failed, and retries transient failures. It never switches to a paid plan. Provider prices, quotas and service availability cannot be guaranteed forever.
- Ciphertext is capped at 131,072 Base64 characters (~96 KB encrypted bytes). The client compresses JSON with native gzip inside AES-GCM where supported. Oversized backups fail visibly; data is not truncated. Encrypted file export has a larger local limit.
- Throttling is an in-memory, per-isolate sliding window: 60 reads/minute and 30 writes/minute per IP. It is best-effort, resets with isolates, and is not distributed abuse protection. A busy school may share an IP; rejected changes remain on devices.
- Observability logs are disabled in the shipped Wrangler configuration. Do not enable body/header logging or analytics that capture credentials. Cloudflare and GitHub still process connection metadata; IPs are used temporarily by the limiter, not stored in D1.

## Cryptographic and data semantics

Four words plus a number from 10–99 gives `256^4 * 90` possibilities, about **38.5 bits**. This is the requested memorable format, with 150,000-iteration PBKDF2-SHA256 and domain-separated salts. It is susceptible to offline guessing if a database is compromised; it is not equivalent to a random 128-bit recovery key. Anyone with the full code can read, overwrite or delete that backup. Recovery is impossible without the code or an authenticated personal device.

AES-GCM uses a fresh 12-byte IV and AAD `accountId:v1`. The AES key never enters a request. D1 stores `SHA256(writeToken)` instead of the write token. Code, nickname, avatar and learning records never appear in API URLs or plaintext bodies. The QR library is bundled locally and makes no network request. URL fragments are excluded from HTTP requests, but copied links and browser screenshots can reveal a code. Boot scrubs the fragment before importing the app. No external analytics or QR service is added.

PUT **requires** `baseRevision` (0 for creation). Existing writes atomically compare and increment the revision; conflicts return 409 and cause pull/decrypt/merge/retry. This deliberately strengthens the draft specification, whose read-then-unconditional-update algorithm could lose simultaneous changes. A stale client does not silently recreate a deleted backup.

Merges preserve map IDs, best results, unlocked cosmetics, legacy reward floors and Singapore practice-date unions. Old aggregate counts use maxima, not sums that would double-count replicated work. This cannot reconstruct independent old events that were never retained. The existing weekend/shield streak behavior is retained; legacy streak anchors preserve counts when old date histories are incomplete. Newer checkpoints win with deterministic ties. Concurrent answers within the same unfinished checkpoint resolve by the requested timestamp policy, not a per-keystroke collaborative editor.

Personal-device derived keys are stored in `sg_maths_cloud_session_v1`; the full passphrase is only held temporarily in memory. Shared mode stores **both progress and credentials in sessionStorage**, clears the persistent guest copy, and requires a successful final sync before Finish & Log Out. Do not close a shared tab while it has unsaved offline work. Browser tab/session restoration may preserve sessionStorage; always use the explicit logout button on a shared machine. Local storage is not protection against someone who controls the browser or site JavaScript.

The production app precaches its ~3 MB static shell and lesson/activity code after an online visit. Core interactive learning then works offline; videos, optional prerecorded audio, school-server pages and uncached static lesson-guide pages can still need connectivity. First-ever visits require a connection. Cloud APIs are excluded from the service-worker cache. Network calls during tab shutdown are best effort, so the app does not claim a completed cloud save until acknowledged.

Deleting the cloud backup removes the live D1 row. Other devices and exported files retain their copies; Cloudflare D1 Time Travel can retain older versions for **7 days on Free**. This feature is privacy-oriented engineering, not a legal certification of PDPA compliance. Consult the [PDPC guidelines for children's data](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-pdpa-for-children%27s-personal-data-in-the-digital-environment_mar24.pdf) and the service's actual operational practices before making legal assurances. (The app provides no email/name-based account recovery.)

## Rollback

Unset `VITE_CLOUD_SYNC_URL` and rebuild to disable new cloud connections without removing on-device learning. Existing encrypted D1 rows remain until explicitly deleted. Existing browser keys and progress are not silently erased. Keep an encrypted file backup and its recovery card before destructive database operations.
