#!/usr/bin/env python3
"""Convert explicit prior page-review evidence to ledger events; never map candidates."""
import argparse,hashlib,json,sqlite3
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('report',type=Path);p.add_argument('--library',type=Path,default=Path(__file__).resolve().parents[1].parent/'Singapore Maths Paper Library');a=p.parse_args();r=json.loads(a.report.read_text());db=sqlite3.connect(a.library/'coverage/ledger.sqlite');db.row_factory=sqlite3.Row
hashfile=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
existing={json.loads(line)['eventId'] for line in (a.library/'coverage/events.jsonl').read_text().splitlines() if line.strip()};events=[]
for sample in r.get('visuallyReviewedSamples',[]):
 if sample.get('visuallyReviewed') is not True or 'prior-page-review-'+sample['id']+'-v1' in existing:continue
 paper=db.execute('SELECT * FROM papers WHERE paper_id=?',(sample['paperId'],)).fetchone();assert paper and Path(sample['sourcePDF']).resolve()==Path(paper['source_pdf']).resolve();assert 1<=sample['pdfPage']<=paper['page_count'];render=Path(sample['render']);assert render.is_file();assert sample.get('observed')
 events.append({'schemaVersion':1,'eventId':'prior-page-review-'+sample['id']+'-v1','type':'page_visually_reviewed','entityType':'page','entityId':paper['file_sha']+':'+str(sample['pdfPage']),'recordedAt':r.get('finishedAt',r['createdAt']),'reviewer':'prior-agent-review-evidence:corpus-pattern-review.json','evidence':[{'path':str(a.report.resolve()),'sha256':hashfile(a.report)},{'path':str(render.resolve()),'sha256':hashfile(render)}],'payload':{'observations':sample['observed'],'sourceGivens':sample.get('observedGivens'),'independentSourceChecks':sample.get('independentCheck'),'sourceIssues':sample.get('sourceIssues'),'importScope':'This records only the explicitly reviewed PDF page. OCR candidate boundaries remain unverified; no pattern mapping, implementation or coverage credit is inferred.'}})
out=a.library/'coverage/imports/prior-reviewed-pages.events.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(events,indent=2)+'\n');print(json.dumps({'explicitPageReviews':len(events),'eventFile':str(out)}))
