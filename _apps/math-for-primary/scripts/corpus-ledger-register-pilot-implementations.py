#!/usr/bin/env python3
"""Version-bound paper-pilot implementation and finite independent-solver receipts.
Run the selected explicit Vitest files first and pass their fresh JSON report.
"""
from pathlib import Path
import argparse,json,hashlib,sqlite3,datetime
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('test_report',type=Path);p.add_argument('--library',type=Path,default=ROOT.parent/'Singapore Maths Paper Library');p.add_argument('--only',default='p1,p3');p.add_argument('--spec-file',type=Path);a=p.parse_args();report=json.loads(a.test_report.read_text());assert report['success'] and report['numFailedTests']==0;db=sqlite3.connect(a.library/'coverage/ledger.sqlite');db.row_factory=sqlite3.Row;existing={r[0] for r in db.execute('SELECT event_id FROM events')};hashfile=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();receipt={'path':str(a.test_report.resolve()),'sha256':hashfile(a.test_report)};now=datetime.datetime.now(datetime.timezone.utc).isoformat();events=[]
def add(eid,typ,entity,ident,payload,evidence):
 if eid in existing:return
 events.append({'schemaVersion':1,'eventId':eid,'type':typ,'entityType':entity,'entityId':ident,'recordedAt':now,'reviewer':'independent-content-audit:visible-given-solvers','evidence':evidence,'payload':payload})
sets=[{'namespace':'pilot:p1-hp25:','sourceManifest':'.generated/paper-pilot/p1-henry-park-2025/review.json','module':'p1HenryPark2025.ts','solver':'p1HenryPark2025.test.ts','solverExport':'solveP1Imported','files':['p1HenryPark2025Meta.ts','missingDigitModel.ts','MissingDigitColumn.tsx','missingDigitColumn.css'],'generator':'makeP1HenryPark2025Question','samplesPerVariant':250,'sampling':'seeds0–249; index=seed%7; every original task parameter','sourceKey':'parts'}, {'namespace':'pilot:p3-rg25:','sourceManifest':'.generated/paper-imports/p3-raffles-2025-review.json','module':'p3Raffles2025.ts','solver':'p3Raffles2025.test.ts','solverExport':'solveP3Imported','files':['p3Raffles2025Meta.ts','p3RafflesPicture.ts','P3RafflesDiagram.tsx','p3RafflesDiagram.css'],'generator':'makeP3Raffles2025','samplesPerVariant':300,'sampling':'seeds0–99 × indexes0–2; every original response part','sourceKey':'entries'}]
sets.append({'namespace':'pilot:p2-hp25:','sourceManifest':'.generated/paper-pilot/p2-henry-park-2025/review.json','module':'p2HenryPark2025.ts','solver':'p2HenryPark2025.test.ts','solverExport':'solveP2Imported','files':['p2HenryPark2025Meta.ts','../answerFormat.ts','../NumberSentence.tsx','../groupingAnswer.ts','../GroupingBuilder.tsx','../groupingBuilder.css'],'generator':'makeP2HenryPark2025Question','samplesPerVariant':250,'sampling':'seeds0–249; index=seed%7; every original response task','sourceKey':'parts'})
sets.append({'namespace':'pilot:p4-ny25:','sourceManifest':'.generated/paper-imports/p4-nanyang-2025-review.json','module':'p4Nanyang2025.ts','solver':'p4Nanyang2025.test.ts','solverExport':'solveP4Imported','files':['p4Nanyang2025Meta.ts','p4NanyangPicture.ts','P4NanyangDiagram.tsx','p4NanyangDiagram.css'],'generator':'makeP4Nanyang2025','samplesPerVariant':900,'sampling':'seeds0–299 × indexes0–2; every original response unit','sourceKey':'entries'})
if a.spec_file:
 extra=json.loads(a.spec_file.read_text());sets.extend(extra if isinstance(extra,list) else [extra])
required={'namespace','sourceManifest','module','solver','solverExport','files','generator','samplesPerVariant','sampling','sourceKey'}
for spec in sets:
 assert required <= set(spec),f'Missing reviewed implementation specification fields: {required-set(spec)}'
 assert isinstance(spec['samplesPerVariant'],int) and spec['samplesPerVariant']>0 and spec['sourceKey'] in ['parts','entries']
 spec['files']=list(dict.fromkeys([*spec['files'],'../generate.ts','../answerFormat.ts','../groupingAnswer.ts','batch6MiddleResponse.ts','../../engine/random.ts']))
