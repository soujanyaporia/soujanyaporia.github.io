#!/usr/bin/env python3
"""Optional deterministic reuse fast path for bounded, self-contained OCR arithmetic.

Reuses the existing literal parser and typed arithmetic domains. Only registered
same-grade single-variant binary profiles are eligible. All source evidence and
uncertainties remain private; no source question/whole-paper verification is
inferred. scan writes private reports/receipts only. apply is explicit and locked.
"""
from __future__ import annotations
import argparse
from collections import Counter,defaultdict
from fractions import Fraction
import importlib.util
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import time
import sys

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
literal=load('fast_literal',ROOT/'scripts/corpus-literal-arithmetic.py')
pipeline=load('fast_pipeline',ROOT/'scripts/rag-pipeline.py')
memory=load('fast_memory',ROOT/'scripts/rag-memory.py')
worker=load('fast_worker',ROOT/'scripts/rag-generator-worker.py')
FACTORY='src/primary/paperImports/arithmeticTemplates.ts'
# Reviewed implementation: typed domains, one arithmetic tree, rejection-sampled regrouping.
FACTORY_SHA='7f2fe5a266e13ec2f7f1236a9e85c4b0ba06369d72b1163eea5571022c728853'
FOOTER=re.compile(r'^\s*(?:www\.sgexam\.com|\(?Go on to the next page\)?|Page\s+\d+\s+of\s+\d+)\.?\s*$',re.I)
MCQ=re.compile(r'multiple.choice|choose\s+(?:the\s+)?correct\s+answer|write.{0,80}(?:1.{0,8}2.{0,8}3.{0,8}4).{0,80}bracket|circle.{0,30}correct\s+answer',re.I|re.S)
EXTRA=re.compile(r'give.{0,45}(?:nearest|decimal place|significant)|correct\s+to|round.{0,35}answer|estimate|calculator.{0,20}(?:allowed|not)',re.I|re.S)
NODE=r'''
import {createServer} from 'vite';import{readFile,writeFile}from'node:fs/promises';
const config=JSON.parse(await readFile(process.argv[2],'utf8'));const server=await createServer({cacheDir:config.cache,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{const{ACTIVITIES}=await server.ssrLoadModule('/src/primary/catalog.ts');const{makeQuestion,correctAnswer}=await server.ssrLoadModule('/src/primary/generate.ts');const{responseReady}=await server.ssrLoadModule('/src/primary/answerFormat.ts');const{ARITHMETIC_FAMILIES}=await server.ssrLoadModule('/src/primary/paperImports/arithmeticTemplates.ts');
const profiles=[];for(const family of ARITHMETIC_FAMILIES){const activity=ACTIVITIES.find(a=>a.track==='standard'&&a.level===family.level&&a.parameter==='b7a-'+family.id);if(!activity)continue;const samples=[];for(let seed=0;seed<config.seeds;seed++){const q=makeQuestion(activity,seed,0);samples.push({prompt:q.prompt,display:q.display,answer:q.answer,picture:q.picture,choices:q.choices,order:q.order,numberSentence:q.numberSentence,structuredResponse:q.structuredResponse,unit:q.unit,ready:responseReady(q,q.answer),accepted:correctAnswer(q,q.answer)});}profiles.push({activity:{id:activity.id,level:activity.level,canonicalPatternId:activity.canonicalPatternId,parameter:activity.parameter,title:activity.title},family,samples});}await writeFile(config.output,JSON.stringify({profiles}));}finally{await server.close();}
'''

def read_only(path):
 db=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row;return db

def atomic(path,value):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix(path.suffix+'.writing');temp.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n');temp.replace(path)

def places(value):
 d=value.denominator;twos=fives=0
 while d%2==0:twos+=1;d//=2
 while d%5==0:fives+=1;d//=5
 return max(twos,fives)if d==1 else 100

def domain_accept(text,domain):
 value=Fraction(text.replace(',',''));precision=len(text.split('.')[1])if'.'in text else 0
 if 'fixed'in domain:return value==Fraction(domain['fixed'])and precision==0
 if precision!=domain['places']:return False
 if domain['belowOne']:
  if not 0<value<1:return False
 elif not 10**(domain['digits']-1)<=value<10**domain['digits']:return False
 scaled=value*10**domain['places']
 return scaled.denominator==1 and  scaled.numerator%10**domain['trailingZeros']==0

