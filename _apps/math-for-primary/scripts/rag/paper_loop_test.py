"""Two-paper durable-memory fixtures; fake model/checker/promoter, real memory validation."""
import importlib.util
import json
from pathlib import Path
import sqlite3
import sys
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('paper_loop',HERE.parent/'rag-paper-loop.py');loop_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(loop_module)
spec=importlib.util.spec_from_file_location('loop_memory_fixture',HERE/'memory_test.py');fixture_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture_module)

RETRIEVER=r'''
import argparse,hashlib,json,pathlib,sqlite3
p=argparse.ArgumentParser();p.add_argument('--level',type=int);p.add_argument('--query');p.add_argument('--bank-line',type=int);p.add_argument('--limit');p.add_argument('--queue');p.add_argument('--inventory');p.add_argument('--output');p.add_argument('--render',action='store_true');p.add_argument('--source-only',action='store_true');a=p.parse_args()
q=sqlite3.connect(a.queue);q.row_factory=sqlite3.Row;staging=json.loads(q.execute("select value from meta where key='inputs'").fetchone()[0])['staging'];s=sqlite3.connect(staging);s.row_factory=sqlite3.Row;r=s.execute('select *from regions where bank_line=?',(a.bank_line,)).fetchone();paper=q.execute('select *from papers where paper_id=?',(r['paper_id'],)).fetchone()
source={'bankLine':a.bank_line,'paperId':r['paper_id'],'candidateId':r['candidate_id'],'level':a.level,'title':paper['title'],'questionNumber':r['question_number'],'pageNumbers':json.loads(r['page_numbers_json']),'sourceSha256':paper['source_sha256'],'sourcePdf':paper['source_pdf'],'rawText':r['raw_text'],'pageTexts':[{'page':2,'text':r['raw_text']}],'pageImages':[],'subpartMarkers':[{'label':'a'},{'label':'b'}],'diagramDependencies':[]}
packet={'schema':1,'jobId':'unversioned-fixture-'+str(a.bank_line),'level':a.level,'topic':'bottle equal capacity','sourceRegions':[source],'existingGenerators':[],'referenceFiles':[],'requirements':[],'selection':{'inventorySha256':None if a.source_only else hashlib.sha256(pathlib.Path(a.inventory).read_bytes()).hexdigest(),'sourceOnly':a.source_only,'renderRequested':a.render}}
out=pathlib.Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(packet));print(json.dumps({'packet':str(out)}))
'''
MATCHER=r'''
import argparse,hashlib,json,pathlib,sqlite3
p=argparse.ArgumentParser();p.add_argument('packet');p.add_argument('--jobs-dir');p.add_argument('--memory');p.add_argument('--app-root');p.add_argument('--limit');p.add_argument('--codex');p.add_argument('--timeout');p.add_argument('--max-repairs');a=p.parse_args();source=json.loads(pathlib.Path(a.packet).read_text());job=pathlib.Path(a.jobs_dir)/source['jobId'];job.mkdir(parents=True,exist_ok=True);root=pathlib.Path(__file__).parent
assert not source['referenceFiles'] and not source['existingGenerators'] and 'memoryContext' not in source
if(job/'checkpoint.json').exists():print((job/'checkpoint.json').read_text());raise SystemExit(0)
db=sqlite3.connect(a.memory);db.row_factory=sqlite3.Row
index=[{'id':r['generator_id'],'canonicalPatternId':r['canonical_pattern_id'],'level':r['level'],'title':r['title'],'objective':r['objective'],'skillIds':json.loads(r['skill_ids_json'])}for r in db.execute('select g.*from generators g join generator_versions v on v.version_id=g.current_version where active=1 and available=1 and level=?',(source['level'],))]
packet={k:source[k]for k in('schema','jobId','level','topic','sourceRegions')};packet.update(existingGenerators=index,referenceFiles=[],requirements=[])
with(root/'match-calls.jsonl').open('a')as log:log.write(json.dumps({'paper':source['sourceRegions'][0]['paperId'],'index':index,'references':source['referenceFiles']})+'\n')
review=(root/'review-first').exists()and source['sourceRegions'][0]['paperId']=='paper1';target=next((g for g in index if g['canonicalPatternId']=='new-bottle-capacity'),None);decision='review'if review else'match'if target else'generate'
def digest(value):return hashlib.sha256(value).hexdigest()
(job/'packet.json').write_text(json.dumps(packet));evidence={'decision':{'decision':decision,'sourceRefs':[{k:source['sourceRegions'][0][k]for k in('bankLine','paperId','questionNumber','pageNumbers')}]}};(job/'match-result.json').write_text(json.dumps(evidence))
state={'schema':1,'jobId':packet['jobId'],'packetSha256':digest(json.dumps(packet,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()),'status':'generate','decision':'generate','attempt':1,'checksExecuted':False,'fileSha256':{},'matchEvidenceSha256':digest((job/'match-result.json').read_bytes())}
if decision!='generate':
 proposal={'decision':'needs-review'if review else'reuse','canonicalPatternId':''if review else target['id'],'sourceRefs':evidence['decision']['sourceRefs'],'reasoning':'Compare full source constraints to compact existing family.','files':[],'tests':[],'blockingGaps':['Necessary diagram unresolved']if review else[]};candidate=job/'candidate-attempt-1.json';candidate.write_text(json.dumps(proposal));state.update(status=proposal['decision'],decision=proposal['decision'],candidateFile=candidate.name,candidateSha256=digest(candidate.read_bytes()))
(job/'checkpoint.json').write_text(json.dumps(state));print(json.dumps(state))
'''
WORKER=r'''
import argparse,hashlib,json,pathlib,sys
p=argparse.ArgumentParser();p.add_argument('packet');p.add_argument('--jobs-dir');p.add_argument('--codex');p.add_argument('--timeout');p.add_argument('--max-repairs');p.add_argument('--resume',action='store_true');p.add_argument('--check-command-json',action='append',default=[]);a=p.parse_args();packet=json.loads(pathlib.Path(a.packet).read_text());job=pathlib.Path(a.jobs_dir)/packet['jobId'];job.mkdir(parents=True,exist_ok=True);root=pathlib.Path(__file__).parent
if a.resume and(job/'checkpoint.json').exists():print((job/'checkpoint.json').read_text());sys.exit(0)
with(root/'model-calls.jsonl').open('a')as log:log.write(json.dumps({'paper':packet['sourceRegions'][0]['paperId'],'memory':packet['memoryContext']})+'\n')
if(root/'worker-fail').exists():print('fixture worker failed',file=sys.stderr);sys.exit(1)
family='new-bottle-capacity';available=any(g['canonicalPatternId']==family for g in packet['memoryContext']['generators']);review=(root/'review-first').exists()and packet['sourceRegions'][0]['paperId']=='paper1';decision='needs-review'if review else'reuse'if available else'new-generator'
files=[{'path':'candidate/src/primary/paperImports/ragPaperBottle.ts','content':'export const bottle=1;'}, {'path':'candidate/src/primary/paperImports/ragPaperBottle.test.ts','content':'// independent fixture solver'}]if decision=='new-generator'else[]
proposal={'decision':decision,'canonicalPatternId':family,'sourceRefs':[{k:packet['sourceRegions'][0][k]for k in['bankLine','paperId','questionNumber','pageNumbers']}],'reasoning':'Use equal bottles to find capacity, keeping both source subparts.','files':files,'tests':['independent visible-givens fixture']if files else[],'blockingGaps':['Necessary diagram unresolved']if review else[]}
def digest(data):return hashlib.sha256(data).hexdigest()
(job/'packet.json').write_text(json.dumps(packet));candidate=job/'candidate-attempt-1.json';candidate.write_text(json.dumps(proposal))
for f in files:path=job/f['path'];path.parent.mkdir(parents=True,exist_ok=True);path.write_text(f['content'])
state={'schema':1,'jobId':packet['jobId'],'packetSha256':digest(json.dumps(packet,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()),'status':'checks-passed'if files else decision,'decision':decision,'checksExecuted':bool(files),'checks':[{'exitCode':0}]if files else[],'candidateFile':candidate.name,'candidateSha256':digest(candidate.read_bytes()),'fileSha256':{f['path']:digest(f['content'].encode())for f in files},'commands':[json.loads(c)for c in a.check_command_json]}
if files:
 report={'status':'checks-passed','packetSha256':state['packetSha256'],'candidateSha256':state['candidateSha256'],'candidateFiles':{f['path'].removeprefix('candidate/'):digest(f['content'].encode())for f in files}};(job/'rag-check-report.json').write_text(json.dumps(report));state['checkReportSha256']=digest((job/'rag-check-report.json').read_bytes())
(job/'checkpoint.json').write_text(json.dumps(state));print(json.dumps(state))
'''
PROMOTER=r'''
import argparse,hashlib,json,pathlib,sys
p=argparse.ArgumentParser();p.add_argument('--app-root');p.add_argument('--job');a=p.parse_args();job=pathlib.Path(a.job);app=pathlib.Path(a.app_root);root=pathlib.Path(__file__).parent
if(root/'promotion-fail').exists():print('fixture promotion failed',file=sys.stderr);sys.exit(1)
packet=json.loads((job/'packet.json').read_text());state=json.loads((job/'checkpoint.json').read_text());proposal=json.loads((job/state['candidateFile']).read_text());registry=app/'src/primary/paperImports/ragRegistry.json';data=json.loads(registry.read_text())
if not any(e['jobId']==packet['jobId']for e in data['entries']):
 files=[]
 for f in proposal['files']:
  relative=f['path'].removeprefix('candidate/');target=app/relative;target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists():raise ValueError('fixture must not overwrite code')
  target.write_text(f['content']);files.append({'path':relative,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 entry={'id':'paper-bottle','level':3,'parameter':'rag-paper-bottle','title':'New bottle capacity','objective':'Use equal bottles and capacity','skillIds':['P3.S.MEASURE.03'],'canonicalPatternId':proposal['canonicalPatternId'],'files':files,'sourceRefs':[{'paperId':r['paperId'],'sourceQuestion':r['questionNumber'],'sourcePages':r['pageNumbers']}for r in proposal['sourceRefs']],'jobId':packet['jobId'],'packetSha256':state['packetSha256'],'candidateSha256':state['candidateSha256'],'checkReportSha256':state['checkReportSha256']};data['entries'].append(entry);registry.write_text(json.dumps(data))
with(root/'promotion-calls.jsonl').open('a')as log:log.write(packet['jobId']+'\n')
print(json.dumps({'status':'integrated'}))
'''
EXPORTER=r'''
import argparse,json,pathlib
p=argparse.ArgumentParser();p.add_argument('--app');p.add_argument('--output');a=p.parse_args();app=pathlib.Path(a.app);entries=json.loads((app/'src/primary/paperImports/ragRegistry.json').read_text())['entries'];activities=[{'id':'existing-capacity','level':3,'track':'standard','title':'Known bottle capacity','objective':'Find capacity','skillIds':['P3.S.MEASURE.03'],'canonicalPatternId':'known-capacity','examples':[]}]
for e in entries:activities.append({**e,'id':'p3s-paper-'+e['parameter'],'track':'standard','examples':[]})
pathlib.Path(a.output).write_text(json.dumps({'activities':activities}));print(json.dumps({'activities':len(activities)}))
'''

