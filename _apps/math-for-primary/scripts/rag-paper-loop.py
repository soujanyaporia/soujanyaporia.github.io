#!/usr/bin/env python3
"""Sequential paper/region adaptation using current durable code memory.

prepare/dry-run never calls a model. run retrieves just in time, checks a single
worker candidate, records its decision, promotes only a passing receipt, and
refreshes inventory/memory before proceeding. OCR regions never imply complete
source questions or whole-paper coverage. Real model execution is opt-in via run.
"""
from __future__ import annotations
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]

def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);loaded=importlib.util.module_from_spec(spec);spec.loader.exec_module(loaded);return loaded

memory=module('rag_paper_memory',ROOT/'scripts/rag-memory.py')
pipeline=module('rag_paper_pipeline',ROOT/'scripts/rag-pipeline.py')
worker=module('rag_paper_worker',ROOT/'scripts/rag-generator-worker.py')
DONE={'integrated','reuse','needs-review','generated-unverified'}
CORE_REFERENCES={'src/primary/generate.ts','src/primary/answerFormat.ts','src/primary/gridDrawingModel.ts','src/primary/paperImports/batch6MiddleResponse.ts','src/primary/paperPicture.ts','src/school/curriculum.ts'}

class LoopError(ValueError):pass

def atomic(path,value):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_suffix(path.suffix+'.writing');temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)

def compact_memory(matches,limit,database):
 """Bound lookup descriptors; full decisions/examples/region history stay in SQLite."""
 generators=[]
 for source in matches.get('generators',[])[:limit]:
  row={key:source.get(key)for key in('id','familyId','canonicalPatternId','level','title','objective','skillIds','codeVersion','codeFiles','bindingStatus','descriptor','responseShapes','partCounts','representations','numericConstraints','structuralSignature','numericSignature','exactSignature','signatureMeaning','responseShapeMismatch','evidenceReference')}
  constraints=source.get('constraints',{})
  row['constraints']={key:constraints.get(key)for key in('declared','status')}
  row['priorSources']=[{key:ref.get(key)for key in('paper_id','bank_line','question_number','page_numbers_json','pageNumbers','outcome','version_id','bindingCurrent')}for ref in source.get('priorSources',[])[:3]]
  generators.append(row)
 backlog=[]
 for source in matches.get('reviewBacklog',[])[:limit]:
  backlog.append({'decisionId':source.get('decisionId'),'reasoning':str(source.get('reasoning',''))[:600],'blockingGaps':[str(gap)[:400]for gap in source.get('blockingGaps',[])[:4]],'sourceRefs':source.get('sourceRefs',[])[:3]})
 return {'memory_revision':matches['memory_revision'],'fresh':matches['fresh'],'generators':generators,'reviewBacklog':backlog,'archiveReference':{'database':str(Path(database).resolve()),'memoryRevision':matches['memory_revision'],'meaning':'Full code versions, source associations and decision history remain in this private memory database.'}}

