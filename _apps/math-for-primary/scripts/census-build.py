#!/usr/bin/env python3
"""Build generators from a pattern census: work list -> family packets -> parallel generation -> serial promotion.

  worklist  free   families still needing code (fit partial/none), placed by the app's current curriculum
  packets   free   one worker packet per family: 3 source examples (distinct papers, recent first) + family brief
  generate  model  existing isolated worker + independent checker, in parallel (2 slots per jobs dir)
  promote   free   SERIAL queue: recheck against the current src tree if needed, then rag-promote.mjs
  status    free   summary of job states

Generation never edits src/. Promotion is the only step that does, through the existing receipt-checked tool,
one job at a time, because a promotion changes src and makes every other job's check stale.
"""
import argparse, importlib.util, json, os, re, subprocess, sys, threading, time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
CODEX_EFFORT = str(APP / 'scripts/rag/codex-effort.sh')  # adds -c model_reasoning_effort=$RAG_CODEX_EFFORT
CLAUDE_EXEC = str(APP / 'scripts/rag/claude-exec.py')  # same interface as codex exec, runs claude -p (--engine claude)
spec = importlib.util.spec_from_file_location('census', APP / 'scripts/pattern-census.py')
census = importlib.util.module_from_spec(spec); spec.loader.exec_module(census)

TOPIC_CODES = {
    'whole-numbers': ['WN'], 'four-operations': ['WN', 'MD', 'AS'], 'fractions': ['FRAC'], 'decimals': ['DEC'],
    'percentage': ['PCT'], 'ratio': ['RATIO'], 'rate': ['RATE'], 'average': ['AVG'],
    'money': ['MONEY', 'DEC', 'WN', 'FRAC', 'PCT'], 'measurement': ['LENGTH', 'MASS', 'VOLUME', 'MEASURE', 'DEC'],
    'time': ['TIME'], 'area-perimeter': ['AREA', 'CIRCLE'], 'volume': ['VOL'], 'angles': ['ANGLE', 'SHAPE'],
    'geometry-shapes': ['SHAPE', 'SYM', 'SOLID', 'LINES'], 'data-graphs': ['GRAPH'], 'patterns': [],
    'algebra': ['ALG'], 'speed': ['SPEED'], 'other': []}


def curriculum():
    """{level: {code: [(skillId, title)]}} for the standard track, parsed from src/school/curriculum.ts."""
    text = (APP / 'src/school/curriculum.ts').read_text()
    out = defaultdict(dict)
    for lvl, track, code, objectives in re.findall(r"\[(\d),'(standard|foundation)',\w+,'([A-Z]+)','[^']*',\d+,'([^']*)'\]", text):
        if track == 'standard':
            out[int(lvl)][code] = [(f'P{lvl}.S.{code}.{i + 1:02d}', t) for i, t in enumerate(objectives.split('|'))]
    return out


def placement(topic, level, cur):
    codes = TOPIC_CODES.get(topic, [])
    for lv in [level, level + 1, level - 1, level + 2, level - 2]:
        if 1 <= lv <= 6 and any(c in cur[lv] for c in codes):
            return lv
    return None

# ---------------------------------------------------------------- worklist


