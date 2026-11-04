#!/usr/bin/env python3
"""Whole-paper inventories must reuse exact, previously reviewed response identities."""
import hashlib,json,sqlite3,subprocess,tempfile,unittest
from pathlib import Path
SCRIPT=Path(__file__).with_name('corpus-ledger-import-pilot.py')

class WholeReviewTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  (self.root/'coverage/imports').mkdir(parents=True)
  self.db=self.root/'coverage/ledger.sqlite';self.sha=hashlib.sha256(b'source').hexdigest()
  self.image=self.root/'page-01.png';self.image.write_bytes(b'fixture rendered page')
  with sqlite3.connect(self.db) as c:
   c.executescript('CREATE TABLE papers(paper_id TEXT,file_sha TEXT);CREATE TABLE events(event_id TEXT);CREATE TABLE patterns(pattern_id TEXT);CREATE TABLE candidates(candidate_key TEXT,question_number TEXT,manual INTEGER,file_sha TEXT,source_pages TEXT);CREATE TABLE candidate_aliases(candidate_key TEXT,paper_id TEXT);')
   c.execute('INSERT INTO papers VALUES (?,?)',('paper',self.sha))
   c.execute('INSERT INTO candidates VALUES (?,?,?,?,?)',('ocr:1','1',0,self.sha,'[1]'))
   c.execute('INSERT INTO candidate_aliases VALUES (?,?)',('ocr:1','paper'))
  part={'sourcePart':'1','sourceQuestion':'1','pdfPage':1,'canonicalPatternId':'addition','structure':'Join two amounts','patternParameter':'1','originalVariantProposal':'Original amounts with the same join relationship','evidenceImage':str(self.image),'sourceGivens':{'a':3,'b':4},'independentSourceSolution':{'reasoning':'3 + 4 = 7'},'sourceAnswerCheck':{'correct':True},'sourceDefects':[],'adaptationScope':'same structure','sourceDiagramDependency':'not-required','response':'number','diagramNeeds':[]}
  self.manifest=self.root/'manifest.json'
  self.manifest.write_text(json.dumps({'paper':{'paperId':'paper','sourceSHA':self.sha},'review':{'completeSource':True,'visualPages':[1],'numberedQuestions':1,'mainAnswerParts':1,'storyEquationTasks':0},'parts':[part],'sourceInventoryReplacesHeuristicOCRSegmentation':True}))
 def tearDown(self):self.tmp.cleanup()
 def add_prior(self,key='partial:paper:1',pages='[1]'):
  with sqlite3.connect(self.db) as c:
   c.execute('INSERT INTO candidates VALUES (?,?,?,?,?)',(key,'1',1,self.sha,pages))
   c.execute('INSERT INTO candidate_aliases VALUES (?,?)',(key,'paper'))
 def run_import(self):
  return subprocess.run(['python3',str(SCRIPT),str(self.manifest),'--library',str(self.root),'--namespace','whole:example:'],capture_output=True,text=True)
 def test_reuses_prior_partial_identity_in_review_mapping_and_inventory(self):
  self.add_prior();result=self.run_import();self.assertEqual(result.returncode,0,result.stderr)
  events=json.loads((self.root/'coverage/imports/pilot-paper-source.events.json').read_text())
  self.assertFalse(any(e['type']=='candidate_created' for e in events))
  for e in events:
   if e['type'] in ['candidate_visually_reviewed','pattern_mapped']:self.assertEqual(e['entityId'],'partial:paper:1')
   if e['type']=='paper_inventory_reviewed':
    self.assertEqual(e['payload']['confirmedQuestionIds'],['partial:paper:1'])
    self.assertEqual(e['payload']['excludedCandidateIds'],['ocr:1'])
 def test_refuses_ambiguous_prior_manual_units(self):
  self.add_prior();self.add_prior('manual:paper:1');self.assertNotEqual(self.run_import().returncode,0)
 def test_refuses_different_source_page(self):
  self.add_prior(pages='[2]');self.assertNotEqual(self.run_import().returncode,0)
 def test_creates_one_unit_when_no_prior_review_exists(self):
  result=self.run_import();self.assertEqual(result.returncode,0,result.stderr)
  events=json.loads((self.root/'coverage/imports/pilot-paper-source.events.json').read_text())
  created=[e for e in events if e['type']=='candidate_created']
  self.assertEqual([e['entityId'] for e in created],['manual:paper:1'])

if __name__=='__main__':unittest.main()