def bounded_task(raw,question):
 removed=[];lines=[]
 for line in raw.splitlines():
  if FOOTER.fullmatch(line):removed.append(line)
  else:lines.append(line)
 clean='\n'.join(lines).strip();prefix=re.match(r'^(\d{1,3})[.)]?\s+(?=calculate|find|evaluate|what)',clean,re.I)
 if not prefix or str(question)!=prefix[1]:return None,'unresolved-or-subpart-question-boundary'
 if not re.search(r'\bans(?:wer)?\s*[:.]*\s*[._\s]*$',clean,re.I):return None,'no-explicit-blank-open-response'
 if '/'in clean:return None,'slash-fraction-division-ambiguity'
 parsed,reason=literal.classify(clean,6)
 if not parsed:return None,reason
 props=parsed['operandDomain'];tree=parsed['operationTree']
 if props['operandCount']!=2 or  tree['kind']!='operation'or any(tree[side]['kind']!='literal'for side in('left','right')):return None,'not-one-binary-literal-question'
 return {'parsed':parsed,'normalizedTask':clean,'removedBoilerplateLines':removed},None

def source_fits(task,profile):
 variant=profile['family']['variants'][0];tree=variant['tree'];parsed=task['parsed'];properties=parsed['operandDomain'];source=parsed['operationTree']
 if source['operator']!=tree['op']:return False
 operands=[source['left']['literal'],source['right']['literal']]
 if not all(domain_accept(text,domain)for text,domain in zip(operands,variant['domains'])):return False
 if variant.get('regroup')is not None:
  regroup=properties.get('decimalColumnRegrouping',properties.get('carrying',properties.get('borrowing')))
  if regroup!=variant['regroup']:return False
 answer=Fraction(parsed['evaluatedExactly']);return 0<=answer<=10**9 and  places(answer)<=variant['maxAnswerPlaces']

def validate_profile(profile):
 family=profile['family'];variants=family['variants']
 if profile['activity']['level']!=family['level']or profile['activity'].get('parameter')!='b7a-'+family['id']:return False,'unbound-grade-or-factory-parameter'
 if len(variants)!=1:return False,'multiple-unselected-domain-variants'
 variant=variants[0];tree=variant['tree']
 if set(tree)!={'op','a','b'}or tree['a']!={'slot':0}or tree['b']!={'slot':1}or len(variant['domains'])!=2:return False,'not-single-binary-domain'
 if tree['op']in('+','-')and variant.get('regroup')is None:return False,'regrouping-not-fixed'
 if len(profile['samples'])<20:return False,'too-few-generator-samples'
 for sample in profile['samples']:
  if any(sample.get(key)for key in('picture','choices','order','numberSentence','structuredResponse','unit')):return False,'response-or-visible-givens-mismatch'
  if not sample.get('ready')or not sample.get('accepted'):return False,'generator-control-failed'
  parsed,reason=literal.classify('Calculate '+sample.get('display','')+'\nAns:',family['level'])
  if not parsed:return False,'generator-expression-unparseable:'+str(reason)
  task={'parsed':parsed}
  if not source_fits(task,profile)or Fraction(sample['answer'])!=Fraction(parsed['evaluatedExactly']):return False,'independent-generator-maths-or-domain-failed'
 return True,None

def collect_profiles(args,directory):
 if pipeline.file_hash(args.app_root/FACTORY)!=FACTORY_SHA:raise ValueError('Arithmetic factory changed; this bounded adapter needs review before reuse.')
 bindings=memory.code_files(args.app_root);config={'seeds':args.seeds,'cache':str(directory/'vite-cache'),'output':str(directory/'generator-samples.json')};atomic(directory/'sample-config.json',config)
 result=subprocess.run(['node','--input-type=module','-',str(directory/'sample-config.json')],input=NODE,cwd=args.app_root,text=True,capture_output=True,timeout=120,check=False)
 if result.returncode:raise ValueError('Actual generator sample collection failed: '+result.stderr[-3000:])
 if bindings!=memory.code_files(args.app_root):raise ValueError('App code changed during sampling; retry with stable code.')
 data=json.loads((directory/'generator-samples.json').read_text());valid=[];excluded=[]
 for profile in data['profiles']:
  ok,reason=validate_profile(profile)
  if ok:valid.append(profile)
  else:excluded.append({'activityId':profile['activity']['id'],'reason':reason})
 proof={'factory':FACTORY,'factorySha256':FACTORY_SHA,'codeBindings':bindings,'inventorySha256':pipeline.file_hash(args.inventory),'samplesPerProfile':args.seeds,'validatedProfiles':valid,'excludedProfiles':excluded,'sourceMeaning':'Finite actual factory exercise plus reviewed typed-domain implementation; not source-PDF verification.'};atomic(directory/'profile-proof.json',proof);return proof