def cmd_worklist(a):
    cdir = a.census
    ns = argparse.Namespace(out=cdir, papers=a.papers)
    regions, sample, tagged = census.current_tags(ns)
    report = json.load(open(census.out_file(ns, 'report', a.papers)))
    grouping = json.load(open(census.out_file(ns, 'grouping', a.papers)))
    families = json.load(open(census.out_file(ns, 'families', a.papers)))
    match = json.load(open(census.out_file(ns, 'match', a.papers)))
    lines = {(l['topic'], ' '.join(census.norm_pattern(l['pattern']))): l['id'] for l in json.load(open(census.out_file(ns, 'lines', a.papers)))}
    pats, line_to_pat = {}, {}
    for pid, t, g in census.pattern_list(grouping):
        pats[pid] = {'pid': pid, 'name': g['name'], 'method': g['method']}
        for lid in g['ids']:
            line_to_pat[lid] = pid
    pcount = {p['pattern']: p['count'] for p in report['patternList']}
    # source examples per pattern: (bankLine, paperId, year, questionsInRegion, textLength)
    examples = defaultdict(list)
    for g, qs in tagged.values():
        rep = regions[g['rep']]
        if rep['paperId'] not in sample:
            continue
        nq = sum(q['kind'] == 'question' for q in qs)
        for q in qs:
            pid = line_to_pat.get(lines.get((q['topic'], ' '.join(census.norm_pattern(q['pattern'])))))
            if q['kind'] == 'question' and pid:
                examples[pid].append({'bankLine': rep['bankLine'], 'paperId': rep['paperId'], 'year': rep['year'] or 0,
                                      'questions': nq, 'length': len(rep['text']), 'pages': len(rep['pages']), 'figure': q['figure']})
    cur = curriculum()
    build, routed = [], []
    for f in report['familyList']:
        topic, idx = f['family'].split(':F')
        members = families[topic][int(idx)]['ids']
        fit = lambda pid: match.get(pid, {}).get('fit', 'none')
        gap = sorted([p for p in members if fit(p) != 'same'], key=lambda p: -pcount.get(p, 0))
        if not gap:
            continue
        place = placement(topic, a.level, cur)
        item = {'familyId': f['family'], 'topic': topic, 'name': f['name'], 'method': f['method'], 'count': f['count'],
                'bestFit': f['bestFit'], 'placement': place,
                'gapPatterns': [{**pats[p], 'count': pcount.get(p, 0), 'fit': fit(p),
                                 'nearestGenerator': match.get(p, {}).get('generator', '')} for p in gap],
                'coveredPatterns': [{**pats[p], 'generator': match[p]['generator']} for p in members if fit(p) == 'same']}
        pool = [e for p in gap for e in examples.get(p, [])]
        # prefer current-syllabus years, single-question regions, moderate length; one per paper
        pool.sort(key=lambda e: (e['pages'] > 2, e['questions'] > 2, e['year'] < 2021, e['questions'] > 1, abs(e['length'] - 500)))
        chosen, papers = [], set()
        for e in pool:
            if e['paperId'] not in papers and len(chosen) < 3:
                chosen.append(e); papers.add(e['paperId'])
        item['examples'] = chosen
        item['figureEssential'] = sum(e['figure'] == 'essential' for e in pool) > len(pool) / 2
        item['gapCount'] = sum(g['count'] for g in item['gapPatterns'])
        (build if place == a.level else routed).append(item)
    build.sort(key=lambda i: -i['gapCount'])
    out = {'level': a.level, 'census': str(cdir), 'papers': a.papers, 'build': build, 'routed': routed}
    a.work.mkdir(parents=True, exist_ok=True)
    census.dump(a.work / 'worklist.json', out)
    q = report['questionOccurrences']
    gq = sum(i['gapCount'] for i in build); cum, cut = 0, {}
    for k, i in enumerate(build, 1):
        cum += i['gapCount']
        for pct in (50, 80):
            if pct not in cut and cum >= gq * pct / 100:
                cut[pct] = k
    print(f'gap questions={gq} ({gq / q:.0%} of sample); families covering 50%/80% of gap questions: {cut.get(50)}/{cut.get(80)}')
    print(f"build at P{a.level}: {len(build)} families = {sum(i['count'] for i in build) / q:.0%} of sample questions "
          f"({sum(i['bestFit'] == 'none' for i in build)} none, {sum(i['bestFit'] == 'partial' for i in build)} partial, "
          f"{sum(i['figureEssential'] for i in build)} mostly figure-essential)")
    print('routed elsewhere:', dict(Counter((i['placement'] or 'park') for i in routed)),
          dict(Counter(i['topic'] for i in routed).most_common()))

# ---------------------------------------------------------------- route

