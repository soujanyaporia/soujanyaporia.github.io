#!/usr/bin/env python3
"""Code-free shortlist comparison. Match decisions are provisional source associations."""
from __future__ import annotations
import argparse,fcntl,hashlib,importlib.util,json,re,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
worker=load('rag_worker',ROOT/'rag-generator-worker.py')
memory=load('rag_memory',ROOT/'rag-memory.py')
SCHEMA=ROOT/'rag'/'match-schema.json'
PROMPT=ROOT/'rag'/'match-prompt.txt'
class MatchError(ValueError):pass

def compact_generator(g):
 """No generator code, examples, source history, file paths, or version history."""
 keys=('id','canonicalPatternId','level','title','objective','skillIds','responseShapes','partCounts','representations','numericConstraints','responseShapeMismatch')
 out={k:g[k] for k in keys if k in g};out['canonicalPatternId']=out.get('canonicalPatternId') or '';return out

def build_match_packet(packet,shortlist):
 packet=worker.packet_check(packet)
 if len(packet['sourceRegions'])!=1:raise MatchError('Select exactly one source region per match job.')
 results=[compact_generator(g) for g in shortlist if isinstance(g,dict) and g.get('level')==packet['level'] and isinstance(g.get('id'),str) and (g.get('canonicalPatternId') is None or isinstance(g.get('canonicalPatternId'),str))]
 return {'schema':1,'jobId':packet['jobId'],'level':packet['level'],'topic':packet['topic'],'sourceRegions':packet['sourceRegions'],'existingGenerators':results,'referenceFiles':[],'requirements':[]}

def prompt_evidence(packet):
 keys=('bankLine','paperId','title','level','questionNumber','pageNumbers','rawText','pageTexts','sourceSha256','diagramDependencies','uncertaintyFlags','subpartMarkers')
 return {'level':packet['level'],'topic':packet['topic'],'sourceRegions':[{k:s[k] for k in keys if k in s} for s in packet['sourceRegions']],'shortlist':packet['existingGenerators']}

def decision_check(out,packet,images):
 fields={'decision','targetGeneratorId','targetCanonicalPatternId','sourceRefs','reasoning','compatibleConstraints','blockingGaps'}
 if not isinstance(out,dict) or set(out)!=fields or out['decision'] not in ('match','review','generate'):raise MatchError('Invalid match decision fields.')
 if not isinstance(out['reasoning'],str) or not out['reasoning'].strip() or len(out['reasoning'])>20000:raise MatchError('Missing reasoning.')
 for key in ('targetGeneratorId','targetCanonicalPatternId'):
  if not isinstance(out[key],str):raise MatchError('Invalid target.')
 for key in ('compatibleConstraints','blockingGaps'):
  if not isinstance(out[key],list) or len(out[key])>40 or any(not isinstance(x,str) or not x.strip() or len(x)>4000 for x in out[key]):raise MatchError(f'Invalid {key}.')
 refs=out['sourceRefs'];source=packet['sourceRegions'][0]
 if not isinstance(refs,list) or len(refs)!=1 or not isinstance(refs[0],dict) or set(refs[0])!={'bankLine','paperId','questionNumber','pageNumbers'}:raise MatchError('Exactly one source reference is required.')
 ref=refs[0]
 if (ref['bankLine'],ref['paperId'],ref['questionNumber'])!=(source['bankLine'],source['paperId'],source['questionNumber']) or not isinstance(ref['pageNumbers'],list) or not ref['pageNumbers'] or any(not isinstance(p,int) or isinstance(p,bool) or p not in source['pageNumbers'] for p in ref['pageNumbers']):raise MatchError('Source reference does not match the selected region.')
 if out['decision']=='match':
  if not any(g.get('id')==out['targetGeneratorId'] and g.get('canonicalPatternId')==out['targetCanonicalPatternId'] for g in packet['existingGenerators']):raise MatchError('Match target is not an exact entry in the current shortlist.')
  if not out['compatibleConstraints'] or out['blockingGaps']:raise MatchError('A match requires constraints and no blocking gaps.')
 else:
  if out['targetGeneratorId'] or out['targetCanonicalPatternId']:raise MatchError('Only a match can name a target.')
  if out['decision']=='review' and not out['blockingGaps']:raise MatchError('Review requires an explicit blocking gap.')
  if out['decision']=='generate' and out['blockingGaps']:raise MatchError('Unresolved gaps require review, not generation.')
 if out['decision']!='review':
  available={p['page'] for p in source['pageTexts'] if p.get('text','').strip() and not p.get('missing',False)}
  if source['questionNumber']=='unresolved' or not set(ref['pageNumbers']).issubset(available):raise MatchError('Unresolved source identity or missing source text requires review.')
  visual=bool(source.get('diagramDependencies')) or bool(re.search(r'\b(?:diagram|figure|graph|grid|picture|pictured|chart|table)\b',source['rawText'],re.I))
  image_pages={i['page'] for i in source['pageImages'] if str(Path(i['path']).resolve()) in images}
  if visual and not set(ref['pageNumbers']).issubset(image_pages):raise MatchError('Essential source figure requires an attached page image or review.')
  flags=source.get('uncertaintyFlags',[])
  if isinstance(flags,list) and 'low-ocr-confidence' in flags and not set(ref['pageNumbers']).issubset(image_pages):raise MatchError('Low-confidence source OCR requires an attached page image or review.')
 return out

