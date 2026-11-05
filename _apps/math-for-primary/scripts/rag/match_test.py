import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('rag_match',Path(__file__).resolve().parents[1]/'rag-match.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def packet():
 return {'schema':1,'jobId':'p5_match_1','level':5,'topic':'DEC','sourceRegions':[{'bankLine':42,'paperId':'abc123','title':'Paper','questionNumber':'7a','pageNumbers':[2],'level':5,'rawText':'A jar has 2.4 L. How much is this in ml?','sourceSha256':'a'*64,'sourcePdf':'/private/source.pdf','pageTexts':[{'page':2,'text':'A jar has 2.4 L. How much is this in ml?'}],'pageImages':[]}], 'existingGenerators':[{'id':'ignored','code':'SECRET_GENERATOR_CODE'}],'referenceFiles':[{'path':'/private/secret.ts','content':'SECRET_REFERENCE_CODE'}],'requirements':['SECRET_OLD_REQUIREMENTS']}

def shortlist():
 return [{'id':'p5s-paper-volume-convert','canonicalPatternId':'litres-to-millilitres','level':5,'title':'Convert capacity','objective':'Convert litres into millilitres','skillIds':['P5.S.DEC.02'],'responseShapes':['number'],'partCounts':[1],'representations':['text'],'numericConstraints':['decimal input'],'codeFiles':['SECRET_PATH'],'priorSources':['SECRET_HISTORY'],'examples':['SECRET_EXAMPLE']}]

def response():
 return {'decision':'match','targetGeneratorId':'p5s-paper-volume-convert','targetCanonicalPatternId':'litres-to-millilitres','sourceRefs':[{'bankLine':42,'paperId':'abc123','questionNumber':'7a','pageNumbers':[2]}],'reasoning':'Both ask for the same unit conversion with a different quantity.','compatibleConstraints':['One decimal quantity in litres; one numerical millilitre response.'],'blockingGaps':[]}

class FakeRun:
 def __init__(self,responses):self.responses=list(responses);self.calls=[]
 def __call__(self,cmd,**kwargs):
  self.calls.append((cmd,kwargs));item=self.responses.pop(0);Path(cmd[cmd.index('--output-last-message')+1]).write_text(json.dumps(item));return subprocess.CompletedProcess(cmd,0,'','')

class MatchTests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.job=Path(self.tmp.name)/'job'
 def tearDown(self):self.tmp.cleanup()
 def test_match_emits_standard_reuse_without_code_or_history(self):
  fake=FakeRun([response()]);state=m.run_match(packet(),shortlist(),self.job,codex='mock',run=fake)
  self.assertEqual(state['status'],'reuse');self.assertFalse(state['checksExecuted']);candidate=json.loads((self.job/state['candidateFile']).read_text());self.assertEqual(candidate['canonicalPatternId'],'p5s-paper-volume-convert');self.assertEqual(candidate['files'],[])
  clean=json.loads((self.job/'packet.json').read_text());self.assertEqual(clean['referenceFiles'],[]);m.worker.candidate_check(candidate,clean)
  prompt=fake.calls[0][1]['input'];self.assertIn('2.4 L',prompt)
  for private in ('SECRET_GENERATOR_CODE','SECRET_REFERENCE_CODE','SECRET_PATH','SECRET_HISTORY','SECRET_EXAMPLE','SECRET_OLD_REQUIREMENTS'):self.assertNotIn(private,prompt)
  changed=packet();changed['sourceRegions'][0]['rawText']='A jar has 3.7 L. How much is this in ml?';self.assertEqual(m.decision_check(response(),m.build_match_packet(changed,shortlist()),[])['decision'],'match')
 def test_unknown_target_and_wrong_source_are_rejected(self):
  clean=m.build_match_packet(packet(),shortlist());bad=response();bad['targetGeneratorId']='unknown'
  with self.assertRaises(m.MatchError):m.decision_check(bad,clean,[])
  bad=response();bad['sourceRefs'][0]['pageNumbers']=[9]
  with self.assertRaises(m.MatchError):m.decision_check(bad,clean,[])
 def test_missing_page_or_essential_figure_requires_review(self):
  data=packet();data['sourceRegions'][0]['pageTexts']=[];clean=m.build_match_packet(data,shortlist());generate=response();generate.update(decision='generate',targetGeneratorId='',targetCanonicalPatternId='',compatibleConstraints=[])
  with self.assertRaises(m.MatchError):m.decision_check(generate,clean,[])
  data=packet();data['sourceRegions'][0]['rawText']='Use the diagram to find the volume.';clean=m.build_match_packet(data,shortlist())
  with self.assertRaises(m.MatchError):m.decision_check(generate,clean,[])
  review=response();review.update(decision='review',targetGeneratorId='',targetCanonicalPatternId='',compatibleConstraints=[],blockingGaps=['Figure missing'])
  self.assertEqual(m.decision_check(review,clean,[])['decision'],'review')
 def test_generate_never_emits_reuse_or_code(self):
  decision=response();decision.update(decision='generate',targetGeneratorId='',targetCanonicalPatternId='',compatibleConstraints=[])
  state=m.run_match(packet(),shortlist(),self.job,codex='mock',run=FakeRun([decision]));self.assertEqual(state['status'],'generate');self.assertFalse((self.job/'candidate-attempt-1.json').exists());self.assertFalse((self.job/'candidate').exists())
 def test_resume_detects_modified_packet_or_decision(self):
  m.run_match(packet(),shortlist(),self.job,codex='mock',run=FakeRun([response()]));self.assertEqual(m.run_match(packet(),shortlist(),self.job,codex='mock',run=FakeRun([]))['status'],'reuse');(self.job/'match-result.json').write_text('{}')
  with self.assertRaises(m.MatchError):m.run_match(packet(),shortlist(),self.job,codex='mock',run=FakeRun([]))
 def test_baseline_entry_without_canonical_id_retains_explicit_id(self):
  entry=shortlist()[0];entry.update(id='p5s-decimalConvert-n4',canonicalPatternId=None);clean=m.build_match_packet(packet(),[entry]);out=response();out.update(targetGeneratorId=entry['id'],targetCanonicalPatternId='');self.assertEqual(m.decision_check(out,clean,[])['decision'],'match');state=m.run_match(packet(),[entry],self.job,codex='mock',run=FakeRun([out]));self.assertEqual(state['status'],'reuse')
if __name__=='__main__':unittest.main()