# Topics with no (or no current) curriculum code: the nearest codes a generator can honestly be tagged with.
ROUTE_FALLBACK = {'patterns': ['ALG', 'WN'], 'speed': ['RATE'], 'other': []}


def cmd_route(a):
    """Move routed families that the curriculum teaches at this level or earlier (or nowhere) into this level's
    build, tagged with the earlier level's skills: they appear in P{level} papers, so P{level} practice papers need
    them. Families the curriculum teaches only at a later level stay routed (no future-grade skills at this level)."""
    wl = json.load(open(a.work / 'worklist.json'))
    cur, src = curriculum(), wl['level']
    have = {i['familyId'] for i in wl['build']}
    keep, moved = [], Counter()
    for item in wl['routed']:
        if item['familyId'] in have:
            continue
        place = item['placement']
        if place is not None and place > src:
            item['routeDecision'] = f'curriculum-later-P{place}'
            keep.append(item); moved[item['routeDecision']] += 1
            continue
        codes = TOPIC_CODES.get(item['topic'], []) + ROUTE_FALLBACK.get(item['topic'], [])
        item['skillPairs'] = [(lv, c) for lv in range(src, 0, -1) for c in dict.fromkeys(codes) if c in cur[lv]]
        item['routeDecision'] = f'build-at-P{src}' + (f'-skills-from-P{place}' if place else '-nearest-skills')
        wl['build'].append(item); moved[item['routeDecision']] += 1
    wl['routed'] = keep
    census.dump(a.work / 'worklist.json', wl)
    print(f'P{src}: {dict(moved)}; build now {len(wl["build"])}, still routed {len(keep)}')

# ---------------------------------------------------------------- packets

FAMILY_BRIEF = '''CENSUS FAMILY BRIEF (from a pattern census of {papers} Primary {level} papers; counts are sample occurrences).
Build ONE generator for this family: "{name}" (topic {topic}; core method: {method}).
Implement the most frequent gap variants below (at most 4) inside the single makeRagQuestion, choosing the variant
deterministically from seed and index. canonicalPatternId must name the family as a lowercase slug starting with p{level}- (ids must be unique across levels).
Gap variants (count | variant | method):
{gaps}
{covered}The attached source regions are examples of these variants from different papers; use them for structure,
givens, constraints and response format only. Write original wording and numbers. If a variant needs a figure the
existing Question/picture types cannot draw, leave that variant out and say so in reasoning; choose needs-review only if no variant is buildable.
For new-generator, blockingGaps MUST be empty (the promotion tool rejects any new-generator with blocking gaps); omitted variants belong in reasoning.
Use skill IDs from this list (current curriculum): {skills}'''


