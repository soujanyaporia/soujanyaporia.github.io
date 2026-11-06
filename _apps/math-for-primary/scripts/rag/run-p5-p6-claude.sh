#!/bin/zsh
# P5 + P6 full 60-paper scope on Claude Sonnet (Codex is blocked until 5 Dec). Same flow as the Codex runner:
# generate (slim prompt) with promote every 5 min, regenerate rejected jobs, second --retry-failed pass.
# census-build's gate paces jobs against the plan windows (75% of 5 h, 85% weekly), so no probe calls are made here.
# If the breaker trips (usage limit hit by other Claude use), wait 30 min and resume, up to 12 times per pass.
cd "/Users/poriasoujanya/Documents/Math for Primary" || exit 1
B=scripts/census-build.py
G=(--engine claude --model sonnet --effort high --timeout 900 --breaker 4 --job-share 0.03 --start-gap 45 --usage-cap 0.88)
LOG=.generated/census-build-full-scope.log
log() { echo "$(date +%H:%M:%S) $*" >> $LOG; }

pass() {  # level workers logname
  local L=$1 W=$2 N=$3 D=.generated/census-build-p$1
  for try in {1..12}; do
    log "P$L generate --workers $W ${G[*]} --retry-failed ($N, try $try)"
    python3 -I $B --level $L generate --workers $W $G --retry-failed >> $D/$N.log 2>&1 &
    local P=$!
    while kill -0 $P 2>/dev/null; do sleep 300; python3 -I $B --level $L promote >> $D/promote-loop.log 2>&1; done
    wait $P; local rc=$?
    python3 -I $B --level $L promote >> $D/promote-loop.log 2>&1
    [ $rc -eq 3 ] || return 0
    log "P$L breaker tripped (usage limit?); waiting 30 min"; sleep 1800
  done
}

run_level() {  # level workers
  local L=$1 W=$2 D=.generated/census-build-p$1
  pass $L $W sonnet-1
  python3 -I $B --level $L regenerate >> $D/sonnet-regenerate.log 2>&1
  pass $L $W sonnet-2
  log "P$L full scope finished: $(python3 -I $B --level $L status | head -1)"
}

log "P5/P6 Sonnet run starting"
run_level 6 ${W6:-2} &
sleep 20
run_level 5 ${W5:-2} &
wait
log "P5/P6 Sonnet run done"
