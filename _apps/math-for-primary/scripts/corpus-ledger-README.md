# Source-paper to original-pattern ledger

This pipeline accounts for the entire local Singapore paper collection. It is **not** a public PDF browser or an OCR question bank. Source papers, renders, working transcriptions, source answer keys and ledger files stay under `../Singapore Maths Paper Library/coverage/`. The app receives original question generators and original illustrations through its existing format.

## What is counted

- A **paper entry** is a catalogue record. Every one remains listed, even if several entries eventually alias the same PDF.
- A **canonical PDF** is identified by its complete SHA-256. Only identical bytes deduplicate automatically. Similar text does not merge papers.
- A **candidate region** is heuristic extraction, potentially a question, answer-key fragment, diagram label or merged set of questions. It is not counted as a verified question. The ledger retains the exact source hash, physical PDF pages, source link, original bank line/byte offsets, raw-text hash, and region fingerprint.
- A **manual response unit** is a visually reviewed question or subpart reconstructed with explicit provenance. It can replace incorrect OCR segmentation while the original candidates remain accounted for.
- A **pattern** is a reusable original mathematical structure, with parameter constraints, an original illustration and implementation/test evidence. Several school questions can map to it. An existing authored family is registered first; structural uniqueness is a separate review. Forty-two family names are not automatically forty-two unique mathematical strategies.

## Separate states

File download/integrity, extraction, source completeness, page review, candidate review, pattern mapping, implementation and independent verification have separate fields. A valid, intact downloaded PDF may itself omit printed pages or givens. A source answer key may also be wrong; retain its value and an independently derived correction in `sourceAnswerCheck` / `sourceDefects` inside the candidate review payload.

`same-structure` mappings can eventually earn source-question coverage. `partial-adaptation` mappings cannot: e.g. greatest/smallest of fractions does not cover ordering all four, and a simpler triangle does not cover a composite arrangement. Number changes or a similar keyword are not evidence of structural coverage.

A whole paper is covered only after all physical pages are visually reviewed, source completeness is confirmed, every candidate is reconciled as a reviewed question/response unit or an explicit exclusion, and all confirmed units have verified same-structure mappings. `numberedQuestionCount` and the number of answer/response units are kept distinct.

## Commands

From the app workspace:

```sh
python3 scripts/corpus-ledger.py build --rehash
python3 scripts/corpus-ledger.py status
python3 scripts/corpus-ledger.py pending --level 3 --limit 10
python3 scripts/corpus-ledger.py pending --paper PAPER_ID --limit 100
python3 scripts/corpus-ledger.py record /absolute/path/to/events.json
python3 scripts/corpus-ledger.py self-test
```

`build --rehash` verifies every complete PDF hash. Later `build` runs may reuse the verification only when file size, modification timestamp and expected hash still match the verified version. The cache records its verification time. `build` rebuilds derived data, then replays the append-only event log. `record` accepts one event or a JSON array, validates the entire batch, snapshots evidence into content-addressed local storage, appends the events, and refreshes exports. An event ID cannot be reused.

```sh
node scripts/corpus-ledger-export-patterns.mjs
python3 scripts/corpus-ledger.py record '../Singapore Maths Paper Library/coverage/imports/existing-app-patterns.events.json'
python3 scripts/corpus-ledger-import-reviewed-pages.py .generated/corpus-pattern-review.json
python3 scripts/corpus-ledger.py record '../Singapore Maths Paper Library/coverage/imports/prior-reviewed-pages.events.json'
```

The exporters skip existing registration/review event IDs on later runs; the recorder rejects duplicate IDs. The first registers existing family metadata without assigning source coverage. The second imports only the seven explicit, evidenced page reviews from that report; its unverified candidate boundaries remain unverified.

## Durable artifacts

- `ledger.sqlite`: normalized papers, pages, candidates/aliases, patterns, mappings, inventories, events and integrity issues.
- `events.jsonl`: append-only review/implementation/verification evidence; rebuilds preserve it.
- `paper-coverage.jsonl`: every paper, its source completeness and separate coverage counts.
- `candidate-coverage.jsonl`: every canonical candidate and all source aliases; incomplete/unreviewed/diagram status remains explicit.
- `patterns.json`: registered structures, confirmed aliases/distinctness and implementation versions.
- `review-queue.jsonl`: all outstanding papers, alternating P1–P6, newest first within each level.
- `summary.json`: denominators, level counts and supported evidence counts. Triage flags are not defects or coverage.
- `evidence/`: immutable artifact snapshots named by SHA-256.
- `source-hash-cache.json`: full-file integrity verification receipts.

## Evidence event envelope

```json
{
  "schemaVersion": 1,
  "eventId": "unique-stable-id",
  "type": "candidate_visually_reviewed",
  "entityType": "candidate",
  "entityId": "candidate-id-or-canonical-key",
  "recordedAt": "2026-11-04T15:00:00+00:00",
  "reviewer": "agent-or-human-review-identity",
  "evidence": [{"path": "/absolute/render-or-report", "sha256": "full-file-sha256"}],
  "payload": {
    "sourceSha256": "full-source-pdf-sha256",
    "reviewedSourcePages": [5],
    "completeness": "complete",
    "diagramDependency": "required",
    "observations": "Exact givens and relationships read from the source page.",
    "sourceAnswerCheck": {"status": "disagrees", "sourceKey": "...", "independentAnswer": "...", "reason": "..."},
    "sourceDefects": []
  }
}
```

