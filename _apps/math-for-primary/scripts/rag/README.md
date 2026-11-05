# Isolated retrieval-augmented generator worker

`rag-generator-worker.py` accepts one schema-1 retrieval packet and asks an existing authenticated Codex CLI for a structured candidate. It treats retrieved source text, reference files and images as untrusted evidence. The worker never integrates code into the app, publishes it, or records source coverage. It stages only new `candidate/src/primary/paperImports/rag*.ts` or `.tsx` files, including a `rag*.test.ts`, under a job folder, checks returned source IDs and pages against the packet, and rejects paths to existing app files, shared routes or configuration.

```sh
python3 scripts/rag-generator-worker.py /private/path/packet.json \
  --jobs-dir /private/path/jobs \
  --timeout 180 --max-repairs 2
```

Each job creates a checkpoint, numbered structured outputs and (for a new generator) its candidate files. Hash-verified source-page PNG/JPEG/WebP images under the packet or job directory are attached to the CLI; missing cited page text forces a needs-review decision. The two local slot locks prevent more than two workers using the same jobs directory; a per-job lock prevents concurrent writes to the same job. `--resume` returns a terminal checkpoint only after verifying the packet, check-command list, candidate JSON and staged file hashes. Failed or interrupted jobs can be retried. Use a private jobs directory: packets, feedback and test output can contain locally licensed paper content.

A generated candidate is **not checked** merely because the model proposed tests. With no explicit check commands its status is `generated-unverified`. The standard checker copies the app's `src`, `package.json`, `tsconfig.json`, and `vite.config.ts` into a private `validation-app/`, symlinks the existing `node_modules`, overlays only staged files, then runs TypeScript and every new candidate test. It also creates a temporary promotion-contract test covering metadata, known skill IDs, readiness, grading, negative answers and deterministic questions across 20 seeds. It requires at least one passing test in every candidate test file and records snapshot/config/candidate hashes in `rag-check-report.json`.

```sh
python3 scripts/rag-generator-worker.py /private/path/packet.json \
  --jobs-dir /private/path/jobs \
  --check-command-json '["node","/absolute/path/to/scripts/rag-check-candidate.mjs","--app-root","/absolute/path/to/app"]'
```

Commands run sequentially from the isolated job directory with `shell=False` and bounded timeout; shell interpreters are rejected. `checks-passed` means only that all supplied commands exited zero, not that the source mapping or the substance of candidate tests has been independently reviewed. The snapshot prevents ordinary source writes to the app but is **not a security sandbox**: generated test code is executable and the snapshot links existing dependencies. Use only in an appropriately isolated environment. Failed checks and validation errors can be fed back for up to two repair attempts. `reuse` and `needs-review` contain no new files and do not assert tests passed.

No real CLI invocation occurs in the mock test suite:

```sh
python3 -m unittest discover -s scripts/rag -p '*_test.py'
node --test scripts/rag/check-candidate.test.mjs
```

A separate reviewer must examine source-page fidelity, correctness, safety, grade alignment and whether a proposed reuse really matches. Importing, integration and whole-paper coverage are separate actions.

## Index-first provisional matching

`rag-match.py` reads one source packet and the current compact memory index. It sends the selected source text/pages and hash-verified images plus a small metadata-only shortlist to the model: no generator code, example history or reference files are sent. The command refuses stale memory and maintains bounded retries and worker locks.

```sh
python3 scripts/rag-match.py /private/source-only-packet.json \
  --jobs-dir /private/match-jobs --app-root /absolute/path/to/app
```

`reuse` is a provisional match, with a standard packet/checkpoint/candidate bridge that `rag-memory.py record` can accept; it is not source-coverage proof. `needs-review` preserves gaps. `generate` means only that a complete source item had no apparent match in the supplied shortlist; it contains no code and should trigger code retrieval and generation as a separate stage. Unknown sources, missing cited text or missing diagram evidence must be reviewed. The source retriever must be run in source-only mode for the entire process to avoid loading app code before matching.
