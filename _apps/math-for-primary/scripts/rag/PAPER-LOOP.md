# Sequential paper memory: match first, generate only when needed

The loop retrieves one original source region, compares it with a fresh compact pattern dictionary without loading generator code, and records a reuse/review receipt directly. Only a `generate` matcher decision loads selected factory/model references and invokes the generator worker. Successful code integration is visible before the next source is matched.

```sh
python3 scripts/rag-paper-loop.py prepare \
  --paper-id PAPER_ONE --paper-id PAPER_TWO --max-regions 2

python3 scripts/rag-paper-loop.py run \
  --paper-id PAPER_ONE --paper-id PAPER_TWO \
  --bank-line BANK_LINE_ONE --bank-line BANK_LINE_TWO \
  --max-regions 2 --match-timeout 600 \
  --work-dir .generated/rag-paper-loop

python3 scripts/rag-paper-loop.py status --work-dir .generated/rag-paper-loop
```

`--bank-line` is optional and repeatable. When supplied, only those exact regions are selected, and each must belong to a supplied paper. Other siblings remain unprocessed. Without it, the existing bounded pending-region order is unchanged. `--max-regions` bounds selected raw regions, not source questions or completed papers.

`prepare` and `run --dry-run` can update the private evidence inventory but never invoke a model or promote code. `status` reads the saved manifest without modifying memory. Defaults are `.generated/rag-paper-loop` for checkpoints and `.generated/rag-memory.sqlite` for private memory. No command publishes the app or grants coverage.

## Match-first order

1. Check app/inventory/registry freshness. Unchanged code avoids a full export and memory sync per source. A stale binding triggers explicit refresh; a new integration exports and syncs once. Parent question text, page IDs, subpart markers and unresolved figures remain attached to the paper.
2. Retrieve exactly the selected bank line using `rag-retrieve.py --source-only --render`. This mode reads no generator inventory or code. It preserves full source context and hashed page images, and returns empty generator/reference arrays. The retriever's default behavior for other pipelines is unchanged.
3. Run `rag-match.py` with the source packet and fresh SQLite memory. Its prompt receives only source evidence and at most Top-K compact same-grade descriptors. It receives no generator files, examples or code/history context. `--memory-limit` defaults to 5, maximum 20. The matcher checks source/response constraints and returns `match`, `review` or `generate`; its decision remains a provisional source association.
4. A match writes a worker-compatible `reuse` receipt, and review writes `needs-review`. The loop records either directly from the matcher directory without invoking the generator worker or promoter. Unknown or stale reuse targets are rejected by durable memory.
5. Only `generate` builds a separate immutable generation packet. It includes at most two selected generators' current hashed factory references plus core Question/control/curriculum references. Tests and metadata-only source files are excluded from factory loading. Current code hashes are checked before loading. The existing generator worker then writes a candidate, executes checks and records its receipt.
6. A checked new candidate is promoted only through `rag-promote.mjs` and its exact receipts/hash/duplicate checks. The loop exports updated inventory, syncs memory and records the exact registry integration before the next source lookup. A generated but unchecked candidate remains unintegrated.

No-model planning and matching never preload all source papers' generator code. Matching and generation packets are separate files and IDs. Source evidence remains private.

## Checkpoints and retries

`loop.json` retains ordered papers, exact selected source identities, packet generations, match and code-worker directories, hashes, outcomes and transitions. Source packets, matcher evidence and generation packets are immutable within a generation. Prior generations remain on disk. Packet writes are explicitly contained in the private work directory; the loop rejects app-source paths and escaped packet paths before writing.

Normal resume skips integrated, reused and review outcomes. `--retry-failed` resumes saved work; interrupted promotion reuses its checked candidate instead of generating again. An unchanged saved generation packet is reused with its recorded hash. `--retry-review` deliberately creates a new source generation and matcher directory, so an old cached review cannot silently answer the retry. Reuse/review receipts whose source code context became stale are rematched. Freshness is checked again before finalizing; a concurrent app change prevents promotion.

The matcher defaults to 180 seconds per attempt (`--match-timeout`, maximum 1800); the generator defaults to 600 seconds. Both allow at most two repairs. The outer job timeout defaults to 4200 seconds. `--matcher`, `--retriever`, `--worker`, and structured check/export/promotion command overrides support isolated fixtures. No shell string is evaluated. Command placeholders are `{app}`, `{inventory}`, `{registry}` and `{job}`.

A promotion or recording failure stops the next source from proceeding against uncertain code. The source inventory and its skipped siblings never imply whole-paper completion, teacher review or verified mathematical equivalence.

## Bounded fixture demonstration

```sh
python3 -m unittest discover -s scripts/rag -p paper_loop_test.py -v
python3 scripts/rag-retrieve-test.py
```

The fixtures use real memory validation and fake matcher/model/checker/promotion processes. Across two tiny papers they assert two code-free matches, exactly one generator-worker call, one integration, and a direct second-paper reuse with no extra files. They cover no-model planning, source-only retrieval without an inventory file, review retry without another generator call, saved-candidate recovery, exact bank-line filtering, stale packet versioning, skipped repeated exports/syncs, and private-path containment with unchanged external app bytes. No real Codex invocation or live app/memory mutation is required.