assert len({s['namespace'] for s in sets})==len(sets),'Duplicate source pattern namespace'
selected=set(a.only.split(','));available={spec['namespace'].split(':')[1].split('-')[0] for spec in sets};assert selected <= available and selected,'Unknown or empty --only selection';sets=[spec for spec in sets if spec['namespace'].split(':')[1].split('-')[0] in selected];total_samples=0
for spec in sets:
 folder=ROOT/'src/primary/paperImports';code=folder/spec['module'];solver=folder/spec['solver'];test=next(r for r in report['testResults'] if Path(r['name']).resolve()==solver.resolve());assert test['status']=='passed' and all(t['status']=='passed' for t in test['assertionResults']);manifest=ROOT/spec['sourceManifest'];data=json.loads(manifest.read_text());groups={}
 # A passing historical receipt cannot attest files edited after that run began.
 # Content hashes remain authoritative on subsequent ledger rebuilds.
 for tested in [code,solver,*[folder/name for name in spec['files']]]:
  assert tested.stat().st_mtime_ns//1000000 <= report['startTime'],f'{tested} changed after the test run began; rerun the independent tests.'
 for part in data[spec['sourceKey']]:groups.setdefault(part['canonicalPatternId'],[]).append(part)
 total_samples+=len(data[spec['sourceKey']])*spec['samplesPerVariant']
 tracked=[{'path':str((folder/name).resolve()),'sha256':hashfile(folder/name)} for name in spec['files']];fingerprint=hashlib.sha256(json.dumps([{'path':str(code),'sha256':hashfile(code)},*tracked],sort_keys=True).encode()).hexdigest();solverhash=hashfile(solver);evidence=[receipt,{'path':str(solver),'sha256':solverhash},{'path':str(manifest),'sha256':hashfile(manifest)}]
 for canonical,members in groups.items():
  patternid=spec['namespace']+canonical;assert db.execute('SELECT 1 FROM patterns WHERE pattern_id=?',(patternid,)).fetchone();variants=[x.get('patternParameter',x.get('adaptationId')) for x in members];scope={'variants':variants,'sampling':spec['sampling'],'sourceResponseCount':len(members),'limits':'Finite independent visible-given solutions and renderer assertions; not a proof over every possible generated value, a classroom review or public deployment evidence.'};version=fingerprint[:16]+'-'+solverhash[:12]
  add('implementation-'+patternid+'-'+version,'pattern_implemented','pattern',patternid,{'originalContent':True,'parameterisedNumbers':True,'generatorId':spec['generator'],'illustrationId':'original-models:'+','.join(spec['files']),'parameterConstraints':{'variantParameters':variants,'rules':'Bounded constraints implemented in the versioned generator; see corresponding independent test scope.'},'codePath':str(code),'codeSha256':hashfile(code),'trackedFiles':tracked,'implementationFingerprint':fingerprint,'integrationStatus':'Catalogue integration and release verification are tracked separately.'},evidence)
  add('independent-'+patternid+'-'+version,'pattern_independently_verified','pattern',patternid,{'codeSha256':hashfile(code),'implementationFingerprint':fingerprint,'method':'independent-visible-givens-solver','sampleCount':len(members)*spec['samplesPerVariant'],'solverPath':str(solver),'solverSha256':solverhash,'solverExport':spec['solverExport'],'testedParameterScope':scope,'testReportSha256':receipt['sha256']},evidence)
  for mapping in db.execute('SELECT m.*,c.file_sha,c.completeness,c.diagram_dependency FROM mappings m JOIN candidates c USING(candidate_key) WHERE m.pattern_id=?',(patternid,)):
   if mapping['relation']!='same-structure' or mapping['completeness']!='complete' or mapping['diagram_dependency']=='uncertain':continue
   fields=json.loads(mapping['scope'])['sourceVariantRequirements'];variant=fields.get('originalParameter',fields.get('originalAdaptationId'))
   # Partial-review mappings have their own scoped receipts and must not be credited by this full-pilot importer.
   if variant is None:continue
   assert variant in variants,(variant,variants)
   add('source-map-'+hashlib.sha256(mapping['candidate_key'].encode()).hexdigest()[:20]+'-'+version,'mapping_independently_verified','candidate',mapping['candidate_key'],{'patternId':patternid,'sourceSha256':mapping['file_sha'],'allSourceVariantRequirementsCovered':True,'scopeExplanation':{'sourceVariant':variant,'testedVariantIncluded':True,'sampling':spec['sampling'],'sourceReviewEvent':'Complete source givens/diagram relationship mapped explicitly in the review manifest; same-structure only.'},'implementationFingerprint':fingerprint},evidence)
out=a.library/'coverage/imports/pilot-implementations.events.json';out.write_text(json.dumps(events,indent=2)+'\n');print(json.dumps({'events':len(events),'eventFile':str(out),'testCount':report['numPassedTests'],'independentGeneratedSamples':total_samples,'sourceUncertaintiesPreserved':['P1 Q21 equation and answer','P3 Q13']}))
