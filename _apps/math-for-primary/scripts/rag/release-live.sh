#!/bin/zsh
# Publish the current app source to GitHub Pages: snapshot (promotions paused) -> release mirror -> API shared sync,
# build and tests -> app tests and production build -> commit -> push master -> wait for the Pages workflow -> check
# the live asset. Aborts without pushing on any failure. --dry-run stops before the commit and restores the mirror.
# GitHub Actions re-runs the tests and deploys only if they pass. The school API (ChatGPT Sites) is NOT deployed here.
set -u
SRC="/Users/poriasoujanya/Documents/Math for Primary"
REL="/Users/poriasoujanya/Documents/GitHub/singapore-primary-maths-release"
DST="$REL/_apps/math-for-primary"
LOG="$SRC/.generated/release-live.log"
LOCK="$SRC/src/primary/paperImports/.rag-promotion-lock"
SYNC_URL=https://sg-primary-maths-sync.sg-primary-maths-sync.workers.dev
LIVE=https://soujanyaporia.github.io/singapore-primary-maths/
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1
HAVE_LOCK=0
log() { echo "$(date '+%m-%d %H:%M:%S') $*" >> "$LOG"; }
cleanup() {
  [ $HAVE_LOCK -eq 1 ] && rmdir "$LOCK" 2>/dev/null && HAVE_LOCK=0
  rm -f "$DST/node_modules" "$DST/school-api/node_modules"
  rm -rf "$DST/dist" "$DST/dist-legacy" "$DST/school-api/dist"
}
restore() { cd "$REL" && git checkout -q -- _apps/math-for-primary && git clean -fdq _apps/math-for-primary; }
fail() { log "RELEASE ABORT: $*"; cleanup; restore; exit 1; }
trap 'fail "interrupted"' INT TERM

log "release start (dry=$DRY)"
cd "$REL" || fail "no release checkout"
git fetch -q origin || fail "git fetch failed"
[ -z "$(git status --porcelain)" ] || fail "release checkout has uncommitted changes"
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/master)" ]; then
  git merge-base --is-ancestor HEAD origin/master && git merge -q --ff-only origin/master || fail "release branch diverged from origin/master"
fi
BASE=$(git rev-parse HEAD)

for i in {1..120}; do mkdir "$LOCK" 2>/dev/null && { HAVE_LOCK=1; break; }; sleep 5; done
[ $HAVE_LOCK -eq 1 ] || fail "could not pause promotions (lock busy 10 min)"
rsync -rlptD --delete --checksum --exclude 'node_modules' --exclude 'dist/' --exclude 'dist-legacy/' --exclude '.generated/' \
  --exclude '.tools/' --exclude '.private/' --exclude '.recovery/' --exclude '.git/' --exclude '.claude/' --exclude '.env*' \
  --exclude '*.sqlite*' --exclude '*.log' --exclude '*.tar.gz' --exclude '.DS_Store' --exclude '.wrangler/' \
  --exclude '__pycache__/' --exclude '.rag-promotion-lock/' "$SRC/" "$DST/" || fail "rsync failed"
rmdir "$LOCK"; HAVE_LOCK=0
log "snapshot copied; promotions resumed"

ln -s "$SRC/node_modules" "$DST/node_modules"; ln -s "$SRC/school-api/node_modules" "$DST/school-api/node_modules"
cd "$DST/school-api" || fail "no school-api"
node sync-shared.mjs > "$SRC/.generated/release-api.log" 2>&1 && npm run build >> "$SRC/.generated/release-api.log" 2>&1 \
  && npm test >> "$SRC/.generated/release-api.log" 2>&1 || fail "school API sync/build/test failed (.generated/release-api.log)"