def cmd_packets(a):
    wl = json.load(open(a.work / 'worklist.json'))
    cur = curriculum()
    items = wl['build'][:a.top] if a.top else wl['build']
    made = 0
    for item in items:
        d = a.work / 'packets' / item['familyId'].replace(':', '-')
        if (d / 'packet.json').exists():
            continue
        if not item['examples']:
            print('no examples:', item['familyId']); continue
        d.mkdir(parents=True, exist_ok=True)
        cmd = [sys.executable, '-I', str(APP / 'scripts/rag-retrieve.py'), '--level', str(wl['level']),
               '--query', f"{item['name']} {item['method']}", '--limit', str(len(item['examples'])), '--render',
               '--output', str(d / 'packet.json')]
        for e in item['examples']:
            cmd += ['--bank-line', str(e['bankLine'])]
        p = subprocess.run(cmd, capture_output=True, text=True, cwd=APP, timeout=300)
        if p.returncode != 0 or not (d / 'packet.json').exists():
            print('retrieve failed:', item['familyId'], p.stderr[-300:]); continue
        packet = json.load(open(d / 'packet.json'))
        lvl = wl['level']
        codes = {c for c in TOPIC_CODES.get(item['topic'], []) if c in cur[lvl]} or set(cur[lvl])
        skills = [f'{i} {t}' for c in sorted(cur[lvl]) for i, t in cur[lvl][c]]
        skills += [f'{i} {t}' for lv in range(1, lvl) for c in codes if c in cur[lv] for i, t in cur[lv][c]]
        if 'skillPairs' in item:  # routed family built here: the earlier level's skills first (see cmd_route)
            routed = [f'{i} {t}' for lv, c in item['skillPairs'] for i, t in cur[lv][c]][:60]
            skills = routed + [x for x in skills if x not in routed] if routed else skills
        covered = ''.join(f"Already in the app (do not rebuild): {c['name']} -> {c['generator']}\n" for c in item['coveredPatterns'])
        brief = FAMILY_BRIEF.format(
            papers=wl['papers'], level=lvl, name=item['name'], topic=item['topic'], method=item['method'],
            gaps='\n'.join(f"{g['count']} | {g['name']} | {g['method']}" + (f" (nearest existing: {g['nearestGenerator']})" if g['nearestGenerator'] else '')
                           for g in item['gapPatterns'][:8]),
            covered=covered, skills='; '.join(skills))
        if 'skillPairs' in item:
            brief += (f"\nPlacement: this family appears in Primary {lvl} papers but the curriculum teaches its topic earlier "
                      f"(or has no code for it). Build it as a P{lvl} generator at P{lvl} difficulty and tag it with the "
                      f"closest skill IDs above, listed nearest first.")
        for r in packet['sourceRegions']:  # the worker accepts at most 12 images: keep each region's own pages
            r['pageImages'] = [im for im in r['pageImages'] if im.get('page') in r['pageNumbers']][:4]
        while sum(len(r['pageImages']) for r in packet['sourceRegions']) > 12 and len(packet['sourceRegions']) > 1:
            packet['sourceRegions'].pop()
        packet['topic'] = item['name']
        packet['requirements'] = [brief] + packet['requirements']
        packet['censusFamily'] = {k: item[k] for k in ('familyId', 'topic', 'name', 'method', 'count', 'bestFit')}
        census.dump(d / 'packet.json', packet)
        made += 1
    print(f'packets made: {made}; total packets: {len(list((a.work / "packets").glob("*/packet.json")))}')

# ---------------------------------------------------------------- generate

lock = threading.Lock()


def job_dir_for(a, packet_path):
    """The job folder with the newest checkpoint (a retry can live in a different jobs-* folder than an old attempt)."""
    jid = json.load(open(packet_path))['jobId']
    found = [d / jid for d in a.work.glob('jobs-*') if (d / jid).is_dir()]
    if not found:
        return None
    mtime = lambda j: (j / 'checkpoint.json').stat().st_mtime if (j / 'checkpoint.json').exists() else 0
    return max(found, key=mtime)


CLAUDE_USAGE = APP / '.generated/claude-usage.json'  # written by claude-exec.py after every call


inflight, last_start = [0], [0.0]  # Claude jobs started by this run and not yet finished; time of the last start


def claude_gate(a):
    """Before a Claude job: wait until (a) the 5-hour window's utilisation plus the expected share of the jobs already
    running is below --usage-cap, (b) the weekly window is below --weekly-cap, and (c) --start-gap seconds have passed
    since the last start. (c) stops every worker firing at once when a window resets; (a) stops in-flight jobs pushing
    the window past 100% (2026-11-05: 10 workers, gate at 0.90, window went to 1.12 and locked the account for 5 h).
    Leaves headroom for the account owner's own Claude use."""
    while True:
        now, wait = time.time(), 0
        try:
            w = json.load(open(CLAUDE_USAGE))['windows']
        except (OSError, ValueError, KeyError):
            w = {}
        with lock:
            for name, cap, share in (('five_hour', a.usage_cap, a.job_share), ('seven_day', a.weekly_cap, a.job_share / 20)):
                x = w.get(name) or {}
                if x.get('utilization', 0) + inflight[0] * share >= cap and x.get('resetsAt', 0) > now:
                    wait = max(wait, (x['resetsAt'] - now + 90) if x.get('utilization', 0) >= cap else 60)
            gap = last_start[0] + a.start_gap - now
            if not wait and gap <= 0:
                inflight[0] += 1; last_start[0] = now
                return
        if wait > 60:
            print(f'[generate] Claude plan usage near cap {json.dumps(w)} (+{inflight[0]} running); waiting {wait / 60:.0f} min', flush=True)
        time.sleep(min(max(wait, gap, 1), 1800))
        try:  # after the reset the next call rewrites the file; drop the stale reading so one job can refresh it
            if w and json.load(open(CLAUDE_USAGE))['windows'] == w and \
                    all((x.get('resetsAt') or 0) <= time.time() for x in w.values() if x.get('utilization', 0) >= 0.5):
                CLAUDE_USAGE.unlink()
        except (OSError, ValueError, KeyError):
            pass