def run_match(packet,shortlist,job,*,codex='codex',timeout=180,max_repairs=2,image_roots=None,run=subprocess.run):
 packet=build_match_packet(packet,shortlist);job=Path(job);job.mkdir(parents=True,exist_ok=True)
 images=worker.validated_images(packet,image_roots or [job]);digest=hashlib.sha256(json.dumps(packet,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest();checkpoint=job/'checkpoint.json'
 if checkpoint.exists():
  previous=json.loads(checkpoint.read_text())
  if previous.get('packetSha256')!=digest:raise MatchError('Existing job has a different source or shortlist.')
  if previous.get('status') in ('reuse','needs-review','generate'):
   evidence=job/'match-result.json'
   saved_packet=job/'packet.json'
   if not saved_packet.is_file() or hashlib.sha256(json.dumps(json.loads(saved_packet.read_text()),sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()!=digest:raise MatchError('Saved code-free packet changed.')
   if evidence.is_file() and hashlib.sha256(evidence.read_bytes()).hexdigest()==previous.get('matchEvidenceSha256'):
    if previous['status']=='generate':return previous
    candidate=job/previous.get('candidateFile','');
    if candidate.is_file() and hashlib.sha256(candidate.read_bytes()).hexdigest()==previous.get('candidateSha256'):return previous
   raise MatchError('Completed match evidence changed; use a new job.')
 worker.atomic_json(job/'packet.json',packet);history=[];feedback='No previous attempt.'
 if timeout<1 or timeout>1800 or max_repairs not in range(3):raise MatchError('Invalid timeout or repair count.')
 for attempt in range(max_repairs+1):
  worker.atomic_json(checkpoint,{'schema':1,'jobId':packet['jobId'],'packetSha256':digest,'status':'running','attempt':attempt+1,'attempts':history,'checksExecuted':False})
  output=job/f'match-attempt-{attempt+1}.json'
  if output.exists() or output.is_symlink():output.unlink()
  prompt=PROMPT.read_text()+'\n\nPREVIOUS VALIDATION FEEDBACK:\n'+feedback+'\n\nUNTRUSTED SOURCE AND COMPACT INDEX JSON:\n'+json.dumps(prompt_evidence(packet),ensure_ascii=False)
  cmd=[codex,'exec','--sandbox','read-only','--skip-git-repo-check','--ephemeral','--output-schema',str(SCHEMA),'--output-last-message',str(output),'--json',*[v for p in images for v in ('-i',p)],'-']
  try:
   proc=run(cmd,input=prompt,text=True,capture_output=True,cwd=str(job),timeout=timeout,check=False)
   if proc.returncode!=0:raise MatchError(f'Codex exited {proc.returncode}: {(proc.stderr or "")[-3000:]}')
   if not output.is_file() or output.stat().st_size>worker.MAX_CANDIDATE:raise MatchError('No bounded match decision JSON.')
   decision=decision_check(json.loads(output.read_text()),packet,images)
   evidence={'schema':1,'kind':'provisional-index-match','decision':decision,'indexPolicy':'Index similarities and model judgments are not proof of mathematical equivalence or source coverage.'}
   worker.atomic_json(job/'match-result.json',evidence);evidence_hash=hashlib.sha256((job/'match-result.json').read_bytes()).hexdigest()
   result={'schema':1,'jobId':packet['jobId'],'packetSha256':digest,'status':'generate','decision':'generate','attempt':attempt+1,'attempts':history,'checksExecuted':False,'matchEvidenceSha256':evidence_hash,'fileSha256':{},'commands':[]}
   if decision['decision']!='generate':
    bridge={'decision':'reuse' if decision['decision']=='match' else 'needs-review','canonicalPatternId':decision['targetGeneratorId'] if decision['decision']=='match' else '', 'sourceRefs':decision['sourceRefs'],'reasoning':decision['reasoning']+' Constraints: '+'; '.join(decision['compatibleConstraints']), 'files':[],'tests':[],'blockingGaps':decision['blockingGaps']}
    worker.candidate_check(bridge,packet);candidate=job/'candidate-attempt-1.json';worker.atomic_json(candidate,bridge)
    result.update(status=bridge['decision'],decision=bridge['decision'],candidateFile=candidate.name,candidateSha256=hashlib.sha256(candidate.read_bytes()).hexdigest(),candidateDirectory=None)
   worker.atomic_json(checkpoint,result);return result
  except (MatchError,worker.WorkerError,json.JSONDecodeError,UnicodeError,OSError,subprocess.TimeoutExpired) as error:
   feedback=str(error)[:3000];history.append({'attempt':attempt+1,'status':'invalid-or-failed','error':feedback})
 state={'schema':1,'jobId':packet['jobId'],'packetSha256':digest,'status':'failed','decision':None,'attempt':len(history),'attempts':history,'checksExecuted':False};worker.atomic_json(checkpoint,state);return state

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('packet',type=Path);p.add_argument('--jobs-dir',type=Path,required=True);p.add_argument('--memory',type=Path,default=ROOT.parent/'.generated/rag-memory.sqlite');p.add_argument('--app-root',type=Path,default=ROOT.parent);p.add_argument('--limit',type=int,default=5);p.add_argument('--codex',default='codex');p.add_argument('--timeout',type=int,default=180);p.add_argument('--max-repairs',type=int,default=2);args=p.parse_args()
 try:
  path=args.packet.resolve()
  if path.stat().st_size>worker.MAX_PACKET:raise MatchError('Packet exceeds size limit.')
  packet=worker.packet_check(json.loads(path.read_text()));
  if len(packet['sourceRegions'])!=1:raise MatchError('Select exactly one source region per match job.')
  with memory.read_only(args.memory) as db:found=memory.query(db,args.app_root,packet['level'],packet['sourceRegions'][0]['rawText'][:4000],args.limit)
  if not found.get('fresh'):raise MatchError('Pattern memory is stale; sync it before matching.')
  root=args.jobs_dir.resolve();root.mkdir(parents=True,exist_ok=True);job=root/packet['jobId']
  if job.is_symlink():raise MatchError('Job directory may not be a symlink.')
  locks=root/'.worker-locks';locks.mkdir(exist_ok=True);held=None
  for n in range(2):
   lock=open(locks/f'slot-{n}.lock','a+')
   try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);held=lock;break
   except BlockingIOError:lock.close()
  if held is None:raise MatchError('Both worker slots are occupied; retry later.')
  try:
   job.mkdir(parents=True,exist_ok=True)
   with open(job/'.job.lock','a+') as lock:
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:raise MatchError('This match job is already running.') from None
    try:state=run_match(packet,found['generators'],job,codex=args.codex,timeout=args.timeout,max_repairs=args.max_repairs,image_roots=[path.parent,job])
    finally:fcntl.flock(lock,fcntl.LOCK_UN)
  finally:fcntl.flock(held,fcntl.LOCK_UN);held.close()
  print(json.dumps(state,ensure_ascii=False));return 1 if state['status']=='failed' else 0
 except (OSError,ValueError,KeyError,TypeError) as error:print(f'Match error: {error}',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
