#!/usr/bin/env python3
"""Bounded code-free bulk source tagging. Provisional groups never grant coverage."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import sqlite3
import subprocess
import unicodedata

ROOT=Path(__file__).resolve().parents[1]
SCHEMA=ROOT/'scripts/rag/bulk-tag-schema.json'
PROMPT=ROOT/'scripts/rag/bulk-tag-prompt.txt'
POLICY='Model source tags and exact-text aliases are triage evidence, not verified questions, equivalent patterns or source coverage.'
SQL='''
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS source_index(bank_line INTEGER PRIMARY KEY,paper_id TEXT NOT NULL,title TEXT,level INTEGER,year INTEGER,question_number TEXT,page_numbers_json TEXT,source_sha256 TEXT,raw_text_sha256 TEXT,exact_text_key TEXT,topic_hint TEXT,kind TEXT,flags_json TEXT,text_length INTEGER,literal_arithmetic INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS exact_texts(exact_text_key TEXT PRIMARY KEY,representative_bank_line INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS batches(batch_id TEXT PRIMARY KEY,ordinal INTEGER,status TEXT,packet_path TEXT,packet_sha256 TEXT,result_path TEXT,result_sha256 TEXT,attempts INTEGER NOT NULL DEFAULT 0,error TEXT);
CREATE TABLE IF NOT EXISTS batch_sources(batch_id TEXT NOT NULL,bank_line INTEGER NOT NULL UNIQUE,PRIMARY KEY(batch_id,bank_line));
CREATE TABLE IF NOT EXISTS region_tags(bank_line INTEGER PRIMARY KEY,batch_id TEXT,classification TEXT,raw_text_sha256 TEXT,group_key TEXT,hold_reasons_json TEXT,tag_json TEXT,result_sha256 TEXT);
CREATE TABLE IF NOT EXISTS dictionary(group_key TEXT PRIMARY KEY,descriptor_json TEXT NOT NULL);
'''

def canonical(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def digest(x):return hashlib.sha256(x.encode()).hexdigest()
def file_hash(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def now():return datetime.now(timezone.utc).isoformat()
def atomic(path,data):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix(path.suffix+'.writing');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
def read_only(path):
 db=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row;return db
def connect(work):
 work=Path(work).resolve();work.mkdir(parents=True,exist_ok=True);db=sqlite3.connect(work/'tags.sqlite');db.row_factory=sqlite3.Row;db.executescript(SQL)
 if 'literal_arithmetic'not in{r['name']for r in db.execute('pragma table_info(source_index)')}:db.execute('alter table source_index add column literal_arithmetic integer not null default 0')
 return db
def meta(db,key,default=None):
 row=db.execute('select value from meta where key=?',(key,)).fetchone();return json.loads(row[0])if row else default
def set_meta(db,key,value):db.execute('insert into meta values(?,?) on conflict(key)do update set value=excluded.value',(key,canonical(value)))
def exact_normalized(text):
 # Preserve every number/name/operator/word; only Unicode/case/whitespace normalize.
 return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',text).casefold()).strip()
def defaults(queue):
 with read_only(queue)as db:return Path(json.loads(db.execute("select value from meta where key='inputs'").fetchone()[0])['staging'])

def index_sources(db,queue,level):
 staging=defaults(queue)
 spec=importlib.util.spec_from_file_location('bulk_literal_triage',ROOT/'scripts/corpus-literal-arithmetic.py');literal=importlib.util.module_from_spec(spec);spec.loader.exec_module(literal)
 with read_only(staging)as source,read_only(queue)as q,db:
  snapshot=dict(source.execute('select key,value from meta')).get('snapshotId')
  identity={'staging':str(staging.resolve()),'snapshot':snapshot,'queue':str(Path(queue).resolve()),'level':level}
  if meta(db,'inputs')and meta(db,'inputs')!=identity:raise ValueError('Work directory belongs to a different immutable source snapshot/grade')
  if meta(db,'indexed'):return identity
  cues={r['bank_line']:dict(r)for r in q.execute('select bank_line,primary_topic from region_queue where level=?',(level,))}
  for row in source.execute('select r.bank_line,r.paper_id,r.question_number,r.page_numbers_json,r.source_sha256,r.raw_text,r.raw_text_sha256,r.kind,r.triage_flags_json,p.level,p.year,p.title from regions r join papers p using(paper_id) where p.level=? order by p.year desc,r.bank_line',(level,)):
   text=row['raw_text'];key=digest(exact_normalized(text))
   if digest(text)!=row['raw_text_sha256']:raise ValueError('Staged raw text hash mismatch')
   literal_only=len(text)<=5000 and literal.classify(text,level)[0]is not None
   db.execute('insert or ignore into source_index values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(row['bank_line'],row['paper_id'],row['title'],row['level'],row['year'],row['question_number'],row['page_numbers_json'],row['source_sha256'],row['raw_text_sha256'],key,cues.get(row['bank_line'],{}).get('primary_topic','UNCLASSIFIED'),row['kind'],row['triage_flags_json'],len(text),int(literal_only)))
   db.execute('insert or ignore into exact_texts values(?,?)',(key,row['bank_line']))
  set_meta(db,'inputs',identity);set_meta(db,'indexed',True)
 return identity

def select_sources(db,limit,year_min=2025,paper_ids=()):
 sql='''select i.* from source_index i join exact_texts e using(exact_text_key) where i.bank_line=e.representative_bank_line and i.literal_arithmetic=0 and i.year>=? and i.text_length between 10 and 5000 and not exists(select 1 from batch_sources b where b.bank_line=i.bank_line) order by i.year desc,i.title,i.bank_line'''
 candidates=[dict(r)for r in db.execute(sql,(year_min,))if(not paper_ids or r['paper_id']in paper_ids)and 0<len(json.loads(r['page_numbers_json']))<=2]
 preferred=['AREA','ANGLE','LINES','SYM','SHAPE','SOLID','DEC','FRAC','MEASURE','TIME','MONEY','FACT','GRAPH','LENGTH','WN','MD','AS','UNCLASSIFIED']
 buckets=defaultdict(list)
 for row in candidates:buckets[row['topic_hint']].append(row)
 topics=[t for t in preferred if t in buckets]+sorted(set(buckets)-set(preferred));picked=[];paper_counts=Counter()
 while len(picked)<limit and any(buckets.values()):
  for topic in topics:
   if len(picked)>=limit:break
   if not buckets[topic]:continue
   best=min(range(len(buckets[topic])),key=lambda n:(paper_counts[buckets[topic][n]['paper_id']],-buckets[topic][n]['year'],buckets[topic][n]['bank_line']))
   row=buckets[topic].pop(best);picked.append(row);paper_counts[row['paper_id']]+=1
 return picked

def make_packet(db,rows):
 inputs=meta(db,'inputs');regions=[];pages={}
 with read_only(inputs['staging'])as source:
  for indexed in rows:
   row=source.execute('select * from regions where bank_line=?',(indexed['bank_line'],)).fetchone()
   if not row or row['raw_text_sha256']!=indexed['raw_text_sha256']or digest(row['raw_text'])!=indexed['raw_text_sha256']:raise ValueError('Source region changed since indexing')
   numbers=json.loads(row['page_numbers_json'])
   regions.append({'bankLine':row['bank_line'],'paperId':row['paper_id'],'title':indexed['title'],'level':indexed['level'],'questionNumber':str(row['question_number'])if row['question_number']is not None else'unresolved','pageNumbers':numbers,'sourceSha256':row['source_sha256'],'rawTextSha256':row['raw_text_sha256'],'rawText':row['raw_text'],'sourceKind':row['kind'],'flags':json.loads(row['triage_flags_json']or'[]'),'subpartMarkers':[dict(s)for s in source.execute('select *from subpart_candidates where bank_line=?order by ordinal',(row['bank_line'],))],'diagramDependencies':[dict(s)for s in source.execute('select *from diagram_dependencies where bank_line=?order by page_number',(row['bank_line'],))]})
   for page in numbers:
    key=(row['paper_id'],page)
    if key in pages:continue
    record=source.execute('select text from pages where paper_id=?and page_number=?',key).fetchone();text=record['text']if record else''
    pages[key]={'paperId':row['paper_id'],'page':page,'text':text,'textSha256':digest(text),'missing':record is None}
 base={'schema':1,'level':inputs['level'],'sources':regions,'pageContexts':[pages[k]for k in sorted(pages)],'policy':POLICY}
 return {'batchId':'tag-'+digest(canonical(base))[:20],**base}

def prepare(work,queue,level=4,limit=40,batch_size=20,year_min=2025,paper_ids=()):
 with connect(work)as db:
  index_sources(db,queue,level);rows=select_sources(db,limit,year_min,paper_ids)
  if not rows:return status(work)
  if len(rows)<20:raise ValueError('Need at least 20 eligible representative regions for a bulk batch; retain smaller tails unqueued')
  batches=max(1,math.ceil(len(rows)/batch_size))
  while batches>1 and len(rows)//batches<20:batches-=1
  if math.ceil(len(rows)/batches)>40:raise ValueError('Cannot form 20–40-region batches')
  for n in range(batches):
   chunk=rows[n*len(rows)//batches:(n+1)*len(rows)//batches];packet=make_packet(db,chunk);directory=Path(work).resolve()/'batches'/packet['batchId'];path=directory/'packet.json'
   if path.exists()and json.loads(path.read_text())!=packet:raise ValueError('Immutable packet changed')
   atomic(path,packet);ordinal=db.execute('select coalesce(max(ordinal),0)+1 from batches').fetchone()[0]
   db.execute('insert or ignore into batches(batch_id,ordinal,status,packet_path,packet_sha256)values(?,?,?,?,?)',(packet['batchId'],ordinal,'prepared',str(path),file_hash(path)))
   for row in chunk:db.execute('insert or ignore into batch_sources values(?,?)',(packet['batchId'],row['bank_line']))
 return status(work)

def tag_check(out,packet):
 if not isinstance(out,dict)or set(out)!={'schema','batchId','tags'}or out['schema']!=1 or out['batchId']!=packet['batchId']or not isinstance(out['tags'],list):raise ValueError('Invalid bound batch result')
 sources={s['bankLine']:s for s in packet['sources']};seen=set();validated=[]
 fields={'bankLine','paperId','rawTextSha256','classification','topic','unknowns','relations','linkedSubparts','units','numericalDomain','response','representation','boundaries','confidence','gaps'}
 for tag in out['tags']:
  if not isinstance(tag,dict)or set(tag)!=fields:raise ValueError('Invalid tag fields')
  line=tag['bankLine'];source=sources.get(line)
  if line in seen or not source or tag['paperId']!=source['paperId']or tag['rawTextSha256']!=source['rawTextSha256']:raise ValueError('Changed/duplicate source identity or raw text binding')
  seen.add(line)
  if tag['classification']not in('real-question','answer-key','fragment','unknown')or tag['boundaries']not in('complete','uncertain','fragment')or tag['confidence']not in('high','medium','low'):raise ValueError('Invalid classification/confidence')
  if not isinstance(tag['topic'],str)or len(tag['topic'])>80:raise ValueError('Invalid topic')
  for key in('unknowns','relations','units','gaps'):
   if not isinstance(tag[key],list)or len(tag[key])>20 or any(not isinstance(x,str)or not x.strip()or len(x)>400 for x in tag[key]):raise ValueError('Invalid compact tag list')
  if not isinstance(tag['linkedSubparts'],list)or len(tag['linkedSubparts'])>12:raise ValueError('Invalid linked subparts')
  for part in tag['linkedSubparts']:
   if set(part)!={'label','unknown','dependsOn'}or not isinstance(part['label'],str)or not isinstance(part['unknown'],str)or not isinstance(part['dependsOn'],list)or any(not isinstance(x,str)for x in part['dependsOn']):raise ValueError('Invalid part dependency')
  if set(tag['numericalDomain'])!={'numberTypes','constraints'}or not all(isinstance(tag['numericalDomain'][k],list)and all(isinstance(v,str)and len(v)<400 for v in tag['numericalDomain'][k])for k in('numberTypes','constraints')):raise ValueError('Invalid numerical domain')
  response=tag['response'];representation=tag['representation']
  if set(response)!={'kind','fieldCount','ordered','requirements'}or not isinstance(response['kind'],str)or type(response['fieldCount'])is not int or not 0<=response['fieldCount']<=20 or type(response['ordered'])is not bool or not isinstance(response['requirements'],list):raise ValueError('Invalid response shape')
  if set(representation)!={'kind','figureNeed','constraints'}or representation['kind']not in('text','table','graph','geometry','construction','mixed','unknown')or representation['figureNeed']not in('required','not-required','uncertain')or not isinstance(representation['constraints'],list):raise ValueError('Invalid representation')
  for values in(response['requirements'],representation['constraints']):
   if len(values)>20 or any(not isinstance(v,str)or len(v)>400 for v in values):raise ValueError('Invalid response/representation constraints')
  validated.append(tag)
 if seen!=set(sources):raise ValueError('Result must tag every source exactly once')
 return sorted(validated,key=lambda t:t['bankLine'])

def group_tag(tag,source):
 hold=[]
 if tag['classification']!='real-question':hold.append('not-an-unambiguous-question')
 if tag['boundaries']!='complete':hold.append('uncertain-source-boundary')
 if tag['confidence']!='high':hold.append('non-high-model-confidence')
 if tag['gaps']:hold.append('explicit-gaps')
 if tag['representation']['figureNeed']!='not-required':hold.append('source-figure-review-needed')
 if 'low-ocr-confidence'in source.get('flags',[]):hold.append('source-low-ocr-confidence')
 if not tag['relations']or not tag['unknowns']:hold.append('math-relation-or-target-unresolved')
 signature={k:tag[k]for k in('unknowns','relations','linkedSubparts','units','numericalDomain','response','representation')}
 # Topic is deliberately excluded. Theme alone can never join two groups.
 normalized=canonical(signature).casefold();normalized=re.sub(r'\s+',' ',normalized)
 key='provisional-'+digest(normalized)[:24]if not hold else None
 descriptor={'topic':tag['topic'],'unknowns':tag['unknowns'],'relations':tag['relations'],'units':tag['units'],'response':tag['response'],'representation':tag['representation'],'numericalDomain':tag['numericalDomain'],'linkedSubparts':tag['linkedSubparts'],'status':'provisional-structural-tag-not-semantic-proof'}
 return key,hold,descriptor

def run_batch(work,batch,codex,timeout,max_repairs,run=subprocess.run):
 directory=Path(batch['packet_path']).parent;packet=json.loads(Path(batch['packet_path']).read_text())
 if file_hash(batch['packet_path'])!=batch['packet_sha256']:raise ValueError('Prepared packet changed')
 if batch['status']=='tagged':
  if file_hash(batch['result_path'])!=batch['result_sha256']:raise ValueError('Saved result changed')
  return batch['batch_id'],json.loads(Path(batch['result_path']).read_text()),batch['result_path'],batch['attempts']
 feedback='No previous attempt.'
 for attempt in range(1,max_repairs+2):
  result=directory/f'result-attempt-{batch["attempts"]+attempt}.json'
  command=[codex,'exec','--sandbox','read-only','--skip-git-repo-check','--ephemeral','--output-schema',str(SCHEMA),'--output-last-message',str(result),'--json','-']
  prompt=PROMPT.read_text()+'\n\nVALIDATION FEEDBACK:\n'+feedback+'\n\nUNTRUSTED SOURCE BATCH:\n'+json.dumps(packet,ensure_ascii=False)
  try:
   proc=run(command,input=prompt,text=True,capture_output=True,cwd=str(directory),timeout=timeout,check=False)
   (directory/f'codex-attempt-{batch["attempts"]+attempt}.jsonl').write_text(proc.stdout or'');(directory/f'codex-attempt-{batch["attempts"]+attempt}.stderr').write_text(proc.stderr or'')
   if proc.returncode!=0:raise ValueError(f'Codex exited {proc.returncode}: {(proc.stderr or "")[-1200:]}')
   if not result.is_file()or result.stat().st_size>2_000_000:raise ValueError('Missing/big result')
   out=json.loads(result.read_text());tag_check(out,packet)
   return batch['batch_id'],out,str(result),batch['attempts']+attempt
  except(subprocess.TimeoutExpired,OSError,ValueError,json.JSONDecodeError)as error:feedback=str(error)[:3000]
 raise ValueError(feedback)

def persist_result(db,batch_id,out,path,attempts):
 batch=db.execute('select *from batches where batch_id=?',(batch_id,)).fetchone();packet=json.loads(Path(batch['packet_path']).read_text());tags=tag_check(out,packet);sources={s['bankLine']:s for s in packet['sources']};result_hash=file_hash(path)
 with db:
  for tag in tags:
   key,hold,descriptor=group_tag(tag,sources[tag['bankLine']]);existing=db.execute('select *from region_tags where bank_line=?',(tag['bankLine'],)).fetchone()
   values=(tag['bankLine'],batch_id,tag['classification'],tag['rawTextSha256'],key,canonical(hold),canonical(tag),result_hash)
   if existing and tuple(existing)!=values:raise ValueError('Immutable region tag changed')
   db.execute('insert or ignore into region_tags values(?,?,?,?,?,?,?,?)',values)
   if key:db.execute('insert or ignore into dictionary values(?,?)',(key,canonical(descriptor)))
  db.execute("update batches set status='tagged',result_path=?,result_sha256=?,attempts=?,error=null where batch_id=?",(str(path),result_hash,attempts,batch_id))

def status(work):
 with read_only(Path(work)/'tags.sqlite')as db:
  counts=lambda table:db.execute(f'select count(*)from {table}').fetchone()[0]
  # Build the set of tagged text keys once; a correlated lookup rescans the
  # grade index for every source when the tag table is still empty.
  tagged=counts('region_tags');aliases=db.execute('select count(*) from source_index where exact_text_key in (select i.exact_text_key from region_tags t join source_index i on i.bank_line=t.bank_line)').fetchone()[0]
  result={'schema':1,'workDirectory':str(Path(work).resolve()),'database':str((Path(work)/'tags.sqlite').resolve()),'level':meta(db,'inputs',{}).get('level',4),'indexedSourceRegions':counts('source_index'),'exactNormalizedTexts':counts('exact_texts'),'exactDuplicateMembers':counts('source_index')-counts('exact_texts'),'selectedSourceRegions':counts('batch_sources'),'taggedSourceRegions':tagged,'taggedIncludingExactAliases':aliases,'provisionalGroups':counts('dictionary'),'groupedSourceRegions':db.execute('select count(*)from region_tags where group_key is not null').fetchone()[0],'heldSourceRegions':db.execute('select count(*)from region_tags where group_key is null').fetchone()[0],'nonQuestionRegions':db.execute("select count(*)from region_tags where classification!='real-question'").fetchone()[0],'classifications':dict(db.execute('select classification,count(*)from region_tags group by classification')),'batchStatuses':dict(db.execute('select status,count(*)from batches group by status')),'batches':[dict(r)for r in db.execute('select *from batches order by ordinal')],'coverageGranted':0,'sourceCompleteness':'unknown','policy':POLICY}
 return result

def export_artifacts(work):
 with read_only(Path(work)/'tags.sqlite')as db:
  dictionary=[{'groupKey':r['group_key'],**json.loads(r['descriptor_json']),'sourceRepresentatives':db.execute('select count(*)from region_tags where group_key=?',(r['group_key'],)).fetchone()[0]}for r in db.execute('select *from dictionary order by group_key')]
 atomic(Path(work)/'dictionary.json',{'schema':1,'groups':dictionary,'policy':POLICY});out=status(work);atomic(Path(work)/'stats.json',out);return out

def run_batches(work,codex='codex',parallel=2,timeout=600,max_repairs=1,retry_failed=False):
 if parallel not in(1,2)or not 1<=timeout<=1800 or max_repairs not in(0,1,2):raise ValueError('Invalid run bounds')
 with connect(work)as db:
  rows=[dict(r)for r in db.execute("select *from batches where status in ('prepared','running')"+(' or status=\'failed\''if retry_failed else'')+' order by ordinal')]
  for row in rows:db.execute("update batches set status='running',error=null where batch_id=?",(row['batch_id'],))
  db.commit()
  with ThreadPoolExecutor(max_workers=parallel)as pool:
   futures={pool.submit(run_batch,work,row,codex,timeout,max_repairs):row for row in rows}
   for future in as_completed(futures):
    row=futures[future]
    try:persist_result(db,*future.result())
    except Exception as error:
     with db:db.execute("update batches set status='failed',error=?where batch_id=?",(str(error),row['batch_id']))
 return export_artifacts(work)

def main():
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='action',required=True)
 for action in('prepare','run','status'):
  a=sub.add_parser(action);a.add_argument('--work-dir',type=Path,default=ROOT/'.generated/rag-bulk-tag-p4')
  if action=='prepare':
   a.add_argument('--queue',type=Path,default=ROOT/'.generated/corpus-pattern-queue.sqlite');a.add_argument('--level',type=int,choices=range(1,7),default=4);a.add_argument('--limit',type=int,default=40);a.add_argument('--batch-size',type=int,default=20);a.add_argument('--year-min',type=int,default=2025);a.add_argument('--paper-id',action='append',default=[])
  elif action=='run':
   a.add_argument('--codex',default='codex');a.add_argument('--parallel',type=int,choices=(1,2),default=2);a.add_argument('--timeout',type=int,default=600);a.add_argument('--max-repairs',type=int,choices=range(3),default=1);a.add_argument('--retry-failed',action='store_true')
 args=p.parse_args()
 try:
  if args.action=='prepare':
   if not 20<=args.batch_size<=40 or not 20<=args.limit<=1000:raise ValueError('Prepare 20–1000 representatives in batches of 20–40')
   result=prepare(args.work_dir,args.queue,args.level,args.limit,args.batch_size,args.year_min,args.paper_id)
  elif args.action=='run':result=run_batches(args.work_dir,args.codex,args.parallel,args.timeout,args.max_repairs,args.retry_failed)
  else:result=status(args.work_dir)
  print(json.dumps(result,ensure_ascii=False,indent=2));return 1 if result['batchStatuses'].get('failed')else 0
 except(OSError,ValueError,sqlite3.Error,KeyError)as error:print(f'Bulk tag stopped: {error}',file=__import__('sys').stderr);return 2
if __name__=='__main__':raise SystemExit(main())
