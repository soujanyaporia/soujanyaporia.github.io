#!/bin/zsh
# Wait until either Claude plan window (5-hour or weekly, as last reported by claude-exec.py) reaches the threshold
# (default 0.85, just before 90%), then run release-live.sh once. Polls a local file; makes no model calls.
SRC="/Users/poriasoujanya/Documents/Math for Primary"
U="$SRC/.generated/claude-usage.json"
T=${1:-0.85}
log() { echo "$(date '+%m-%d %H:%M:%S') $*" >> "$SRC/.generated/release-live.log"; }
log "watcher armed: release when a Claude window reaches $T"
until python3 -c "import json,sys; w=json.load(open('$U'))['windows']; sys.exit(0 if max((x or {}).get('utilization',0) for x in w.values())>=$T else 1)" 2>/dev/null; do
  sleep 60
done
log "usage reached $T ($(cat "$U")); starting release"
"$SRC/scripts/rag/release-live.sh"