Review events bind to canonical candidate fingerprints, so a later OCR re-segmentation cannot silently transfer review credit to a different region. Source changes or missing references require explicit reconciliation.

Supported payloads (the Python validator is authoritative):

| Event | Required evidence/details |
| --- | --- |
| `pattern_registered` | Title, mathematical structural description; optional `structuralSignature`. No uniqueness/coverage inferred. |
| `pattern_distinct_reviewed` | Structural signature, explicit compared-pattern IDs, distinctness rationale. |
| `pattern_alias_reviewed` | Existing canonical pattern ID and mathematical equivalence rationale. |
| `source_integrity_reviewed` | `completeness`: complete/incomplete, notes, issues; optional source role: exam/answer-only/mixed. |
| `page_visually_reviewed` | Page key `SHA:physical-page`, substantive observations, source render/report. Never promotes candidates. |
| `candidate_created` | Paper ID/hash, physical pages, question/subpart number, reason for correcting segmentation. |
| `candidate_visually_reviewed` | All referenced pages; complete/incomplete/not-question; required/not-required/uncertain diagram dependency; observations and optional source-key defects. |
| `candidate_superseded` | Explicit full manual source inventory, all source pages reviewed, reviewed replacement-unit IDs. Raw OCR is retained as superseded, not promoted to a reviewed question. |
| `pattern_mapped` | Visually complete candidate, resolved diagram dependency, pattern ID, same-structure/partial-adaptation, structural rationale and source-variant requirements. |
| `pattern_implemented` | Generator ID, original illustration ID, parameter constraints, code path/hash; original content and parameterised numbers both true. |
| `pattern_independently_verified` | Matching implementation hash; `independent-visible-givens-solver` method; solver path/hash; sample count and tested parameter scope. A generator proof tree does not qualify. |
| `mapping_independently_verified` | Verified pattern, same-structure mapping, source hash and explicit explanation that all source variant requirements are covered by the tested generator. |
| `paper_inventory_reviewed` | Source-complete paper, all PDF pages reviewed, exhaustive confirmed/excluded candidate ID lists (source-incomplete units stay explicit), reconciled unit count, optional numbered-question count, segmentation checked. |

Changed implementation code invalidates implementation/verification credit on rebuild or export. Re-registering its new version also resets its mapped verification. Evidence remains historical and is not overwritten. Independently solving a generator does not by itself show that it covers a particular source question.


## Reviewed whole-paper pilots

```sh
python3 scripts/corpus-ledger-import-pilot.py .generated/paper-pilot/p1-henry-park-2025/review.json --incomplete-parts 21.equation,21.answer
python3 scripts/corpus-ledger-import-pilot.py .generated/paper-pilot/p2-henry-park-2025/review.json
python3 scripts/corpus-ledger-import-response-review.py .generated/paper-imports/p3-raffles-2025-review.json
```

These generate explicit event batches for recording with the main CLI. The first preserves the P1 Q21 interpretation caution and missing pages in the rejected Quiz4 source. The second matches the uploaded PDF to its canonical library paper by complete file hash, preserves P3 Q13's missing tick and Q23a's incorrect source key, and distinguishes 25 numbered questions from37 response fields. Neither importer promotes reported test counts into implementation/verification credit. A `--revision` value identifies an explicit subsequent source-review update; old evidence remains immutable.

Run the independent P1/P3 solvers and register their current implementation versions:

```sh
npx vitest run src/primary/paperImports/p1HenryPark2025.test.ts src/primary/paperImports/p3Raffles2025.test.ts --maxWorkers=1 --reporter=json --outputFile='../Singapore Maths Paper Library/coverage/imports/pilot-independent-tests.json'
python3 scripts/corpus-ledger-register-pilot-implementations.py '../Singapore Maths Paper Library/coverage/imports/pilot-independent-tests.json'
python3 scripts/corpus-ledger.py record '../Singapore Maths Paper Library/coverage/imports/pilot-implementations.events.json'
```

The registrar checks both named solver files passed and rejects files edited after the test run began. Each receipt binds generator, metadata, specialised renderer/model/CSS dependencies and independent solver hashes. A dependency change invalidates credit on rebuild, even if the main generator is unchanged. Test scope records which task variants and finite seed ranges were solved; it is not an exhaustive mathematical proof. The source exceptions remain unverified even where a newly authored, unambiguous app variant passes its solver.

For P2/P4, run their named test files with a fresh JSON report and pass `--only p2` or `--only p4` to the registrar. P2 also binds the shared equation and grouping controls used by its tests. All current receipts bind the shared answer grader and response-format/grouping validators. `--only p1,p2,p3,p4` accepts a combined report. New source importers require an explicit registry namespace and image naming prefix unless the paper is one of the reviewed pilots; this prevents an unrelated paper being registered under another source's namespace.

For further papers, `--spec-file /absolute/reviewed-implementation-spec.json` accepts an object or list with `namespace`, `sourceManifest` (workspace-relative), `module`, `solver`, `solverExport`, `files`, `generator`, `samplesPerVariant`, `sampling`, and `sourceKey` (`parts` or `entries`). Module, solver and dependency paths are relative to `src/primary/paperImports`. Use a namespace such as `pilot:p5-school-year:` and select it with `--only p5`. The specified sample count and solver scope must be manually checked against the actual test loops; merely supplying a passing test report does not establish mathematical independence. Source inventory registration must already exist. Public integration and deployment remain a separate release check.
