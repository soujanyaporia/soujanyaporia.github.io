#!/usr/bin/env python3
"""Read-only, local adaptation tracker. It serves counts, never PDFs or OCR text."""
import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def rows(path,sql):
    if not Path(path).is_file(): return []
    db=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True)
    db.row_factory=sqlite3.Row
    try: return [dict(r) for r in db.execute(sql)]
    finally: db.close()

def read_json(path,default):
    try:return json.loads(Path(path).read_text())
    except FileNotFoundError:return default

def public_text(value):
    """Never expose a private path accidentally embedded in an identifier/label."""
    import re
    return re.sub(r'(?:/(?:Users|private|tmp|var|home)/[^\s<>"\']*|[A-Za-z]:\\[^\s<>"\']*)','[private path]',str(value or ''))

def identifier(value):
    import re
    return str(value) if isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:(), +×÷−-]{0,199}',value) else None

def safe_checkpoint(root,retrieval_id,loop_directory=None):
    if not identifier(retrieval_id) or '/' in retrieval_id or '\\' in retrieval_id:return {}
    paths=[root/'.generated/rag-pipeline/workers'/retrieval_id/'checkpoint.json',root/'.generated/rag-paper-loop/workers'/retrieval_id/'checkpoint.json',root/'.generated/rag-runs'/retrieval_id/'checkpoint.json']
    if loop_directory:
        candidate=Path(loop_directory).resolve()
        if candidate.is_relative_to((root/'.generated').resolve()):paths.insert(0,candidate/'checkpoint.json')
    for path in paths:
        if path.is_file() and path.resolve().is_relative_to((root/'.generated').resolve()):return read_json(path,{})
    return {}

def registry_current(root,entry):
    import hashlib
    files=entry.get('files',[])
    if not files:return False
    for binding in files:
        relative=binding.get('path','');path=(root/relative).resolve()
        if not relative.startswith('src/') or not path.is_relative_to((root/'src').resolve()) or not path.is_file() or (root/relative).is_symlink():return False
        if hashlib.sha256(path.read_bytes()).hexdigest()!=binding.get('sha256'):return False
    return True

def census_progress(root):
    import math
    snapshots=[]
    for directory in sorted((root/'.generated').glob('pattern-census-p[1-6]')):
        extract=read_json(directory/'extract-summary.json',{})
        if not extract:continue
        dedupe=read_json(directory/'dedupe-summary.json',{})
        sample=set(read_json(directory/'sample.json',{}).get('papers',[]))
        tags={}
        path=directory/'tags.jsonl'
        if path.exists():
            for line in path.read_text().splitlines():
                try:
                    row=json.loads(line);tags[row['rep']]=row
                except (ValueError,KeyError):pass
        wanted=sampled=0
        if sample and (directory/'regions.jsonl').exists() and (directory/'groups.json').exists():
            regions={}
            for line in (directory/'regions.jsonl').read_text().splitlines():
                row=json.loads(line)
                if row['paperId']in sample:regions[row['bankLine']]=row['paperId']
            sampled=len(regions)
            wanted=sum(any(n in regions for n in group['members'])for group in read_json(directory/'groups.json',[]))
        grouping=read_json(directory/'grouping.json',{})
        matches=read_json(directory/'match.json',{})
        report=read_json(directory/'report.json',{})
        grouped=sum(len(groups)for groups in grouping.values())
        stage='report available'if report else'matching'if matches else'grouping'if grouping else'tagging'if sample else'deduplicating'if not dedupe else'ready to tag'
        snapshots.append({'level':extract['level'],'stage':stage,'filterVersion':extract.get('filterVersion'),'candidateRegions':extract['questionCandidateRegions'],'keptRegions':extract['kept'],'dedupedRepresentatives':dedupe.get('groups'),'sampledPapers':len(sample),'sampledRegions':sampled,'representativesToTag':wanted,'taggedRepresentatives':len(tags),'tagBatches':math.ceil(wanted/20),'taggedItems':dict(Counter(q['kind']for row in tags.values()for q in row['questions'])),'provisionalPatterns':grouped,'matchedPatterns':len(matches),'reportCounts':{k:report[k]for k in('questionOccurrences','distinctPatternsObserved','chao1Estimate','newPatternsInLast10Papers','patternsCoveringPctOfQuestions','existingGeneratorFit')if k in report}})
    return snapshots