def cmd_generate(a):
    wl = json.load(open(a.work / 'worklist.json'))
    order = [i['familyId'].replace(':', '-') for i in wl['build']]
    packets = [a.work / 'packets' / f / 'packet.json' for f in order if (a.work / 'packets' / f / 'packet.json').exists()]
    if a.top:
        packets = packets[:a.top]
    todo = []
    for p in packets:
        j = job_dir_for(a, p)
        state = json.load(open(j / 'checkpoint.json')).get('status') if j and (j / 'checkpoint.json').exists() else None
        # 'running' = owned by another live run (or crashed); rerun it only with --retry-failed
        if state not in ('checks-passed', 'needs-review', 'reuse', 'generated-unverified') and (state not in ('failed', 'running') or a.retry_failed):
            todo.append(p)
    n_dirs = max(1, a.workers)  # one job folder per worker: never more than 2 jobs on a folder's 2 slots
    check = json.dumps(['node', str(APP / 'scripts/rag-check-candidate.mjs'), '--app-root', str(APP)])
    print(f'packets={len(packets)} to generate={len(todo)} workers={a.workers} jobs dirs={n_dirs}')
    t0, done = time.time(), Counter()
    stop, streak = threading.Event(), [0]  # circuit breaker: consecutive connection/model failures

    def run(i_p):
        if stop.is_set():
            return
        i, p = i_p
        if a.engine == 'claude':
            claude_gate(a)
        try:
            run_job(i, p)
        finally:
            if a.engine == 'claude':
                with lock:
                    inflight[0] -= 1

    def run_job(i, p):
        prev = job_dir_for(a, p)  # retry in the same folder as the earlier attempt
        jobs = prev.parent if prev else a.work / f'jobs-{i % n_dirs}'
        jobs.mkdir(parents=True, exist_ok=True)
        codex = CLAUDE_EXEC if a.engine == 'claude' else CODEX if a.effort == 'default' and not a.model else CODEX_EFFORT
        cmd = [sys.executable, '-I', str(APP / 'scripts/rag-generator-worker.py'), str(p), '--jobs-dir', str(jobs),
               '--codex', codex, '--timeout', str(a.timeout), '--max-repairs', '2', '--check-command-json', check] + ([] if a.full_prompt else ['--slim-prompt'])
        env = {**os.environ, 'RAG_CODEX_EFFORT': a.effort, **({'RAG_CODEX_MODEL': a.model, 'RAG_CLAUDE_MODEL': a.model} if a.model else {})}
        (p.parent / 'effort.txt').write_text(f'{a.engine} {a.model or "config-default"} {a.effort}')
        for attempt in range(30):  # the worker refuses when both slots of a jobs dir are busy
            r = subprocess.run(cmd, capture_output=True, text=True, cwd=APP, env=env, timeout=a.timeout * 4 + 900)
            if 'slots are occupied' not in (r.stderr + r.stdout):
                break
            time.sleep(20)
        j = job_dir_for(a, p)
        status = json.load(open(j / 'checkpoint.json')).get('status') if j and (j / 'checkpoint.json').exists() else 'failed'
        if status == 'failed':
            (p.parent / 'worker-error.log').write_text(f'exit {r.returncode}\n{r.stderr[-4000:]}\n{r.stdout[-2000:]}')
        text = r.stderr + r.stdout + (json.dumps(json.load(open(j / 'checkpoint.json'))) if j and (j / 'checkpoint.json').exists() else '')
        infra = status == 'failed' and re.search(r'failed to connect|not supported when using Codex|Codex exited 1|rate.?limit|429', text)
        with lock:
            streak[0] = streak[0] + 1 if infra else 0
            if streak[0] >= a.breaker and not stop.is_set():
                stop.set()
                print(f'[generate] CIRCUIT BREAKER: {streak[0]} consecutive connection/model failures; not starting new jobs', flush=True)
        with lock:
            done[status] += 1
            print(f"[generate] {sum(done.values())}/{len(todo)} {p.parent.name}: {status} ({time.time() - t0:.0f}s) {dict(done)}", flush=True)
    with ThreadPoolExecutor(a.workers) as ex:
        list(ex.map(run, enumerate(todo)))
    if stop.is_set():
        sys.exit(3)

