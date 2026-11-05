"""Read-only tracker fixtures: source items, generated previews and patterns stay distinct."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('rag_progress',Path(__file__).parents[1]/'rag-progress.py');progress=importlib.util.module_from_spec(spec);spec.loader.exec_module(progress)

class ProgressTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name);self.private='/Users/private-owner/secret-paper.pdf';self.ocr='RAW_OCR_SECRET_SENTINEL';generated=self.root/'.generated';generated.mkdir()
  self.memory=generated/'rag-memory.sqlite'
  with sqlite3.connect(self.memory)as db:
   db.executescript('''create table papers(paper_id text,level integer,title text,source_pdf text);create table regions(paper_id text,bank_line integer,raw_text text);create table generators(generator_id text,canonical_pattern_id text,current_version text,active integer);create table generator_versions(version_id text,available integer);create table decisions(decision_id text,decision text,target text,job_id text,reasoning text);create table decision_sources(decision_id text,paper_id text,bank_line integer);create table decision_outcomes(decision_id text,outcome text,generator_id text,version_id text);''')
   for n in range(1,4):db.execute('insert into papers values(?,?,?,?)',(f'paper{n}',n,f'School {n} paper',self.private));db.execute('insert into regions values(?,?,?)',(f'paper{n}',n*11,self.ocr))
   db.execute('insert into generators values(?,?,?,?)',('g-current','same-family','v1',1));db.executemany('insert into generator_versions values(?,?)',[('v1',1),('v0',1)])
   for identity,decision,job,paper,line,outcome,version in [('new','new-generator','rag-checked-integrated','paper2',22,'code-integrated','v1'),('reuse-a','reuse','rag-loop-running','paper3',33,'reuse','v1'),('reuse-b','reuse','rag-loop-running','paper3',33,'reuse','v1'),('old','reuse','rag-old','paper3',99,'reuse','v0')]:
    db.execute('insert into decisions values(?,?,?,?,?)',(identity,decision,'same-family',job,self.ocr));db.execute('insert into decision_sources values(?,?,?)',(identity,paper,line));db.execute('insert into decision_outcomes values(?,?,?,?)',(identity,outcome,'g-current',version))
  sample={'reasoningFamily':'family-label','response':'constructed:numeric-fields','prompt':'Find both amounts.','context':['A complete original shared story.'],'structuredResponse':{'kind':'numeric-fields','fields':[{'label':'(a)'},{'label':'(b)'}]},'answer':'["2","3"]','workedSteps':[{'text':self.ocr,'sourcePdf':self.private}]}
  duplicate={**sample,'reasoningFamily':'another-label','response':'other-format','answer':'changed hidden answer','workedSteps':[{'text':'different hidden solution'}]}
  activities=[{'id':'g-current','parameter':'rag-1','canonicalPatternId':'same-family','source':{'paperId':'paper1','questionLabels':['12(a)']},'examples':[sample,sample]},{'id':'a-two','parameter':'two','canonicalPatternId':'same-family','source':{'paperId':'paper1','questionLabels':['12(b)']},'examples':[duplicate]}]
  self.put(generated/'question-pattern-progress.json',{'generatedAt':'2026-11-05T00:00:00Z','activities':activities})
  entries=[]
  for n,paper,job in [(1,'paper2','rag-checked-integrated'),(2,'paper1','rag-other-integrated')]:
   code=self.root/f'src/primary/paperImports/rag{n}.ts';code.parent.mkdir(parents=True,exist_ok=True);code.write_text(f'export const value={n};');entries.append({'id':f'generator-{n}','level':int(paper[-1]),'parameter':f'rag-{n}','canonicalPatternId':'same-family','jobId':job,'sourceRefs':[{'paperId':paper,'sourceQuestion':'22(a),(b)','sourcePages':[2]}],'files':[{'path':str(code.relative_to(self.root)),'sha256':hashlib.sha256(code.read_bytes()).hexdigest()}]})
  self.put(self.root/'src/primary/paperImports/ragRegistry.json',{'schema':1,'entries':entries})
  pipeline=generated/'rag-pipeline/pipeline.sqlite';pipeline.parent.mkdir()
  with sqlite3.connect(pipeline)as db:
   db.execute('create table jobs(id text,level integer,paper_id text,question_number text,bank_line integer,state text,stage text,retrieval_id text,updated_at text)');db.execute('insert into jobs values(?,?,?,?,?,?,?,?,?)',('legacy',2,'paper2','22',22,'checks-passed','worker','rag-checked-integrated','2026-11-05T01:00:00Z'))
  self.put(generated/'rag-pipeline/workers/rag-checked-integrated/checkpoint.json',{'status':'checks-passed','attempt':1,'error':self.ocr,'command':['cat',self.private]})
  jobs={'paper2:22':{'key':'paper2:22','paperId':'paper2','level':2,'bankLine':22,'questionNumber':'22','retrievalId':'rag-checked-integrated','state':'checks-passed','workerDirectory':str(generated/'rag-paper-loop/workers/rag-checked-integrated'),'error':self.private},'paper3:33':{'key':'paper3:33','paperId':'paper3','level':3,'bankLine':33,'questionNumber':'33','retrievalId':'rag-loop-running','state':'generating','error':self.ocr,'packet':self.private,'decisionReceipt':{'database':self.private}}}
  self.put(generated/'rag-paper-loop/loop.json',{'schema':1,'jobs':jobs,'events':[{'sourceText':self.ocr,'packet':self.private}]})
 def put(self,path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value))
 def test_declared_pattern_and_multipart_duplicates_do_not_become_question_totals(self):
  data=progress.snapshot(self.root);c=data['counts'];self.assertEqual(c['cataloguePatternIds'],1);self.assertEqual(c['newPatternIds'],1);self.assertEqual(c['newGeneratorsIntegrated'],2);self.assertEqual(c['exportedSampleQuestions'],1);self.assertEqual(c['sourceItemsLinked'],2);self.assertEqual(c['reuseLinks'],1);self.assertIsNone(c['totalSourceQuestions']);self.assertEqual(c['wholePapersVerifiedByThisPipeline'],0)
  self.assertEqual(c['primarySourceReferencesInExport'],1);self.assertIn('Primary source references in this export',data['scope'])
 def test_loop_jobs_are_current_and_registry_integration_overrides_old_checks(self):
  data=progress.snapshot(self.root);current=data['currentJobs'];running=next(j for j in current if j['paper_id']=='paper3');self.assertEqual(running['origin'],'paper-loop');self.assertEqual(running['workerStatus'],'running');integrated=next(j for j in data['jobs']if j['retrieval_id']=='rag-checked-integrated');self.assertEqual(integrated['state'],'code-integrated');self.assertEqual(integrated['workerStatus'],'code-integrated');self.assertEqual(set(integrated['origins']),{'regional-pipeline','paper-loop'});self.assertEqual(len([j for j in data['jobs']if j['retrieval_id']=='rag-checked-integrated']),1)
 def test_paper_rows_separate_pattern_ids_new_generator_ids_and_concrete_previews(self):
  data=progress.snapshot(self.root);paper=next(p for p in data['papers']if p['id']=='paper2');self.assertEqual(paper['matchedPatternIds'],['same-family']);self.assertEqual(paper['newGeneratorIds'],['generator-1']);self.assertEqual(paper['patterns'],1);self.assertEqual(paper['new'],1);self.assertEqual(paper['samples'],1);self.assertEqual(len(paper['samplePreviews']),1);self.assertEqual(paper['samplePreviews'][0]['prompt'],'Find both amounts.');self.assertIn('unfinished',paper['status'])
  self.assertEqual(progress.identifier('arithmetic-×-decimal'), 'arithmetic-×-decimal')
  self.assertEqual(progress.identifier('arithmetic-+-whole-regroupFalse'), 'arithmetic-+-whole-regroupFalse')
  self.assertIsNone(progress.identifier('/Users/name/private'))
 def test_payload_never_exposes_ocr_filesystem_paths_or_hidden_receipts(self):
  data=progress.snapshot(self.root);serialized=json.dumps(data);self.assertNotIn(self.ocr,serialized);self.assertNotIn(self.private,serialized);self.assertNotIn(str(self.root),serialized);self.assertNotIn('workerDirectory',serialized);self.assertNotIn('workedSteps',serialized);self.assertNotIn('raw_text',serialized);self.assertNotIn('command',serialized)
 def test_http_copy_uses_honest_primary_reference_label_and_current_jobs(self):
  self.assertIn('primary source references in this export',progress.PAGE);self.assertNotIn('papers have declared source associations',progress.PAGE);self.assertIn('data.currentJobs||data.jobs',progress.PAGE);self.assertIn('p.matchedPatternIds',progress.PAGE);self.assertIn('See generated examples',progress.PAGE)

if __name__=='__main__':unittest.main()
