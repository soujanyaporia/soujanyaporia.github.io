#!/usr/bin/env python3
"""Checkpointed local retrieval/adaptation loop. OCR clusters are not mathematical patterns.

prepare retrieves private source packets only; run explicitly launches bounded
isolated generator workers; status never promotes code to integrated/deployed.
The existing corpus queue retains every region. This tool stages a small,
grade/topic-balanced set of representatives, without reclustering the corpus.
"""
from __future__ import annotations
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import sqlite3
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
DEFAULT_QUEUE=ROOT/'.generated/corpus-pattern-queue.sqlite'
DEFAULT_WORK=ROOT/'.generated/rag-pipeline'
TERMINAL={'generated','reuse','needs-review','checks-passed'}
WORKER_STATES={'generated-unverified':'generated','reuse':'reuse','needs-review':'needs-review','checks-passed':'checks-passed'}
GAPS={
 1:[('MONEY','money coins prices bought change'),('LENGTH','length ruler centimetres'),('TIME','clock time minutes'),('SHAPE','shapes copy draw'),('GRAPH','picture graph same most')],
 2:[('TIME','clock time duration hours minutes'),('MEASURE','mass capacity litres grams'),('FRAC','fraction whole equal parts'),('MONEY','price change costs'),('SHAPE','shape pattern solids')],
 3:[('MEASURE','measurement mass grams kilograms litres length'),('MONEY','money prices bought coins'),('TIME','journey duration hours minutes'),('LINES','draw parallel perpendicular'),('AREA','rectangle perimeter area')],
 4:[('DEC','decimal length mass money kg cm'),('LENGTH','ribbon length metres'),('MONEY','cost bought total paid'),('SYM','reflect symmetry draw'),('AREA','rectangle area perimeter')],
 5:[('DEC','decimal mass length money rates'),('RATE','rates per hour'),('AREA','triangle area dimensions'),('VOL','tank volume cuboid'),('FRAC','fraction remaining total')],
 6:[('RATIO','ratio fractions shared total'),('PCT','percentage discount total'),('CIRCLE','circle radius semicircle'),('RATE','speed distance time'),('AVG','average missing total')],
}
STORY=re.compile(r'\b(?:bought|buy|paid|cost|spent|sold|shared|gave|poured|weigh|mass|travel|journey|ribbon|baker|shop|coins?|work|tank)\b',re.I)
MULTIPART=re.compile(r'(?:^|\n)\s*\(?[ab]\)',re.I)
FIGURE=re.compile(r'\b(?:diagram|figure|draw|graph|clock|ruler|scale|grid|reflect)\b',re.I)
QUESTION=re.compile(r'\b(?:how|what|which|find|draw|complete|calculate|arrange|express|write)\b|\?',re.I)
SHELLS={'sh','bash','zsh','fish','dash','ksh','cmd','cmd.exe','powershell','powershell.exe'}

class PipelineError(ValueError): pass

