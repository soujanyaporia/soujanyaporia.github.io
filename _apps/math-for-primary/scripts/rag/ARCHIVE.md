# Adapting the archive

Run these commands in the maths app workspace, with the private corpus queue, original paper library and staging database available. The app ships runnable original generators; the source archive, OCR, identity map and worker receipts stay local.

- `python3 scripts/rag-progress.py` starts the live operator tracker on <http://127.0.0.1:8878/>. Use `--report path/to/progress.html` for a standalone snapshot, or `--export path/to/progress.json` for counts.
- `python3 scripts/rag-archive.py plan` lists the next units across P1–P6 without calling a model. The plan chooses an open paper in each level, favours resuming a partially processed paper and preserves the order of its remaining source units. Papers with no indexed units are visible in the census and need source inventory.
- `python3 scripts/rag-archive.py run --batch-size 6 --batches 1 --codex /path/to/codex` executes one bounded batch. Increase the batch count for a longer run. Each paper has its own checkpoint. Current links and unresolved reviews are counted separately and skipped on resume; independent math tests run on new generators. A failed job is kept for explicit retry. Run one archive driver at a time.
- For selected source pages, use the [paper loop](PAPER-LOOP.md). For implementation details see the [dictionary](memory-README.md) and [candidate checks](README.md).

Counts answer different questions: source units are OCR regions; a current reuse receipt links one unit to a specific generator. A canonical pattern ID is a named family in the app. A preview is an actually generated, distinct visible task from the sample export. Multiple numeric versions are not new families, and multipart tasks count as a single preview. Existing source references from earlier adaptations are separate from the new run. None of these constitutes a verified source-question total or a completed paper.