def make_receipt(entry,profile,paper,page_texts,directory,proof_hash):
 job_id='fast-'+pipeline.digest(pipeline.canonical([entry['candidateId'],profile['activity']['id'],entry['sourceSha256'],proof_hash]))[:24];job=directory/job_id;job.mkdir(parents=True,exist_ok=True)
 source={'bankLine':entry['bankLine'],'candidateId':entry['candidateId'],'paperId':entry['paperId'],'level':entry['level'],'title':paper['title'],'questionNumber':entry['questionNumber'],'pageNumbers':entry['sourcePages'],'sourcePdf':paper['source_pdf'],'sourceSha256':entry['sourceSha256'],'rawText':entry['rawText'],'pageTexts':page_texts,'pageImages':[],'uncertaintyFlags':['source-OCR-and-boundaries-not-visually-verified','grammar-bounded-text-task-only'],'sourceCovered':False}
 packet={'schema':1,'jobId':job_id,'level':entry['level'],'topic':'bounded binary arithmetic reuse','sourceRegions':[source],'existingGenerators':[profile['activity']],'referenceFiles':[],'requirements':['No source coverage or teacher review is asserted.'],'selection':{'method':'positive-whole-region-grammar','proofSha256':proof_hash}}
 proposal={'decision':'reuse','canonicalPatternId':profile['activity']['id'],'sourceRefs':[{key:source[key]for key in('bankLine','paperId','questionNumber','pageNumbers')}],'reasoning':'Whole OCR task matches one current same-grade, free numeric binary generator domain. Operator, operand precision/digits/minimum trailing zeros, fixed regrouping and answer precision were checked; actual factory samples independently solved. Original OCR/PDF interpretation remains unaudited.','files':[],'tests':[],'blockingGaps':[]}
 worker.packet_check(packet);worker.candidate_check(proposal,packet);atomic(job/'packet.json',packet);atomic(job/'candidate-attempt-1.json',proposal)
 state={'schema':1,'jobId':job_id,'packetSha256':pipeline.digest(pipeline.canonical(packet)),'status':'reuse','decision':'reuse','checksExecuted':False,'checks':[],'commands':[],'candidateFile':'candidate-attempt-1.json','candidateSha256':pipeline.file_hash(job/'candidate-attempt-1.json'),'fileSha256':{}}
 atomic(job/'checkpoint.json',state);return str(job)

