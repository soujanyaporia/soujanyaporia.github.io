#!/usr/bin/env python3
"""Import explicit reviewed whole-paper pilot source facts only; does not claim implementation/tests.
Known source ambiguities must be supplied explicitly with --incomplete-parts, not inferred by keywords.
"""
import argparse,hashlib,json,sqlite3,datetime
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('--library',type=Path,default=Path(__file__).resolve().parents[1].parent/'Singapore Maths Paper Library');p.add_argument('--incomplete-parts',default='');p.add_argument('--revision',default='1');p.add_argument('--namespace');a=p.parse_args();raw=a.manifest.read_bytes();m=json.loads(raw);paper=m['paper'];review=m['review'];parts=m['parts'];incomplete=set(filter(None,a.incomplete_parts.split(',')));assert incomplete<={x['sourcePart'] for x in parts};db=sqlite3.connect(a.library/'coverage/ledger.sqlite');db.row_factory=sqlite3.Row;known=db.execute('SELECT * FROM papers WHERE paper_id=?',(paper['paperId'],)).fetchone();assert known and known['file_sha']==paper['sourceSHA'];existing={r[0] for r in db.execute('SELECT event_id FROM events')};timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat();hashfile=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();base={'path':str(a.manifest.resolve()),'sha256':hashlib.sha256(raw).hexdigest()};events=[]
namespaces={'0fa004d1786d5dd9':'pilot:p1-hp25:','1a14bf2e2a4e6460':'pilot:p2-hp25:'}
namespace=a.namespace or namespaces.get(paper['paperId']);assert namespace and namespace.endswith(':'),'Supply an explicit --namespace for a new reviewed source'
# A partial review and a complete inventory describe the same source response.
# Reuse that exact paper/question identity, retaining its earlier evidence.
candidate_ids={}
for part in parts:
 matches=list(db.execute('SELECT DISTINCT c.candidate_key,c.file_sha,c.source_pages FROM candidates c JOIN candidate_aliases a USING(candidate_key) WHERE a.paper_id=? AND c.manual=1 AND c.question_number=?',(paper['paperId'],part['sourcePart'])))
 assert len(matches)<=1,('Ambiguous existing manual response; reconcile explicitly',part['sourcePart'])
 if matches:
  match=matches[0];assert match['file_sha']==paper['sourceSHA'] and json.loads(match['source_pages'])==[part['pdfPage']],('Existing response source differs',part['sourcePart'])
  candidate_ids[part['sourcePart']]=match['candidate_key']
 else:candidate_ids[part['sourcePart']]='manual:'+paper['paperId']+':'+part['sourcePart']
assert len(candidate_ids)==len(parts),'Duplicate response identifiers in source inventory'
def add(suffix,typ,entity,ident,payload,images=()):
 eventid='pilot-source-'+paper['paperId']+'-'+suffix+'-v'+a.revision
 if eventid in existing:return
 evidence=[base]+[{'path':str(Path(i).resolve()),'sha256':hashfile(i)} for i in dict.fromkeys(images)]
 events.append({'schemaVersion':1,'eventId':eventid,'type':typ,'entityType':entity,'entityId':ident,'recordedAt':timestamp,'reviewer':'source-review:explicit-manifest; ledger-import:corpus-ledger-import-pilot','evidence':evidence,'payload':payload})
add('source','source_integrity_reviewed','paper',paper['paperId'],{'completeness':'complete' if review['completeSource'] else 'incomplete','sourceRole':'mixed','notes':'Bounded visual review confirms physical source inventory. Question-level defects remain in each manual response unit.','issues':[]})
imagefolder=Path(parts[0]['evidenceImage']).parent
for page in review['visualPages']:
 image=imagefolder/f'page-{page:02}.png';assert image.is_file();onpage=[x['sourcePart'] for x in parts if x['pdfPage']==page]
 add('page-'+str(page),'page_visually_reviewed','page',paper['sourceSHA']+':'+str(page),{'observations':'Reviewed source page containing response units '+', '.join(onpage) if onpage else ('Reviewed intentionally blank physical page.' if page in paper.get('blankPages',[]) else 'Reviewed answer-key page against independently derived response solutions in the source manifest.'),'manifestReview':review,'scope':'Page inspection only; no OCR candidates promoted.'},[image])
patterns={}
for part in parts:patterns.setdefault(part['canonicalPatternId'],[]).append(part)
for structural,members in patterns.items():
 pid=namespace+structural
 if db.execute('SELECT 1 FROM patterns WHERE pattern_id=?',(pid,)).fetchone():continue
 add('pattern-'+structural,'pattern_registered','pattern',pid,{'title':structural.replace('-',' '),'description':members[0]['structure'],'structuralSignature':structural,'sourceReviewPatternGrouping':'Reviewed grouping within this one paper; uniqueness against other registered patterns remains unreviewed.','originalVariants':[x['patternParameter'] for x in members],'proposedVariants':[x['originalVariantProposal'] for x in members]})