# ---------------------------------------------------------------- promote


def jobs_by_state(a):
    wl = json.load(open(a.work / 'worklist.json'))
    rows = []
    for item in wl['build']:
        p = a.work / 'packets' / item['familyId'].replace(':', '-') / 'packet.json'
        if not p.exists():
            continue
        j = job_dir_for(a, p)
        cp = json.load(open(j / 'checkpoint.json')) if j and (j / 'checkpoint.json').exists() else {}
        rows.append({'familyId': item['familyId'], 'name': item['name'], 'count': item['count'], 'job': j,
                     'status': cp.get('status', 'not-run'), 'attempt': cp.get('attempt'),
                     'promoted': bool(j and (j / 'promoted.json').exists())})
    return rows


def cmd_promote(a):
    rows = [r for r in jobs_by_state(a) if r['status'] == 'checks-passed' and not r['promoted']]
    print(f'promotion queue: {len(rows)}')
    for r in rows[:a.limit] if a.limit else rows:
        job = str(r['job'])
        for step in range(2):
            for _ in range(120):  # another promoter holds .rag-promotion-lock: wait for it
                p = subprocess.run(['node', str(APP / 'scripts/rag-promote.mjs'), '--job', job, '--app-root', str(APP)],
                                   capture_output=True, text=True, cwd=APP, timeout=600)
                if 'EEXIST' not in p.stderr:
                    break
                time.sleep(5)
            if p.returncode == 0:
                census.dump(Path(job) / 'promoted.json', {'at': time.strftime('%Y-%m-%dT%H:%M:%S'), 'stdout': p.stdout[-2000:]})
                print(f"promoted {r['familyId']} ({r['name']})", flush=True)
                break
            if 'rerun checker' in p.stderr and step == 0:
                rc = subprocess.run([sys.executable, '-I', str(APP / 'scripts/rag-recheck.py'), job, '--attempt', str(r['attempt']),
                                     '--app-root', str(APP)], capture_output=True, text=True, cwd=APP, timeout=900)
                if rc.returncode != 0:
                    print(f"recheck failed {r['familyId']}: {(rc.stderr or rc.stdout)[-300:]}", flush=True); break
                continue
            print(f"promotion rejected {r['familyId']}: {p.stderr[-400:]}", flush=True)
            census.dump(Path(job) / 'promotion-rejected.json', {'at': time.strftime('%Y-%m-%dT%H:%M:%S'), 'stderr': p.stderr[-2000:]})
            break


GAP_OLD = "existing Question/picture types cannot draw, leave that variant out; choose needs-review only if no variant is buildable."
GAP_NEW = ("existing Question/picture types cannot draw, leave that variant out and say so in reasoning; choose needs-review only if no variant is buildable.\n"
           "For new-generator, blockingGaps MUST be empty (the promotion tool rejects any new-generator with blocking gaps); omitted variants belong in reasoning.")