class PaperLoop:
 def __init__(self,args):
  self.args=args;self.work=args.work_dir.resolve()
  if self.work==args.app_root.resolve()or self.work.is_relative_to((args.app_root/'src').resolve()):raise LoopError('Private work directory must be outside app source.')
  self.work.mkdir(parents=True,exist_ok=True);self.path=self.work/'loop.json';self.db=memory.connect(args.memory_db)
  self.manifest=json.loads(self.path.read_text())if self.path.exists()else{'schema':1,'paperOrder':[],'jobs':{},'events':[],'coverageGranted':0,'sourceCompleteness':'unknown','deployed':False}
  source={'appRoot':str(args.app_root.resolve()),'queue':str(args.queue.resolve()),'memoryDatabase':str(args.memory_db.resolve())}
  if self.manifest.get('source',source)!=source:raise LoopError('Work directory belongs to another app/queue/memory database.')
  self.manifest['source']=source
  for paper in args.paper_id or[]:
   if paper not in self.manifest['paperOrder']:self.manifest['paperOrder'].append(paper)
  self.save()
 def close(self):self.db.close()
 def private_path(self,path):
  path=Path(path).resolve()
  if not path.is_relative_to(self.work)or path==self.work:raise LoopError('Packet writes must stay inside the private work directory.')
  return path
 def write_packet(self,path,value):atomic(self.private_path(path),value)
 def save(self):atomic(self.path,self.manifest)
 def event(self,kind,job=None,**detail):
  self.manifest['events'].append({'at':pipeline.now(),'kind':kind,'job':job.get('key')if job else None,**detail});self.save()
 def command(self,argv,label,timeout=300):
  count=len(self.manifest['events']);result=pipeline.execute(argv,self.work/'logs'/f'{count:06d}-{label}',timeout)
  self.event('command',command=argv,exitCode=result['exitCode'],timedOut=result['timedOut'])
  if result['exitCode']!=0 or result['timedOut']:raise LoopError(f'{label} failed: {result["stderr"]or result["stdout"]}')
  return result
 def export_inventory(self):
  if self.args.export_command_json:
   argv=self.expand(self.args.export_command_json)
  else:argv=['node',str(ROOT/'scripts/export-question-pattern-inventory.mjs'),str(self.args.inventory.resolve())]
  # Vite's inventory exporter resolves the target app from cwd, not retrieved text.
  # The existing execute helper has no cwd option, so this trusted command uses a tiny explicit subprocess wrapper below.
  self.command_in_app(argv,'inventory-export',300)
 def command_in_app(self,argv,label,timeout):
  import os
  original=Path.cwd()
  try:os.chdir(self.args.app_root);return self.command(argv,label,timeout)
  finally:os.chdir(original)
 def expand(self,raw,job=None):
  values={'app':str(self.args.app_root.resolve()),'inventory':str(self.args.inventory.resolve()),'registry':str(self.args.registry.resolve()),'job':str(job or'')}
  return [arg.format_map(values)for arg in pipeline.command_json(raw)]
 def sync(self,force_export=False):
  state=memory.freshness(self.db,self.args.app_root)
  if state.get('fresh')and not force_export:return state
  self.export_inventory()
  result=memory.sync(self.db,self.args.app_root,self.args.inventory,self.args.registry,self.args.queue)
  fresh=memory.freshness(self.db,self.args.app_root)
  if not fresh['fresh']:raise LoopError('Memory did not become current after explicit inventory/sync.')
  self.event('memory-synced',memoryRevision=result['memory_revision'],codeHash=fresh['currentCodeHash'],inventorySha256=fresh['currentInventorySha256'])
  return fresh
 def job(self,paper,region):
  key=f'{paper["paper_id"]}:{region["bank_line"]}'
  if key not in self.manifest['jobs']:
   self.manifest['jobs'][key]={'key':key,'paperId':paper['paper_id'],'level':paper['level'],'bankLine':region['bank_line'],'candidateId':region['candidate_id'],'questionNumber':region['question_number'],'sourcePages':region['page_numbers'],'sourceSha256':paper['source_sha256'],'state':'queued','generation':0,'attempts':[],'error':None,'integrated':False,'deployed':False}
   self.save()
  return self.manifest['jobs'][key]
 def retained_job_receipts(self):
  # A conservative code snapshot may invalidate an association version after an unrelated integration.
  # Rebind an unchanged, already integrated/reused receipt through memory's exact current-code checks.
  for job in self.manifest['jobs'].values():
   if job['state']in('integrated','reuse')and job.get('workerDirectory'):
    code_hash=memory.freshness(self.db,self.args.app_root).get('currentCodeHash')
    if job.get('receiptCodeHash')==code_hash:continue
    recorded=memory.record(self.db,job['workerDirectory'],self.args.app_root)
    if job['state']=='integrated'and recorded['integration']!='code-integrated':raise LoopError('A previously integrated binding is no longer current; source association requires review.')
    job['receiptCodeHash']=code_hash;self.save()
 def plan(self):
  self.sync();self.retained_job_receipts();selected=[];papers=[]
  requested=set(self.args.bank_line or[])
  supplied=set(self.args.paper_id or self.manifest['paperOrder'])
  if requested:
   with memory.read_only(self.args.queue)as queue:
    for line in requested:
     source=queue.execute('select paper_id from region_queue where bank_line=?',(line,)).fetchone()
     if not source or source['paper_id']not in supplied:raise LoopError(f'Bank line {line} does not belong to a supplied paper.')
  for paper_id in self.args.paper_id or self.manifest['paperOrder']:
   inspection=memory.ingest(self.db,paper_id,self.args.queue);papers.append({'paperId':paper_id,'regionsRetained':len(inspection['regions']),'pendingRawRegions':len(inspection['pendingBankLines']),'sourceCompleteness':'unknown'})
   pending=set(inspection['pendingBankLines'])
   for region in inspection['regions']:
    if requested and region['bank_line']not in requested:continue
    if region['bank_line']not in pending and f'{paper_id}:{region["bank_line"]}'not in self.manifest['jobs']:continue
    job=self.job(inspection['paper'],region)
    retry=job['state']=='failed'and self.args.retry_failed or job['state']=='needs-review'and self.args.retry_review
    if region['bank_line']not in pending and not retry:continue
    if job['state']in DONE and not retry:continue
    if job['state']=='failed'and not self.args.retry_failed:continue
    if len(selected)<self.args.max_regions:selected.append(job)
  self.manifest['lastPlan']={'at':pipeline.now(),'paperOrder':self.args.paper_id or self.manifest['paperOrder'],'selectedKeys':[j['key']for j in selected],'papers':papers,'maxRegions':self.args.max_regions};self.save()
  return selected
 def prepare_packet(self,job,fresh):
  source=self.db.execute('select raw_text,raw_text_sha256 from regions where paper_id=?and bank_line=?order by region_key limit 1',(job['paperId'],job['bankLine'])).fetchone()
  if source is None:raise LoopError('Ingested source region disappeared.')
  generation=job['generation']+1;directory=self.work/'packets'/pipeline.digest(job['key'])[:18]/f'generation-{generation:04d}';path=self.private_path(directory/'packet.json')
  job.update(state='retrieving',generation=generation,error=None);self.event('retrieving',job,memoryRevision=fresh['memory_revision'])
  argv=[sys.executable,str(self.args.retriever),'--level',str(job['level']),'--query',source['raw_text'][:1600],'--bank-line',str(job['bankLine']),'--limit','1','--queue',str(self.args.queue.resolve()),'--inventory',str(self.args.inventory.resolve()),'--output',str(path),'--render','--source-only']
  self.command(argv,'retrieve',self.args.retrieval_timeout);packet=worker.packet_check(json.loads(path.read_text()))
  sources=packet['sourceRegions']
  if len(sources)!=1 or sources[0]['bankLine']!=job['bankLine']or sources[0]['paperId']!=job['paperId']or sources[0]['sourceSha256']!=job['sourceSha256']or sources[0]['pageNumbers']!=job['sourcePages']:raise LoopError('Retriever changed the selected source identity or boundaries.')
  if pipeline.digest(sources[0]['rawText'])!=source['raw_text_sha256']:raise LoopError('Original parent-region text changed.')
  if packet['existingGenerators']or packet['referenceFiles']:raise LoopError('Source-only retrieval unexpectedly included generator context.')
  packet.setdefault('selection',{}).update(memoryRevision=fresh['memory_revision'],memoryCodeHash=fresh['currentCodeHash'],inventorySha256=fresh['currentInventorySha256'],sourceOnly=True,loopGeneration=generation)
  packet['requirements'].append('Match this full source evidence against the fresh compact dictionary before loading any generator code.')
  packet['jobId']='rag-'+pipeline.digest(pipeline.canonical({k:v for k,v in packet.items()if k!='jobId'}))[:20];self.write_packet(path,packet)
  attempt={'generation':generation,'packet':str(path),'packetSha256':pipeline.file_hash(path),'retrievalId':packet['jobId'],'matchDirectory':str(self.work/'matches'/packet['jobId']),'memoryRevision':fresh['memory_revision'],'memoryCodeHash':fresh['currentCodeHash'],'inventorySha256':fresh['currentInventorySha256']}
  job['attempts'].append(attempt);job.update(state='prepared',packet=str(path),sourcePacket=str(path),retrievalId=packet['jobId'],matchDirectory=str(self.work/'matches'/packet['jobId']),workerDirectory=None);self.event('prepared',job,**attempt)
  return packet
 def current_packet(self,job,fresh,force=False):
  if job.get('sourcePacket')and not force:
   path=Path(job['sourcePacket']);memory.verify(path,job['attempts'][-1]['packetSha256'],'Saved source packet');packet=worker.packet_check(json.loads(path.read_text()));selection=packet.get('selection',{})
   if selection.get('sourceOnly')and selection.get('inventorySha256')==fresh['currentInventorySha256']and selection.get('memoryCodeHash')==fresh['currentCodeHash']:return packet
  return self.prepare_packet(job,fresh)
 def match(self,job,packet):
  job['state']='matching';self.event('matching',job)
  argv=[sys.executable,str(self.args.matcher),job['sourcePacket'],'--jobs-dir',str(self.work/'matches'),'--memory',str(self.args.memory_db.resolve()),'--app-root',str(self.args.app_root.resolve()),'--limit',str(self.args.memory_limit),'--codex',self.args.codex,'--timeout',str(self.args.match_timeout),'--max-repairs',str(self.args.max_repairs)]
  self.command(argv,'match',self.args.job_timeout)
  directory=Path(job['matchDirectory']);state=json.loads((directory/'checkpoint.json').read_text());saved=worker.packet_check(json.loads((directory/'packet.json').read_text()))
  if state.get('jobId')!=packet['jobId']or state.get('packetSha256')!=pipeline.digest(pipeline.canonical(saved))or saved['sourceRegions']!=packet['sourceRegions']or saved['referenceFiles']or saved.get('memoryContext'):raise LoopError('Matcher receipt changed source evidence or included code context.')
  allowed={'id','canonicalPatternId','level','title','objective','skillIds','responseShapes','partCounts','representations','numericConstraints','responseShapeMismatch'}
  if any(set(g)-allowed for g in saved['existingGenerators']):raise LoopError('Matcher packet contains noncompact generator context.')
  if state.get('status')not in('reuse','needs-review','generate'):raise LoopError('Matcher has no valid terminal decision.')
  memory.verify(directory/'match-result.json',state.get('matchEvidenceSha256'),'Match evidence')
  job['matchStatus']=state['status'];self.event('match-completed',job,matchStatus=state['status'])
  if state['status']!='generate':job.update(workerDirectory=str(directory),workerStatus=state['status'],state='recording')
  return state
 def generation_packet(self,job,source_packet,fresh):
  path=self.private_path(Path(job['sourcePacket']).with_name('generation-packet.json'))
  if path.exists():
   memory.verify(path,job['attempts'][-1].get('generationPacketSha256'),'Saved generation packet');saved=worker.packet_check(json.loads(path.read_text()))
   if saved['sourceRegions']!=source_packet['sourceRegions']or saved['selection'].get('memoryCodeHash')!=fresh['currentCodeHash']or saved['selection'].get('inventorySha256')!=fresh['currentInventorySha256']:raise LoopError('Saved generation context is stale; retrieve a new generation.')
   for ref in saved['referenceFiles']:memory.verify(memory.app_file(self.args.app_root,ref['path']),ref['sha256'],'Saved code reference')
   job.update(packet=str(path),workerDirectory=str(self.work/'workers'/saved['jobId']));self.save();return saved
  found=memory.query(self.db,self.args.app_root,job['level'],source_packet['sourceRegions'][0]['rawText'][:4000],self.args.memory_limit)
  if not found.get('fresh'):raise LoopError('Stale memory before code loading.')
  matches=compact_memory(found,self.args.memory_limit,self.args.memory_db)
  packet=json.loads(json.dumps(source_packet));references={}
  indexed_bindings=json.loads(self.db.execute('select files_json from code_snapshots where snapshot_hash=?',(fresh['currentCodeHash'],)).fetchone()[0])
  selected=set(CORE_REFERENCES)
  for generator in matches['generators'][:2]:
   for binding in generator.get('codeFiles')or[]:
    binding_path=binding['path']
    if '.test.'not in binding_path and not binding_path.endswith('Meta.ts')and binding_path not in('src/primary/paperImports/catalog.ts','src/primary/paperImports/questions.ts'):selected.add(binding_path)
  for relative in sorted(selected):
   if relative not in indexed_bindings:continue
   file=memory.app_file(self.args.app_root,relative);memory.verify(file,indexed_bindings[relative],'Selected current code binding');references[relative]={'path':relative,'sha256':indexed_bindings[relative],'content':file.read_text()}
  packet['memoryContext']=matches;packet['existingGenerators']=matches['generators'];packet['referenceFiles']=list(references.values());packet['selection'].update(sourceOnly=False,matchJobId=source_packet['jobId'],matchEvidenceSha256=pipeline.file_hash(Path(job['matchDirectory'])/'match-result.json'),memoryRevision=matches['memory_revision'])
  packet['requirements'].append('The code-free matcher requested generation. Use only current selected code/model references; preserve source response requirements and prefer reuse if a genuine match becomes clear.')
  packet['jobId']='rag-'+pipeline.digest(pipeline.canonical({k:v for k,v in packet.items()if k!='jobId'}))[:20]
  self.write_packet(path,packet)
  if path.stat().st_size>worker.MAX_PACKET:raise LoopError('Generation packet exceeds the worker limit.')
  job.update(packet=str(path),workerDirectory=str(self.work/'workers'/packet['jobId']));job['attempts'][-1].update(generationPacket=str(path),generationPacketSha256=pipeline.file_hash(path),workerDirectory=job['workerDirectory']);self.event('code-context-loaded',job,selectedReferenceFiles=list(references),generationId=packet['jobId']);return packet
 def generate(self,job,packet):
  checks=[self.expand(raw,job['workerDirectory'])for raw in self.args.check_command_json]
  if not checks:checks=[['node',str(ROOT/'scripts/rag-check-candidate.mjs'),'--app-root',str(self.args.app_root.resolve())]]
  argv=[sys.executable,str(self.args.worker),job['packet'],'--jobs-dir',str(self.work/'workers'),'--codex',self.args.codex,'--timeout',str(self.args.worker_timeout),'--max-repairs',str(self.args.max_repairs),'--resume']
  for check in checks:argv.extend(['--check-command-json',pipeline.canonical(check)])
  job['state']='generating';self.event('generating',job,commands=checks)
  self.command(argv,'worker',self.args.job_timeout)
  state=json.loads((Path(job['workerDirectory'])/'checkpoint.json').read_text())
  if state.get('jobId')!=packet['jobId']or state.get('packetSha256')!=pipeline.digest(pipeline.canonical(packet)):raise LoopError('Worker checkpoint does not bind to the current packet.')
  if state.get('status')not in('checks-passed','reuse','needs-review','generated-unverified'):raise LoopError('Worker has no successful terminal decision.')
  job['state']='recording';job['workerStatus']=state['status'];self.event('worker-completed',job,workerStatus=state['status'])
  return state
 def finalize(self,job,state):
  # memory.record validates source, candidate, code and checker hashes before any promotion.
  record=memory.record(self.db,job['workerDirectory'],self.args.app_root);job['decisionReceipt']=record;self.event('decision-recorded',job,receipt=record)
  if state['status']=='checks-passed':
   if record['decision']!='new-generator':raise LoopError('Only new-generator checks may promote code.')
   job['state']='promoting';self.event('promoting',job)
   argv=self.expand(self.args.promote_command_json,job['workerDirectory'])if self.args.promote_command_json else['node',str(ROOT/'scripts/rag-promote.mjs'),'--job',job['workerDirectory'],'--app-root',str(self.args.app_root.resolve())]
   self.command(argv,'promote',300);job['state']='syncing';self.event('promotion-receipt-passed',job)
   self.sync(force_export=True);record=memory.record(self.db,job['workerDirectory'],self.args.app_root)
   if record['integration']!='code-integrated':raise LoopError('Promotion has no exact current registry/memory integration receipt.')
   job.update(state='integrated',integrated=True,decisionReceipt=record);self.event('integration-recorded',job,receipt=record)
  elif state['status']=='reuse':
   if record['decision']!='reuse'or not record['reuseTargets']:raise LoopError('Reuse must resolve to existing current same-grade code.')
   job.update(state='reuse',decisionReceipt=record);self.event('reuse-recorded',job,targets=record['reuseTargets'])
  else:
   job['state']=state['status'];self.event('review-retained',job,workerStatus=state['status'])
  job['receiptCodeHash']=memory.freshness(self.db,self.args.app_root).get('currentCodeHash');self.save()
 def execute(self):
  selected=self.plan();processed=0
  for job in selected:
   self.sync();self.retained_job_receipts();fresh=memory.freshness(self.db,self.args.app_root)
   try:
    phase=job.get('failedPhase')if job['state']=='failed'else job['state']
    checkpoint=Path(job['workerDirectory'])/'checkpoint.json'if job.get('workerDirectory')else None
    stale_match_receipt=job.get('workerDirectory')==job.get('matchDirectory')and job.get('sourcePacket')and json.loads(Path(job['sourcePacket']).read_text()).get('selection',{}).get('memoryCodeHash')!=fresh['currentCodeHash']
    if phase in('recording','promoting','syncing')and checkpoint and checkpoint.is_file()and not stale_match_receipt:
     # Resume receipt/promotion work even when that promotion itself changed code.
     # Do not discard an already checked candidate or ask the model for it again.
     packet=worker.packet_check(json.loads(Path(job['packet']).read_text()));state=json.loads(checkpoint.read_text());job['state']=phase
    else:
     packet=self.current_packet(job,fresh,force=phase=='needs-review'and self.args.retry_review);state=self.match(job,packet)
     if state['status']=='generate':packet=self.generation_packet(job,packet,fresh);state=self.generate(job,packet)
    # Other running tools may have integrated code during generation. Never promote against stale bindings.
    if not memory.freshness(self.db,self.args.app_root)['fresh']:raise LoopError('App bindings changed during generation; saved candidate requires recheck before promotion.')
    self.finalize(job,state);processed+=1
   except Exception as error:
    phase=job['state'];job.update(state='failed',failedPhase=phase,error=str(error));self.event('failed',job,phase=phase,error=str(error));processed+=1
    if phase in('recording','promoting','syncing'):break
  self.manifest['lastRun']={'at':pipeline.now(),'processedRawRegions':processed,'modelExecutionEnabled':True};self.save();return self.status()
 def status(self):
  jobs=list(self.manifest['jobs'].values());return {'schema':1,'workDirectory':str(self.work),'memoryDatabase':str(self.args.memory_db.resolve()),'paperOrder':self.manifest['paperOrder'],'jobStateCounts':dict(Counter(j['state']for j in jobs)),'regionsRetainedInPlan':len(jobs),'jobs':jobs,'lastPlan':self.manifest.get('lastPlan'),'lastRun':self.manifest.get('lastRun'),'sourceCompleteness':'unknown','wholePaperCoverageGranted':0,'deployed':False,'policy':'Paper order and raw-region outcomes do not assert complete questions, whole-paper adaptation or teacher review.'}

