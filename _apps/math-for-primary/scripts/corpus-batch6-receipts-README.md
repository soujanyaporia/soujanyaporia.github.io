# Batch 6 evidence refresh

Run only after all source manifests, generator files and the combined independent-test report are frozen. Preparation reads the ledger but does not record events:

```sh
python3 scripts/corpus-batch6-prepare-receipts.py --extra-spec /absolute/p2-spec.json --extra-spec /absolute/p4-spec.json
```

Import and record each new whole-paper source using `corpus-ledger-import-pilot.py` with its reviewed manifest and explicit namespace. Respect any `--incomplete-parts` required by the source; missing source facts cannot be promoted to implemented coverage. The stock importer reuses an existing partial candidate only on matching paper, source part and page. Review every inventory and overlap before recording.

With all new source patterns registered, use the final passing JSON report:

```sh
python3 scripts/corpus-ledger-register-pilot-implementations.py /absolute/final-tests.json --spec-file .generated/corpus-template-reuse/batch6-refresh/whole-implementation-specs.json --only p1,p2,p3,p4,p5,p6,p3tn25,OTHER_NEW_SELECTORS
python3 scripts/corpus-ledger.py record '../Singapore Maths Paper Library/coverage/imports/pilot-implementations.events.json'
```

`OTHER_NEW_SELECTORS` are the segments before the first hyphen of each additional spec namespace's second colon-delimited field. List them exactly; remove that placeholder. The registrar checks solver suites and file modification times, and binds the shared structured grading helper in every implementation fingerprint.

Then, serially, pass the seven filtered manifests in the order printed by the preparation script to `corpus-partial-review-import.py`, using the same final report and a *new* event output path for each. Record each resulting batch before processing the next. Existing pilot patterns must be refreshed first; batch3-upper must precede batch4-upper-reuse. The preparation script skips the two previously partial source units now present in complete inventories, checks the surviving same-structure mappings against the ledger, and includes the shared grading helper in each refreshed fingerprint. It does not add source units or promote OCR regions. Old manifests and reports remain archived as historical evidence.

Finally compare the live summary to the prior baseline (245 independently verified source units, 9 complete inventories and 7 strict covered papers), audit all overlaps and source exceptions, and report new responses separately from previously verified ones. Do not infer a global count of unique mathematical patterns.