def now(): return datetime.now(timezone.utc).isoformat()
def canonical(value): return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def digest(value): return hashlib.sha256(value.encode()).hexdigest()
def file_hash(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def ro(path):
 db=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row;return db

def connect(work):
 work=Path(work).resolve();work.mkdir(parents=True,exist_ok=True)
 db=sqlite3.connect(work/'pipeline.sqlite',timeout=30);db.row_factory=sqlite3.Row
 db.execute('pragma journal_mode=WAL');db.execute('pragma foreign_keys=ON')
 db.executescript('''
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS corpus_papers(paper_id TEXT PRIMARY KEY,level INTEGER NOT NULL,title TEXT,source_sha256 TEXT,region_count INTEGER,staged_pages INTEGER);
 CREATE TABLE IF NOT EXISTS jobs(
  id TEXT PRIMARY KEY,level INTEGER NOT NULL,topic TEXT NOT NULL,query TEXT NOT NULL,pattern_id TEXT,
  bank_line INTEGER NOT NULL UNIQUE,candidate_id TEXT,paper_id TEXT NOT NULL,question_number TEXT,pages_json TEXT NOT NULL,
  source_sha256 TEXT,raw_text_sha256 TEXT,cluster_id TEXT NOT NULL UNIQUE,selection_json TEXT NOT NULL,
  state TEXT NOT NULL,stage TEXT NOT NULL,packet_path TEXT NOT NULL,packet_sha256 TEXT,retrieval_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,error TEXT,worker_result_json TEXT,
  integrated_at TEXT DEFAULT NULL,deployed_at TEXT DEFAULT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,job_id TEXT NOT NULL,at TEXT NOT NULL,old_state TEXT,new_state TEXT,stage TEXT,detail_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS job_archives(archive_id TEXT PRIMARY KEY,job_id TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,archive_dir TEXT NOT NULL,manifest_sha256 TEXT NOT NULL,job_json TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS job_level_state ON jobs(level,state);
 ''')
 columns={row['name']for row in db.execute('pragma table_info(jobs)')}
 for name,definition in [('generation','INTEGER NOT NULL DEFAULT 0'),('refresh_context_json','TEXT')]:
  if name not in columns:db.execute(f'alter table jobs add column {name} {definition}')
 db.commit()
 return db

@contextmanager
def exclusive(work):
 work=Path(work).resolve();work.mkdir(parents=True,exist_ok=True)
 with (work/'.pipeline.lock').open('a+') as lock:
  try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError:raise PipelineError('Another prepare/run owns this pipeline directory.') from None
  try:yield
  finally:fcntl.flock(lock,fcntl.LOCK_UN)

def event(db,job_id,state,stage,detail=None,**updates):
 old=db.execute('select state,generation from jobs where id=?',(job_id,)).fetchone()
 if old is None:raise PipelineError('Unknown pipeline job')
 fields={'state':state,'stage':stage,'updated_at':now(),**updates}
 db.execute('update jobs set '+','.join(f'{key}=?'for key in fields)+' where id=?',(*fields.values(),job_id))
 db.execute('insert into events(job_id,at,old_state,new_state,stage,detail_json) values(?,?,?,?,?,?)',(job_id,now(),old['state'],state,stage,canonical({'generation':updates.get('generation',old['generation']),**(detail or {})})));db.commit()

def command_json(raw):
 try:value=json.loads(raw)
 except ValueError as e:raise PipelineError('Command must be a JSON array of argument strings.')from e
 if not isinstance(value,list)or not value or any(not isinstance(x,str)or not x or '\x00'in x for x in value):raise PipelineError('Command must be a nonempty JSON array of argument strings.')
 if Path(value[0]).name.lower()in SHELLS:raise PipelineError('Commands may not invoke shell interpreters.')
 return value

def execute(command,prefix,timeout):
 """Bound an entire child process group and keep private logs, never shell text."""
 prefix=Path(prefix);prefix.parent.mkdir(parents=True,exist_ok=True);timed_out=False
 with Path(str(prefix)+'.stdout.log').open('wb')as out,Path(str(prefix)+'.stderr.log').open('wb')as err:
  child=subprocess.Popen(command,stdout=out,stderr=err,shell=False,start_new_session=True)
  try:code=child.wait(timeout=timeout)
  except (subprocess.TimeoutExpired,KeyboardInterrupt):
   timed_out=True;os.killpg(child.pid,signal.SIGTERM)
   try:child.wait(timeout=2)
   except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);child.wait()
   code=child.returncode
  result={'command':command,'exitCode':code,'timedOut':timed_out}
 for name in ('stdout','stderr'):
  path=Path(str(prefix)+f'.{name}.log')
  with path.open('rb')as stream:stream.seek(max(0,path.stat().st_size-16000));result[name]=stream.read().decode('utf-8',errors='replace')
 return result

def snapshot(queue):
 with ro(queue)as db:
  row=db.execute("select value from meta where key='inputs'").fetchone()
  if row is None:raise PipelineError('Queue does not record its source snapshot.')
  inputs=json.loads(row[0]);papers=[dict(p)for p in db.execute('select * from papers')]
  counts={'papers':len(papers),'regions':db.execute('select count(*)from region_queue').fetchone()[0],'observedTextClusters':db.execute('select count(*)from clusters').fetchone()[0]}
 return inputs,papers,counts

