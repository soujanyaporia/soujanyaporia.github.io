#!/usr/bin/env python3
"""Prepare *unverified* same-structure review leads; never writes to the ledger.
Raw OCR candidates are not source questions: review every match and source page.
"""
import argparse, hashlib, json, re, sqlite3
from pathlib import Path

# Captures are narrow and purpose-specific. All matched material remains a proposal;
# matching inside an OCR region does not assert a boundary or the absence of a diagram.
RULES = {
 'round-decimal-tenth': ('pilot:p5-mb25:decimal-round-tenth', re.compile(r'\bround\s+(?P<number>\d+\.\d{2,3})(?!\d)\s+to\s+the\s+nearest\s+tenth\b',re.I)),
 'tens-place-digit': ('pilot:p3-rg25:place-digit', re.compile(r'\b(?:which|what)\s+digit\s+is\s+in\s+the\s+tens\s+place\b',re.I)),
 'whole-hours-equation': ('pilot:p3-rg25:hours-to-minutes', re.compile(r'\b(?P<hours>\d+)\s*(?:hours?|h)\s*=\s*(?:[?_.-]+\s*)?(?:minutes?|min)\b',re.I)),
 'whole-hours-to-minutes': ('pilot:p3-rg25:hours-to-minutes', re.compile(r'\bhow\s+many\s+minutes\s+(?:are\s+there\s+)?in\s+(?P<hours>\d+)\s+hours?\s*\?',re.I)),
 'circle-radius-symbolic-circumference': ('pilot:p6-ch25:circle-circumference-symbolic', re.compile(r'\bradius\s+of\s+(?:a|the)\s+circle\s+is\s+(?P<radius>\d+)\s*(?P<unit>cm|m)\b(?:(?!\n\s*\d+[.)]).){0,200}?\bcircumference\b(?:(?!\n\s*\d+[.)]).){0,100}?(?:in\s+terms\s+of\s*(?:π|pi)|(?:π|pi)\s+form)',re.I|re.S)),
}
def matches(text):
 out=[]
 for key,(target,pat) in RULES.items():
  for m in pat.finditer(text):out.append({'rule':key,'proposedPatternId':target,'matchedText':m.group(),'characterSpan':[m.start(),m.end()],'capturedValues':m.groupdict()})
 return out

def run(dbpath,ledger,output):
 # Read-only database connections prevent accidental coverage mutation.
 db=sqlite3.connect(f'file:{Path(dbpath).resolve()}?mode=ro',uri=True);db.row_factory=sqlite3.Row
 cov=sqlite3.connect(f'file:{Path(ledger).resolve()}?mode=ro',uri=True)
 for target,_ in RULES.values():
  row=cov.execute('select independent_status,implementation_status from patterns where pattern_id=?',(target,)).fetchone()
  if not row or row[0]!='verified' or row[1]!='implemented':raise ValueError(f'Target not currently verified and implemented: {target}: {row}')
 meta=dict(db.execute('select key,value from meta'));counts={k:0 for k in RULES}; total=0
 query='''select r.*,p.level,p.title,p.source_pdf from regions r join papers p using(paper_id) order by r.bank_line'''
 with Path(output).open('x',encoding='utf8') as f:
  for r in db.execute(query):
   found=matches(r['raw_text'])
   if not found:continue
   for x in found:counts[x['rule']]+=1
   pages=[dict(x) for x in db.execute('select page_number,source_link,has_page_record from region_pages where bank_line=? order by ordinal',(r['bank_line'],))]
   blocks=[dict(x) for x in db.execute('select block_index,page_number,text,bbox_json,confidence,method,recognition_level from region_blocks where bank_line=? order by block_index',(r['bank_line'],))]
   deps=[dict(x) for x in db.execute('select page_number,source_link,dependency,cues_json,status from diagram_dependencies where bank_line=? order by page_number',(r['bank_line'],))]
   context=[dict(x) for x in db.execute('select page_number,text,coordinate_system,page_bounds_json,mean_confidence from pages where paper_id=? and page_number in (select page_number from region_pages where bank_line=?) order by page_number',(r['paper_id'],r['bank_line']))]
   row={'bankLine':r['bank_line'],'candidateId':r['candidate_id'],'paperId':r['paper_id'],'sourceSha256':r['source_sha256'],'sourcePdf':r['source_pdf'],'level':r['level'],'title':r['title'],'rawText':r['raw_text'],'rawTextSha256':r['raw_text_sha256'],'originalRawLineSha256':r['raw_line_sha256'],'sourcePageReferences':pages,'regionBlocks':blocks,'fullExtractedPageContext':context,'diagramDependencies':deps,'matches':found,'status':'unreviewed-proposal','sourceBoundaries':'heuristic-unverified','visualReviewRequired':True,'answerVerified':False,'sourceCovered':False,'reviewRequirements':['Confirm source PDF page and question boundaries.','Confirm all givens, units, conditions and diagram dependencies.','Independently solve and check the exact requested response.','Confirm generator supports the complete source variant, including number domain and answer format.']}
   f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n');total+=1
 return {'candidateRegions':total,'matchOccurrencesByRule':counts,'reviewedMappings':0,'sourceCoverageGranted':0,'stagingDatabase':str(Path(dbpath).resolve()),'stagingMeta':meta,'output':str(Path(output).resolve()),'queueSha256':hashlib.sha256(Path(output).read_bytes()).hexdigest(),'caveat':'Unverified text leads, not distinct source questions or coverage; merged regions and answer-key fragments may match.'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--staging',required=True);p.add_argument('--ledger',required=True);p.add_argument('--output',required=True);a=p.parse_args();print(json.dumps(run(a.staging,a.ledger,a.output),indent=2))
if __name__=='__main__':main()
