# Local structured OCR staging

`corpus-structure.py` prepares the **entire existing local corpus** for faster mathematical source review. It does not add source material to the app, download PDFs, call a paid model, generate practice questions, or grant coverage. The existing `corpus-ledger.py` remains the authority for reviewed inventories, mathematical mappings, implementations and independent verification.

The search index provides text lookup and the coverage ledger records evidence. This additional staging database connects the complete page context to each region's text, geometry, confidence, quantity inventory, proposed subparts and review dependencies. Reviewers can work from prepared bundles without repeatedly locating/reconstructing OCR and can inspect potential repeated text together. Short numerical fragments stay in a separate `boundary-and-context-reconciliation` triage track; they are not omitted. Every original candidate remains individually addressable, including headers, answer fragments, duplicate IDs, uncertain regions and merged questions.

## Build and inspect

From the app workspace:

```sh
python3 scripts/corpus-structure.py build
python3 scripts/corpus-structure-test.py
python3 scripts/corpus-structure.py audit '/absolute/library/structure/SNAPSHOT/staging.sqlite' --deep
python3 scripts/corpus-structure.py batch '/absolute/library/structure/SNAPSHOT/staging.sqlite' --per-level 10 --output '/absolute/library/structure/SNAPSHOT/next-60.jsonl'
```

The default library is `/Users/poriasoujanya/Documents/Singapore Maths Paper Library`. `--library /other/local/library` goes before the command. Builds use only Python's standard library. There is no model account or credit dependency.

The output directory is `LIBRARY/structure/INPUT_SNAPSHOT/`, containing:

- `staging.sqlite`: normalized preparation data and the lossless compressed snapshots.
- `audit.json`: full-corpus counts, hashes checked, byte round-trip result and explicit coverage limitations.
- `review-queue.jsonl`: one representative per **unverified number-normalized text cluster**, alternating P1–P6. Within each level, substantive mathematical text candidates come before boundary/context fragments, then newest papers and larger candidate-repeat groups first. All members remain in SQLite.
- Any explicitly requested review batch. A batch includes the representative's complete original candidate record and full extracted source-page context, proposed subparts, unresolved source diagram dependencies and all member identities/source pages.

Snapshots are keyed by the SHA-256 receipts of both manifests, every page JSONL and the complete candidate bank, plus the algorithm schema version. Bump `VERSION` when changing extraction or clustering semantics. Existing snapshots and review batches are preserved. A new source snapshot gets a separate directory. An existing completed snapshot is reused; `audit --deep` rechecks its inputs. An interrupted `.building` database is deliberately retained for inspection and must be explicitly removed before retrying that snapshot. No source artifact or coverage event is changed.

## What is preserved

- Every catalogue paper ID, declared complete PDF SHA-256, local source path, full catalogue record and full digitization record. PDFs remain in their existing private library paths. **The staging build does not rehash source PDFs**; PDF integrity verification belongs to the existing coverage ledger.
- Exact bytes of both source manifests and every original candidate/page JSONL line, including unknown fields, whitespace and newline spelling, compressed using zlib. `source_artifacts` stores the complete file hash/size; rows store original line/byte offsets, lengths and individual raw-line hashes. The deep audit reconstructs the original file hashes from stored raw lines.
- Every physical page, all its text/native text/metadata, original coordinate system and page dimensions, recognition mode, confidence and all OCR/native blocks. Page blocks outside candidates remain available for boundary and context review.
- Every raw candidate in original bank-line order, with its own row even if IDs or text repeat. Full raw text and quantity values remain unchanged. Candidate pages, source links, original block order, bboxes, confidence and recognition modes are queryable. Exact block matches to original page lines are retained as a list, preserving ambiguity if multiple lines match.
- Candidate boundaries as originally supplied, with status `heuristic-unverified`. No missing/merged boundary is silently repaired.
- Proposed `(a)`, `(b)`, `(i)` etc. text markers, their exact character spans and an unverified next-marker span. These are **not confirmed subparts**. OCR may miss markers, mistake diagram labels for subparts, or merge columns; complete raw blocks/pages remain authoritative source context.
- An unresolved diagram/page dependency for **every region page**, even without a diagram keyword. Cue words only prioritize visual review; absence of a cue never establishes a text-only question. The source PDF and physical page retain diagrams that OCR cannot represent.

## Candidate clusters and coarse triage

The normalized-text index performs Unicode NFKC normalization, lowercasing, whitespace collapse, leading question-number removal and numeric masking. The raw source, quantity strings and offsets are kept separately. Cluster keys include level and region kind. Different numerical values, including values that change difficulty or solvability, can enter one cluster; each member still requires source-level checking.

Coarse family buckets use level, candidate kind, keyword tags, the sequence of numeric placeholders/operators/selected relational words, count of proposed subpart markers and presence of visual cues. These are search/triage conveniences. They are not structural mathematical signatures and cannot establish equivalence, uniqueness, full information, diagram structure, parameter constraints, answer correctness or content coverage. Neither similar text nor a similar bucket earns ledger credit. Blank/unclassified/non-question/low-confidence/cross-page material remains explicit and is never discarded.

Example queries:

```sql
-- All source variants of an unverified text cluster.
SELECT bank_line, candidate_id, paper_id, source_sha256, page_numbers_json,
       raw_text, number_profile_json
FROM regions WHERE text_cluster_id = 'text:FULL_HASH' ORDER BY bank_line;

-- Context and geometry omitted by the original candidate segmentation.
SELECT block_index, text, bbox_json, confidence
FROM page_blocks WHERE paper_id = 'PAPER_ID' AND page_number = 5
ORDER BY block_index;

-- Candidate subparts and geometry needing source review.
SELECT * FROM subpart_candidates WHERE bank_line = 123;
SELECT * FROM region_blocks WHERE bank_line = 123 ORDER BY block_index;
SELECT * FROM diagram_dependencies WHERE bank_line = 123;

-- Inspect all possible members before declaring a mathematical family.
SELECT r.bank_line, p.level, p.title, r.raw_text
FROM regions r JOIN papers p USING(paper_id)
WHERE r.family_bucket_id = 'family:FULL_HASH' ORDER BY r.bank_line;
```

## Review and coverage boundary

`exact_source_coverage=0`, `answer_verified=0`, `visual_review_required=1` and `completeness='unknown'` are enforced for staged regions. Database constraints reject unsupported verification/coverage flags. This queue intentionally does not replace or inherit prior reviewed-pilot ledger credit; consult the ledger to avoid repeating completed reviews.

A reviewer still needs to inspect each source page and diagram, repair candidate boundaries, reconstruct every question/subpart and missing given, independently solve it, and then identify or author an original same-structure generator. The existing ledger records that evidence. Looking at one cluster representative does not clear the other members. The acceleration is bulk preparation, shared context retrieval and candidate grouping; it does not automate mathematical verification.

The tests exercise exact CRLF/unknown-field preservation, duplicate candidate IDs, uncertain cross-page context, geometry matching, marker spans, no false coverage, repeated builds, overwrite rejection and source drift detection. `audit --deep` validates all actual input hashes, SQLite integrity/foreign keys, every stored line hash and byte offset, complete raw file round-trips, and cluster/bucket membership totals against all raw regions.
