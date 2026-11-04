# Partial source-review receipts

`corpus-partial-review-import.py` converts a curated manifest of individual visually reviewed response units into ledger events. It does **not** declare a complete paper, supersede an OCR region, or review all of a page. The manifest must provide each source PDF path and SHA-256, physical page, question identifier, original givens, constraints, response format, independent source answer, structural rationale, generator requirements, diagram dependency, and a hashed source-page image. Any response-format scaffolding must be explained; exclude a match when changed options supply necessary givens or otherwise change the mathematical task. Original generator numerals need not match the source, but material features of the operation, representation and response must be covered.

```sh
python3 scripts/corpus-partial-review-test.py
python3 scripts/corpus-partial-review-import.py /absolute/curated-manifest.json /absolute/passing-vitest-report.json --ledger /absolute/coverage/ledger.sqlite --output /absolute/new/events.json
python3 scripts/corpus-ledger.py record /absolute/new/events.json
```

The importer opens the ledger read-only and writes a new event batch. It checks source and image hashes, refuses a previously completed paper inventory and duplicate reviewed question IDs, verifies named solver suites passed after the tracked source files were last modified, and checks existing-template implementation fingerprints. New-template events bind the generator, tracked dependencies, independent solver and report hashes. Test sample counts and mathematical equivalence remain reviewer declarations that must be checked against the actual tests; a test report alone cannot establish equivalence. Recording is a separate explicit ledger operation. The immutable manifest and report must remain available for ledger evidence verification.

For the first batch, `corpus-partial-review-prepare-batch2.py` curates only individually checked units from the local Early, Upper, and reuse reviews. It records differences between source and app answer presentation and omits unresolved source configurations. It is a batch-specific preparation script, not a general automatic mapper. Test fixtures exercise a successful unit, source-hash drift, and protection of a complete paper inventory.