def scan(args):
 started=time.monotonic();directory=args.output.resolve().parent;directory.mkdir(parents=True,exist_ok=True);proof=collect_profiles(args,directory);proof_hash=pipeline.file_hash(directory/'profile-proof.json');profiles=defaultdict(list)
 for p in proof['validatedProfiles']:profiles[p['activity']['level']].append(p)
 counts={str(n):Counter()for n in range(1,7)};accepted=[];candidates=[];pdf_hashes={}
 with read_only(args.staging)as db:
  papers={r['paper_id']:dict(r)for r in db.execute('select *from papers')};page_cache={}
  def context(pid,page):
   if(pid,page)not in page_cache:
    row=db.execute('select text from pages where paper_id=?and page_number=?',(pid,page)).fetchone();page_cache[pid,page]=row[0]if row else''
   return page_cache[pid,page]
  for row in db.execute('select r.*,p.level from regions r join papers p using(paper_id)order by bank_line'):
   c=counts[str(row['level'])];c['rawRegionsScanned']+=1;task,reason=bounded_task(row['raw_text'],row['question_number'])
   if not task:continue
   c['wholeGrammarCandidates']+=1;pages=json.loads(row['page_numbers_json']);why=None
   if len(pages)!=1:why='multi-page-boundary-not-proven'
   elif db.execute('select 1 from subpart_candidates where bank_line=?limit 1',(row['bank_line'],)).fetchone():why='subpart-boundary-not-self-contained'
   else:
    texts=[context(row['paper_id'],p)for p in(pages[0]-1,pages[0])if p>0]
    if any(MCQ.search(t)for t in texts):why='multiple-choice-context-or-option-loss-risk'
    elif any(EXTRA.search(t)for t in texts):why='shared-answer-condition-not-proven'
   matches=[p for p in profiles[row['level']]if source_fits(task,p)]if not why else[]
   if not why and not matches:why='no-exact-current-same-grade-domain-profile'
   paper=papers[row['paper_id']]
   if not why:
    if row['paper_id']not in pdf_hashes:pdf_hashes[row['paper_id']]=pipeline.file_hash(paper['source_pdf'])
    if pdf_hashes[row['paper_id']]!=row['source_sha256']:why='source-PDF-current-hash-mismatch'
   evidence={'bankLine':row['bank_line'],'candidateId':row['candidate_id'],'paperId':row['paper_id'],'level':row['level'],'questionNumber':str(row['question_number']),'sourcePages':pages,'sourceSha256':row['source_sha256'],'rawTextSha256':row['raw_text_sha256'],'sourceCovered':False}
   if why:c['candidateOnlyRegions']+=1;candidates.append({**evidence,'reason':why});continue
   match=sorted(matches,key=lambda p:p['activity']['id'])[0];evidence.update(rawText=row['raw_text'],targetActivityId=match['activity']['id'],targetCanonicalPatternId=match['activity']['canonicalPatternId'],sourceMath=task['parsed']['operandDomain'],sourceExactAnswer=task['parsed']['evaluatedExactly'],grammar=task['normalizedTask'],removedBoilerplate=task['removedBoilerplateLines'],status='automated-text-grammar-reuse; source mapping unaudited')
   page_texts=[{'page':page,'text':context(row['paper_id'],page)}for page in pages];evidence['receiptDirectory']=make_receipt(evidence,match,paper,page_texts,directory/'receipts',proof_hash);accepted.append(evidence);c['acceptedReusableRegions']+=1
  total=db.execute('select count(*)from regions').fetchone()[0]
 for c in counts.values():c['wholeGrammarCandidates']+=0;c['notMatchedByLimitedGrammar']=c['rawRegionsScanned']-c['wholeGrammarCandidates'];c['acceptedReusableRegions']+=0;c['candidateOnlyRegions']+=0
 report={'schema':1,'createdAt':pipeline.now(),'scope':'Optional self-contained binary arithmetic fast path. Accepted means bounded OCR text/schema reuse proof, not source visual verification, complete questions or paper coverage. Nonmatches remain unresolved, not absent patterns.','inputs':{'appRoot':str(args.app_root.resolve()),'inventory':str(args.inventory.resolve()),'inventorySha256':proof['inventorySha256'],'staging':str(args.staging.resolve()),'queue':str(args.queue.resolve()),'matcherSha256':pipeline.file_hash(__file__),'profileProof':str(directory/'profile-proof.json'),'profileProofSha256':proof_hash},'papersObserved':len(papers),'rawRegionsScanned':total,'byLevel':counts,'validatedGeneratorProfiles':len(proof['validatedProfiles']),'acceptedReusableRegions':len(accepted),'acceptedSourcePapers':len({e['paperId']for e in accepted}),'acceptedTargetGenerators':len({e['targetActivityId']for e in accepted}),'validatedFactorySamples':len(proof['validatedProfiles'])*args.seeds,'elapsedSeconds':round(time.monotonic()-started,3),'candidateOnlyRegions':len(candidates),'accepted':accepted,'candidates':candidates,'sourceCoverageGranted':0,'totalSourceQuestions':None,'memoryApplied':False};atomic(args.output,report);return report

def default_staging(queue):
 with read_only(queue)as db:
  row=db.execute("select value from meta where key='inputs'").fetchone()
  if row is None:raise ValueError('Queue lacks immutable staging input metadata.')
  return Path(json.loads(row[0])['staging'])

