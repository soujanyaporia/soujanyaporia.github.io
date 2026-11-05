"""Private tiny corpus + fake subprocesses only. Never invokes Codex or changes app code."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'rag-pipeline.py'
spec=importlib.util.spec_from_file_location('rag_pipeline',SCRIPT);pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)

RETRIEVER=r'''
import argparse,hashlib,json,pathlib,sys
p=argparse.ArgumentParser();p.add_argument('--level',type=int);p.add_argument('--query');p.add_argument('--bank-line',type=int);p.add_argument('--limit');p.add_argument('--queue');p.add_argument('--staging');p.add_argument('--inventory');p.add_argument('--output');p.add_argument('--render',action='store_true');a=p.parse_args()
root=pathlib.Path(__file__).parent
if(root/'retrieval-fail').exists():print('deliberate retrieval failure',file=sys.stderr);sys.exit(1)
row=json.loads((root/'rows.json').read_text())[str(a.bank_line)];packet={'schema':1,'jobId':'fake-'+str(a.bank_line),'level':a.level,'topic':a.query,'sourceRegions':[{'bankLine':a.bank_line,'paperId':row['paper_id'],'candidateId':row['candidate_id'],'level':a.level,'questionNumber':row['question_number'],'pageNumbers':[1],'sourceSha256':row['source_sha256'],'rawText':row['raw_text'],'pageTexts':[{'page':1,'text':'full original page context'}],'pageImages':[]}],'existingGenerators':[],'referenceFiles':[],'requirements':[],'renderRequested':a.render,'selection':{'inventorySha256':hashlib.sha256(pathlib.Path(a.inventory).read_bytes()).hexdigest()}}
out=pathlib.Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(packet));print(json.dumps({'packet':str(out),'jobId':packet['jobId']}))
'''
WORKER=r'''
import argparse,fcntl,hashlib,json,pathlib,sys,time
p=argparse.ArgumentParser();p.add_argument('packet');p.add_argument('--jobs-dir');p.add_argument('--codex');p.add_argument('--timeout');p.add_argument('--max-repairs');p.add_argument('--resume',action='store_true');p.add_argument('--check-command-json',action='append',default=[]);a=p.parse_args();packet=json.loads(pathlib.Path(a.packet).read_text());root=pathlib.Path(__file__).parent
job=pathlib.Path(a.jobs_dir)/packet['jobId'];job.mkdir(parents=True,exist_ok=True);counter=pathlib.Path(a.jobs_dir)/'counter.json';lock=open(str(counter)+'.lock','a+')
def bump(delta):
 fcntl.flock(lock,fcntl.LOCK_EX);data=json.loads(counter.read_text())if counter.exists()else{'active':0,'maximum':0,'calls':0};data['active']+=delta;data['maximum']=max(data['maximum'],data['active']);data['calls']+=int(delta>0);counter.write_text(json.dumps(data));fcntl.flock(lock,fcntl.LOCK_UN)
bump(1);time.sleep(.04);bump(-1)
if(root/'worker-fail').exists()and packet['level']==5:print('deliberate generation failure',file=sys.stderr);sys.exit(1)
commands=[json.loads(c)for c in a.check_command_json];status='checks-passed'if commands else'generated-unverified'
if(root/'mixed-status').exists():status={2:'reuse',3:'needs-review',4:'checks-passed'}.get(packet['level'],status)
checked=status=='checks-passed'and bool(commands);state={'schema':1,'jobId':packet['jobId'],'packetSha256':hashlib.sha256(json.dumps(packet,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest(),'status':status,'codex':a.codex,'workerTimeout':a.timeout,'commands':commands,'checksExecuted':checked,'checks':[{'exitCode':0}for _ in commands]if checked else[]}
candidate=job/'candidate-attempt-1.json';candidate.write_text('{"test":true}');state.update({'candidateFile':candidate.name,'candidateSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'fileSha256':{}});(job/'checkpoint.json').write_text(json.dumps(state));print(json.dumps(state))
'''

class PipelineTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.base=Path(self.tmp.name);self.work=self.base/'private jobs';self.queue=self.base/'queue.sqlite';self.staging=self.base/'staging.sqlite';self.inventory=self.base/'inventory.json';self.inventory.write_text('{"activities":[]}');self.retriever=self.base/'fake retrieve.py';self.retriever.write_text(RETRIEVER);self.worker=self.base/'fake worker.py';self.worker.write_text(WORKER)
  topics={1:'MONEY',2:'TIME',3:'MEASURE',4:'DEC',5:'DEC',6:'RATIO'};rows={}
  source=sqlite3.connect(self.staging);source.execute('create table regions(bank_line integer primary key,raw_text text)')
  q=sqlite3.connect(self.queue);q.executescript('''create table meta(key text,value text);create table papers(paper_id text primary key,level integer,title text,source_sha256 text,region_count integer,staged_pages integer);create table clusters(cluster_id text,representative_bank_line integer);create table provisional_matches(bank_line integer,target_id text,evidence_json text);create table region_queue(bank_line integer primary key,candidate_id text,paper_id text,level integer,question_number text,start_page integer,page_numbers_json text,source_sha256 text,raw_text_sha256 text,text_cluster_id text,topic_cues_json text,primary_topic text,track text,priority integer,visual_cue integer,source_covered integer);''')
  q.execute('insert into meta values(?,?)',('inputs',json.dumps({'staging':str(self.staging),'stagingSnapshot':'fixture-snapshot'})))
  for grade in range(1,7):
   for paper in range(2):q.execute('insert into papers values(?,?,?,?,?,?)',(f'p{grade}-{paper}',grade,'Tiny source',hashlib.sha256(f'{grade}-{paper}'.encode()).hexdigest(),2 if paper==0 else 1,1))
   for variant in range(3):
    bank=grade*100+variant;paper=f'p{grade}-{int(variant==2)}';sha=hashlib.sha256(f'{grade}-{int(variant==2)}'.encode()).hexdigest();cluster=f'c{bank}';text='A baker bought goods with a mass of 3.25 kg. How much remains?\n(a) Find the first amount.\n(b) Find the second amount. Draw the figure if needed.'
    source.execute('insert into regions values(?,?)',(bank,text));row={'bank_line':bank,'candidate_id':f'candidate-{bank}','paper_id':paper,'level':grade,'question_number':'42','source_sha256':sha,'raw_text':text};rows[str(bank)]=row
    q.execute('insert into region_queue values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(bank,row['candidate_id'],paper,grade,'42',1,'[1]',sha,hashlib.sha256(text.encode()).hexdigest(),cluster,json.dumps([topics[grade]]),topics[grade],'unmatched-pattern-review',100-variant,1,0));q.execute('insert into clusters values(?,?)',(cluster,bank));q.execute('insert into provisional_matches values(?,?,?)',(bank,'fixture-family',json.dumps({'canonicalPatternId':'fixture-family'})))
  q.commit();q.close();source.commit();source.close();(self.base/'rows.json').write_text(json.dumps(rows))
 def args(self,action,*more):
  args=pipeline.parser().parse_args(['--work-dir',str(self.work),action,*more])
  if action=='refresh':args.inventory=self.inventory;args.retriever=self.retriever
  if action=='prepare':args.queue=self.queue;args.inventory=self.inventory;args.retriever=self.retriever;args.app_root=self.base;args.level=sorted(set(args.level or range(1,7)))
  if action=='run':args.worker=self.worker;args.inventory=self.inventory
  return args
 def prepare(self,*more):return pipeline.prepare(self.args('prepare',*more))
 def test_balanced_idempotent_selection_retains_full_census_and_source_ids(self):
  first=self.prepare('--render');self.assertEqual(first['jobStateCounts'],{'prepared':6});self.assertEqual(first['trackedSourcePapers'],12);self.assertEqual(first['sourceInventory']['counts']['regions'],18);self.assertEqual(first['coverageGranted'],0)
  self.assertEqual({j['level']for j in first['jobs']},set(range(1,7)));self.assertTrue(all(j['candidate_id']and j['sourcePages']==[1]for j in first['jobs']))
  for j in first['jobs']:self.assertTrue(json.loads(Path(j['packet_path']).read_text())['renderRequested'])
  again=self.prepare('--render');self.assertEqual([j['id']for j in first['jobs']],[j['id']for j in again['jobs']])
  more=self.prepare('--per-grade','2');self.assertEqual(len(more['jobs']),12)
  for grade in range(1,7):self.assertEqual(len({j['paper_id']for j in more['jobs']if j['level']==grade}),2)
  self.assertEqual(more['integrated'],0);self.assertEqual(more['deployed'],0)
 def test_two_worker_bound_checkpoint_resume_failure_and_explicit_retry(self):
  self.prepare();(self.base/'worker-fail').touch();args=self.args('run','--workers','2','--check-command-json','["python3","independent_check.py"]');out=pipeline.run(args)
  self.assertEqual(out['jobStateCounts'],{'checks-passed':5,'failed':1});counter=json.loads((self.work/'workers/counter.json').read_text());self.assertEqual(counter['maximum'],2)
  repeated=pipeline.run(args);self.assertEqual([j['attempts']for j in repeated['jobs']],[1]*6);self.assertEqual(json.loads((self.work/'workers/counter.json').read_text())['calls'],6)
  (self.base/'worker-fail').unlink();args.retry_failed=True;resumed=pipeline.run(args);self.assertEqual(resumed['jobStateCounts'],{'checks-passed':6});self.assertEqual([j['attempts']for j in resumed['jobs']if j['level']==5],[2]);self.assertEqual(resumed['integrated'],0)
 def test_unverified_reuse_review_and_false_check_claim_stay_distinct(self):
  self.prepare();(self.base/'mixed-status').touch();out=pipeline.run(self.args('run'))
  self.assertEqual(out['jobStateCounts'],{'generated':3,'reuse':1,'needs-review':1,'failed':1});self.assertEqual(next(j for j in out['jobs']if j['level']==4)['stage'],'worker');self.assertIn('actually exit zero',next(j for j in out['jobs']if j['level']==4)['error']);self.assertEqual(out['deployed'],0)
 def test_retrieval_failure_and_changed_packet_are_never_silently_completed(self):
  (self.base/'retrieval-fail').touch();failed=self.prepare();self.assertEqual(failed['jobStateCounts'],{'failed':6});self.assertTrue(all(j['stage']=='retrieval'for j in failed['jobs']))
  (self.base/'retrieval-fail').unlink();ready=self.prepare('--retry-failed');self.assertEqual(ready['jobStateCounts'],{'prepared':6});done=pipeline.run(self.args('run'));packet=Path(done['jobs'][0]['packet_path']);packet.write_text(packet.read_text()+' ');out=pipeline.run(self.args('run'));self.assertEqual(out['jobStateCounts'],{'failed':1,'generated':5});self.assertEqual(out['jobs'][0]['stage'],'evidence')
 def test_pattern_filter_and_snapshot_change_and_shell_arguments(self):
  out=self.prepare('--pattern-id','fixture-family');self.assertEqual(out['preparedSourceJobs'],6)
  with sqlite3.connect(self.queue)as q:q.execute('update meta set value=?where key=?',(json.dumps({'staging':str(self.staging),'stagingSnapshot':'changed'}),'inputs'))
  with self.assertRaises(pipeline.PipelineError):self.prepare()
  with self.assertRaises(pipeline.PipelineError):pipeline.command_json('["sh","-c","exit 0"]')
  marker=self.base/'must-not-exist';arg=f'$(touch "{marker}")';result=pipeline.execute([sys.executable,'-c','import sys; print(sys.argv[1])',arg],self.base/'literal-args',2);self.assertEqual(result['exitCode'],0);self.assertIn(arg,result['stdout']);self.assertFalse(marker.exists())
 def test_interrupted_prepare_resumes_the_same_selected_source(self):
  out=self.prepare();job=out['jobs'][0];Path(job['packet_path']).unlink()
  with sqlite3.connect(self.work/'pipeline.sqlite')as db:db.execute("update jobs set state='preparing',stage='retrieval'where id=?",(job['id'],))
  resumed=self.prepare();self.assertEqual(resumed['jobStateCounts'],{'prepared':6});self.assertEqual(resumed['jobs'][0]['id'],job['id']);self.assertTrue(Path(job['packet_path']).is_file())
 def test_terminal_artifacts_and_check_contract_are_bound_on_resume(self):
  self.prepare();args=self.args('run','--check-command-json','["python3","independent_check.py"]');done=pipeline.run(args)
  with self.assertRaises(pipeline.PipelineError):pipeline.run(self.args('run'))
  first=done['jobs'][0];candidate=self.work/'workers'/first['retrieval_id']/'candidate-attempt-1.json';candidate.write_text('{}');out=pipeline.run(args);self.assertEqual(out['jobStateCounts'],{'failed':1,'checks-passed':5});self.assertEqual(out['jobs'][0]['stage'],'evidence')
 def test_codex_executable_and_longer_default_timeout_are_forwarded(self):
  self.prepare();args=self.args('run','--codex','/literal/path with spaces/codex');self.assertEqual(args.worker_timeout,600);self.assertEqual(args.job_timeout,4200);out=pipeline.run(args)
  checkpoint=self.work/'workers'/out['jobs'][0]['retrieval_id']/'checkpoint.json';saved=json.loads(checkpoint.read_text());self.assertEqual(saved['codex'],'/literal/path with spaces/codex');self.assertEqual(saved['workerTimeout'],'600')
 def test_refresh_preserves_old_packet_checkpoint_and_history_without_workers(self):
  self.prepare();(self.base/'mixed-status').touch();old=pipeline.run(self.args('run'));selected=next(j for j in old['jobs']if j['level']==3);before_packet=Path(selected['packet_path']).read_bytes();worker=self.work/'workers'/selected['retrieval_id'];before_checkpoint=(worker/'checkpoint.json').read_bytes();calls=json.loads((self.work/'workers/counter.json').read_text())['calls']
  refreshed=pipeline.refresh(self.args('refresh','--level','3','--render'));after=next(j for j in refreshed['jobs']if j['level']==3);self.assertEqual(after['state'],'prepared');self.assertEqual(after['attempts'],0);self.assertEqual(after['generation'],1);self.assertNotEqual(after['retrieval_id'],selected['retrieval_id']);self.assertEqual(after['bank_line'],selected['bank_line']);self.assertEqual(after['paper_id'],selected['paper_id']);self.assertEqual(Path(selected['packet_path']).read_bytes(),before_packet);self.assertEqual((worker/'checkpoint.json').read_bytes(),before_checkpoint);self.assertEqual(json.loads((self.work/'workers/counter.json').read_text())['calls'],calls)
  archived=refreshed['refreshedJobs'][0];manifest=json.loads((Path(archived['directory'])/'manifest.json').read_text());self.assertEqual(manifest['jobSnapshot']['state'],'needs-review');self.assertEqual(manifest['jobSnapshot']['attempts'],1);self.assertGreater(len(manifest['events']),0);self.assertEqual((Path(archived['directory'])/'packet/packet.json').read_bytes(),before_packet);self.assertEqual((Path(archived['directory'])/'worker/checkpoint.json').read_bytes(),before_checkpoint)
  packet=json.loads(Path(after['packet_path']).read_text());self.assertTrue(packet['renderRequested']);self.assertEqual(packet['refreshContext']['previousRetrievalId'],selected['retrieval_id']);self.assertEqual(refreshed['archivedGenerations'],1);self.assertEqual(refreshed['integrated'],0);self.assertEqual(refreshed['deployed'],0)
 def test_refresh_retrieval_failure_resumes_as_new_generation_and_keeps_archive(self):
  self.prepare();(self.base/'worker-fail').touch();old=pipeline.run(self.args('run'));selected=next(j for j in old['jobs']if j['level']==5);(self.base/'retrieval-fail').touch();failed=pipeline.refresh(self.args('refresh','--level','5','--render'));job=next(j for j in failed['jobs']if j['level']==5);self.assertEqual(job['state'],'failed');self.assertEqual(job['stage'],'retrieval');self.assertEqual(failed['archivedGenerations'],1)
  (self.base/'retrieval-fail').unlink();resumed=self.prepare('--retry-failed');job=next(j for j in resumed['jobs']if j['level']==5);self.assertEqual(job['state'],'prepared');self.assertEqual(job['generation'],1);self.assertNotEqual(job['retrieval_id'],selected['retrieval_id']);self.assertEqual(resumed['archivedGenerations'],1)
 def test_refresh_cannot_reset_other_terminal_states_or_an_active_worker(self):
  self.prepare();done=pipeline.run(self.args('run'))
  with self.assertRaises(pipeline.PipelineError):pipeline.refresh(self.args('refresh','--level','1'))
  selected=done['jobs'][0]
  with sqlite3.connect(self.work/'pipeline.sqlite')as db:db.execute("update jobs set state='failed'where id=?",(selected['id'],))
  import fcntl
  with open(self.work/'workers'/selected['retrieval_id']/'.job.lock','a+')as lock:
   fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
   with self.assertRaises(pipeline.PipelineError):pipeline.refresh(self.args('refresh','--level','1'))
   fcntl.flock(lock,fcntl.LOCK_UN)
  self.assertEqual(pipeline.status(self.args('status'))['archivedGenerations'],0)
 def test_new_inventory_blocks_workers_until_explicit_archived_refresh(self):
  prepared=self.prepare();old=prepared['jobs'][0]
  no_op=pipeline.refresh(self.args('refresh','--level','1','--prepared-if-stale'));self.assertEqual(no_op['refreshedJobs'],[]);self.assertEqual(no_op['skippedFreshJobs'],[old['id']]);self.assertEqual(no_op['archivedGenerations'],0)
  self.inventory.write_text('{"activities":[{"id":"newly-integrated"}]}')
  with self.assertRaisesRegex(pipeline.PipelineError,'inventory differs'):pipeline.run(self.args('run'))
  self.assertFalse((self.work/'workers').exists());refreshed=pipeline.refresh(self.args('refresh','--level','1','--prepared-if-stale','--render'));job=refreshed['jobs'][0];self.assertNotEqual(job['retrieval_id'],old['retrieval_id']);self.assertEqual(job['generation'],1);self.assertTrue(Path(old['packet_path']).is_file());self.assertEqual(refreshed['archivedGenerations'],1);self.assertFalse(pipeline.packet_inventory_stale(job,self.inventory));self.assertTrue(pipeline.packet_inventory_stale(refreshed['jobs'][1],self.inventory))
 def test_refresh_mixed_fresh_and_stale_prepared_jobs_is_idempotent(self):
  self.prepare();self.inventory.write_text('{"activities":[{"id":"new"}]}');first=pipeline.refresh(self.args('refresh','--level','1','--prepared-if-stale'));packet=Path(first['jobs'][0]['packet_path']);unchanged=packet.read_bytes();out=pipeline.refresh(self.args('refresh','--level','1','--level','2','--prepared-if-stale'));self.assertEqual(out['skippedFreshJobs'],[first['jobs'][0]['id']]);self.assertEqual(len(out['refreshedJobs']),1);self.assertEqual(out['refreshedJobs'][0]['level'],2);self.assertEqual(out['archivedGenerations'],2);self.assertEqual(packet.read_bytes(),unchanged)
  again=pipeline.refresh(self.args('refresh','--level','1','--level','2','--prepared-if-stale'));self.assertEqual(again['refreshedJobs'],[]);self.assertEqual(again['archivedGenerations'],2);self.assertEqual(len(again['skippedFreshJobs']),2)
 def test_cli_status_returns_json_without_starting_workers(self):
  self.prepare();proc=subprocess.run([sys.executable,str(SCRIPT),'--work-dir',str(self.work),'status'],capture_output=True,text=True,check=True);report=json.loads(proc.stdout);self.assertEqual(report['jobStateCounts'],{'prepared':6});self.assertFalse((self.work/'workers').exists())

if __name__=='__main__':unittest.main()
