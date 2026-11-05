#!/usr/bin/env python3
"""Plan and run resumable, balanced paper-by-paper adaptation from the local archive."""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HELD = {'needs-review', 'generated-unverified', 'failed'}
ACTIVE = {'retrieving', 'matching', 'generating', 'recording', 'promoting', 'syncing', 'prepared'}

def read(path):
    return json.loads(path.read_text()) if path.is_file() else {}

def connect(path):
    db = sqlite3.connect(path.resolve().as_uri()+'?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    return db

def manifest_paths(root):
    return [root/'.generated/rag-paper-loop/loop.json', *sorted((root/'.generated/rag-paper-archive/papers').glob('*/loop.json'))]

def plan(root, maximum, levels=tuple(range(1,7))):
    q = root/'.generated/corpus-pattern-queue.sqlite'
    mem = root/'.generated/rag-memory.sqlite'
    sources = defaultdict(list)
    with connect(q) as db:
        census=db.execute('select count(*) from papers').fetchone()[0]
        for r in db.execute('select q.paper_id,q.level,q.bank_line,p.year,p.title from region_queue q join papers p using(paper_id) order by q.level,p.year desc,p.title,q.paper_id,q.start_page,q.bank_line'):
            if r['level'] not in levels:continue
            sources[r['paper_id']].append((r['bank_line'],r['level']))
    in_scope={(p,n) for p,items in sources.items() for n,_ in items}
    seen = set(); held = set(); resume = set()
    for path in manifest_paths(root):
        for row in read(path).get('jobs',{}).values():
            key=(row['paperId'],row['bankLine'])
            if row['state'] in HELD:held.add(key)
            if row['state'] in ACTIVE:resume.add(key)
    if mem.exists():
        with connect(mem) as db:
            for p,n in db.execute("""select distinct s.paper_id,s.bank_line from decision_sources s join decision_outcomes o using(decision_id)
                join generators g on g.generator_id=o.generator_id join generator_versions v on v.version_id=g.current_version
                where g.active=1 and v.available=1 and o.version_id=g.current_version and o.outcome in ('code-integrated','reuse')"""):
                seen.add((p,n))
            for p,n in db.execute("select distinct s.paper_id,s.bank_line from decision_sources s join decisions d using(decision_id) where d.decision='needs-review'"):
                held.add((p,n))
    pipeline=root/'.generated/rag-pipeline/pipeline.sqlite'
    if pipeline.exists():
        with connect(pipeline) as db:
            held.update((row[0],row[1]) for row in db.execute("select paper_id,bank_line from jobs where state='needs-review'"))
    seen&=in_scope;held&=in_scope;resume&=in_scope
    held-=seen;resume-=seen|held
    touched=Counter(); by_grade=defaultdict(list); total=sum(map(len,sources.values()))
    for paper,units in sources.items():
        grade=units[0][1]; selected=[]; started=False
        for n,_ in units:
            key=(paper,n)
            if key in seen or key in held:
                touched[grade]+=1;started=True
            else:selected.append(n)
        if selected:
            # Finish the current paper within each grade before opening another.
            recovering=[n for n in selected if (paper,n) in resume]
            by_grade[grade].append((not bool(recovering),not started,paper,recovering+[n for n in selected if n not in recovering]))
    turn=Counter(); jobs=[]
    front={}
    for grade,papers in by_grade.items():
        papers.sort(key=lambda p:p[:2]);front[grade]=(papers[0][2],iter(papers[0][3]))
    while front and len(jobs)<maximum:
        grade=min(front,key=lambda g:(turn[g],touched[g],g));paper,items=front[grade]
        n=next(items,None)
        if n is None:
            del front[grade];continue
        jobs.append({'level':grade,'paper':paper,'bankLine':n});turn[grade]+=1
    return {'indexedPapers':census,'selectedLevels':list(levels),'papersWithIndexedUnitsInScope':len(sources),'indexedSourceUnits':total,'currentLinkedUnits':len(seen),'heldForReviewOrRetry':len(held),
            'pendingSourceUnits':total-len(seen)-len(held),'selected':jobs,'scope':'Source units are OCR regions; linked units and exhausted queues do not establish complete questions or whole-paper coverage.'}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('action',choices=['plan','run']);parser.add_argument('--app-root',type=Path,default=ROOT)
    parser.add_argument('--level',type=int,choices=range(1,7),action='append',help='Limit work to the selected primary levels; repeatable')
    parser.add_argument('--batch-size',type=int,default=6,choices=range(1,101),metavar='1..100')
    parser.add_argument('--batches',type=int,default=1,choices=range(1,1001),metavar='1..1000')
    parser.add_argument('--codex',default='codex');args=parser.parse_args();root=args.app_root.resolve()
    lock=None
    if args.action=='run':
        import fcntl
        (root/'.generated/rag-paper-archive').mkdir(parents=True,exist_ok=True)
        lock=open(root/'.generated/rag-paper-archive/.driver.lock','a+')
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:parser.error('Another archive driver is running.')
    for _ in range(args.batches if args.action=='run' else 1):
        work=plan(root,args.batch_size,tuple(args.level or range(1,7)))
        print(json.dumps(work,ensure_ascii=False),flush=True)
        if args.action=='plan' or not work['selected']:break
        # A single promotion writer; the next paper always matches against the refreshed registry.
        papers=defaultdict(list)
        for job in work['selected']:papers[job['paper']].append(job['bankLine'])
        for paper,lines in papers.items():
            if not paper.isalnum():raise ValueError('Unexpected paper identifier')
            directory=root/'.generated/rag-paper-archive/papers'/paper;directory.mkdir(parents=True,exist_ok=True)
            args_loop=[sys.executable,str(ROOT/'scripts/rag-paper-loop.py'),'run','--app-root',str(root),'--memory-db',str(root/'.generated/rag-memory.sqlite'),'--queue',str(root/'.generated/corpus-pattern-queue.sqlite'),'--work-dir',str(directory),'--codex',args.codex,'--paper-id',paper,'--max-regions',str(len(lines))]
            for line in lines:args_loop+=['--bank-line',str(line)]
            with (directory/'last-command.json').open('w') as output:
                result=subprocess.run(args_loop,cwd=root,stdout=output,check=False)
            if result.returncode:return result.returncode
    return 0
if __name__=='__main__':raise SystemExit(main())
