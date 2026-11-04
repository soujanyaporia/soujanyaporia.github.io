#!/usr/bin/env python3
"""Build source-numbered syllabus evidence index. Candidate mappings are not coverage claims."""
from pathlib import Path
import re,json,collections
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'audits'
s=json.loads((ROOT/'.generated/content-audit/snapshot.json').read_text())
mathcheck=json.loads((OUT/'content-math-verification-2026-11-04.json').read_text())
source=(ROOT/'.generated/moe-primary-oct-2025.txt').read_text();chunks=re.split(r'Updated: Oct 2025\s+Page \| (\d+)',source)
pagelevel={31:1,32:1,33:2,34:2,35:3,36:3,37:4,38:4,39:4,40:4,41:5,42:5,43:6,44:6,45:5,46:5,47:5,48:5,49:6,50:6}
records=[]
def topic(strand,section,page,point):
 if strand=='WHOLE NUMBERS':
  if 'Addition' in section:return ['AS']
  if 'Multiplication' in section:return ['MD']
  if 'Factors' in section:return ['FACT']
  if 'Four Operations' in section:
   if page==37:return ['MD']
   if page==45:return ['AS'] if point=='2.1' else ['AS','MD'] if point=='2.6' else ['MD']
   return ['WN']
  return ['WN']
 if strand=='MEASUREMENT':return ['TIME'] if 'Time' in section else ['LENGTH'] if page==32 else ['MEASURE']
 if 'AREA' in strand:return ['CIRCLE'] if 'Circle' in section else ['VOL'] if 'Volume' in section or 'volume' in section else ['AREA']
 if strand=='GEOMETRY':
  if 'Symmetry' in section:return ['SYM']
  if 'Perpendicular' in section:return ['LINES']
  if 'Angles' in section:return ['ANGLE']
  if 'Nets' in section:return ['SOLID']
  return ['SHAPE']
 return {'FRACTIONS':['FRAC'],'MONEY':['MONEY'],'DECIMALS':['DEC'],'PERCENTAGE':['PCT'],'RATE':['RATE'],'RATIO':['RATIO'],'ALGEBRA':['ALG'],'DATA ANALYSIS':['AVG'],'DATA REPRESENTATION AND INTERPRETATION':['GRAPH']}.get(strand,[])
for i in range(1,len(chunks),2):
 page=int(chunks[i]);
 if page not in pagelevel:continue
 strand=section='';current=None
 for line in chunks[i+1].splitlines():
  line=' '.join(line.split())
  if not line:continue
  m=re.match(r'SUB-STRAND:\s*(.*)',line)
  if m:strand=m[1].replace('  ',' ');current=None;continue
  m=re.match(r'^(\d+\.\d+)\s+(.*)',line)
  if m:
   current={'id':f"P{pagelevel[page]}.{'F' if page>=45 else 'S'}.{strand.replace(' ','_')}.{m[1]}",'level':pagelevel[page],'track':'foundation' if page>=45 else 'standard','sourcePage':page,'sourceSubstrand':strand,'sourceSection':section,'sourcePoint':m[1],'sourceText':m[2]};records.append(current);continue
  m=re.match(r'^\d+\.\s+(.*)',line)
  if m:section=m[1];current=None;continue
  if current and not re.match(r'PRIMARY |FOUNDATION|NUMBER AND ALGEBRA|MEASUREMENT AND GEOMETRY|STATISTICS|\d+ In 2025|Students in|syllabus will|will be',line):current['sourceText']+=' '+line

# These glyphs were lost by PDF text extraction and restored by visual review of
# the complete official PDF pages (44, 45 and 50), not inferred from app content.
for row in records:
 restored=None
 if row['sourcePage']==45 and row['sourceSubstrand']=='WHOLE NUMBERS' and row['sourcePoint']=='1.5':restored='use of ≈'
 if row['sourcePage']==44 and 'AREA' in row['sourceSubstrand'] and row['sourcePoint']=='2.5':restored='use of square-root and cube-root symbols (√, ∛)'
 if row['sourcePage'] in [44,50] and row['sourceSubstrand']=='DATA ANALYSIS' and row['sourcePoint']=='1.1':restored='average as total value ÷ number of data'
 if restored:
  row['rawExtractedSourceText']=row['sourceText'];row['sourceText']=restored;row['visualSourceCheck']='Complete official PDF page visually checked; dropped mathematical symbols restored.'