def parser():
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='action',required=True)
 for action in('prepare','run','status'):
  a=sub.add_parser(action);a.add_argument('--paper-id',action='append');a.add_argument('--bank-line',action='append',type=int);a.add_argument('--max-regions',type=int,default=2);a.add_argument('--app-root',type=Path,default=ROOT);a.add_argument('--memory-db',type=Path,default=ROOT/'.generated/rag-memory.sqlite');a.add_argument('--work-dir',type=Path,default=ROOT/'.generated/rag-paper-loop');a.add_argument('--queue',type=Path,default=ROOT/'.generated/corpus-pattern-queue.sqlite');a.add_argument('--inventory',type=Path);a.add_argument('--registry',type=Path);a.add_argument('--retriever',type=Path,default=ROOT/'scripts/rag-retrieve.py');a.add_argument('--matcher',type=Path,default=ROOT/'scripts/rag-match.py');a.add_argument('--match-timeout',type=int,default=180);a.add_argument('--worker',type=Path,default=ROOT/'scripts/rag-generator-worker.py');a.add_argument('--codex',default='codex');a.add_argument('--worker-timeout',type=int,default=600);a.add_argument('--job-timeout',type=int,default=4200);a.add_argument('--retrieval-timeout',type=int,default=120);a.add_argument('--max-repairs',type=int,choices=range(3),default=2);a.add_argument('--memory-limit',type=int,default=5);a.add_argument('--check-command-json',action='append',default=[]);a.add_argument('--export-command-json');a.add_argument('--promote-command-json');a.add_argument('--retry-failed',action='store_true');a.add_argument('--retry-review',action='store_true');a.add_argument('--dry-run',action='store_true')
 return p