for part in parts:
 cid=candidate_ids[part['sourcePart']];img=part['evidenceImage'];assert Path(img).is_file();is_incomplete=part['sourcePart'] in incomplete
 if not db.execute('SELECT 1 FROM candidates WHERE candidate_key=?',(cid,)).fetchone():add('create-'+part['sourcePart'],'candidate_created','candidate',cid,{'paperId':paper['paperId'],'sourceSha256':paper['sourceSHA'],'sourcePages':[part['pdfPage']],'questionNumber':part['sourcePart'],'reason':'Manual reconstruction of one source response task from the full-page visual review; raw OCR region retained separately.','workingTranscription':part['structure']+'; givens '+json.dumps(part['sourceGivens']),'unitType':'response-task'},[img])
 add('review-'+part['sourcePart'],'candidate_visually_reviewed','candidate',cid,{'sourceSha256':paper['sourceSHA'],'reviewedSourcePages':[part['pdfPage']],'completeness':'incomplete' if is_incomplete else 'complete','diagramDependency':part.get('sourceDiagramDependency','uncertain'),'sourceDiagramDependencyReason':part.get('sourceDiagramDependencyReason'),'observations':part['independentSourceSolution']['reasoning'],'sourceQuestion':part['sourceQuestion'],'sourcePart':part['sourcePart'],'sourceGivens':part['sourceGivens'],'independentSourceSolution':part['independentSourceSolution'],'sourceAnswerCheck':part['sourceAnswerCheck'],'sourceDefects':part['sourceDefects'],'interpretationNeeded':is_incomplete,'adaptationScope':part['adaptationScope'],'originalVariantProposal':part['originalVariantProposal']},[img])
 if not is_incomplete and part.get('sourceDiagramDependency','uncertain')!='uncertain':
  add('map-'+part['sourcePart'],'pattern_mapped','candidate',cid,{'patternId':namespace+part['canonicalPatternId'],'relation':'same-structure','structuralRationale':part['structure'],'sourceVariantRequirements':{'response':part['response'],'sourceGivens':part['sourceGivens'],'diagramNeeds':part['diagramNeeds'],'originalParameter':part['patternParameter'],'sourcePart':part['sourcePart']},'implementationCredit':'None: registry mapping only, code and independent test evidence are separate.'},[img])
if m.get('sourceInventoryReplacesHeuristicOCRSegmentation') or review.get('inventorySupersedesAllOcrCandidates'):
 manual=[candidate_ids[x['sourcePart']] for x in parts]
 raw=list(db.execute('SELECT DISTINCT a.candidate_key FROM candidate_aliases a JOIN candidates c USING(candidate_key) WHERE a.paper_id=? AND c.manual=0',(paper['paperId'],)))
 for row in raw:add('supersede-'+row['candidate_key'].split(':')[-1],'candidate_superseded','candidate',row['candidate_key'],{'paperId':paper['paperId'],'completeManualInventory':True,'reason':f"Explicit full-paper {review['numberedQuestions']}-question/{len(manual)}-task visual inventory supersedes every heuristic OCR fragment, including answer-key fragments. Raw regions are retained and are not marked individually visually reviewed.",'replacementCandidateIds':manual})
 add('inventory','paper_inventory_reviewed','paper',paper['paperId'],{'confirmedQuestionIds':manual,'excludedCandidateIds':[r['candidate_key'] for r in raw],'questionCount':len(manual),'numberedQuestionCount':review['numberedQuestions'],'mainAnswerParts':review['mainAnswerParts'],'storyEquationTasks':review['storyEquationTasks'],'segmentationChecked':True,'incompleteSourceFields':sorted(incomplete),'scope':'Complete source inventory; interpretation-needed source fields still prevent full coverage.'})
rejected=m.get('rejectedCandidate')
if rejected:
 other=db.execute('SELECT * FROM papers WHERE paper_id=?',(rejected['paperId'],)).fetchone();assert other and other['file_sha']==rejected['sourceSHA']
 add('rejected-source','source_integrity_reviewed','paper',rejected['paperId'],{'completeness':'incomplete','sourceRole':'mixed','notes':rejected['evidence'],'issues':[{'type':'missing-source-pages','printedPages':rejected['missingPrintedPages'],'unhandledQuestions':rejected['unhandledSourceQuestions']},{'type':'filename-mismatch','detail':rejected['filenameMismatch']}]},[rejected['evidenceImage']])
out=a.library/'coverage/imports'/('pilot-'+paper['paperId']+'-source.events.json');out.write_text(json.dumps(events,indent=2)+'\n');print(json.dumps({'events':len(events),'reviewedResponseUnits':len(parts),'incompleteSourceParts':sorted(incomplete),'structuralGroupsWithinPaper':len(patterns),'eventFile':str(out),'implementationVerificationImported':False}))