def associations(root):
 """Only exclude exact prior source associations from duplicate job selection; never grant coverage."""
 result=set()
 def visit(value):
  if isinstance(value,list):
   for child in value:visit(child)
  elif isinstance(value,dict):
   pid=value.get('paperId')or value.get('paper_id');question=value.get('sourceQuestion')
   page=value.get('sourcePage',value.get('sourcePhysicalPage',value.get('physicalPage')))
   if pid and question is not None and isinstance(page,int):
    base=re.match(r'\s*(\d+)',str(question))
    if base:result.add((pid,base[1],page))
   for child in value.values():
    if isinstance(child,(list,dict)):visit(child)
 for path in Path(root).glob('.generated/*provenance.json'):
  try:visit(json.loads(path.read_text()))
  except (ValueError,OSError):continue
 return result

def candidate_score(row,topic,query,seed):
 text=row['raw_text'];words=set(re.findall(r'[a-z]{3,}',query.lower()));found=[w for w in words if re.search(r'\b'+re.escape(w)+r'\w*\b',text,re.I)]
 topic_hit=topic==row['primary_topic']or topic in json.loads(row['topic_cues_json'])
 decimal_hit=topic=='DEC'and bool(re.search(r'\d+\.\d+',text))
 cues={'wordProblem':bool(STORY.search(text)),'multipart':len(MULTIPART.findall(text))>=2,'figure':bool(row['visual_cue']or FIGURE.search(text)),'queryAnchors':found,'topicCue':topic_hit,'decimalQuantityCue':decimal_hit}
 score=row['priority']+min(40,len(found)*8)+(40 if topic_hit or decimal_hit else 0)+12*cues['wordProblem']+18*cues['multipart']+8*cues['figure']
 score-=max(0,len(json.loads(row['page_numbers_json']))-1)*15
 score-=min(70,(text.count('\ufffd')+text.count('\uffff'))*5)
 if not QUESTION.search(text):score-=60
 if re.search(r'answer\s*key|marking\s*scheme|worked\s*solutions?',text,re.I):score-=80
 return score,cues,digest(f'{seed}:{row["bank_line"]}')

def select_candidate(queue,staging,level,topic,query,seed,used_banks,used_clusters,used_papers,known,pattern_id=None):
 with ro(queue)as db:
  db.execute('attach database ? as staging',(Path(staging).resolve().as_uri()+'?mode=ro',))
  extra='';params=[level]
  if pattern_id:
   extra='and exists(select 1 from provisional_matches m where m.bank_line=q.bank_line and(m.target_id=?or json_extract(m.evidence_json,\'$.canonicalPatternId\')=?))';params.extend([pattern_id,pattern_id])
  # Existing cluster representatives only: no new extraction or global reclustering.
  rows=db.execute('''select q.*,r.raw_text,p.title from region_queue q
   join clusters c on c.cluster_id=q.text_cluster_id and c.representative_bank_line=q.bank_line
   join staging.regions r on r.bank_line=q.bank_line join papers p on p.paper_id=q.paper_id
   where q.level=? and q.track in('unmatched-pattern-review','existing-template-review')
   and q.source_covered=0 and json_array_length(q.page_numbers_json)between 1 and 2
   and length(r.raw_text)between 80 and 3500 '''+extra,params)
  ranked=[]
  for row in rows:
   if row['bank_line']in used_banks or row['text_cluster_id']in used_clusters:continue
   base=re.match(r'\s*(\d+)',str(row['question_number']))
   if base and any((row['paper_id'],base[1],p)in known for p in json.loads(row['page_numbers_json'])):continue
   score,cues,tie=candidate_score(row,topic,query,seed)
   # Paper diversity is a soft fallback only after exhausting other eligible papers.
   ranked.append((row['paper_id']not in used_papers,score,tie,dict(row),cues))
  if not ranked:return None
  preferred=[x for x in ranked if x[0]]or ranked;chosen=max(preferred,key=lambda x:(x[1],x[2]));return chosen[3],{'score':chosen[1],'cues':chosen[4],'query':query,'requestedTopic':topic,'paperRepeatedAfterExhaustion':not chosen[0],'status':'heuristic representative, not mathematical equivalence or complete question'}

