#!/usr/bin/env python3
"""Generate bounded partial-source ledger events; never supersede OCR or mark paper inventory.

Manifest and passing named solver report are explicit inputs. A unit's reviewed question
must have all source givens, requirements, independent answer and a hashed source-page image.
The caller must manually validate mathematical equivalence and finite test scope.
"""
import argparse,datetime,hashlib,json,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('report',type=Path);p.add_argument('--ledger',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 m=json.loads(a.manifest.read_text());rep=json.loads(a.report.read_text());assert m['schemaVersion']==1 and rep['success'] and rep['numFailedTests']==0
 db=sqlite3.connect(f'file:{a.ledger.resolve()}?mode=ro',uri=True);db.row_factory=sqlite3.Row
 existing={r[0] for r in db.execute('select event_id from events')};events=[];now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 base=[{'path':str(a.manifest.resolve()),'sha256':digest(a.manifest)},{'path':str(a.report.resolve()),'sha256':digest(a.report)}]
 def add(suffix,kind,entity,ident,payload,extra=()):
  eid='partial-review-v1-'+suffix
  if eid not in existing:events.append({'schemaVersion':1,'eventId':eid,'type':kind,'entityType':entity,'entityId':ident,'recordedAt':now,'reviewer':'partial-source-review:visible-givens-independent-solvers','payload':payload,'evidence':base+list(extra)})
 tests={str(Path(x['name']).resolve()):x for x in rep['testResults']};pattern_evidence={}
 for spec in m['patterns']:
  pattern=spec['patternId'];code=(ROOT/spec['codePath']).resolve();solver=(ROOT/spec['solverPath']).resolve();tracked=[(ROOT/f).resolve() for f in spec['trackedFiles']];test=tests.get(str(solver));assert test and test['status']=='passed' and all(t['status']=='passed' for t in test['assertionResults']),(pattern,'solver test not passed')
  for path in [code,solver,*tracked]:assert path.is_file() and path.stat().st_mtime_ns//1000000<=rep['startTime'],f'{path} changed after test start'
  files=[{'path':str(x),'sha256':digest(x)} for x in tracked];codehash=digest(code);solverhash=digest(solver);fingerprint=hashlib.sha256(json.dumps([{'path':str(code),'sha256':codehash},*files],sort_keys=True).encode()).hexdigest();version=fingerprint[:16]+'-'+solverhash[:12];ev=[{'path':str(solver),'sha256':solverhash}]
  old=db.execute('select * from patterns where pattern_id=?',(pattern,)).fetchone()
  if spec['existing']:
   assert old and old['independent_status']=='verified' and old['implementation_status']=='implemented',(pattern,'existing pattern not currently verified')
   prior=json.loads(old['implementation_evidence']);assert prior.get('implementationFingerprint')==fingerprint,(pattern,'existing receipt fingerprint differs; refresh pilot receipt first')
  else:
   if not old:add('pattern-'+pattern,'pattern_registered','pattern',pattern,{'title':spec['title'],'description':spec['description'],'structuralSignature':spec['structuralSignature'],'sourceReviewPatternGrouping':'One reviewed reusable structure; corpus-wide uniqueness not established.'})
   add('impl-'+pattern+'-'+version,'pattern_implemented','pattern',pattern,{'originalContent':True,'parameterisedNumbers':True,'generatorId':spec['generatorId'],'illustrationId':spec['illustrationId'],'parameterConstraints':spec['parameterConstraints'],'codePath':str(code),'codeSha256':codehash,'trackedFiles':files,'implementationFingerprint':fingerprint,'integrationStatus':'App integration and release verified separately.'},ev)
   add('independent-'+pattern+'-'+version,'pattern_independently_verified','pattern',pattern,{'codeSha256':codehash,'implementationFingerprint':fingerprint,'method':'independent-visible-givens-solver','sampleCount':spec['sampleCount'],'solverPath':str(solver),'solverSha256':solverhash,'solverExport':spec['solverExport'],'testedParameterScope':spec['testedParameterScope'],'testReportSha256':digest(a.report)},ev)
  pattern_evidence[pattern]=(version,fingerprint,ev)
 seen=set();papers=set()
 for unit in m['units']:
  assert all(unit.get(k) is not None for k in ['paperId','sourceSha256','sourcePdf','sourcePage','sourceQuestion','givens','conditions','responseFormat','independentSolution','patternId','structuralRationale','variantRequirements','evidenceImage','diagramDependency'])
  paper=db.execute('select * from papers where paper_id=?',(unit['paperId'],)).fetchone();assert paper and paper['file_sha']==unit['sourceSha256'] and digest(unit['sourcePdf'])==paper['file_sha'];assert not paper['inventory_reviewed'],'Do not disturb an existing complete inventory'
  assert 1<=unit['sourcePage']<=paper['page_count'] and unit['diagramDependency'] in ('required','not-required');assert unit['patternId'] in pattern_evidence
  key='partial:'+unit['paperId']+':'+unit['sourceQuestion'];assert key not in seen;seen.add(key);papers.add(unit['paperId'])
  other=db.execute('select c.candidate_key from candidates c join candidate_aliases a using(candidate_key) where a.paper_id=? and c.manual=1 and c.question_number=?',(unit['paperId'],unit['sourceQuestion'])).fetchone();assert not other or other[0]==key,('Existing manual unit; do not duplicate',key,other[0])
  img=Path(unit['evidenceImage']);assert img.is_file() and digest(img)==unit['evidenceImageSha256'];evidence=[{'path':str(img.resolve()),'sha256':digest(img)}];version,fingerprint,solverev=pattern_evidence[unit['patternId']]
  if not other:add('create-'+key,'candidate_created','candidate',key,{'paperId':unit['paperId'],'sourceSha256':unit['sourceSha256'],'sourcePages':[unit['sourcePage']],'questionNumber':unit['sourceQuestion'],'reason':'Explicit reviewed partial question scope; original OCR region remains untouched.','workingTranscription':json.dumps({'givens':unit['givens'],'conditions':unit['conditions']},ensure_ascii=False),'unitType':'partial-response-unit'},evidence)
  add('review-'+key,'candidate_visually_reviewed','candidate',key,{'sourceSha256':unit['sourceSha256'],'reviewedSourcePages':[unit['sourcePage']],'completeness':'complete','diagramDependency':unit['diagramDependency'],'observations':unit['independentSolution'],'sourceGivens':unit['givens'],'conditions':unit['conditions'],'responseFormat':unit['responseFormat'],'sourceChoices':unit.get('sourceChoices'),'scope':'Only this source unit; OCR region and remaining paper retain unreviewed status.'},evidence)
  add('map-'+key,'pattern_mapped','candidate',key,{'patternId':unit['patternId'],'relation':'same-structure','structuralRationale':unit['structuralRationale'],'sourceVariantRequirements':unit['variantRequirements'],'scope':'Only this response unit, not a complete paper or OCR region.'},evidence)
  add('verify-'+key+'-'+version,'mapping_independently_verified','candidate',key,{'patternId':unit['patternId'],'sourceSha256':unit['sourceSha256'],'allSourceVariantRequirementsCovered':True,'scopeExplanation':unit['verificationExplanation'],'implementationFingerprint':fingerprint},evidence+solverev)
 a.output.open('x').write(json.dumps(events,indent=2,ensure_ascii=False)+'\n');print(json.dumps({'events':len(events),'responseUnits':len(seen),'papersTouched':len(papers),'eventFile':str(a.output.resolve()),'wholePaperInventoryEvents':0,'ocrSupersessionEvents':0}))
if __name__=='__main__':main()