cd "$DST"
npx vitest run --maxWorkers=4 --testTimeout=30000 >"$SRC/.generated/release-tests.log" 2>&1 || fail "app tests failed (.generated/release-tests.log)"
TESTS=$(grep -E "^ +Tests " "$SRC/.generated/release-tests.log" | tail -1 | sed -E 's/ +/ /g')
VITE_CLOUD_SYNC_URL=$SYNC_URL npm run build > "$SRC/.generated/release-build.log" 2>&1 || fail "production build failed (.generated/release-build.log)"
ASSET=$(grep -o -E 'assets/index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1)
log "checks passed: $TESTS; build asset $ASSET"
cleanup

cd "$REL"
git add -A _apps/math-for-primary
if git diff --cached --name-only | grep -E -i '(^|/)(\.env|\.private/|\.recovery/|node_modules/|dist/)|\.sqlite|\.dev\.vars' ; then
  fail "staged files include something private or built"
fi
OUTSIDE=$(git diff --cached --name-only | grep -v '^_apps/math-for-primary/' | head -1)
[ -z "$OUTSIDE" ] || fail "staged change outside the app: $OUTSIDE"
NEW=$(git diff --cached --name-only --diff-filter=A -- '_apps/math-for-primary/src/primary/paperImports/rag*.ts' | grep -v -c '\.test\.ts$')
if [ $DRY -eq 1 ]; then
  log "DRY RUN OK: would commit $(git diff --cached --name-only | wc -l | tr -d ' ') files ($NEW new generators); nothing pushed"
  git reset -q; restore; exit 0
fi
[ -n "$(git diff --cached --name-only)" ] || { log "RELEASE DONE: nothing new to publish"; exit 0; }
git commit -q -F - <<EOF || fail "commit failed"
Add $NEW census-built practice-paper question generators

Generators built from the P1-P6 pattern census of 60 sample papers, each
checked by an independent solver test before promotion. Practice-paper and
daily-plan versions move to $(sed -n -E "s/^export const PRACTICE_PAPER_VERSION=([0-9]+);/\1/p" "$SRC/src/primary/practicePaper.ts") so saved papers regenerate with the new
patterns. Local checks: $TESTS; production build passed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
COMMIT=$(git rev-parse HEAD)
git push -q origin HEAD:master || { git reset -q --hard "$BASE"; fail "push rejected (commit undone locally)"; }
log "pushed $COMMIT to master"

RUN=""
for i in {1..30}; do
  RUN=$(gh run list --repo soujanyaporia/soujanyaporia.github.io --branch master --limit 10 --json databaseId,headSha \
        --jq ".[] | select(.headSha==\"$COMMIT\") | .databaseId" 2>/dev/null | head -1)
  [ -n "$RUN" ] && break; sleep 20
done
[ -n "$RUN" ] || { log "RELEASE PUSHED, workflow not found after 10 min ($COMMIT)"; exit 1; }
gh run watch "$RUN" --repo soujanyaporia/soujanyaporia.github.io --exit-status > "$SRC/.generated/release-workflow.log" 2>&1
RC=$?
LIVEASSET=""
for i in {1..30}; do
  LIVEASSET=$(curl -fsSL "$LIVE?release=$COMMIT" | grep -o -E 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
  [ "$LIVEASSET" = "$ASSET" ] && break; sleep 20
done
python3 - "$SRC/.generated/release-status.json" "$COMMIT" "$RUN" "$RC" "$TESTS" "$LIVEASSET" "$ASSET" "$NEW" <<'PY'
import json, sys
p, commit, run, rc, tests, live, local, new = sys.argv[1:]
try: prior = json.load(open(p))
except Exception: prior = {}
prior.pop('priorRelease', None)
json.dump({'frontendCommit': commit, 'workflow': int(run), 'deployment': 'succeeded' if rc == '0' else 'failed',
           'appTests': tests, 'liveAsset': live, 'assetMatchesLocalBuild': live == local, 'newGenerators': int(new),
           'apiDeployed': False, 'priorRelease': prior}, open(p, 'w'), indent=2)
PY
if [ $RC -eq 0 ] && [ "$LIVEASSET" = "$ASSET" ]; then log "RELEASE DONE: $COMMIT live (workflow $RUN, asset $ASSET)"
else log "RELEASE PUSHED BUT NOT CONFIRMED LIVE: workflow $RUN exit $RC, live asset '$LIVEASSET' vs local '$ASSET'"; exit 1; fi
