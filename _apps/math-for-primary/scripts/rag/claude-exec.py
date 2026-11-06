#!/usr/bin/env -S python3 -I
"""Claude Code stand-in for the `codex exec` call made by rag-generator-worker.py.

The worker runs:  <this> exec --sandbox read-only --skip-git-repo-check --ephemeral --output-schema S
                         --output-last-message O --json [-i IMAGE]... -      (prompt on stdin, cwd = job folder)
This runs `claude -p` with no tools, the same JSON schema as structured output, and the page images attached
as image blocks, then writes the structured result to O. Selected by census-build.py generate --engine claude.
Model: $RAG_CLAUDE_MODEL (default sonnet). Effort: $RAG_CODEX_EFFORT (default high). Binary: $RAG_CLAUDE_BIN.
"""
import base64, json, os, subprocess, sys
from pathlib import Path

DEFAULT_BIN = Path.home() / 'Library/Application Support/Claude/claude-code/2.1.317/91184d3d9ba3/claude.app/Contents/MacOS/claude'
SYSTEM = ('You write and review question-generator modules for a Singapore primary mathematics app. Follow the '
          'user message exactly. You have no tools: everything you need is in the message and the attached page '
          'images. Reply only with the structured output the schema asks for.')
APP = Path(__file__).resolve().parents[2]
# Reference files every packet carries verbatim; sent once in the fixed system prompt so Claude's prompt cache
# reuses them across jobs instead of re-reading ~20k tokens per call. Only moved when identical to the app file.
SHARED = ('src/school/curriculum.ts', 'src/primary/generate.ts', 'src/primary/answerFormat.ts', 'src/primary/gridDrawingModel.ts',
          'src/primary/paperImports/batch6MiddleResponse.ts', 'src/primary/paperPicture.ts')
USAGE = APP / '.generated/claude-usage.json'  # latest plan-window utilisation, read by census-build's pacing gate
MARK = '\n\nUNTRUSTED RETRIEVAL PACKET JSON:\n'
MEDIA = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif'}
# Child-session variables from the desktop app must not leak into the headless run.
DROP = ('CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_HOST_SESSION_ID', 'CLAUDE_CODE_MESSAGING_SOCKET',
        'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_SIMPLE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_CHILD_SESSION',
        'CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_PID', 'CLAUDE_EFFORT')


def parse(argv):
    if not argv or argv[0] != 'exec':
        sys.exit('claude-exec: expected "exec" as the first argument')
    schema = out = None
    images, i = [], 1
    while i < len(argv):
        a = argv[i]
        if a in ('--output-schema', '--output-last-message', '-i', '--sandbox', '-m', '-c'):
            v = argv[i + 1]
            if a == '--output-schema': schema = v
            elif a == '--output-last-message': out = v
            elif a == '-i': images.append(v)
            i += 2
        else:
            i += 1  # --skip-git-repo-check, --ephemeral, --json, '-'
    if not schema or not out:
        sys.exit('claude-exec: --output-schema and --output-last-message are required')
    return schema, out, images


def split_shared(prompt):
    """Move SHARED reference files out of the packet JSON into the system prompt (same text for every job)."""
    disk = {rel: (APP / rel).read_text(encoding='utf-8') for rel in SHARED if (APP / rel).is_file()}
    system = SYSTEM + '\n\nTRUSTED REFERENCE FILES (current app source). Packet referenceFiles entries whose content says ' \
        '"[in system prompt]" are these files, verbatim:\n' + ''.join(f'\n===== {rel} =====\n{disk[rel]}\n' for rel in SHARED if rel in disk)
    head, sep, body = prompt.partition(MARK)
    if not sep:
        return SYSTEM, prompt
    try:
        packet = json.loads(body)
    except json.JSONDecodeError:
        return SYSTEM, prompt
    moved = 0
    for f in packet.get('referenceFiles') or []:
        if isinstance(f, dict) and disk.get(f.get('path')) is not None and f.get('content') == disk[f['path']]:
            f['content'] = '[in system prompt]'; moved += 1
    return (system, head + sep + json.dumps(packet, ensure_ascii=False)) if moved else (SYSTEM, prompt)


def main():
    schema, out, images = parse(sys.argv[1:])
    system, prompt = split_shared(sys.stdin.read())
    content = [{'type': 'text', 'text': prompt}]
    for p in images:
        content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': MEDIA.get(Path(p).suffix.lower(), 'image/png'),
                                                     'data': base64.b64encode(Path(p).read_bytes()).decode()}})
    msg = json.dumps({'type': 'user', 'message': {'role': 'user', 'content': content}})
    cmd = [os.environ.get('RAG_CLAUDE_BIN', str(DEFAULT_BIN)), '-p', '--input-format', 'stream-json',
           '--output-format', 'stream-json', '--verbose', '--json-schema', Path(schema).read_text(encoding='utf-8'),
           '--model', os.environ.get('RAG_CLAUDE_MODEL', 'sonnet'), '--effort', os.environ.get('RAG_CODEX_EFFORT', 'high'),
           '--tools', '', '--no-session-persistence', '--strict-mcp-config', '--safe-mode', '--disable-slash-commands',
           '--system-prompt', system]
    env = {k: v for k, v in os.environ.items() if k not in DROP}
    proc = subprocess.run(cmd, input=msg + '\n', capture_output=True, text=True, env=env)
    result = None
    for line in proc.stdout.splitlines():
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if ev.get('type') == 'result':
            result = ev
        elif ev.get('type') == 'rate_limit_event':
            windows = (ev.get('rate_limit_info') or {}).get('unifiedWindows')
            if windows:
                tmp = USAGE.with_suffix(f'.{os.getpid()}.tmp')
                tmp.write_text(json.dumps({'windows': windows, 'status': ev['rate_limit_info'].get('status')}))
                os.replace(tmp, USAGE)
    if not result:
        sys.stderr.write(f'Codex exited 1: claude produced no result (exit {proc.returncode}): {proc.stderr[-2000:]}\n')
        return 1
    if result.get('is_error') or result.get('structured_output') is None:
        why = str(result.get('result') or result.get('subtype') or 'no structured output')[:2000]
        # 'Codex exited 1' / 'rate limit' keep census-build's circuit breaker working for usage limits and outages.
        tag = 'rate limit' if any(w in why.lower() for w in ('limit', 'overloaded', '429', 'authenticate')) else 'model error'
        sys.stderr.write(f'Codex exited 1: claude {tag}: {why}\n')
        return 1
    Path(out).write_text(json.dumps(result['structured_output'], ensure_ascii=False), encoding='utf-8')
    usage = result.get('usage') or {}
    with open(APP / '.generated/claude-calls.jsonl', 'a') as log:  # per-call token use, for pacing estimates
        log.write(json.dumps({'job': Path.cwd().name, 'model': list((result.get('modelUsage') or {}).keys()),
                              'ms': result.get('duration_ms'), 'cost_usd': result.get('total_cost_usd'),
                              **{k: usage.get(k) for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens')},
                              'thinking': (usage.get('output_tokens_details') or {}).get('thinking_tokens')}) + '\n')
    sys.stdout.write(json.dumps({'engine': 'claude', 'cost_usd': result.get('total_cost_usd'), 'turns': result.get('num_turns'),
                                 'input_tokens': usage.get('input_tokens'), 'output_tokens': usage.get('output_tokens')}) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
