# Full-scope build prompt for P1–P4 (paste into Codex)

Give one agent one level (replace `N`), or one agent all four levels, run one level at a time. Run from the app root
(`/Users/poriasoujanya/Documents/Math for Primary`). The scripts call `codex exec`, so the session needs network
access.

---

You are finishing the generator build for **Primary N**. The earlier pass built only the most frequent families
(about 80% of the gap questions, the `--top` list). **The goal now is every family in the level's 60-paper work
list.** Do not run the all-paper census sweep.

State at about 15:00 on 5 Nov (check it yourself with `status`):

| Level | Work list | Packets built | Live generators | Earlier pass |
|---|---|---|---|---|
| P1 | 123 | 55 | 52 | done |
| P2 | 150 | 70 | 65 | done |
| P3 | 201 | 99 | 81 | finishing (`--retry-failed` run active) |
| P4 | 287 | 129 | 20 | running |

## Rules

- `src/` changes only through `census-build.py promote`, which uses `scripts/rag-promote.mjs`. That tool is
  lock-safe: it waits for `.rag-promotion-lock`, accepts a candidate when only other RAG promotions changed `src`,
  and rechecks automatically after any other source change.
- Never run two `generate` processes for the same level. Before starting one, check:
  `pgrep -fl "census-build.py --level N generate"`. If one is running, wait for it to exit.
- Workers: use `--workers 2` while three or more levels are generating, `--workers 3` otherwise. The machine has 8
  cores, and the root is running P5 and P6 at the same time.
- Leave families under `routed` in `worklist.json` alone. Those are placed at other levels, and the root handles
  them in a cross-level pass.
- Do not bump `PRACTICE_PAPER_VERSION`, `DAILY_PLAN_VERSION` or kind versions. Do not deploy. Do not touch other
  levels' `census-build-p*` folders. The root does the version bump, the school-API sync and the full test suite
  once, at the end.
- Do not rewrite `scripts/census-build.py` or `scripts/pattern-census.py`. If something genuinely breaks, make the
  smallest fix and report it.

## Steps for level N

1. **Finish the earlier pass.** If a `generate` for level N is still running, wait for it. Then run:

   ```sh
   python3 -I scripts/census-build.py --level N promote
   python3 -I scripts/census-build.py --level N regenerate
   ```

   `promote` retries any checked job that is not live yet. A job rejected for a brief-related reason (non-empty
   `blockingGaps` or a duplicate `canonicalPatternId`) gets a `promotion-rejected.json` marker, and `regenerate`
   sets those aside so they are rebuilt with the corrected brief.

2. **Build packets for the whole work list.** No `--top` means every family:

   ```sh
   python3 -I scripts/census-build.py --level N packets
   ```

   Packets that already exist are kept. A family with no usable sample question prints `no examples:` and is
   skipped; list those in your report.

3. **Generate and promote everything.** Finished jobs are skipped, and `--retry-failed` also reruns failed or
   stale-`running` jobs:

   ```sh
   python3 -I scripts/census-build.py --level N generate --workers 2 --retry-failed
   python3 -I scripts/census-build.py --level N promote
   ```

   You can run `promote` every few minutes in a second shell while generation continues. That is safe.

4. **Mop up:**

   ```sh
   python3 -I scripts/census-build.py --level N regenerate
   python3 -I scripts/census-build.py --level N generate --workers 2 --retry-failed
   python3 -I scripts/census-build.py --level N promote
   python3 -I scripts/census-build.py --level N status
   ```

   Repeat step 4 once if `status` still shows `failed` jobs or checked jobs that are not live.

## Quality check (read, don't skip)

- Pick 5 random generators promoted in this run. Print 4 seeds each: context, prompt, choices, answer and worked
  steps. Do this in a scratch copy of the app: copy `src`, `package.json`, `tsconfig.json` and `vite.config.ts`,
  symlink `node_modules`, and add a temporary vitest file. Never do it in the real `src/`. Solve each question
  yourself. Report any wrong answer, unclear wording, or a figure that is needed but missing.
- Run `npx tsc --noEmit -p .` and `npx vitest run src/primary/paperImports/rag` in the real app. Both must pass.

## Report back

For level N:

- Work list size; and generators live in the app before → after (count entries with `"level": N` in
  `src/primary/paperImports/ragRegistry.json`).
- Job states from `status`: checks-passed / live / reuse / needs-review / failed.
- Every **needs-review** family with its `blockingGaps`, grouped by cause, e.g. "figure type not supported:
  protractor", "ambiguous source". This is the backlog for new diagram types.
- Families skipped for `no examples`.
- Quality-check findings and any script fix you made.

Say plainly that this covers the families in the 60-paper sample, not every paper, and that source mappings remain
unaudited.
