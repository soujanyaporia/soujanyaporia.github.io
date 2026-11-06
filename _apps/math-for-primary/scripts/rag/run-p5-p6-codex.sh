#!/bin/zsh
# P5 + P6 full 60-paper scope on Codex, the 2026-11-05 16:05 mode (8 + 8 workers, promote every 5 min, regenerate
# rejected jobs, second --retry-failed pass). gpt-6-astra is not offered to this ChatGPT login any more, so it uses
# gpt-6-luna at high effort. Stops at once if Codex is not usable (usage limit / model refused).
cd "/Users/poriasoujanya/Documents/Math for Primary" || exit 1
B=scripts/census-build.py
G=(--model gpt-6-luna --effort high --breaker 6)
LOG=.generated/census-build-full-scope.log
log() { echo "$(date +%H:%M:%S) $*" >> $LOG; }

T=$(mktemp -d)
echo '{"type":"object","additionalProperties":false,"properties":{"answer":{"type":"string"}},"required":["answer"]}' > $T/s.json
(cd $T && echo 'Return JSON with answer set to ok.' | RAG_CODEX_MODEL=gpt-6-luna RAG_CODEX_EFFORT=low \
  "/Users/poriasoujanya/Documents/Math for Primary/scripts/rag/codex-effort.sh" exec --sandbox read-only \
  --skip-git-repo-check --ephemeral --output-schema s.json --output-last-message o.json - > /dev/null 2> err)
if ! grep -q '"ok"' $T/o.json 2>/dev/null; then
  echo "Codex not usable: $(grep -m1 ERROR $T/err)"; log "P5/P6 Codex run not started: $(grep -m1 ERROR $T/err)"; exit 2
fi

run_level() {  # level workers
  local L=$1 W=$2 D=.generated/census-build-p$1
  log "P$L full scope (codex): generate --workers $W ${G[*]} --retry-failed"
  python3 -I $B --level $L generate --workers $W $G --retry-failed > $D/codex-1.log 2>&1 &
  local P=$!
  while kill -0 $P 2>/dev/null; do sleep 300; python3 -I $B --level $L promote >> $D/promote-loop.log 2>&1; done
  python3 -I $B --level $L promote >> $D/promote-loop.log 2>&1
  python3 -I $B --level $L regenerate >> $D/codex-regenerate.log 2>&1
  python3 -I $B --level $L generate --workers $W $G --retry-failed > $D/codex-2.log 2>&1
  python3 -I $B --level $L promote >> $D/promote-loop.log 2>&1
  log "P$L full scope finished: $(python3 -I $B --level $L status | head -1)"
}

run_level 5 ${W5:-8} &
run_level 6 ${W6:-8} &
wait
log "P5/P6 codex run done"