def snapshot(root=ROOT):
    import hashlib
    root=Path(root);memory=root/'.generated/rag-memory.sqlite';pipeline=root/'.generated/rag-pipeline/pipeline.sqlite'
    candidates=[read_json(root/'.generated'/name,None)for name in ('question-pattern-progress.json','question-pattern-inventory.json')]
    inventory=max((candidate for candidate in candidates if candidate),key=lambda candidate:candidate.get('generatedAt',''),default={'activities':[]})
    registry=read_json(root/'src/primary/paperImports/ragRegistry.json',{'entries':[]})
    def empty(p):return {'id':identifier(p['paper_id']) or 'unresolved','level':p.get('level'),'title':public_text(p.get('title')or p['paper_id']),'indexedUnits':None,'ingested':0,'linked':set(),'new':set(),'reuse':set(),'patterns':set(),'samples':set(),'jobs':[],'status':'Queued'}
    papers={p['paper_id']:empty(p) for p in rows(memory,'select paper_id,level,title from papers')}
    for p in rows(root/'.generated/corpus-pattern-queue.sqlite','select paper_id,level,title,region_count from papers'):
        papers.setdefault(p['paper_id'],empty(p))['indexedUnits']=p['region_count']
    def paper(key):return papers.get(key)
    for r in rows(memory,'select paper_id,count(*) as n from regions group by paper_id'):
        if paper(r['paper_id']):paper(r['paper_id'])['ingested']=r['n']
    activities=inventory.get('activities',[]);families=set();primary_sources=set();sample_map={};activity_samples=defaultdict(set);by_parameter={a.get('parameter'):a for a in activities if a.get('parameter')}
    # One sample is one visible generated task, even when it has several answer fields.
    visible_fields=('prompt','context','display','figure','gridDrawing','angleConstruction','structuredResponse','numberSentence','grouping','choices','order','fractionBuilder')
    for activity in activities:
        family=identifier(activity.get('canonicalPatternId'))
        if family:families.add(family)
        local=set()
        for example in activity.get('examples',[]):
            visible={key:example[key]for key in visible_fields if key in example and example[key]is not None}
            if not visible:continue
            fingerprint=hashlib.sha256(json.dumps(visible,sort_keys=True,ensure_ascii=False).encode()).hexdigest();local.add(fingerprint)
            preview={'id':fingerprint[:16],'activityId':identifier(activity.get('id')),'prompt':public_text(example.get('prompt')),'context':[public_text(v)for v in(example.get('context')or[])],'display':public_text(example.get('display')),'requiresFigure':bool(example.get('figure')or example.get('gridDrawing')or example.get('angleConstruction'))}
            sample_map.setdefault(fingerprint,preview)
            activity_samples[activity.get('id')].add(fingerprint)
        source=activity.get('source')or{};p=paper(source.get('paperId'))
        if p:
            primary_sources.add(p['id']);p['samples'].update(local)
            if family:p['patterns'].add(family)
    registered=[entry for entry in registry.get('entries',[])if registry_current(root,entry)]
    registered_by_job={entry['jobId']:entry for entry in registered if entry.get('jobId')}
    for entry in registered:
        for ref in entry.get('sourceRefs',[]):
            p=paper(ref.get('paperId'))
            if p:
                if identifier(entry.get('id')):p['new'].add(entry['id'])
                activity=by_parameter.get(entry.get('parameter'))
                if activity:p['samples'].update(activity_samples[activity['id']])
                if identifier(entry.get('canonicalPatternId')):p['patterns'].add(entry['canonicalPatternId'])
    decisions=rows(memory,"select distinct s.paper_id,s.bank_line,d.decision,d.target,d.job_id,o.outcome,o.generator_id,g.canonical_pattern_id from decision_sources s join decisions d using(decision_id) join decision_outcomes o using(decision_id) join generators g on g.generator_id=o.generator_id join generator_versions v on v.version_id=g.current_version where o.outcome in ('reuse','code-integrated') and g.active=1 and v.available=1 and o.version_id=g.current_version")
    integrated_sources={};decision_targets={r['job_id']:identifier(r['canonical_pattern_id']or r['target'])for r in decisions}
    for r in decisions:
        p=paper(r['paper_id'])
        if p:
            p['linked'].add(r['bank_line']);p['samples'].update(activity_samples[r['generator_id']])
            if r['outcome']=='reuse':p['reuse'].add(r['bank_line'])
            family=identifier(r['canonical_pattern_id']or r['target'])
            if family:p['patterns'].add(family)
            if r['outcome']=='code-integrated':integrated_sources[(r['paper_id'],r['bank_line'])]=family
    jobs=[]
    def add_job(raw,origin):
        paper_id=raw.get('paper_id',raw.get('paperId'));retrieval=raw.get('retrieval_id',raw.get('retrievalId'));state=raw.get('state','queued');bank=raw.get('bank_line',raw.get('bankLine'));checkpoint=safe_checkpoint(root,retrieval,raw.get('workerDirectory'))
        job={'id':identifier(raw.get('id',raw.get('key')))or'unnamed','origin':origin,'level':raw.get('level'),'paper_id':identifier(paper_id),'question_number':public_text(raw.get('question_number',raw.get('questionNumber'))),'bank_line':bank if isinstance(bank,int)else None,'state':public_text(state),'stage':public_text(raw.get('stage',state)),'retrieval_id':identifier(retrieval),'updated_at':public_text(raw.get('updated_at',raw.get('updatedAt','')))}
        if checkpoint.get('status'):job['workerStatus']=public_text(checkpoint['status']);job['attempt']=checkpoint.get('attempt')
        elif raw.get('workerStatus'):job['workerStatus']=public_text(raw['workerStatus'])
        elif state in('generating','promoting','syncing','recording','retrieving','matching'):job['workerStatus']='running'
        entry=registered_by_job.get(retrieval);family=identifier(entry.get('canonicalPatternId'))if entry else decision_targets.get(retrieval)
        if entry or(state not in('generating','running')and(paper_id,bank)in integrated_sources):
            job['state']='code-integrated';job['workerStatus']='code-integrated';family=family or integrated_sources.get((paper_id,bank));job['integrationEvidence']='current-registry-or-versioned-memory-binding'
            if entry:job['generatorId']=identifier(entry.get('id'))
        if family:job['canonicalPatternId']=family
        # A region may be shown by both orchestrators; keep one record for the exact worker job.
        duplicate=next((j for j in jobs if retrieval and j['retrieval_id']==retrieval),None)
        if duplicate:
            origins=duplicate.get('origins',[duplicate['origin']]);origins.append(origin);duplicate.update(job);duplicate['origins']=list(dict.fromkeys(origins))
        else:jobs.append(job)
    for job in rows(pipeline,'select id,level,paper_id,question_number,bank_line,state,stage,retrieval_id,updated_at from jobs'):add_job(job,'regional-pipeline')
    manifests=[root/'.generated/rag-paper-loop/loop.json',*sorted((root/'.generated/rag-paper-archive/papers').glob('*/loop.json'))]
    for manifest in manifests:
        loop=read_json(manifest,{})
        dates={e['job']:e.get('at','') for e in loop.get('events',[]) if e.get('job')}
        loop_jobs=loop.get('jobs',{});loop_jobs=list(loop_jobs.values())if isinstance(loop_jobs,dict)else loop_jobs
        for job in loop_jobs:add_job({**job,'updatedAt':dates.get(job.get('key'),'')},'paper-loop')
    # Include promoted workers launched directly, which do not have a legacy pipeline row.
    for entry in registered:
        if any(j['retrieval_id']==entry.get('jobId')for j in jobs):continue
        refs=entry.get('sourceRefs')or[{}];ref=refs[0]
        source=next((r for r in decisions if r['job_id']==entry.get('jobId')),{})
        add_job({'id':'registry:'+entry['jobId'],'level':entry['level'],'paper_id':ref.get('paperId'),'question_number':ref.get('sourceQuestion'),'bank_line':source.get('bank_line'),'state':'code-integrated','retrieval_id':entry['jobId'],'updated_at':''},'current-registry')
    for job in jobs:
        p=paper(job['paper_id'])
        if p:p['jobs'].append(job)
    started=0;output=[]
    for p in papers.values():
        states={j.get('workerStatus',j['state'])for j in p['jobs']}
        if 'running'in states:p['status']='Working'
        elif p['new']or'code-integrated'in states:p['status']='Code integrated · paper unfinished'
        elif p['reuse']:p['status']='Pattern reused · paper unfinished'
        elif 'needs-review'in states or'failed'in states:p['status']='Needs review'
        elif p['ingested']or p['jobs']:p['status']='In progress'
        elif p['patterns']:p['status']='Existing adaptations'
        if p['ingested']or p['jobs']or p['new']or p['reuse']:started+=1
        public={key:len(value)if isinstance(value,set)else value for key,value in p.items()if key!='jobs'}
        review={j['bank_line'] for j in p['jobs'] if j.get('workerStatus',j['state'])=='needs-review' and j['bank_line'] is not None}-p['linked']
        public.update(reviewUnits=len(review),unlinkedUnits=None if p['indexedUnits'] is None else max(0,p['indexedUnits']-len(p['linked'])),matchedPatternIds=sorted(p['patterns']),newGeneratorIds=sorted(p['new']),samplePreviews=[sample_map[key]for key in sorted(p['samples'])[:3]])
        output.append(public)
    output.sort(key=lambda p:(p['status']=='Queued',p['status']=='Existing adaptations',p['level']or 0,p['title']))
    current={}
    for job in jobs:
        key=(job['paper_id'],job['bank_line']if job['bank_line']is not None else job['question_number'])
        score=(job.get('workerStatus')=='running',job['state']=='code-integrated',job['updated_at'])
        if key not in current or score>current[key][0]:current[key]=(score,job)
    counts={'indexedPapers':len(papers),'papersStarted':started,'notStarted':len(papers)-started,'archiveUnits':sum(p['indexedUnits'] or 0 for p in output),'unitsNeedingReview':sum(p['reviewUnits'] for p in output),'papersWithAllUnitsLinked':sum(bool(p['indexedUnits']) and p['unlinkedUnits']==0 for p in output),'papersWithDeclaredAdaptations':len(primary_sources),'primarySourceReferencesInExport':len(primary_sources),'sourceItemsLinked':sum(p['linked']for p in output),'reuseLinks':sum(p['reuse']for p in output),'newGeneratorsIntegrated':len({e['id']for e in registered}),'newPatternIds':len({e['canonicalPatternId']for e in registered}),'cataloguePatternIds':len(families),'catalogueActivities':len(activities),'exportedSampleQuestions':len(sample_map),'wholePapersVerifiedByThisPipeline':0,'totalSourceQuestions':None}
    level_counts={}
    for level in range(1,7):
        subset=[p for p in output if p['level']==level]
        scoped=[a for a in activities if a.get('level')==level]
        visible_ids={key for a in scoped for key in activity_samples[a.get('id')]}
        level_counts[str(level)]={'indexedPapers':len(subset),'papersStarted':sum(p['status'] not in ('Queued','Existing adaptations')for p in subset),'sourceItemsLinked':sum(p['linked']for p in subset),'reuseLinks':sum(p['reuse']for p in subset),'newGeneratorsIntegrated':sum(e['level']==level for e in registered),'newPatternIds':len({e['canonicalPatternId']for e in registered if e['level']==level}),'cataloguePatternIds':len({a['canonicalPatternId']for a in scoped if a.get('canonicalPatternId')}),'exportedSampleQuestions':len(visible_ids),'primarySourceReferencesInExport':sum(p['id'] in primary_sources for p in subset),'notStarted':sum(p['status']in('Queued','Existing adaptations')for p in subset),'papersWithAllUnitsLinked':sum(bool(p['indexedUnits'])and p['unlinkedUnits']==0 for p in subset),'unitsNeedingReview':sum(p['reviewUnits']for p in subset)}
    bulk=[]
    for summary in sorted((root/'.generated').glob('rag-bulk-tag-*/stats.json')):
        stats=read_json(summary,{})
        allowed=('level','indexedSourceRegions','exactNormalizedTexts','exactDuplicateMembers','selectedSourceRegions','taggedSourceRegions','taggedIncludingExactAliases','provisionalGroups','groupedSourceRegions','heldSourceRegions','nonQuestionRegions','classifications','batchStatuses','coverageGranted','sourceCompleteness')
        bulk.append({key:stats[key]for key in allowed if key in stats})
    return {'updatedAt':datetime.now(timezone.utc).isoformat(),'counts':counts,'levels':level_counts,'bulk':bulk,'census':census_progress(root),'jobs':jobs,'currentJobs':[value[1]for value in current.values()],'papers':output,'scope':'New-generator and reuse counts refer to current registry/code-memory bindings. Primary source references in this export count distinct primary paper references declared by exported activities; other historical associations are outside that number. Source items are OCR regions, not established question totals. Pattern IDs are declared families, not verified mathematical uniqueness. Per-paper previews come only from an activity naming that paper or an exact generator linked to that source. A preview associated with several papers counts once in the catalogue. Exported samples are deduplicated visible generated tasks, including multipart tasks as one preview; they are not source questions or estimates of all variants.','sourceQuestionTotalStatus':'Not established: OCR-region, subpart and source-link counts are not verified question totals.','sampleSnapshotAt':inventory.get('generatedAt')}

