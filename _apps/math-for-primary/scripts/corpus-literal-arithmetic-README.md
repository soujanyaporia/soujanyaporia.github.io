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
