# Source-to-template review leads

`corpus-template-reuse.py` searches the local staging database for narrowly worded task excerpts associated with independently verified pilot structures. It produces review leads only, not coverage. It opens staging and ledger read-only, refuses to overwrite its output, and checks that target structures are currently implemented and independently verified in the ledger. It does not create ledger events.

```sh
python3 scripts/corpus-template-reuse-test.py
python3 scripts/corpus-template-reuse.py --staging /absolute/path/staging.sqlite --ledger /absolute/path/coverage/ledger.sqlite --output /absolute/new/path/proposals.jsonl
```

Each row preserves the complete raw OCR region, exact match and offsets, source identity and hash, region block geometry/confidence, complete extracted text for every linked page, and source diagram dependencies. Original PDF paths and page references remain local. Review all pages, repair merged/missing boundaries, verify givens/conditions/units/diagrams, independently solve, and check exact generator constraints and answer format. Matching text is only a triage lead: it might occur in an answer key, an embedded subpart, a question with missing context, or an unsupported numerical domain. It does not identify duplicate PDFs or establish that whole regions are equivalent.

The separate `.generated/corpus-template-reuse/reviewed-examples.json` records two manual page checks, one reviewed structural match inside a merged region and one operation match needing a template extension. Neither is a ledger coverage event. A verified pattern can have a narrower parameter range than a source question (the rounding pilot uses three decimal places; a two-decimal source requires a new parameterization). Rule-level candidate counts count regions/matches rather than questions or distinct strategies.