GAPS=[
 {'id':'number-name-writing','status':'fixed','pages':[31,33,35,37,41,45],'topics':['WN'],'points':['1.3','1.2','1.1'],'selector':'number names; read and write','lessonIds':['p1s-wn-03','p2s-wn-03','p3s-wn-02','p4s-wn-04','p5s-wn-01','p5f-wn-01'],'finding':'Number-name examples omitted low numbers and always used choice recognition for numeral-to-word questions.','resolution':'Full zero-to-cap range; alternating typed name, choice recognition and numeral writing. Standard hyphen/space/optional-and variants accepted.','verification':'numberNames.test.ts: independent English-number reader; all P1 values 0–100 reached across 3000 seeds; all number-name objectives checked.'},
 {'id':'brackets','status':'fixed','pages':[41,45],'topics':['WN','MD'],'points':['2.2','2.3','2.4','2.5'],'lessonIds':['p5s-wn-03','p5f-md-03'],'finding':'Order-of-operations objectives mentioned brackets but generated no bracketed expression to solve.','resolution':'Both (a+b)×c and a×(b+c), plus unbracketed a+b×c; expression table and targeted correction.','verification':'syllabusRegressions.test.ts: independent operator-stack evaluation across 1200 examples.'},
 {'id':'improper-products','status':'fixed','pages':[41,45],'topics':['FRAC'],'points':['2.3','2.4','4.4'],'lessonIds':['p5s-frac-06','p5f-frac-08'],'finding':'Both factors were always proper, omitting official proper×improper and (Standard) improper×improper.','resolution':'Required combinations cycle; Foundation excludes improper×improper. Actual improper values appear in a fraction table.','verification':'syllabusRegressions.test.ts: visible numerator/denominator cross-products across 4800 examples.'},
 {'id':'four-digit-dividend','status':'fixed','pages':[37],'topics':['MD'],'points':['3.2'],'lessonIds':['p4s-md-03'],'finding':'A four-digit quotient was multiplied by the divisor, allowing five-digit dividends.','resolution':'Bound dividend to 1000–9999; quotient bounds derived from divisor.','verification':'2000 seeds per P3/P4 division objective; visible dividend range and quotient×divisor independently checked.'},
 {'id':'related-division-facts','status':'fixed','pages':[33,45],'topics':['MD'],'points':['3.2','3.3','3.4','3.5','2.6'],'lessonIds':['p2s-md-03','p2s-md-04','p5f-md-04'],'finding':'Selector recognised “divide” but not “division”; related fact objectives produced multiplication only.','resolution':'Division-symbol objective produces division; related multiplication/division objectives alternate.','verification':'100 seeds per related-facts objective, both operations and visible arithmetic checked.'},
 {'id':'percentage-equality','status':'fixed','pages':[41,43,49],'topics':['PCT'],'points':['1.1','1.2'],'finding':'Some explanations equated decimal×100 to a percentage, e.g. 0.2×100=20%, confusing a number with a percent value.','resolution':'Use 0.2=20/100=20%; percentage-change explanations use the fraction/decimal ratio before the percentage.','verification':'Numeric worked-step audit with percent values interpreted as /100.'},
 {'id':'rounded-average','status':'fixed','pages':[44,50],'topics':['AVG'],'points':['1.1'],'lessonIds':['p6s-avg-01','p6s-avg-02','p6f-avg-01'],'finding':'Nonterminating averages such as 22÷3 were shown with exact =7.33.','resolution':'Use ≈ for rounded averages, = only when exact.','verification':'Numeric worked-step audit parses exact equalities only.'},
 {'id':'written-algorithms','status':'partial','pages':[35,37,45],'topics':['AS','MD'],'points':['2.6','2.1','3.4','3.1','3.2','2.2'],'finding':'Existing guided core decomposes numbers and uses counters/bars; it does not demonstrate a written column algorithm for every required grade.','needed':'P1/P2 addition/subtraction column extensions are now present as separately tested lessons. P3/P4 multiplication/division and P3/5F written algorithms still need dedicated instructional coverage.','evidenceFiles':['src/teach/build/families/numbers.ts','src/teach/tools/columnArithmetic.ts','src/teach/lessons/columnLessons.ts']},
 {'id':'compare-concrete-sets','status':'partial','pages':[31],'topics':['WN'],'points':['1.4'],'finding':'Dedicated comparison objective asks symbolic numeral comparisons; number-of-objects comparison across two or more pictured sets is not established by that lesson.','needed':'Explicit matching/comparison of two and three object sets, including equal sets.'},
 {'id':'fraction-ordering','status':'partial','pages':[33,35,45],'topics':['FRAC'],'points':['1.3','2.3'],'finding':'Comparison generates two fractions and a relation symbol. Ordering three or more fractions is not supplied by the dedicated comparison objective.','needed':'Order unit/like fractions in P2 and unlike fractions in P3/5F with denominators≤12, using equal wholes.'},
 {'id':'measuring-ordering','status':'partial','pages':[32,34],'topics':['LENGTH','MEASURE'],'points':['1.1','1.3'],'finding':'P1 length examples read a zero-aligned ruler; P2 measurement examples subtract two stated measurements. Actual measured scale-reading and ordering three measurements need broader evidence.','needed':'Non-zero starts, scales for appropriate instruments, and order multiple lengths/masses/volumes within the stated level.'},
 {'id':'shape-composition','status':'partial','pages':[32],'topics':['SHAPE'],'points':['1.2','1.3'],'finding':'P1 compose/decompose generated examples ask only how many quarter-circles form a half/whole circle.','needed':'Compose/decompose rectangles, squares and triangles as well as circular parts with actual manipulation.'},
 {'id':'drawing-construction','status':'partial','pages':[32,36,39,42,47],'topics':['SHAPE','LENGTH','LINES','ANGLE','SOLID','VOL'],'points':['1.4','2.2','1.3','4.2','2.3','1.2','3.2'],'finding':'Drawing objectives mostly assess recognition or give a paper-construction task to be checked by an adult. Recognition questions do not verify the pupil constructed the target.','needed':'Interactive ruler/protractor/grid construction with constraints checked, or clear practical-task coverage labelling. Existing free drawing pad alone is not mathematical assessment.'},
 {'id':'symmetric-grid-figure','status':'partial','pages':[39],'topics':['SYM'],'points':['3.3'],'finding':'Complete-symmetry objective asks the distance of a single reflected point from a vertical line.','needed':'Complete and check a whole figure on a square grid, with varied mirror-line positions.'},
 {'id':'composite-circles','status':'partial','pages':[44],'topics':['CIRCLE'],'points':['1.3'],'finding':'Dedicated composite-circle generator always uses a rectangle topped by a semicircle.','needed':'Original composite families incorporating square/triangle/quarter-circle cases, curved boundary vs internal join reasoning, and useful diagrams.'},
 {'id':'cubic-metre-experience','status':'partial','pages':[42,47],'topics':['VOL'],'points':['2.2'],'finding':'Generated volume examples use cm³ or unit cubes; objectives mention m³ but systematic m³ questions were not demonstrated in sampled lesson items.','needed':'Include m³ as a cubic unit at appropriate scale, explicitly excluding cm³↔m³ conversion.'},
]
# Explicit evidence inventories per objective, not coverage inferred from a title.
lesson_by_skill=collections.defaultdict(list)
for lesson in s['lessons']:
 for skill in lesson.get('skillIds',[]):lesson_by_skill[skill].append(lesson)
