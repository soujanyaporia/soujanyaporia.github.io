# Literal arithmetic review leads

This read-only queue identifies a narrow class of OCR regions that appear to contain one complete literal arithmetic expression. It builds and exactly evaluates an operation tree, records decimal precision and regrouping where relevant, and proposes specific generator configurations only when their general domain can plausibly match. It preserves the source paper ID/hash, question label, page links, OCR text and hash, region block geometry/confidence, page bounds, and full page OCR. It never creates a question in the app or records ledger coverage.

```sh
python3 scripts/corpus-literal-arithmetic-test.py
python3 scripts/corpus-literal-arithmetic.py \
  --staging '/absolute/path/to/staging.sqlite' \
  --ledger '/absolute/path/to/coverage/ledger.sqlite' \
  --output '/absolute/new/review-leads.jsonl'
```

Output creation is exclusive to avoid accidentally replacing an earlier queue. The JSON summary separates candidate regions, prior-pilot-structure leads, generic app-configuration leads, and cases with no matching configuration. A previously verified pilot is labelled as such only when its current ledger status and all bound code hashes agree; stale local versions are marked explicitly. A generic sampler is not promoted to a verified source mapping simply because its arithmetic domain resembles the OCR text.

The classifier excludes source regions with apparent key answers, multiple problems, missing operands, unknown symbols, diagram/rounding instructions, invalid syntax, negative intermediate results, ambiguous grade-domain features, or source pages with strong key cues. These conservative rules intentionally miss valid tasks. They do not establish that remaining OCR is faithful: visual review must check each digit and operator, source question boundaries, answer format, geometry and all material constraints. OCR can misread division as subtraction; even an arithmetically valid parsed tree is only an interpretation of the OCR. Expression evaluation is exact rational arithmetic, not independent verification of the PDF.

Counts describe OCR regions, not unique questions or patterns; duplicates and unreviewed text remain possible. No ledger event is emitted, no source PDF is copied, and no original source operand is used to seed app questions. Named pilot candidates may still require response-format or operand-precision configuration and must be checked against a fresh independent test receipt.

Version 2 also accepts a question number followed by an instruction on the same
line, explicit “Find the product of A and B” wording, and blank `Answer` tails
with optional subpart labels and punctuation. It does not remove arbitrary
footers, choices, units, source conditions, or filled-in answers.

Explicit consecutive `(a)`, `(b)`, … markers can propose separate literal tasks
only when their parent prefix contains no shared prose or conditions. Every
output retains the exact parent `rawText`, full page OCR, and block provenance.
`sourceSlice` gives the original slice and half-open offsets in **Unicode code
points**, not UTF-8 byte positions. `contentStart` marks the text after a subpart
label. `leftoverRegions` retains the parent question label and every rejected
sibling with its exact offsets/raw text and rejection reason. Unsupported
siblings earn no proposal and are never silently treated as implemented.
`candidateId` remains the parent staging identifier; `proposalId` adds the exact
slice offsets so two siblings cannot overwrite each other in downstream queues.
Adjacent number tokens such as `4 92 × 8` are rejected rather than concatenated
into `492 × 8` or guessed to mean `4.92 × 8`.

`candidateRegions` counts distinct staged parents; `candidateTasks` counts
emitted task slices. Region configuration counts may overlap, and operation
counts describe task slices. A parent with two accepted subparts is one region
and two tasks. Neither count establishes unique source questions or coverage.
Each proposal remains `unreviewed-proposal`, `visuallyReviewed: false`, and
`sourceCovered: false`, including when a prior receipt is current. Review the
full parent and leftovers before deciding whether a slice is self-contained.
