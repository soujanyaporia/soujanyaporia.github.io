# Optional deterministic reuse fast path

This is a deliberately narrow bypass for source regions that do not need a model to identify their mathematical task. It reuses `corpus-literal-arithmetic.py`; it does not re-extract PDFs, split shared stories into independent questions, recluster papers, add generators or infer corpus coverage.

```sh
python3 scripts/rag-fast-match.py scan
```

The staging database defaults to the immutable `inputs.staging` metadata in `.generated/corpus-pattern-queue.sqlite` (override with `--queue` or `--staging`), rather than a historical accounting report. The default dry run scans every retained region of all 2,406 local source papers. It writes a private report, actual generator sample proof and standard reuse receipts under `.generated/rag-fast-match`. It does **not** write shared memory, the source ledger or application files.

The initial adapter covers only whole, numbered, two-operand literal calculations with an explicit blank `Ans`/`Answer` response. It accepts a few known layout footer lines and preserves them as normalization evidence. It rejects trailing tasks, subparts, missing response evidence, printed answers and slash/fraction ambiguity. Surrounding page context rejects multiple-choice instructions and shared precision conditions. A nonmatch means this limited adapter has no proof; it does not mean the source task or pattern is absent.

Eligible targets must be currently registered Standard activities at the exact source grade, using one binary variant in `arithmeticTemplateData.ts`. Multiple-variant families and unbound response forms are excluded. The reviewed sampler implementation has a fixed SHA guard. Operand digit ranges, literal decimal precision, minimum trailing-zero steps, fixed regrouping and exact answer precision must fit the typed domain. Original operands need not be copied into generated practice.

The collector uses a private Vite cache with HMR, watching and automatic dependency discovery disabled. Before enabling a profile, the tool draws 40 actual questions through the app's current `makeQuestion` route. The existing Python exact-rational parser independently solves every accepted profile sample and checks its domain and numeric response form. These finite checks and the reviewed implementation/domain contract are hash-bound in `profile-proof.json`. They do not turn OCR into visual source verification.

The first real dry run found 38 reusable OCR regions, including 31 P4 regions, through 17 validated generator profiles and 680 independently solved generated samples. Forty-four other grammar candidates had no safe binding or context proof. P1/P2 yielded zero under this narrow rule. These are reuse opportunities, not 38 verified source questions, new patterns or new generators.

## Receipts and reviewed application

Each accepted result stages a standard schema-1 `packet.json`, a `reuse` candidate and a `checkpoint.json`. The receipt identifies an exact current activity ID. It makes no new files, claims no generated-code test execution and explicitly retains source/OCR uncertainty. It is compatible with `rag-memory.py record`.

After root reviews the report and synchronizes current memory, P4-only application is explicit:

```sh
python3 scripts/rag-fast-match.py apply .generated/rag-fast-match/report.json \
  --level 4 --limit 31 \
  --memory-db .generated/rag-memory.sqlite
```

No actual shared-memory application was performed during development. Apply uses a lock, refuses changed matcher/inventory/code/proof bindings, rechecks the saved source grammar/domain and source/target receipt identity, then calls memory's hash-validated idempotent recorder. Every successful decision is atomically saved to `.generated/rag-fast-match/applied.json` (override with `--output`), with per-grade deduplicated raw-region counts and run history. Reapplying the same receipt does not inflate counts. An interrupted run retains successful decisions and is not marked completed. A changed app requires a new scan. Integration, deployment, teacher review and whole-paper coverage remain separate.

## Focused tests

```sh
python3 -m unittest discover -s scripts/rag -p 'fast_match_test.py' -v
```

Fixtures cover complete boundaries versus fragments/options/filled answers, numeric domains and decimal precision, multiple variants and control mismatches, independently wrong generator answers, standard reuse receipt compatibility/idempotence, queue-derived input reproducibility, persistent apply counts/idempotence, and changed-evidence rejection before opening a memory database. Only disposable fixture databases are written.
