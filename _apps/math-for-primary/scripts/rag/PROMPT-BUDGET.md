# Generator prompt budget (analysis of 2026-11-05, written 2026-11-06)

## What happened
- 20:17 `--engine claude` (`claude -p`, Sonnet 5.5, effort high) was started on P1–P6 with 10 workers. The Claude
  5-hour window, already mostly used by the long Opus orchestration session (≈490k-token context per turn), hit
  100% at 20:23.
- At the 21:20 reset every waiting worker started together. 28 model calls in 21:22–21:27 took a **fresh** 5-hour
  window to 112% (weekly 55% → 61%). The account was locked until 02:20.
- The gate checked usage only before a job started. Usage is reported only after a call finishes, so 10 jobs already
  in flight carried it past the 0.90 cap. The runner's `probe()` also made a call every 10 minutes while waiting.

## Cost per call (29 logged calls, `.generated/claude-calls.jsonl`)
Fitted: cache write $4/M, output $10/M. Mean cost was $0.35 per call ($10.28 total).
- Input, 61%: the user message averaged 54k tokens and is written to cache every time, but each one is unique.
  - Whole-grade generator index (`existingGenerators` beyond the top 5, about 134 entries): 49k characters, about 20k tokens.
    It is redundant for census packets, because the census match already removed covered patterns and the promoter
    rejects duplicates.
  - Extra example reference files: about 10k tokens. Source page texts: about 6k. Page images at 1600 px: about 2.8k tokens each.
  - Core reference files (about 37k tokens) are already in the cached system prompt, which is cheap.
- Output, 38%: averaged 13.5k tokens, 8.3k of them thinking.

## Fixes (code only; nothing was run)
- `rag-generator-worker.py --slim-prompt`, which `census-build.py generate` now passes by default (`--full-prompt` turns it off).
  It changes only what the model is sent; the stored packet, its digest and the checker are unchanged. It keeps the
  top 5 generators and at most 2 extra reference files, puts the core files first (a shared prefix, so Codex can cache it),
  scales images down to 1280 px and trims repair feedback to 4k characters per stream.
  Offline result over the 1,234 packets still to run: the Claude user message goes from a mean of 48.9k to 27.1k tokens (−45%).
  Expected cost per call is about −30% at effort high and about −40% at medium.
- `claude_gate`: one job start every `--start-gap` seconds (45). It counts the expected share of running jobs
  (`--job-share` 0.04) before starting another. Defaults are now `--usage-cap 0.75` and `--weekly-cap 0.85`.

## Scale
About 1,234 jobs, roughly 1,480 calls with repairs. At slim cost one 5-hour window holds about 35 calls, and a week about 670
(if nothing else uses the account). The full scope on this Claude plan would need about 2 weeks of the whole allowance.
Top families by gap questions: 323 cover 50% and 732 cover 80% of the remaining gap questions.
Run long batches from a plain terminal, not under a long-context Claude session that wakes on every event.
