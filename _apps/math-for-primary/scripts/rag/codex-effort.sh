#!/bin/bash
# Codex CLI with a chosen reasoning effort (and optional model) for bulk generator jobs, set by
# census-build.py generate --effort/--model. The worker calls: <this> exec [options] -
#   ->  codex exec [-m $RAG_CODEX_MODEL] -c model_reasoning_effort="$RAG_CODEX_EFFORT" [options] -
model=(); [ -n "$RAG_CODEX_MODEL" ] && model=(-m "$RAG_CODEX_MODEL")
exec /Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex "$1" "${model[@]}" -c "model_reasoning_effort=\"${RAG_CODEX_EFFORT:-high}\"" "${@:2}"
