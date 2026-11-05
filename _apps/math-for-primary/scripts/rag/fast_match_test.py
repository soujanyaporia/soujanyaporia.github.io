"""Strict grammar/domain and standard reuse receipt fixtures. No shared DB writes."""
import copy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('fast_match',HERE.parent/'rag-fast-match.py');f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
spec=importlib.util.spec_from_file_location('fast_memory_fixture',HERE/'memory_test.py');fixtures=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixtures)

def profile():
 return {'activity':{'id':'p4s-paper-b7a-fixture','level':4,'parameter':'b7a-fixture','canonicalPatternId':'arithmetic-multiply-whole','title':'Multiply'},'family':{'id':'fixture','level':4,'variants':[{'tree':{'op':'×','a':{'slot':0},'b':{'slot':1}},'domains':[{'digits':2,'places':0,'belowOne':False,'trailingZeros':0},{'digits':1,'places':0,'belowOne':False,'trailingZeros':0}],'maxAnswerPlaces':0}]},'samples':[{'prompt':'Calculate.','display':f'{n} × 3','answer':str(n*3),'ready':True,'accepted':True}for n in range(12,32)]}

class FastMatchTests(unittest.TestCase):
 def test_whole_question_requires_matching_number_blank_response_and_no_residue(self):
  valid='17.\nFind the product of 27 and 8.\nAns:\nwww.sgexam.com';task,reason=f.bounded_task(valid,'17');self.assertIsNone(reason);self.assertEqual(task['parsed']['evaluatedExactly'],'216');self.assertEqual(task['removedBoilerplateLines'],['www.sgexam.com'])
  invalid=[('Find the product of 27 and 8.\nAns:','17'),('17. Find the product of27and8.\nAns:','17'),('17. Calculate 27 × 8.\nAns:216','17'),('17. Calculate 27 × 8.\nAns:\n(a) Find more.','17'),('17. Calculate 27 × 8.\n(1)100 (2)200','17'),('17. Calculate 27 / 8.\nAns:','17'),('17. A shared story. Calculate 27 × 8.\nAns:','17'),('17. Calculate 27 × 8.\nAns:','17a'),('17. Calculate 27 × 8.\nAns:','18')]
  for text,q in invalid:self.assertIsNone(f.bounded_task(text,q)[0],text)
 def test_domains_precision_and_regrouping_are_constraints_not_keywords(self):
  domain={'digits':1,'places':2,'belowOne':False,'trailingZeros':0};self.assertTrue(f.domain_accept('7.83',domain));self.assertFalse(f.domain_accept('7.8',domain));self.assertFalse(f.domain_accept('70.83',domain));self.assertTrue(f.domain_accept('200',{'digits':3,'places':0,'belowOne':False,'trailingZeros':2}));self.assertFalse(f.domain_accept('210',{'digits':3,'places':0,'belowOne':False,'trailingZeros':2}))
  p=profile();task=f.bounded_task('17. Calculate 27 × 8.\nAns:','17')[0];self.assertTrue(f.source_fits(task,p));wrong=f.bounded_task('17. Calculate 270 × 8.\nAns:','17')[0];self.assertFalse(f.source_fits(wrong,p))
 def test_actual_sample_proof_rejects_wrong_answers_controls_variants_or_grade(self):
  p=profile();self.assertTrue(f.validate_profile(p)[0])
  for mutate in [lambda p:p['samples'][0].update(answer='999'),lambda p:p['samples'][0].update(choices=['36','99']),lambda p:p['family']['variants'].append(copy.deepcopy(p['family']['variants'][0])),lambda p:p['activity'].update(level=3)]:
   bad=copy.deepcopy(p);mutate(bad);self.assertFalse(f.validate_profile(bad)[0])
  bad=copy.deepcopy(p);bad['samples']=bad['samples'][:3];self.assertFalse(f.validate_profile(bad)[0])
 def test_context_guards_reject_mcq_or_extra_precision_instructions(self):
  self.assertTrue(f.MCQ.search('Choose the correct answer. Write its number in brackets.'));self.assertTrue(f.EXTRA.search('Give all answers to the nearest whole number.'));self.assertFalse(f.MCQ.search('Show your working and write your answers in the spaces.'))
 def test_standard_receipt_records_only_current_existing_reuse_idempotently(self):
  fixture=fixtures.MemoryTests('test_idempotent_sync_ingest_and_unknown_reuse_rejection');fixture.setUp();self.addCleanup(fixture.doCleanups)
  # This checks receipt compatibility with a known existing capacity fixture;
  # acceptance semantics are separately exercised by the strict arithmetic tests.
  raw='1. Shared story givens.\n(a) Find one bottle.\n(b) Find all bottles.';entry={'candidateId':'candidate-1','bankLine':1,'paperId':'paper1','level':3,'questionNumber':'1','sourcePages':[2],'sourceSha256':f.memory.file_hash(fixture.root/'paper1.pdf'),'rawText':raw}
  p={'activity':{'id':'existing-capacity','level':3,'canonicalPatternId':'known-capacity'}};paper={'title':'Fixture','source_pdf':str(fixture.root/'paper1.pdf')};job=f.make_receipt(entry,p,paper,[{'page':2,'text':raw}],fixture.root/'receipts','a'*64)
  a=f.memory.record(fixture.db,job,fixture.app);b=f.memory.record(fixture.db,job,fixture.app);self.assertEqual(a,b);self.assertEqual(a['decision'],'reuse');self.assertEqual(a['reuseTargets'],['existing-capacity']);self.assertEqual(a['integration'],'not-integrated');state=json.loads((Path(job)/'checkpoint.json').read_text());self.assertFalse(state['checksExecuted']);self.assertEqual(state['fileSha256'],{})
 def test_queue_input_and_apply_progress_are_reproducible_and_idempotent(self):
  fixture=fixtures.MemoryTests('test_idempotent_sync_ingest_and_unknown_reuse_rejection');fixture.setUp();self.addCleanup(fixture.doCleanups)
  self.assertEqual(f.default_staging(fixture.queue),fixture.staging)
  p=profile();p['activity'].update(id='existing-arithmetic',level=3);p['family']['level']=3
  fixture.inventory.write_text(json.dumps({'activities':[{**p['activity'],'track':'standard','objective':'Multiply two numbers','skillIds':['P3.S.MD.01'],'examples':[]}]}));f.memory.sync(fixture.db,fixture.app,fixture.inventory,fixture.registry,fixture.queue)
  raw='1. Calculate 27 × 8.\nAns:';entry={'candidateId':'candidate-1','bankLine':1,'paperId':'paper1','level':3,'questionNumber':'1','sourcePages':[2],'sourceSha256':f.memory.file_hash(fixture.root/'paper1.pdf'),'rawText':raw,'rawTextSha256':f.pipeline.digest(raw),'targetActivityId':'existing-arithmetic'}
  proof_path=fixture.root/'proof.json';f.atomic(proof_path,{'validatedProfiles':[p],'codeBindings':f.memory.code_files(fixture.app)})
  entry['receiptDirectory']=f.make_receipt(entry,p,{'title':'Arithmetic fixture','source_pdf':str(fixture.root/'paper1.pdf')},[{'page':2,'text':raw}],fixture.root/'receipts',f.pipeline.file_hash(proof_path))
  report=fixture.root/'report.json';f.atomic(report,{'inputs':{'appRoot':str(fixture.app),'inventory':str(fixture.inventory),'inventorySha256':f.pipeline.file_hash(fixture.inventory),'matcherSha256':f.pipeline.file_hash(f.__file__),'profileProof':str(proof_path),'profileProofSha256':f.pipeline.file_hash(proof_path)},'accepted':[entry]})
  args=SimpleNamespace(report=report,memory_db=fixture.root/'memory.sqlite',limit=1,level=[3],output=None)
  first=f.apply(args);second=f.apply(args);self.assertEqual(first['decisions'],second['decisions']);saved=json.loads((fixture.root/'applied.json').read_text());self.assertEqual(saved['appliedReceipts'],1);self.assertEqual(saved['appliedReusableRegions'],1);self.assertEqual(saved['byLevel']['3'],1);self.assertEqual([r['status']for r in saved['runs']],['completed','completed']);self.assertIsNone(saved['totalSourceQuestions']);self.assertEqual(saved['sourceCoverageGranted'],0)
 def test_apply_rejects_changed_evidence_before_opening_memory(self):
  fixture=fixtures.MemoryTests('test_idempotent_sync_ingest_and_unknown_reuse_rejection');fixture.setUp();self.addCleanup(fixture.doCleanups);report=fixture.root/'tampered-report.json';report.write_text(json.dumps({'inputs':{'appRoot':str(fixture.app),'matcherSha256':'wrong'}}));new_db=fixture.root/'must-not-create.sqlite'
  with self.assertRaises(ValueError):f.apply(SimpleNamespace(report=report,memory_db=new_db,limit=1))
  self.assertFalse(new_db.exists())

if __name__=='__main__':unittest.main()
