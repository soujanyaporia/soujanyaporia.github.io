#!/usr/bin/env python3
import json,sqlite3,subprocess,tempfile,unittest,hashlib,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=ROOT/'scripts/corpus-partial-review-import.py'
class PartialTest(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.d=Path(self.t.name);pdf=self.d/'source.pdf';pdf.write_bytes(b'fixture pdf');img=self.d/'page.png';img.write_bytes(b'fixture page');h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();self.sha=h(pdf);self.db=self.d/'ledger.sqlite'
  c=sqlite3.connect(self.db);c.executescript('CREATE TABLE papers(paper_id TEXT,file_sha TEXT,page_count INTEGER,inventory_reviewed INTEGER); CREATE TABLE events(event_id TEXT); CREATE TABLE patterns(pattern_id TEXT); CREATE TABLE candidates(candidate_key TEXT,question_number TEXT,manual INTEGER); CREATE TABLE candidate_aliases(candidate_key TEXT,paper_id TEXT);');c.execute('insert into papers values (?,?,?,?)',('p',self.sha,1,0));c.commit();c.close()
  spec={'patternId':'new:test','codePath':'src/primary/paperImports/batch2Reuse.ts','solverPath':'src/primary/paperImports/batch2Reuse.test.ts','trackedFiles':['src/primary/generate.ts'],'existing':False,'title':'round','description':'round decimal','structuralSignature':'round','generatorId':'generate','illustrationId':'cards','parameterConstraints':{'places':2},'sampleCount':1000,'solverExport':'test solver','testedParameterScope':{'seeds':'0–999'}}
  unit={'paperId':'p','sourceSha256':self.sha,'sourcePdf':str(pdf),'sourcePage':1,'sourceQuestion':'2a','givens':{'number':'1.25'},'conditions':'nearest tenth','responseFormat':'constructed','independentSolution':'1.3','patternId':'new:test','structuralRationale':'same rounding','variantRequirements':{'places':2},'verificationExplanation':'two-place decimal rounding independently checked','evidenceImage':str(img),'evidenceImageSha256':h(img),'diagramDependency':'not-required'}
  self.man=self.d/'manifest.json';self.man.write_text(json.dumps({'schemaVersion':1,'patterns':[spec],'units':[unit]}));self.report=self.d/'test.json';self.report.write_text(json.dumps({'success':True,'numFailedTests':0,'startTime':int(time.time()*1000)+1000,'testResults':[{'name':str(ROOT/spec['solverPath']),'status':'passed','assertionResults':[{'status':'passed'}]}]}))
 def tearDown(self):self.t.cleanup()
 def run_import(self):return subprocess.run(['python3',str(SCRIPT),str(self.man),str(self.report),'--ledger',str(self.db),'--output',str(self.d/'events.json')],capture_output=True,text=True)
 def test_partial_scope_never_supersedes_or_inventories(self):
  r=self.run_import();self.assertEqual(r.returncode,0,r.stderr);events=json.loads((self.d/'events.json').read_text());types=[e['type'] for e in events];self.assertEqual(len(types),7);self.assertNotIn('candidate_superseded',types);self.assertNotIn('paper_inventory_reviewed',types);self.assertIn('mapping_independently_verified',types)
 def test_refuses_existing_paper_inventory(self):
  c=sqlite3.connect(self.db);c.execute('update papers set inventory_reviewed=1');c.commit();c.close();r=self.run_import();self.assertNotEqual(r.returncode,0);self.assertFalse((self.d/'events.json').exists())
 def test_refuses_changed_source(self):
  (self.d/'source.pdf').write_bytes(b'changed');r=self.run_import();self.assertNotEqual(r.returncode,0);self.assertFalse((self.d/'events.json').exists())
if __name__=='__main__':unittest.main()