def apply(args):
 report=json.loads(args.report.read_text());inputs=report['inputs'];app=Path(inputs['appRoot'])
 if pipeline.file_hash(__file__)!=inputs['matcherSha256']or pipeline.file_hash(inputs['inventory'])!=inputs['inventorySha256']or pipeline.file_hash(inputs['profileProof'])!=inputs['profileProofSha256']:raise ValueError('Matcher/inventory/profile evidence changed; rescan before applying.')
 proof=json.loads(Path(inputs['profileProof']).read_text())
 if memory.code_files(app)!=proof['codeBindings']:raise ValueError('App code bindings changed; rescan before applying.')
 results=[];output=args.output or args.report.resolve().parent/'applied.json'
 def save_progress():
  unique={(v['paperId'],v['bankLine'])for v in saved['decisions'].values()};saved['appliedReusableRegions']=len(unique);saved['appliedReceipts']=len(saved['decisions']);saved['byLevel']={str(level):len({(v['paperId'],v['bankLine'])for v in saved['decisions'].values()if v['level']==level})for level in range(1,7)};atomic(output,saved)
 with pipeline.exclusive(args.memory_db.parent/'rag-fast-match-apply'),memory.connect(args.memory_db)as db:
  saved=json.loads(output.read_text())if output.exists()else{'schema':1,'decisions':{},'runs':[],'sourceCoverageGranted':0,'totalSourceQuestions':None}
  if not memory.freshness(db,app)['fresh']:raise ValueError('Current memory sync is required before applying reuse receipts.')
  profiles={p['activity']['id']:p for p in proof['validatedProfiles']}
  selected=[entry for entry in report['accepted']if not args.level or entry['level']in args.level]
  run={'startedAt':pipeline.now(),'reportSha256':pipeline.file_hash(args.report),'levels':args.level,'requestedReceipts':min(len(selected),args.limit),'status':'running','decisionIds':[]};saved['runs'].append(run);save_progress()
  for entry in selected[:args.limit]:
   profile=profiles.get(entry['targetActivityId'])
   if not profile or not validate_profile(profile)[0]:raise ValueError('Stored generator proof is invalid.')
   task,reason=bounded_task(entry['rawText'],entry['questionNumber'])
   if not task or not source_fits(task,profile)or entry['level']!=profile['activity']['level']:raise ValueError('Stored source no longer has the claimed complete grammar/domain proof.')
   job=Path(entry['receiptDirectory']);packet=json.loads((job/'packet.json').read_text());candidate=json.loads((job/'candidate-attempt-1.json').read_text());worker.packet_check(packet);worker.candidate_check(candidate,packet)
   source=packet['sourceRegions'][0]
   if candidate['canonicalPatternId']!=entry['targetActivityId']or source['paperId']!=entry['paperId']or source['bankLine']!=entry['bankLine']or source['rawText']!=entry['rawText']or pipeline.digest(source['rawText'])!=entry['rawTextSha256']:raise ValueError('Receipt source/target differs from accepted scan evidence.')
   recorded=memory.record(db,job,app);results.append(recorded);run['decisionIds'].append(recorded['decisionId']);saved['decisions'][recorded['decisionId']]={'paperId':entry['paperId'],'bankLine':entry['bankLine'],'level':entry['level'],'targetActivityId':entry['targetActivityId'],'decision':'reuse','receiptDirectory':entry['receiptDirectory'],'memoryRevision':recorded['memory_revision'],'recordedAt':pipeline.now()};save_progress()
  run.update(status='completed',completedAt=pipeline.now());save_progress()
 return {'appliedReceipts':len(results),'appliedReport':str(output),'decisions':results,'sourceCoverageGranted':0,'idempotent':'memory.record uses hash-bound decision identities'}

def main():
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True);a=sub.add_parser('scan');a.add_argument('--app-root',type=Path,default=ROOT);a.add_argument('--inventory',type=Path,default=ROOT/'.generated/question-pattern-inventory.json');a.add_argument('--staging',type=Path);a.add_argument('--queue',type=Path,default=ROOT/'.generated/corpus-pattern-queue.sqlite');a.add_argument('--output',type=Path,default=ROOT/'.generated/rag-fast-match/report.json');a.add_argument('--seeds',type=int,default=40);a=sub.add_parser('apply');a.add_argument('report',type=Path);a.add_argument('--memory-db',type=Path,default=ROOT/'.generated/rag-memory.sqlite');a.add_argument('--limit',type=int,default=100);a.add_argument('--level',action='append',type=int,choices=range(1,7));a.add_argument('--output',type=Path)
 args=p.parse_args()
 try:
  if args.command=='scan':
   if not 20<=args.seeds<=100:raise ValueError('Use 20–100 actual samples per profile.')
   if args.staging is None:args.staging=default_staging(args.queue)
   result=scan(args);print(json.dumps({k:result[k]for k in('papersObserved','rawRegionsScanned','byLevel','validatedGeneratorProfiles','acceptedReusableRegions','candidateOnlyRegions','memoryApplied')},indent=2))
  else:
   if not 1<=args.limit<=10000:raise ValueError('Apply limit must be 1–10000.')
   print(json.dumps(apply(args),indent=2))
  return 0
 except (OSError,ValueError,sqlite3.Error)as error:print(f'Fast match rejected: {error}',file=sys.stderr);return 2
if __name__=='__main__':raise SystemExit(main())