objective_evidence=[]
for skill in s['skills']:
 lessons=lesson_by_skill[skill['id']];items=[q for l in lessons for st in l['stages'] for q in st.get('items',[])];samples=[]
 for q in items:
  if q.get('kind') and not any(x['kind']==q['kind'] for x in samples):samples.append({'kind':q['kind'],'prompt':q['prompt'],'model':(q.get('tool') or {}).get('kind','none')})
 objective_evidence.append({'skillId':skill['id'],'title':skill['title'],'level':skill['level'],'track':skill['track'],'sourcePage':skill['sourcePage'],'topicCode':skill['subtopic'],'lessonIds':[l['id'] for l in lessons],'lessonStages':{l['id']:dict(collections.Counter(st['kind'] for st in l['stages'])) for l in lessons},'sampledItemCount':len(items),'itemKinds':dict(collections.Counter(q.get('kind','unlabelled') for q in items)),'models':dict(collections.Counter((q.get('tool') or {}).get('kind','none') for q in items)),'samplePrompts':samples,'practiceLinks':[{'lessonId':l['id'],'activityId':l.get('activityId'),'exactObjectiveMatch':any(a['id']==l.get('activityId') and skill['id'] in a['skillIds'] for a in s['activities'])} for l in lessons]})
stop=set('a an the and of to in as by with for up given number numbers using use whole or without at from two one'.split())
def tokens(text):return set(re.findall(r'[a-z]+',text.lower()))-stop
for row in records:
 codes=topic(row['sourceSubstrand'],row['sourceSection'],row['sourcePage'],row['sourcePoint']);row['topicCodes']=codes
 candidates=[e for e in objective_evidence if e['level']==row['level'] and e['track']==row['track'] and e['topicCode'] in codes]
 candidates.sort(key=lambda e:len(tokens(e['title'])&tokens(row['sourceText'])),reverse=True)
 row['candidateObjectiveIds']=[e['skillId'] for e in candidates[:4]]
 row['candidateLessonIds']=list(dict.fromkeys(l for e in candidates[:4] for l in e['lessonIds']))
 row['mappingMethod']='Same level/track/topic, then text-overlap ranking; candidate links require subpoint review.'
 row['findings']=[g['id'] for g in GAPS if row['sourcePage'] in g['pages'] and set(codes)&set(g['topics']) and row['sourcePoint'] in g['points']]
 row['coverageStatus']='partial-confirmed' if any(g['id'] in row['findings'] and g['status']=='partial' for g in GAPS) else 'evidence-indexed-not-signed-off'
 row['signOff']='Not a claim that all bullets, ranges, representations, construction skills or teaching quality are covered.'
