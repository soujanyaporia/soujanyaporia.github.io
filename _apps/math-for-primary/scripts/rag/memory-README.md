# Durable adaptation memory

`rag-memory.py` stores the generator inventory, code versions and per-paper adaptation decisions in a private SQLite database. A census entry only identifies a downloaded paper. Ingesting its OCR regions preserves parent text, original pages, question identity, subpart marker offsets and unresolved diagrams; it does not mean the paper was read or completed.

Use the existing staging/queue, without OCR or model calls:

```sh
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite sync --app-root .
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite ingest --paper-id PAPER_ID
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite inspect --paper-id PAPER_ID
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite query --app-root . --level 3 --query 'equal bottle capacity' --limit 5
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite inspect-generator --generator-id ACTIVITY_ID
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite record --app-root . --job PRIVATE_WORKER_JOB
python3 scripts/rag-memory.py --database .generated/rag-memory.sqlite status --app-root .
```

`sync` accepts optional `--inventory`, `--registry` and `--queue` paths. `ingest` accepts `--queue`. The default database is `.generated/rag-memory.sqlite`. This database and job receipts are private: they may contain source OCR, local PDF paths and model reasoning, and must not be published as application assets.

## Paper-by-paper sequence

1. Export the current app inventory, then `sync`. This records known families, descriptions, skill IDs, sampled examples and file bindings. RAG code is available only if every committed registry file still matches its expected hash. Historical versions are retained.
2. `ingest --paper-id` imports every retained source region for that paper from the queue and existing staging snapshot. `pendingBankLines` identifies regions without a current reuse or code-integrated association. It is an orchestration queue, **not** a count of fully understood or unimplemented source questions; regions can contain several subparts or source fragments.
3. Retrieve the complete source region plus current `query` memory before generating. Attach `memory_revision` to the retrieval packet as `selection.memoryRevision`. An existing family can be reused with no new generator files; unknown or stale reuse targets are rejected.
4. `record` validates an actual terminal worker checkpoint, immutable packet/candidate/code hashes, source PDF hashes, cited source IDs/pages and, for checked code, the bound checker report. A new-generator proposal is recorded separately from code availability.
5. Only after a successful exact registry promotion, export the app inventory and `sync` again, then `record` that same job again. The exact registry job, packet, candidate, check report, source association and code-file hashes must match to append a `code-integrated` event. The next paper can then find and reuse this family. No model call is made by memory commands.

`reuse`, `new-generator`, `needs-review` and `code-integrated` are separate durable outcomes. A needs-review region remains pending. Source completeness always remains unknown: these are code associations and automated receipts, not teacher review or coverage claims.

Blocking gaps and the worker's reasoning are retained as searchable evidence. `query` returns `reviewBacklog` alongside generators, matching terms such as missing diagram controls, ambiguous subpart boundaries or grade alignment. Each gap retains its source references and original job; it is labelled historical because later UI/code changes may have resolved it without revisiting that source decision. This backlog remains searchable even while code bindings are stale.

## Freshness and history

Every output exposes `memory_revision`, a deterministic hash of semantic database state, excluding timestamps. Unchanged sync/ingest/record operations are idempotent. `status`, `query` and `inspect` open SQLite read-only. `status --app-root` reports `fresh`, inventory/registry hashes and current/indexed code hashes. A changed binding makes queries return no available generators until an explicit sync. Source-region inspection also treats associations as pending while indexed bindings are stale.

The conservative runtime snapshot hashes primary app TypeScript/TSX (including tests), random helpers and curriculum. A change anywhere in that scope can invalidate a prior runtime binding; this is deliberately broader than an exact generator dependency analysis. Sync records a new version and invalidation history without claiming it reran mathematical tests. A changed RAG factory/test remains unavailable if the registry's expected hash is stale, even after sync. Prior source mappings retain their original `codeVersion`; query results mark whether each mapping still binds the current version. Declared constraints and sampled examples are descriptive evidence, not guarantees of a complete parameter domain.

Tables: `code_snapshots`, `generators`, `generator_versions`, `binding_invalidations`, `papers`, `regions`, `decisions`, `decision_sources`, `decision_outcomes`, `meta`. There is no verified-coverage or paper-complete flag.

## Compressed matching dictionary

`pattern_dictionary` stores one compact current descriptor per generator; persistent `pattern_fts` uses SQLite FTS5/BM25 for retrieval. Only changed descriptors replace their FTS rows, and inactive generators leave the current search index. Matching descriptors contain grade/skill tags, a short objective, canonical ID, response shapes, response field counts, representations and observed numeric forms. Each serialized descriptor is at most 600 characters. Queries obey top-K and include only code path/hash references and at most three prior source identities, never full code, OCR, sampled examples or model reasoning. Full declarations, examples, code-version bindings and source evidence are available on demand through `inspect-generator` / `inspect_generator(db, generator_id)`.

`structuralSignature` hashes number-normalized sampled wording plus response/control constraints; `numericSignature` hashes observed numeric forms and any explicitly declared constraints. `exactSignature` combines those fingerprints. Changing numbers within the same observed form can retain a signature; changing wording, decimal requirements or multipart response shape can change it. A shared signature is only an exact lookup hint over these sampled features, **not mathematical equivalence**. Different multipart shapes within a canonical family remain separate candidates. `responseShapeMismatch` exposes provisional source-text hints such as two labelled parts versus one response field, or a drawing request versus a numeric-only task, for the next reranking/review step; it does not silently discard uncertain candidates.

Memory revisions use content-addressed row leaves in 256 fixed hash buckets. SQL triggers mark changed row keys; within the same write transaction, `revise` refreshes only affected leaves and buckets before hashing the bucket roots. An unchanged call reads no source rows or leaves. Full OCR bodies, sampled examples, model reasoning and full code snapshots remain in separate evidence tables; revision leaves use their stable content addresses and compact metadata. `revision_recompute(db)` performs a full independent verification when explicitly needed. Existing databases bootstrap the new index once without deleting historical records; the first version-2 revision hash can differ from the old scan-based hash. Repeating the same operation thereafter retains its revision. The tracking schema and dirty markers are transactional, so rollback restores both data and revision.

Python integration uses `connect(path)`, `sync(db, app, inventory, registry, queue=None)`, `ingest(db, paper_id, queue)`, `inspect_paper(db, paper_id)`, `record(db, job, app)`, `query(db, app, level, text, limit)` and `freshness(db, app)`.

Run bounded fixtures:

```sh
python3 -m unittest discover -s scripts/rag -p memory_test.py
```

The fixtures also compare incremental revisions with a fresh full recomputation after inserts, updates, deletes, rollback and reopen, verify legacy migration and history retention, and inspect SQL traces for no full-table scan on unchanged or single-row revisions.