def validate_packet(path,job):
 packet=json.loads(Path(path).read_text())
 if packet.get('schema')!=1 or  packet.get('level')!=job['level']or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}',packet.get('jobId','')):raise PipelineError('Retriever packet schema, level or identity is invalid.')
 regions=packet.get('sourceRegions')
 if not isinstance(regions,list)or not regions:raise PipelineError('Retriever returned no source regions.')
 match=[s for s in regions if s.get('bankLine')==job['bank_line']and s.get('paperId')==job['paper_id']and s.get('sourceSha256')==job['source_sha256']]
 if len(match)!=1 or  match[0].get('pageNumbers')!=json.loads(job['pages_json']):raise PipelineError('Retriever changed the selected source identity or page boundary.')
 if match[0].get('candidateId')!=job['candidate_id']or digest(match[0].get('rawText',''))!=job['raw_text_sha256']:raise PipelineError('Retriever changed the original candidate ID or parent-region text.')
 if any(s.get('level')!=job['level']for s in regions):raise PipelineError('Packet contains a different grade.')
 return packet

def retrieve_job(db,job,args,staging):
 packet=Path(job['packet_path']);command=[sys.executable,str(args.retriever),'--level',str(job['level']),'--query',job['query'],'--bank-line',str(job['bank_line']),'--limit','1','--queue',str(args.queue),'--staging',str(staging),'--inventory',str(args.inventory),'--output',str(packet)]
 if args.render:command.append('--render')
 event(db,job['id'],'preparing','retrieval',{'command':command},error=None)
 try:
  result=execute(command,packet.parent/'retrieval',args.retrieval_timeout)
  if result['exitCode']!=0 or  result['timedOut']:raise PipelineError(f'Retrieval failed: {canonical(result)}')
  data=validate_packet(packet,job)
  if job.get('refresh_context_json'):
   data['refreshContext']=json.loads(job['refresh_context_json'])
   data['jobId']='rag-'+digest(canonical({k:v for k,v in data.items()if k!='jobId'}))[:20]
   packet.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
  event(db,job['id'],'prepared','retrieval',{'sourceRegionCount':len(data['sourceRegions']),'renderRequested':args.render},packet_sha256=file_hash(packet),retrieval_id=data['jobId'],error=None)
 except (ValueError,OSError)as exc:event(db,job['id'],'failed','retrieval',{'error':str(exc)},error=str(exc)[:16000])