ID_OLD = "deterministically from seed and index. canonicalPatternId must name the family as a lowercase slug."
REGENERABLE = ('not a complete new-generator', 'Existing RAG pattern matches', 'record reuse')


def cmd_regenerate(a):
    """Set aside checked jobs whose promotion was rejected for brief-related reasons; refresh the brief; regenerate."""
    picked = 0
    for r in jobs_by_state(a):
        j = r['job']
        if not j or r['promoted'] or not (j / 'promotion-rejected.json').exists():
            continue
        if not any(k in json.load(open(j / 'promotion-rejected.json'))['stderr'] for k in REGENERABLE):
            continue
        pk = a.work / 'packets' / r['familyId'].replace(':', '-') / 'packet.json'
        d = json.load(open(pk))
        d['requirements'][0] = d['requirements'][0].replace(GAP_OLD, GAP_NEW).replace(
            ID_OLD, f"deterministically from seed and index. canonicalPatternId must name the family as a lowercase slug starting with p{a.level}- (ids must be unique across levels).")
        census.dump(pk, d)
        j.rename(j.with_name(j.name + '.superseded-' + time.strftime('%H%M%S')))
        picked += 1
        print('regenerating', r['familyId'], r['name'])
    print(f'set aside {picked} rejected job(s); now run: generate --top <same as before> (they have no job folder, so they run again)')


def cmd_status(a):
    rows = jobs_by_state(a)
    print(dict(Counter(r['status'] for r in rows)), 'promoted:', sum(r['promoted'] for r in rows))
    for r in rows:
        print(f"  {r['status']:16s} {'P' if r['promoted'] else ' '} {r['count']:3d}  {r['familyId']}  {r['name']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--level', type=int, required=True)
    ap.add_argument('--census', type=Path)
    ap.add_argument('--papers', default='60')
    ap.add_argument('--work', type=Path)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('worklist')
    p = sub.add_parser('packets'); p.add_argument('--top', type=int)
    sub.add_parser('route')
    g = sub.add_parser('generate'); g.add_argument('--top', type=int); g.add_argument('--workers', type=int, default=4)
    g.add_argument('--timeout', type=int, default=900); g.add_argument('--retry-failed', action='store_true')
    g.add_argument('--breaker', type=int, default=6, help='stop after this many consecutive connection/model failures')
    g.add_argument('--engine', choices=['codex', 'claude'], default='codex', help='model CLI for generator jobs')
    g.add_argument('--usage-cap', type=float, default=0.75, help='claude: pause new jobs at this share of the 5-hour window')
    g.add_argument('--weekly-cap', type=float, default=0.85, help='claude: pause new jobs at this share of the weekly window')
    g.add_argument('--job-share', type=float, default=0.04, help='claude: expected 5-hour-window share of one running job')
    g.add_argument('--start-gap', type=int, default=45, help='claude: seconds between job starts (no burst after a reset)')
    g.add_argument('--full-prompt', action='store_true', help='send the whole packet (default: worker --slim-prompt)')
    g.add_argument('--model', help='model for generator jobs (codex default: ~/.codex/config.toml; claude default: sonnet)')
    g.add_argument('--effort', default='high', help="Codex reasoning effort for generator jobs; 'default' uses ~/.codex/config.toml")
    pr = sub.add_parser('promote'); pr.add_argument('--limit', type=int)
    sub.add_parser('status')
    sub.add_parser('regenerate')
    a = ap.parse_args()
    a.census = a.census or APP / f'.generated/pattern-census-p{a.level}'
    a.work = a.work or APP / f'.generated/census-build-p{a.level}'
    {'worklist': cmd_worklist, 'packets': cmd_packets, 'route': cmd_route, 'generate': cmd_generate, 'promote': cmd_promote,
     'status': cmd_status, 'regenerate': cmd_regenerate}[a.cmd](a)


if __name__ == '__main__':
    main()