PAGE='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Singapore Maths · Adaptation progress</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5f7f7;color:#203a39;font:16px/1.5 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:32px 24px}header{display:flex;justify-content:space-between;gap:24px;align-items:center}h1{font-size:32px;letter-spacing:-1px;margin:0}h2{font-size:19px;margin:0 0 16px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#448377;font-weight:700}p{color:#5a706d}.live{border:1px solid #b7d7cd;border-radius:100px;background:#ecf8f1;padding:8px 14px;font-size:13px;white-space:nowrap}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:26px 0}.card,section{background:white;border:1px solid #dce7e3;border-radius:16px;padding:20px}.card strong{display:block;font-size:30px;margin:4px 0}.card span{font-size:13px;color:#58716b}.card small{font-size:12px;color:#71847e}.layout{display:grid;grid-template-columns:1fr 1fr;gap:16px}.bar{height:8px;background:#edf1ee;border-radius:99px;margin:10px 0;overflow:hidden}.bar i{display:block;background:#2d967b;height:100%;min-width:2px}.filters{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}input,select,button{font:inherit;padding:10px 12px;border:1px solid #ceddd7;border-radius:9px;min-height:44px;background:white;color:inherit}input{flex:1;min-width:210px}button{cursor:pointer;background:#e8f4ed;font-weight:650}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #e9eeeb;vertical-align:top}th{font-size:11px;letter-spacing:.5px;color:#637a72;text-transform:uppercase}td:first-child{min-width:245px;max-width:390px}.badge{font-size:11px;font-weight:650;border-radius:6px;background:#eef5f1;padding:4px 7px;display:inline-block}.note{font-size:12px;color:#657b75}.jobs{display:grid;gap:10px}.job{padding:10px 12px;background:#f5f8f6;border-radius:9px}.job b{display:block;font-size:13px}.job span{font-size:12px;color:#5b736a}.page-section{margin-top:18px}details{margin-top:18px}summary{cursor:pointer;font-size:13px;font-weight:650;min-height:44px;padding:10px 0}footer{margin:24px 0;color:#60766d;font-size:12px}@media(max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}.layout{grid-template-columns:1fr}header{display:block}.live{display:inline-block}main{padding:20px 14px}h1{font-size:27px}}@media(prefers-reduced-motion:no-preference){.live:before{content:'● ';color:#2d967b;animation:pulse 2s infinite}@keyframes pulse{50%{opacity:.35}}}</style>
<main><header><div><div class="eyebrow">Singapore Primary Maths · Local workspace</div><h1>Paper adaptation progress</h1><p>Read a paper. Match a pattern. Reuse or build a generator.</p></div><span class="live" id="live">Connecting…</span></header>
<div class="cards" id="cards"></div><div class="layout"><section><h2>Paper processing</h2><div id="paper-progress"></div><p class="note">Started means the pipeline has selected or ingested material. It does not mean every question in that paper is implemented.</p></section><section><h2>Current jobs</h2><div class="jobs" id="jobs"></div></section></div>
<section class="page-section"><h2>Group-first processing</h2><div id="census" class="jobs"></div><div id="bulk" class="jobs"></div><p class="note">These are provisional groups from source tagging. They become reusable app patterns after matching and generator checks.</p></section><section class="page-section"><h2>By paper</h2><div class="filters"><input id="search" type="search" placeholder="Find a school or paper" aria-label="Find a paper"><select id="grade" aria-label="Primary level"><option value="">All P1–P6</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select><select id="stage" aria-label="Processing stage"><option value="">All stages</option><option value="active">Started in this run</option><option value="existing">Existing adaptations</option><option value="Queued">Queued</option></select></div><div class="table-wrap"><table><thead><tr><th>Paper</th><th>Stage</th><th>OCR units in archive</th><th>Source items linked</th><th>New generators</th><th>Reused items</th><th>Matched pattern IDs</th><th>Generated previews</th></tr></thead><tbody id="papers"></tbody></table></div><p id="showing" class="note"></p><button id="more">Show 100 more</button></section>
<details><summary>What these counts mean</summary><p class="note" id="scope"></p><p class="note" id="unknown"></p><p class="note">The pipeline keeps source evidence separate from its compact matching catalogue. New numerical values do not create a new pattern. Source PDFs and OCR text are never served by this tracker.</p></details><footer id="updated"></footer></main>
<script>let data,limit=100;const $=id=>document.getElementById(id),n=x=>Number(x).toLocaleString(),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function table(){if(!data)return;const q=$('search').value.toLowerCase(),g=$('grade').value,s=$('stage').value;const all=data.papers.filter(p=>(!q||p.title.toLowerCase().includes(q)||p.id.includes(q))&&(!g||p.level===Number(g))&&(!s||(s==='active'?!['Queued','Existing adaptations'].includes(p.status):s==='existing'?p.status==='Existing adaptations':p.status===s)));$('papers').innerHTML=all.slice(0,limit).map(p=>`<tr><td><b>P${p.level} · ${esc(p.title)}</b></td><td><span class="badge">${esc(p.status)}</span></td><td>${p.indexedUnits==null?'—':n(p.indexedUnits)}</td><td>${n(p.linked)}</td><td>${n(p.new)}${p.newGeneratorIds.length?'<details><summary>Generator IDs</summary><span class="note">'+p.newGeneratorIds.map(esc).join('<br>')+'</span></details>':''}</td><td>${n(p.reuse)}</td><td>${n(p.patterns)}${p.matchedPatternIds.length?'<details><summary>Pattern IDs</summary><span class="note">'+p.matchedPatternIds.map(esc).join('<br>')+'</span></details>':''}</td><td>${n(p.samples)}${p.samplePreviews.length?'<details><summary>See generated examples</summary>'+p.samplePreviews.map(e=>'<p class="note">'+e.context.map(esc).join(' ')+' '+esc(e.display)+' <b>'+esc(e.prompt)+'</b>'+(e.requiresFigure?' Mathematical figure is shown in the activity.':'')+'</p>').join('')+'</details>':''}</td></tr>`).join('');$('showing').textContent=`Showing ${Math.min(limit,all.length)} of ${n(all.length)} papers`;$('more').hidden=all.length<=limit}async function refresh(){try{const r=await fetch('/api/progress',{cache:'no-store'});if(!r.ok)throw Error('Tracker unavailable');data=await r.json();const c=$('grade').value?(data.levels[$('grade').value]||data.counts):data.counts;const cards=[['Papers indexed',c.indexedPapers,'Downloaded archive'],['Papers started',c.papersStarted,'This adaptation run'],['New generators integrated',c.newGeneratorsIntegrated,'Ready for lessons and practice'],['Existing pattern matches',c.reuseLinks,'Source items reused in this run'],['Source items linked',c.sourceItemsLinked,'Questions may span OCR units'],['New pattern IDs',c.newPatternIds,'Declared by this run'],['Catalogue pattern IDs',c.cataloguePatternIds,'Includes earlier adaptations'],['Generated previews exported',c.exportedSampleQuestions,'Distinct visible sample tasks']];$('cards').innerHTML=cards.map(([l,v,h])=>`<div class="card"><span>${l}</span><strong>${n(v)}</strong><small>${h}</small></div>`).join('');$('paper-progress').innerHTML=`<b>${n(c.papersStarted)} / ${n(c.indexedPapers)} papers started</b><div class="bar"><i style="width:${Math.max(.1,100*c.papersStarted/Math.max(1,c.indexedPapers))}%"></i></div><span class="note">${n(c.primarySourceReferencesInExport)} primary source references in this export.<br>${n(c.notStarted)} papers not yet started in this run · ${n(c.papersWithAllUnitsLinked)} with every indexed unit linked · ${n(c.unitsNeedingReview)} source units awaiting review. These are not complete-paper coverage counts.</span>`;const jobs=[...(data.currentJobs||data.jobs)].filter(j=>!$('grade').value||j.level===Number($('grade').value)).sort((a,b)=>(b.workerStatus==='running')-(a.workerStatus==='running')||String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,5);$('jobs').innerHTML=jobs.length?jobs.map(j=>`<div class="job"><b>P${j.level} · source item ${esc(j.question_number||'?')}</b><span>${esc(j.workerStatus||j.state)}${j.attempt?' · attempt '+j.attempt:''} · ${esc(j.paper_id)}</span></div>`).join(''):'No running jobs.';$('census').innerHTML=(data.census||[]).filter(b=>!$('grade').value||b.level===Number($('grade').value)).map(b=>'<div class="job"><b>P'+b.level+' reference census · '+esc(b.stage)+'</b><span>'+n(b.taggedRepresentatives)+' / '+n(b.representativesToTag)+' representatives tagged · '+n(b.sampledPapers)+' sampled papers · '+n(b.provisionalPatterns)+' provisional patterns · '+n(b.matchedPatterns)+' catalogue verdicts</span></div>').join('');$('bulk').innerHTML=(data.bulk||[]).filter(b=>!$('grade').value||b.level===Number($('grade').value)).map(b=>'<div class="job"><b>P'+b.level+' · '+n(b.taggedSourceRegions||0)+' tagged source units / '+n(b.indexedSourceRegions||0)+' indexed</b><span>'+n(b.provisionalGroups||0)+' provisional groups · '+n(b.exactDuplicateMembers||0)+' exact text duplicate members · '+n(b.heldSourceRegions||0)+' held for review</span></div>').join('')||'<span class="note">Preparing the first tagging batches.</span>';$('scope').textContent=data.scope;$('unknown').textContent=data.sourceQuestionTotalStatus;$('updated').textContent='Live counts refreshed '+new Date(data.updatedAt).toLocaleTimeString()+' · sample export '+(data.sampleSnapshotAt?new Date(data.sampleSnapshotAt).toLocaleString():'not available');$('live').textContent='Live · refreshes every 10 seconds';table()}catch(e){$('live').textContent='Connection interrupted · retrying'}}for(const id of ['search','grade','stage'])$(id).addEventListener('input',()=>{limit=100;if(id==='grade')refresh();else table()});$('more').onclick=()=>{limit+=100;table()};const initialLevel=new URLSearchParams(location.search).get('level');if(/^[1-6]$/.test(initialLevel||''))$('grade').value=initialLevel;refresh();setInterval(refresh,10000);</script></html>'''

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--app-root',type=Path,default=ROOT);parser.add_argument('--port',type=int,default=8878);parser.add_argument('--export',type=Path);parser.add_argument('--report',type=Path,help='Save an offline HTML snapshot for viewing without a local server');args=parser.parse_args()
    if args.report:
        data=snapshot(args.app_root)
        # Escape '<' so an original example can never close the script tag.
        embedded=json.dumps(data,ensure_ascii=True).replace('<',r'\u003c')
        page=PAGE.replace("const r=await fetch('/api/progress',{cache:'no-store'});if(!r.ok)throw Error('Tracker unavailable');data=await r.json();","data="+embedded+";").replace("const initialLevel=new URLSearchParams(location.search).get('level');if(/^[1-6]$/.test(initialLevel||''))$('grade').value=initialLevel;refresh();setInterval(refresh,10000);","refresh();").replace('Live · refreshes every 10 seconds','Saved snapshot · '+data['updatedAt'][:10]).replace('Live counts refreshed','Snapshot saved')
        args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(page);return
    if args.export:
        args.export.parent.mkdir(parents=True,exist_ok=True);args.export.write_text(json.dumps(snapshot(args.app_root),indent=2)+'\n');return
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            route=self.path.split('?',1)[0]
            try:
                if route=='/':body=PAGE.encode();mime='text/html; charset=utf-8'
                elif route=='/api/progress':body=json.dumps(snapshot(args.app_root)).encode();mime='application/json'
                else:self.send_error(404);return
                self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
            except (OSError,sqlite3.Error,ValueError):self.send_error(503,'Progress data is being updated; retry shortly.')
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);print(f'Local tracker: http://127.0.0.1:{args.port}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()

if __name__=='__main__':main()