class PaperLoopTests(unittest.TestCase):
 def setUp(self):
  self.fixture=fixture_module.MemoryTests('test_paper_one_register_then_paper_two_reuses_durable_current_family');self.fixture.setUp();self.addCleanup(self.fixture.doCleanups);f=self.fixture;self.base=f.root;self.work=self.base/'paper-loop';self.memory_db=self.base/'memory.sqlite'
  for name,content in [('retrieve.py',RETRIEVER),('matcher.py',MATCHER),('worker.py',WORKER),('promote.py',PROMOTER),('export.py',EXPORTER)]:f.put(self.base/name,content)
 def args(self,action='run',*extra):
  f=self.fixture;argv=[action,'--paper-id','paper1','--paper-id','paper2','--max-regions','2','--app-root',str(f.app),'--memory-db',str(self.memory_db),'--work-dir',str(self.work),'--queue',str(f.queue),'--retriever',str(self.base/'retrieve.py'),'--matcher',str(self.base/'matcher.py'),'--worker',str(self.base/'worker.py'),'--export-command-json',json.dumps([sys.executable,str(self.base/'export.py'),'--app','{app}','--output','{inventory}']),'--promote-command-json',json.dumps([sys.executable,str(self.base/'promote.py'),'--job','{job}','--app-root','{app}']),*extra]
  return loop_module.normalize(loop_module.parser().parse_args(argv))
 def run_loop(self,args=None):
  loop=loop_module.PaperLoop(args or self.args())
  try:return loop.execute()
  finally:loop.close()
 def calls(self,name='model-calls.jsonl'):
  path=self.base/name;return path.read_text().splitlines()if path.exists()else[]
 def test_paper_one_integrates_before_paper_two_reuses_without_extra_code(self):
  real_generate=HERE.parents[1]/'src/primary/generate.ts';real_bytes=real_generate.read_bytes();fixture_baseline=(self.fixture.app/'src/primary/generate.ts').read_bytes()
  out=self.run_loop();self.assertEqual(out['jobStateCounts'],{'integrated':1,'reuse':1});self.assertEqual(out['paperOrder'],['paper1','paper2']);calls=[json.loads(x)for x in self.calls()];self.assertEqual([c['paper']for c in calls],['paper1']);self.assertFalse(any(g['canonicalPatternId']=='new-bottle-capacity'for g in calls[0]['memory']['generators']));matches=[json.loads(x)for x in self.calls('match-calls.jsonl')];self.assertEqual([x['paper']for x in matches],['paper1','paper2']);self.assertTrue(any(g['canonicalPatternId']=='new-bottle-capacity'for g in matches[1]['index']));self.assertTrue(all(not x['references']for x in matches));self.assertEqual(len(self.calls('promotion-calls.jsonl')),1)
  files=list((self.fixture.app/'src/primary/paperImports').glob('ragPaperBottle*.ts'));self.assertEqual(len(files),2);registry=json.loads(self.fixture.registry.read_text());self.assertEqual(len(registry['entries']),1);self.assertEqual(out['wholePaperCoverageGranted'],0);self.assertEqual(out['sourceCompleteness'],'unknown')
  again=self.run_loop();self.assertEqual(again['jobStateCounts'],out['jobStateCounts']);self.assertEqual(len(self.calls()),1);self.assertEqual(len(self.calls('promotion-calls.jsonl')),1)
  self.assertEqual(real_generate.read_bytes(),real_bytes);self.assertEqual((self.fixture.app/'src/primary/generate.ts').read_bytes(),fixture_baseline)
 def test_prepare_and_dry_run_plan_without_model_or_promotion(self):
  loop=loop_module.PaperLoop(self.args('prepare'))
  try:chosen=loop.plan();out=loop.status()
  finally:loop.close()
  self.assertEqual([j['bankLine']for j in chosen],[1,2]);self.assertEqual(out['jobStateCounts'],{'queued':2});self.assertFalse(self.calls());self.assertFalse(self.calls('match-calls.jsonl'));self.assertFalse(self.calls('promotion-calls.jsonl'));self.assertEqual(json.loads(self.fixture.registry.read_text())['entries'],[])
  for paper in ['paper1','paper2']:
   view=loop_module.memory.inspect_paper(self.fixture.db,paper);self.assertEqual([x['label']for x in view['regions'][0]['subparts']],['a','b']);self.assertEqual(view['sourceCompleteness'],'unknown')
 def test_review_gap_stays_pending_and_is_not_rerun_by_resume(self):
  (self.base/'review-first').touch();out=self.run_loop();self.assertEqual(out['jobStateCounts'],{'needs-review':1,'integrated':1});self.assertEqual(len(self.calls()),1);self.assertEqual(loop_module.memory.inspect_paper(self.fixture.db,'paper1')['pendingBankLines'],[1]);self.run_loop();self.assertEqual(len(self.calls()),1);self.assertEqual(len(self.calls('promotion-calls.jsonl')),1)
 def test_retry_review_uses_new_match_receipt_and_no_second_codegen(self):
  (self.base/'review-first').touch();first=self.run_loop();old=next(j for j in first['jobs']if j['paperId']=='paper1');saved=Path(old['workerDirectory'])/'checkpoint.json';before=saved.read_bytes();(self.base/'review-first').unlink()
  result=self.run_loop(self.args('run','--retry-review'));self.assertEqual(result['jobStateCounts'],{'reuse':1,'integrated':1});new=next(j for j in result['jobs']if j['paperId']=='paper1');self.assertNotEqual(new['workerDirectory'],old['workerDirectory']);self.assertEqual(saved.read_bytes(),before);self.assertEqual(len(self.calls()),1);self.assertEqual(len(self.calls('match-calls.jsonl')),3)
 def test_explicit_bank_lines_only_select_the_supplied_source_units(self):
  result=self.run_loop(self.args('run','--bank-line','1'));self.assertEqual([j['bankLine']for j in result['jobs']],[1]);self.assertEqual(len(self.calls('match-calls.jsonl')),1)
  args=self.args('prepare','--bank-line','2');args.paper_id=['paper1'];loop=loop_module.PaperLoop(args)
  try:
   with self.assertRaisesRegex(loop_module.LoopError,'supplied paper'):loop.plan()
  finally:loop.close()
 def test_unchanged_sources_do_not_repeat_full_sync_or_export(self):
  from unittest.mock import patch
  with patch.object(loop_module.memory,'sync',wraps=loop_module.memory.sync)as sync:
   self.run_loop();self.assertEqual(sync.call_count,1)
  commands=json.loads((self.work/'loop.json').read_text())['events'];self.assertEqual(sum(e.get('kind')=='command'and 'export.py'in ' '.join(e.get('command',[]))for e in commands),1)
 def test_packet_writer_rejects_app_paths_and_escaped_source_packet(self):
  loop=loop_module.PaperLoop(self.args('prepare'));real_generate=HERE.parents[1]/'src/primary/generate.ts';before=real_generate.read_bytes()
  try:
   for path in [real_generate,self.fixture.app/'src/primary/generate.ts','src/primary/generate.ts']:
    with self.assertRaisesRegex(loop_module.LoopError,'private work'):loop.write_packet(path,{'bad':'must never write'})
   chosen=loop.plan();fresh=loop_module.memory.freshness(loop.db,self.fixture.app);packet=loop.prepare_packet(chosen[0],fresh);chosen[0]['sourcePacket']=str(real_generate)
   with self.assertRaisesRegex(loop_module.LoopError,'private work'):loop.generation_packet(chosen[0],packet,fresh)
   self.assertEqual(real_generate.read_bytes(),before)
  finally:loop.close()
 def test_promotion_failure_stops_next_paper_and_resume_uses_saved_candidate(self):
  (self.base/'promotion-fail').touch();out=self.run_loop();self.assertEqual(out['jobStateCounts'],{'failed':1,'queued':1});self.assertEqual(len(self.calls()),1);first=out['jobs'][0];candidate=Path(first['workerDirectory'])/'candidate-attempt-1.json';before=candidate.read_bytes();(self.base/'promotion-fail').unlink();resumed=self.run_loop(self.args('run','--retry-failed'));self.assertEqual(resumed['jobStateCounts'],{'integrated':1,'reuse':1});self.assertEqual(len(self.calls()),1);self.assertEqual(candidate.read_bytes(),before)
 def test_bound_and_order_prevent_second_paper_from_running_early(self):
  first=self.run_loop(self.args('run','--max-regions','1'));self.assertEqual(first['jobStateCounts'],{'integrated':1,'queued':1});self.assertEqual(len(self.calls()),1);second=self.run_loop();self.assertEqual(second['jobStateCounts'],{'integrated':1,'reuse':1});self.assertEqual(len(self.calls()),1)
 def test_compact_lookup_keeps_top_k_and_separate_history_reference(self):
  full={'memory_revision':'revision','fresh':True,'generators':[{'id':str(i),'constraints':{'declared':['equal counts'],'sampledExamples':['FULL_EXAMPLE_NOT_FOR_DESCRIPTOR']},'priorSources':[{'paper_id':str(j),'reasoning':'RAW_HISTORY_NOT_FOR_DESCRIPTOR'}for j in range(12)]}for i in range(30)],'reviewBacklog':[{'reasoning':'gap','blockingGaps':['x']*9,'sourceRefs':[{}]*10}for _ in range(12)]}
  compact=loop_module.compact_memory(full,3,self.memory_db);self.assertEqual(len(compact['generators']),3);self.assertEqual(len(compact['reviewBacklog']),3);self.assertTrue(all(len(g['priorSources'])==3 for g in compact['generators']));self.assertNotIn('FULL_EXAMPLE_NOT_FOR_DESCRIPTOR',json.dumps(compact));self.assertNotIn('RAW_HISTORY_NOT_FOR_DESCRIPTOR',json.dumps(compact));self.assertEqual(compact['archiveReference']['database'],str(self.memory_db.resolve()))
  full['generators'][0].update({'descriptor':'compact','responseShapes':['number-pair'],'partCounts':[2],'representations':['plain-text'],'structuralSignature':'shape-hash','numericSignature':'number-hash','exactSignature':'exact-hash','signatureMeaning':'candidate-lookup-not-semantic-proof','responseShapeMismatch':['provisional mismatch']})
  passed=loop_module.compact_memory(full,1,self.memory_db)['generators'][0]
  for key in ('descriptor','responseShapes','partCounts','representations','structuralSignature','numericSignature','exactSignature','signatureMeaning','responseShapeMismatch'):self.assertEqual(passed[key],full['generators'][0][key])
 def test_cli_dry_run_does_not_invoke_worker_or_promoter(self):
  from unittest.mock import patch
  from contextlib import redirect_stdout
  import io
  argv=['rag-paper-loop.py','run','--paper-id','paper1','--paper-id','paper2','--app-root',str(self.fixture.app),'--memory-db',str(self.memory_db),'--queue',str(self.fixture.queue),'--work-dir',str(self.work),'--dry-run']
  output=io.StringIO()
  with patch.object(sys,'argv',argv),patch.object(loop_module.PaperLoop,'execute',side_effect=AssertionError('dry run launched execution')),redirect_stdout(output):self.assertEqual(loop_module.main(),0)
  self.assertEqual(json.loads(output.getvalue())['modelCalls'],0);self.assertFalse(self.calls());self.assertFalse(self.calls('promotion-calls.jsonl'))
 def test_changed_code_is_synced_and_stale_packet_is_versioned_before_worker(self):
  loop=loop_module.PaperLoop(self.args('prepare'))
  try:
   chosen=loop.plan();fresh=loop_module.memory.freshness(loop.db,self.fixture.app);old=loop.prepare_packet(chosen[0],fresh);old_path=Path(chosen[0]['packet']);old_bytes=old_path.read_bytes();self.fixture.put(self.fixture.app/'src/primary/generate.ts','export const baseline=2;');loop.sync();new=loop.current_packet(chosen[0],loop_module.memory.freshness(loop.db,self.fixture.app));self.assertNotEqual(old['jobId'],new['jobId']);self.assertEqual(old_path.read_bytes(),old_bytes);self.assertEqual(len(chosen[0]['attempts']),2);self.assertFalse(self.calls())
  finally:loop.close()

if __name__=='__main__':unittest.main()