result={'date':'2026-11-04','source':'https://www.moe.gov.sg/api/media/92bff26d-b2b4-4535-b868-b8415c744b91/2021-Primary-Mathematics-Syllabus-P1-to-P6-Updated-October-2025.pdf','sourcePrintedPages':[31,50],'sourcePointCount':len(records),'sourcePointCountsByTrack':dict(collections.Counter(f"P{r['level']} {r['track']}" for r in records)),'matrixMethod':'Every numbered content subpoint is indexed against actual lesson-stage and generated-item evidence. Candidate text matches are not signed-off coverage. Confirmed gaps are recorded separately. A full manual subpoint review is unfinished.','sourcePoints':records,'objectiveEvidence':objective_evidence,'findings':GAPS,'verificationScopeFile':'content-math-verification-2026-11-04.json'}
(OUT/'syllabus-coverage-matrix-2026-11-04.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['sourcePointCount','sourcePointCountsByTrack']},indent=2));print('Unmapped source topics:',[(r['sourcePage'],r['sourceSubstrand'],r['sourceSection']) for r in records if not r['topicCodes']]);print('Objective evidence rows',len(objective_evidence))

rows=['# Official numbered syllabus subpoint index','','Candidate lesson links are an evidence index, not a completed coverage sign-off. Full source bullet text, stage/item samples and findings are in the adjacent JSON.','','| Level/track | Page | Substrand / point | Requirement | Candidate lessons | Confirmed findings |','| --- | ---: | --- | --- | --- | --- |']
for r in records:
 rows.append('| '+' | '.join([f"P{r['level']} {r['track']}",str(r['sourcePage']),r['sourceSubstrand']+' '+r['sourcePoint'],r['sourceText'].replace('|','/'),', '.join(r['candidateLessonIds']),', '.join(r['findings']) or 'Not signed off'])+' |')
(OUT/'syllabus-subpoint-index-2026-11-04.md').write_text('\n'.join(rows)+'\n')