def prepare(args):
 work=Path(args.work_dir).resolve()
 with exclusive(work),connect(work)as db:
  inputs,papers,counts=snapshot(args.queue);old=db.execute("select value from meta where key='source'").fetchone()
  source={'queue':str(Path(args.queue).resolve()),'staging':inputs['staging'],'snapshot':inputs.get('stagingSnapshot'),'counts':counts}
  if old and json.loads(old[0])!=source:raise PipelineError('Pipeline source snapshot changed; use a new work directory.')
  db.execute('insert or replace into meta values(?,?)',('source',canonical(source)))
  db.execute('insert or replace into meta values(?,?)',('policy',canonical({'localOnly':True,'coverageGranted':0,'textClustersAreMathematicalPatterns':False,'sourceBoundaries':'full parent regions retained in packets; subpart markers provisional','integrationAndDeployment':'separate; never inferred from generation or checks'})))
  db.executemany('insert or ignore into corpus_papers values(?,?,?,?,?,?)',[(p['paper_id'],p['level'],p['title'],p['source_sha256'],p['region_count'],p['staged_pages'])for p in papers]);db.commit()
  known=associations(args.app_root);existing=list(db.execute('select *from jobs'));used_banks={j['bank_line']for j in existing};used_clusters={j['cluster_id']for j in existing};used_papers={j['paper_id']for j in existing};created=[];warnings=[]
  for level in args.level:
   current=[j for j in existing if j['level']==level and(not args.pattern_id or j['pattern_id']==args.pattern_id)]
   for slot in range(len(current),args.per_grade):
    topic,query=GAPS[level][slot%len(GAPS[level])]
    selected=select_candidate(args.queue,inputs['staging'],level,topic,query,args.seed,used_banks,used_clusters,used_papers,known,args.pattern_id)
    if selected is None:warnings.append(f'P{level}: no eligible unseen representative for slot {slot+1}');break
    row,selection=selected;identity={'snapshot':inputs.get('stagingSnapshot'),'bankLine':row['bank_line'],'level':level,'query':query,'patternId':args.pattern_id};job_id=f'p{level}-'+digest(canonical(identity))[:20];packet=work/'packets'/job_id/'packet.json';stamp=now()
    db.execute('''insert into jobs(id,level,topic,query,pattern_id,bank_line,candidate_id,paper_id,question_number,pages_json,source_sha256,raw_text_sha256,cluster_id,selection_json,state,stage,packet_path,created_at,updated_at)
     values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(job_id,level,topic,query,args.pattern_id,row['bank_line'],row['candidate_id'],row['paper_id'],row['question_number'],row['page_numbers_json'],row['source_sha256'],row['raw_text_sha256'],row['text_cluster_id'],canonical(selection),'preparing','retrieval',str(packet),stamp,stamp));db.commit()
    job=dict(db.execute('select *from jobs where id=?',(job_id,)).fetchone());created.append(job);used_banks.add(row['bank_line']);used_clusters.add(row['text_cluster_id']);used_papers.add(row['paper_id'])
  created.extend(dict(j)for j in db.execute("select *from jobs where state='preparing'and stage='retrieval'")if j['level']in args.level and j['id']not in{j['id']for j in created})
  if args.retry_failed:
   created.extend(dict(j)for j in db.execute("select *from jobs where state='failed'and stage='retrieval'")if j['level']in args.level and j['id']not in{j['id']for j in created})
  for job in created:retrieve_job(db,job,args,inputs['staging'])
  db.execute('insert or replace into meta values(?,?)',('lastPrepare',canonical({'at':now(),'seed':args.seed,'perGradeTarget':args.per_grade,'levels':args.level,'render':args.render,'warnings':warnings,'priorSourceAssociationsExcluded':len(known)})));db.commit()
 report=status(args);report['prepareWarnings']=warnings;return report

def archive_job(db,job,work):
 """Copy prior evidence before changing any current-generation pointer."""
 revision=db.execute('select count(*)from job_archives where job_id=?',(job['id'],)).fetchone()[0]+1
 stamp=now();archive_id=f'revision-{revision:04d}-'+digest(stamp)[:10]
 destination=work/'history'/job['id']/archive_id;destination.mkdir(parents=True,exist_ok=False)
 packet=Path(job['packet_path']);worker=work/'workers'/job['retrieval_id']if job['retrieval_id']else None
 with open(worker/'.job.lock','a+')if worker and worker.is_dir()else open(os.devnull,'r')as lock:
  if worker and worker.is_dir():
   try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
   except BlockingIOError:raise PipelineError(f'Worker is still using {job["id"]}; refresh refused.')from None
  try:
   if packet.parent.is_dir():shutil.copytree(packet.parent,destination/'packet',symlinks=True)
   if worker and worker.is_dir():shutil.copytree(worker,destination/'worker',symlinks=True)
   logs=work/'logs'/job['id']
   if logs.is_dir():shutil.copytree(logs,destination/'logs',symlinks=True)
  finally:
   if worker and worker.is_dir():fcntl.flock(lock,fcntl.LOCK_UN)
 files=[]
 for path in sorted(destination.rglob('*')):
  if path.is_symlink():files.append({'path':str(path.relative_to(destination)),'symlink':os.readlink(path)})
  elif path.is_file():files.append({'path':str(path.relative_to(destination)),'sha256':file_hash(path)})
 history=[dict(e)for e in db.execute('select *from events where job_id=?order by id',(job['id'],))]
 manifest={'schema':1,'archiveId':archive_id,'createdAt':stamp,'jobSnapshot':job,'events':history,'files':files,'originalPacket':str(packet),'originalWorker':str(worker)if worker else None,'missingPacket':not packet.is_file(),'policy':'Archived generation evidence; no source coverage, integration or deployment promotion.'}
 path=destination/'manifest.json';path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 db.execute('insert into job_archives values(?,?,?,?,?,?,?)',(archive_id,job['id'],revision,stamp,str(destination),file_hash(path),canonical(job)));db.commit()
 return {'archiveId':archive_id,'directory':str(destination),'manifestSha256':file_hash(path),'previousRetrievalId':job['retrieval_id']}

def refresh(args):
 """Refresh explicitly selected failed/review jobs, keeping their source identity."""
 work=Path(args.work_dir).resolve();refreshed=[];skipped_fresh=[]
 with exclusive(work),connect(work)as db:
  row=db.execute("select value from meta where key='source'").fetchone()
  if row is None:raise PipelineError('No prepared source snapshot; run prepare first.')
  source=json.loads(row[0]);args.queue=Path(source['queue'])
  jobs=[dict(j)for j in db.execute('select *from jobs order by level,created_at')if(j['level']in(args.level or[])or j['id']in(args.job_id or[]))]
  missing=set(args.job_id or[])-{j['id']for j in jobs}
  if missing:raise PipelineError('Unknown selected job IDs: '+', '.join(sorted(missing)))
  if not jobs:raise PipelineError('No jobs match the refresh selection.')
  if args.prepared_if_stale:
   skipped_fresh=[job['id']for job in jobs if job['state']=='prepared'and not packet_inventory_stale(job,args.inventory)]
   jobs=[job for job in jobs if job['id']not in skipped_fresh]
  for job in jobs:
   stale_prepared=args.prepared_if_stale and job['state']=='prepared'and packet_inventory_stale(job,args.inventory)
   if(job['state']not in('failed','needs-review')and not stale_prepared)or job['integrated_at']or job['deployed_at']:raise PipelineError(f'Only failed/review or explicitly stale prepared, unintegrated jobs may refresh: {job["id"]} is {job["state"]}.')
  for job in jobs:
   archived=archive_job(db,job,work);generation=job['generation']+1
   context={'generation':generation,'refreshedAt':now(),'reason':args.reason,**archived}
   packet=work/'packets'/job['id']/'revisions'/archived['archiveId']/'packet.json'
   event(db,job['id'],'preparing','retrieval',{'refresh':context},generation=generation,refresh_context_json=canonical(context),packet_path=str(packet),packet_sha256=None,retrieval_id=None,worker_result_json=None,attempts=0,error=None)
   current=dict(db.execute('select *from jobs where id=?',(job['id'],)).fetchone());retrieve_job(db,current,args,source['staging'])
   refreshed.append({'id':job['id'],'level':job['level'],'bankLine':job['bank_line'],'generation':generation,**archived})
 report=status(args);report['refreshedJobs']=refreshed;report['skippedFreshJobs']=skipped_fresh;return report

def packet_inventory_stale(job,inventory):
 try:packet=json.loads(Path(job['packet_path']).read_text())
 except (OSError,ValueError):return True
 return packet.get('selection',{}).get('inventorySha256')!=file_hash(inventory)

def worker_result(job,args,checks):
 packet=Path(job['packet_path'])
 if not packet.is_file()or file_hash(packet)!=job['packet_sha256']:raise PipelineError('Prepared packet changed or disappeared; not running this job.')
 data=validate_packet(packet,job);command=[sys.executable,str(args.worker),str(packet),'--jobs-dir',str(Path(args.work_dir).resolve()/'workers'),'--codex',args.codex,'--timeout',str(args.worker_timeout),'--max-repairs',str(args.max_repairs),'--resume']
 for check in checks:command.extend(['--check-command-json',canonical(check)])
 result=execute(command,Path(args.work_dir)/'logs'/job['id']/f'worker-{job["attempts"]+1}',args.job_timeout)
 if result['exitCode']!=0 or  result['timedOut']:raise PipelineError('Worker process did not complete successfully: '+canonical(result))
 checkpoint=Path(args.work_dir).resolve()/'workers'/data['jobId']/'checkpoint.json'
 state=json.loads(checkpoint.read_text());name=state.get('status')
 if state.get('jobId')!=data['jobId']or state.get('packetSha256')!=digest(canonical(data)):raise PipelineError('Worker checkpoint does not bind to the prepared source packet.')
 if name not in WORKER_STATES:raise PipelineError(f'Worker returned nonterminal or unknown status{name!r}.')
 if state.get('commands')!=checks:raise PipelineError('Worker checkpoint has different check commands.')
 if name=='checks-passed'and(not checks or not state.get('checksExecuted')or not state.get('checks')or any(c.get('exitCode')!=0 for  c in state['checks'])or len(state['checks'])!=len(checks)):raise PipelineError('checks-passed requires every supplied check to actually exit zero.')
 if name in('reuse','needs-review')and state.get('checksExecuted'):raise PipelineError('Reuse/review status may not claim generated-code checks.')
 return WORKER_STATES[name],state

def terminal_evidence(job,args,checks):
 state=json.loads(job['worker_result_json']or '{}')
 if state.get('commands')!=checks:raise PipelineError('Cannot resume terminal jobs with different check commands; their archived checks remain unchanged.')
 base=Path(args.work_dir).resolve()/'workers'/job['retrieval_id'];name=state.get('candidateFile')
 if not isinstance(name,str)or not re.fullmatch(r'candidate-attempt-[1-3]\.json',name):raise PipelineError('Terminal checkpoint is missing its candidate evidence.')
 candidate=base/name
 if not candidate.is_file()or candidate.is_symlink()or file_hash(candidate)!=state.get('candidateSha256'):raise PipelineError('Terminal candidate JSON changed or disappeared.')
 for rel,expected in state.get('fileSha256',{}).items():
  path=(base/rel).resolve()
  if not path.is_relative_to(base)or not path.is_file()or path.is_symlink()or file_hash(path)!=expected:raise PipelineError('Terminal candidate code changed or disappeared.')

def run(args):
 checks=[command_json(raw)for raw in args.check_command_json];work=Path(args.work_dir).resolve()
 with exclusive(work),connect(work)as db:
  # No terminal outcome is rerun by a normal resume. Detect altered prepared evidence instead.
  for row in list(db.execute('select *from jobs')):
   if row['state']in TERMINAL and(not Path(row['packet_path']).is_file()or file_hash(row['packet_path'])!=row['packet_sha256']):event(db,row['id'],'failed','evidence',error='Terminal job packet changed; existing outcome cannot be trusted.')
  for row in list(db.execute('select *from jobs')):
   if row['state']in TERMINAL:
    try:terminal_evidence(row,args,checks)
    except PipelineError as exc:
     if 'different check commands'in str(exc):raise
     event(db,row['id'],'failed','evidence',error=str(exc))
  eligible=list(db.execute("select *from jobs where state='prepared' or(state in('running','failed')and stage='worker')order by attempts,level,created_at"))
  if not args.retry_failed:eligible=[r for r in eligible if r['state']!='failed']
  stale=[job['id']for job in eligible if packet_inventory_stale(job,args.inventory)]
  if stale:raise PipelineError('Current generator inventory differs from these prepared packets: '+', '.join(stale)+'. Use explicit refresh --prepared-if-stale with selected --level/--job-id and --render before run; prior evidence will be archived.')
  # Round-robin grades before taking a bounded run batch.
  grouped={level:[dict(j)for j in eligible if j['level']==level]for level in range(1,7)};jobs=[]
  while any(grouped.values())and len(jobs)<args.limit:
   for level in range(1,7):
    if grouped[level]and len(jobs)<args.limit:jobs.append(grouped[level].pop(0))
  def run_one(job):
   with connect(work) as thread_db:
    event(thread_db,job['id'],'running','worker',{'workersBound':args.workers,'commands':checks},attempts=job['attempts']+1,error=None)
   return worker_result(job,args,checks)
  with ThreadPoolExecutor(max_workers=args.workers)as pool:
   futures={}
   for job in jobs:
    futures[pool.submit(run_one,job)]=job
   for future in as_completed(futures):
    job=futures[future]
    try:new_state,state=future.result();event(db,job['id'],new_state,'worker',{'workerStatus':state['status'],'checksExecuted':state.get('checksExecuted',False)},worker_result_json=canonical(state),error=None)
    except Exception as exc:event(db,job['id'],'failed','worker',{'error':str(exc)},error=str(exc)[:16000])
 return status(args)

def status(args):
 work=Path(args.work_dir).resolve();path=work/'pipeline.sqlite'
 if not path.exists():raise PipelineError('No pipeline exists; run prepare first.')
 with ro(path)as db:
  source=json.loads(db.execute("select value from meta where key='source'").fetchone()[0]);jobs=[dict(j)for j in db.execute('select *from jobs order by level,created_at')];counts=Counter(j['state']for j in jobs)
  result={'schema':1,'workDirectory':str(work),'sourceInventory':source,'trackedSourcePapers':db.execute('select count(*)from corpus_papers').fetchone()[0],'preparedSourceJobs':len(jobs),'jobStateCounts':dict(counts),'byLevel':{str(level):dict(Counter(j['state']for j in jobs if j['level']==level))for level in range(1,7)},'unselectedRawRegions':source['counts']['regions']-len({j['bank_line']for j in jobs}),'coverageGranted':0,'integrated':sum(j['integrated_at']is not None for j in jobs),'deployed':sum(j['deployed_at']is not None for j in jobs),'policy':'Selection/retrieval/generation/checks are not source verification, integration, deployment or mathematical pattern counts.','jobs':[]}
  archives='job_archives'in{r[0]for r in db.execute("select name from sqlite_master where type='table'")}
  result['archivedGenerations']=db.execute('select count(*)from job_archives').fetchone()[0]if archives else 0
  for j in jobs:result['jobs'].append({k:j[k]for k in ['id','level','topic','bank_line','candidate_id','paper_id','question_number','state','stage','packet_path','retrieval_id','attempts','error','integrated_at','deployed_at']}|{'generation':j.get('generation',0),'sourcePages':json.loads(j['pages_json']),'sourceSha256':j['source_sha256'],'textClusterId':j['cluster_id'],'selection':json.loads(j['selection_json'])})
 return result

def parser():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--work-dir',type=Path,default=DEFAULT_WORK);commands=p.add_subparsers(dest='action',required=True)
 a=commands.add_parser('prepare',help='Retrieve bounded balanced jobs; never launch generator workers.')
 a.add_argument('--queue',type=Path,default=DEFAULT_QUEUE);a.add_argument('--inventory',type=Path,default=ROOT/'.generated/question-pattern-inventory.json');a.add_argument('--app-root',type=Path,default=ROOT);a.add_argument('--retriever',type=Path,default=ROOT/'scripts/rag-retrieve.py');a.add_argument('--per-grade',type=int,default=1);a.add_argument('--level',action='append',type=int,choices=range(1,7));a.add_argument('--seed',type=int,default=37);a.add_argument('--pattern-id');a.add_argument('--render',action='store_true');a.add_argument('--retry-failed',action='store_true');a.add_argument('--retrieval-timeout',type=int,default=120)
 a=commands.add_parser('refresh',help='Archive and retrieve selected failed/review jobs using current code, without launching workers.')
 a.add_argument('--level',action='append',type=int,choices=range(1,7));a.add_argument('--job-id',action='append');a.add_argument('--inventory',type=Path,default=ROOT/'.generated/question-pattern-inventory.json');a.add_argument('--retriever',type=Path,default=ROOT/'scripts/rag-retrieve.py');a.add_argument('--prepared-if-stale',action='store_true');a.add_argument('--render',action='store_true');a.add_argument('--retrieval-timeout',type=int,default=120);a.add_argument('--reason',default='Refresh with current inventory and code references.')
 a=commands.add_parser('run',help='Explicitly launch isolated workers, at most two at once.')
 a.add_argument('--worker',type=Path,default=ROOT/'scripts/rag-generator-worker.py');a.add_argument('--codex',default='codex');a.add_argument('--inventory',type=Path,default=ROOT/'.generated/question-pattern-inventory.json');a.add_argument('--workers',type=int,choices=[1,2],default=2);a.add_argument('--limit',type=int,default=6);a.add_argument('--worker-timeout',type=int,default=600);a.add_argument('--job-timeout',type=int,default=4200);a.add_argument('--max-repairs',type=int,choices=range(3),default=2);a.add_argument('--check-command-json',action='append',default=[]);a.add_argument('--retry-failed',action='store_true')
 commands.add_parser('status',help='Read persistent state; never run or promote a job.')
 return p

def main():
 p=parser();args=p.parse_args()
 if args.action=='prepare':
  args.level=sorted(set(args.level or range(1,7)))
  if not 1<=args.per_grade<=100:p.error('--per-grade must be between 1 and 100; use bounded targets.')
  if not 1<=args.retrieval_timeout<=1800:p.error('--retrieval-timeout must be between 1 and 1800 seconds.')
 if args.action=='run'and(not 1<=args.limit<=1000 or  not 1<=args.worker_timeout<=1800 or  not 1<=args.job_timeout<=14400):p.error('Run limits/timeouts are outside bounded ranges.')
 if args.action=='refresh':
  if not args.level and not args.job_id:p.error('Refresh requires explicit --level or --job-id selectors.')
  if not 1<=args.retrieval_timeout<=1800:p.error('--retrieval-timeout must be between 1 and 1800 seconds.')
 try:
  report={'prepare':prepare,'refresh':refresh,'run':run,'status':status}[args.action](args);print(json.dumps(report,indent=2,ensure_ascii=False));return 1 if  args.action!='status'and(report['jobStateCounts'].get('failed')or report.get('prepareWarnings'))else 0
 except (PipelineError,OSError,sqlite3.Error,ValueError)as exc:print(f'Pipeline error: {exc}',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