def normalize(args):
 args.inventory=args.inventory or args.app_root/'.generated/question-pattern-inventory.json';args.registry=args.registry or args.app_root/'src/primary/paperImports/ragRegistry.json'
 if not 1<=args.match_timeout<=1800 or not 1<=args.max_regions<=100 or  not 1<=args.memory_limit<=20 or  not 1<=args.worker_timeout<=1800 or  not 1<=args.job_timeout<=14400:raise LoopError('Region, memory or timeout bounds are invalid.')
 if args.action!='status'and not args.paper_id:raise LoopError('Provide ordered --paper-id values.')
 return args

def main():
 try:
  args=normalize(parser().parse_args())
  if args.action=='status':
   path=args.work_dir/'loop.json'
   if not path.is_file():raise LoopError('No paper loop exists; prepare first.')
   view=object.__new__(PaperLoop);view.args=args;view.work=args.work_dir.resolve();view.manifest=json.loads(path.read_text());print(json.dumps(view.status(),indent=2,ensure_ascii=False));return 0
  with pipeline.exclusive(args.work_dir):
   loop=PaperLoop(args)
   try:
    if args.action=='status':report=loop.status()
    elif args.action=='prepare'or args.dry_run:loop.plan();report=loop.status();report['modelCalls']=0
    else:report=loop.execute()
   finally:loop.close()
  print(json.dumps(report,ensure_ascii=False,indent=2));return 1 if  report['jobStateCounts'].get('failed')else 0
 except (OSError,ValueError)as error:print(f'Paper loop stopped: {error}',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
