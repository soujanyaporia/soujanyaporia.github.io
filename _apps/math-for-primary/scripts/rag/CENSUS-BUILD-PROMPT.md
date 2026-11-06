# Census build prompt (paste into Codex, one agent per level)

Replace `N` with the level (1–4). Run from the app root. The scripts call `codex exec`, so the session needs network
access (or run the commands yourself in a terminal).

---

You are turning the **pattern census for Primary N** into app generators. The root session already did this for P5
with `scripts/census-build.py` (pilot: 3 of 3 families passed checks first time and were promoted; typecheck and RAG
tests pass). Use the same script and settings. Do not rewrite it. If it genuinely breaks for your level, make the
smallest fix and report it.

## Preconditions

`.generated/pattern-census-pN/` must contain the finished 60-paper census: `report.json`, `families.json` and
`match.json`. If `families.json` or `match.json` is missing, first run:

```sh
python3 -I scripts/pattern-census.py --level N family --workers 3
python3 -I scripts/pattern-census.py --level N match --workers 3
python3 -I scripts/pattern-census.py --level N report
```

## Steps

```sh
python3 -I scripts/census-build.py --level N worklist
```

This prints how many families still need code at PN under the app's current curriculum. It also prints how many
families cover 50% and 80% of the gap questions (call that number `TOP80`). Families the curriculum places at other
levels are listed under `routed`. **Leave routed families alone.** The root session merges them into the right level.

```sh
python3 -I scripts/census-build.py --level N packets --top TOP80
python3 -I scripts/census-build.py --level N generate --top TOP80 --workers 3
python3 -I scripts/census-build.py --level N promote
python3 -I scripts/census-build.py --level N status
```

- **packets** builds one worker packet per family: three compact source examples from different papers (current
  syllabus years first), a family brief listing the gap variants, and the curriculum skill IDs.
- **generate** runs the existing isolated worker and independent checker, with up to two repairs. Each job takes
  4–7 minutes. It is resumable: rerunning skips finished jobs, and `--retry-failed` retries failures.
- **promote** is the only step that edits `src/`, through `scripts/rag-promote.mjs`. It is lock-safe: it waits while
  another promoter holds `.rag-promotion-lock`. It rechecks a job automatically if non-RAG source changed. You can
  run it while generation continues, and again at the end.

Use at most 3 generation workers. Other levels share the same Codex account.

To generate with Claude instead of Codex (for example when Codex is at its usage limit), add `--engine claude` to
`generate`. It runs `scripts/rag/claude-exec.py`, a drop-in for the `codex exec` call. That script uses the signed-in
Claude CLI (`claude auth status`) with no tools and the same JSON schema, and it sends the page images as image
blocks. The model comes from `--model`, default `sonnet`; `--effort` works as before. Checks and promotion are
unchanged. A Claude usage limit counts as a connection failure for `--breaker`.

When generation has finished, mop up:

```sh
python3 -I scripts/census-build.py --level N generate --top TOP80 --workers 3 --retry-failed
python3 -I scripts/census-build.py --level N promote
python3 -I scripts/census-build.py --level N regenerate
python3 -I scripts/census-build.py --level N generate --top TOP80 --workers 3
python3 -I scripts/census-build.py --level N promote
```

- `--retry-failed` reruns jobs the worker refused before starting. Under the old two-folder layout these show as
  "failed" with no job folder; they never called the model.
- `regenerate` sets aside checked jobs whose promotion was rejected for brief-related reasons: non-empty
  `blockingGaps`, or a `canonicalPatternId` that duplicates another level's. It refreshes their brief so the next
  `generate` rebuilds them. (The brief now requires empty `blockingGaps` for a new generator and a `pN-` id prefix.)
- `rag-promote.mjs` (updated 5 Nov ~14:00) accepts a candidate when only other RAG promotions changed `src` since its
  check, so promotions no longer invalidate each other. Any non-RAG source change still forces a recheck, which
  `promote` runs automatically.

### Then the rest of the work list (full scope)

The TOP80 pass puts the most frequent families in the app first. After its mop-up, continue straight into the rest of
the level's work list. No `--top` means every family:

```sh
python3 -I scripts/census-build.py --level N packets
python3 -I scripts/census-build.py --level N generate --workers 3
python3 -I scripts/census-build.py --level N promote
```

Then run the same mop-up again (`--retry-failed`, `promote`, `regenerate`, `generate`, `promote`). Jobs already
finished are skipped. Jobs in state `running` belong to another live run and are skipped unless you pass
`--retry-failed`.

## Quality check before you report (read, don't skip)

- Pick 5 random promoted generators. Print 4 seeds each: context, prompt, choices, answer and worked steps. Do this
  in a scratch copy of the app, not in `src/` (the root used a copied `src` with `node_modules` symlinked and a
  temporary vitest file). Solve each one yourself. Report any wrong answer, unclear wording or a figure that is
  needed but missing.
- Summarise the `needs-review` reasons from the job candidates (`blockingGaps`).

## Do not

- Edit any other file under `src/`.
- Bump `PRACTICE_PAPER_VERSION`, `DAILY_PLAN_VERSION` or generator kind versions. The root does that once, after
  all levels are promoted, together with the school-API shared-copy sync and the full test suite.
- Deploy or publish anything.
- Touch other levels' `census-build-p*` folders.

## Report back

- Families built, by state: checks-passed / promoted / needs-review / failed.
- The share of PN gap questions covered by promoted families.
- Quality-check findings.
- Any script fix you made.
