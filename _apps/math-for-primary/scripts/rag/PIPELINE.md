# Local adaptation loop

The pipeline connects the existing corpus queue, source retriever and isolated generator worker. It does not extract the PDFs again, recluster the corpus, edit application files, integrate candidates, publish a release or write source coverage.

Prepare one private source packet per grade:

```sh
python3 scripts/rag-pipeline.py prepare --per-grade 1 --render
python3 scripts/rag-pipeline.py status
```

`prepare` does **not** launch Codex. It reuses the existing text-cluster representatives and starts with P1 money, P2 time, P3 measurement, P4/P5 decimal quantities and P6 ratio. Further slots cycle other topic gaps. Selection favours word problems, linked subparts and necessary figures while avoiding repeated source papers when alternatives exist. These are provisional retrieval priorities, not verified reasoning-family classifications.

The default private work directory is `.generated/rag-pipeline`. To choose another directory, place the global option before the command:

```sh
python3 scripts/rag-pipeline.py --work-dir /private/path/adaptations prepare --per-grade 2 --render
```

`--per-grade` is a **total target**, so repeating the same prepare command resumes the selected jobs rather than adding another batch. Raising it adds unseen representatives. Use repeatable `--level 3 --level 4` to target grades, `--seed` for deterministic tie-breaking, or `--pattern-id` to restrict candidates to an existing provisional template-match target. A pattern filter is a reuse lead, not proof of equivalence. Existing exact source associations are excluded from duplicate selection but never treated as source-coverage evidence. Interrupted retrieval resumes automatically; `prepare --retry-failed` explicitly retries retrieval failures.

When worker execution is authorized, run at most two generator processes with an explicit independent check command:

```sh
python3 scripts/rag-pipeline.py run --workers 2 --limit 6 \
  --check-command-json '["node","/absolute/app/scripts/rag-check-candidate.mjs","--app-root","/absolute/app"]'
```

Every executable and argument is a separate JSON-array element. No shell command is evaluated. Check commands run in the worker's private job folder. The supplied candidate checker copies app source into that folder, typechecks the candidate there and runs its staged tests. Without checks, new code remains `generated`, never `checks-passed`.

`run` records worker errors and timeouts as `failed`, continues other jobs, and exits nonzero if any job failed. `run --retry-failed` explicitly retries worker failures. Existing terminal jobs are not regenerated. Resume verifies the immutable retrieval packet and terminal candidate/code hashes; it refuses a different check-command list. To use a new check protocol, use a separately reviewed work directory rather than silently overwriting old evidence. The worker also validates its checkpoint before returning an existing terminal candidate.

`--workers` permits only 1 or 2. `--codex` forwards a chosen executable path as one argument. `--worker-timeout` defaults to 600 seconds, and the outer `--job-timeout` defaults to 4,200 seconds so bounded repair attempts can finish. `--max-repairs` still permits only 0, 1 or 2 repairs. A pipeline lock prevents overlapping prepare/run commands in the same work directory; read-only status remains available. The worker independently maintains two slot locks and a per-job lock.

## Refresh after a code integration or failed trial

Before launching any eligible worker, `run` compares the packet’s recorded inventory hash with the current inventory. A stale packet is refused, so the next source must consult the newly integrated generators rather than an earlier reference list. `run --inventory PATH` can select an explicit current inventory. This preflight is a freshness check, not a claim that lexical matches prove equivalence.

Refresh failed or `needs-review` jobs explicitly, using the same source bank line:

```sh
python3 scripts/rag-pipeline.py refresh --level 1 --level 2 --level 5 --level 6 --render
```

To refresh prepared packets only when their generator inventory is stale, select the intended jobs and enable the additional condition:

```sh
python3 scripts/rag-pipeline.py refresh --job-id JOB_ID --prepared-if-stale --render
```

Fresh prepared jobs are skipped as a no-op and listed in `skippedFreshJobs`; repeating this refresh is idempotent. A selection containing both fresh and stale prepared packets refreshes only the stale ones. Level selectors include every eligible failed/review job in that grade, so use `--job-id` when an older review gap should remain untouched. Generated, reused, checked, integrated or deployed outcomes are never reset by this command.

Refresh first copies the old packet directory, source images, worker checkpoint and candidates, logs, complete job row and event history into `history/JOB_ID/revision-…`. The archive manifest records file hashes, and `job_archives` records its hash and previous row. The original files remain in place. An active worker’s job lock prevents refresh.

The same source candidate, paper, page list and hashes remain attached to the logical job. A new versioned packet uses current inventory/code and a new retrieval job ID, even if the source text itself is unchanged. Only current generation state is reset: attempts return to zero, prior worker results remain archived, and integration/deployment fields stay untouched. A failed or interrupted refresh remains visible and resumes through ordinary retrieval recovery; it never becomes a silent success. Refresh retrieves and renders evidence but never launches Codex.

## Persistent state

`pipeline.sqlite` stores:

- `corpus_papers`: every paper from the existing source queue, with grade, source hash and region/page counts. The initial corpus has 2,406 papers and 116,085 retained OCR regions. Unselected regions stay addressable through the recorded queue and staging snapshot.
- `jobs`: selected source bank line, original candidate ID, paper/question/pages, source and raw-text hashes, existing text-cluster ID, topic/query selection evidence, packet path/hash, worker retrieval ID, attempts and errors.
- `events`: every retrieval/worker transition and failure, tagged with generation; no silent success on subprocess failure.
- `job_archives`: immutable prior-generation row snapshots and archive manifest hashes.
- `meta`: immutable source snapshot linkage, census and selection policy.

States are `preparing`, `prepared`, `running`, `generated`, `reuse`, `needs-review`, `checks-passed` or `failed`. `generated` corresponds to the worker's `generated-unverified`. `reuse` and `needs-review` do not claim generated-code tests. `checks-passed` requires that every supplied command actually exited zero. Source mapping review is still separate.

`integrated_at` and `deployed_at` remain null. Neither generation nor passing checks sets them. Whole-paper coverage and unique corpus reasoning-pattern counts are not inferred from any state or from the text clusters.

Packets retain the whole parent region, original source IDs and numerals, all recorded source pages plus adjacent OCR context, provisional subparts, diagram dependencies, hash-verified private page images and existing-generator references. A worker must resolve ambiguous boundaries and missing figure givens or return `needs-review`. A rendered image is available evidence, not a claim that it has been visually reviewed.

## Tests without Codex

```sh
python3 -m unittest discover -s scripts/rag -p '*_test.py'
python3 scripts/rag-retrieve-test.py
```

The pipeline suite uses a tiny disposable corpus and fake subprocesses. It checks grade/paper balance, idempotent preparation, interrupted retrieval recovery, original source identity, bounded concurrency, retry behavior, honest status separation, tampered-evidence detection and literal argument handling. It never launches Codex or writes live app code.
