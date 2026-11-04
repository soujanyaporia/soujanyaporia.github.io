#!/usr/bin/env python3
"""Local-only, evidence-gated source-paper → original-pattern coverage ledger.
No source text, PDF or ledger is copied into the app/public directory.
"""
from pathlib import Path
import argparse,collections,datetime,fcntl,hashlib,json,os,re,shutil,sqlite3,sys,tempfile
ROOT=Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY=ROOT.parent/'Singapore Maths Paper Library'
SCHEMA=1

def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def dump(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v):return hashlib.sha256(v.encode() if isinstance(v,str) else v).hexdigest()
def filehash(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def readjson(p,default=None):return json.loads(Path(p).read_text()) if Path(p).exists() else default
def rows(c,sql,args=()):return [dict(x) for x in c.execute(sql,args)]
def decode_fields(row,names):
 for name in names:
  if isinstance(row.get(name),str):row[name]=json.loads(row[name])
 return row
def require(condition,message):
 if not condition:raise ValueError(message)
def atomic_json(p,v):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n');tmp.replace(p)
def connect(p):
 c=sqlite3.connect(p);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c

DDL='''
CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE papers(paper_id TEXT PRIMARY KEY,title TEXT,level INTEGER,year INTEGER,page_url TEXT,source_url TEXT,source_pdf TEXT,file_sha TEXT NOT NULL,canonical_paper_id TEXT NOT NULL,downloaded INTEGER NOT NULL,hash_verified INTEGER NOT NULL,extracted INTEGER NOT NULL,page_count INTEGER NOT NULL,source_completeness TEXT NOT NULL DEFAULT 'unknown',source_role TEXT NOT NULL DEFAULT 'unknown',inventory_reviewed INTEGER NOT NULL DEFAULT 0,inventory_details TEXT NOT NULL DEFAULT '{}',source_issues TEXT NOT NULL DEFAULT '[]');
CREATE TABLE pages(page_key TEXT PRIMARY KEY,file_sha TEXT NOT NULL,page_number INTEGER NOT NULL,method TEXT,recognition TEXT,text_sha TEXT,char_count INTEGER,line_count INTEGER,source_path TEXT,visually_reviewed INTEGER NOT NULL DEFAULT 0,review_evidence TEXT NOT NULL DEFAULT '[]');
CREATE TABLE candidates(candidate_key TEXT PRIMARY KEY,file_sha TEXT NOT NULL,question_number TEXT,region_kind TEXT NOT NULL,source_pages TEXT NOT NULL,text_sha TEXT,text_preview TEXT,region_fingerprint TEXT,visual_status TEXT NOT NULL DEFAULT 'unreviewed',completeness TEXT NOT NULL DEFAULT 'unknown',diagram_dependency TEXT NOT NULL DEFAULT 'unknown',disposition TEXT NOT NULL DEFAULT 'unreviewed',source_flags TEXT NOT NULL DEFAULT '[]',review_evidence TEXT NOT NULL DEFAULT '[]',review_details TEXT NOT NULL DEFAULT '{}',manual INTEGER NOT NULL DEFAULT 0);
CREATE TABLE candidate_aliases(candidate_id TEXT PRIMARY KEY,candidate_key TEXT NOT NULL REFERENCES candidates(candidate_key),paper_id TEXT NOT NULL REFERENCES papers(paper_id),bank_line INTEGER,bank_byte_offset INTEGER,bank_byte_length INTEGER,source_page_links TEXT NOT NULL,source_pages TEXT NOT NULL);
CREATE INDEX candidate_alias_paper ON candidate_aliases(paper_id);
CREATE INDEX candidate_alias_key ON candidate_aliases(candidate_key);
CREATE TABLE patterns(pattern_id TEXT PRIMARY KEY,title TEXT,description TEXT,structural_signature TEXT,canonical_pattern_id TEXT NOT NULL,uniqueness_reviewed INTEGER NOT NULL DEFAULT 0,implementation_status TEXT NOT NULL DEFAULT 'unregistered',implementation_evidence TEXT NOT NULL DEFAULT '{}',independent_status TEXT NOT NULL DEFAULT 'unverified',independent_evidence TEXT NOT NULL DEFAULT '{}',metadata TEXT NOT NULL DEFAULT '{}');
CREATE TABLE mappings(candidate_key TEXT NOT NULL REFERENCES candidates(candidate_key),pattern_id TEXT NOT NULL REFERENCES patterns(pattern_id),relation TEXT NOT NULL,scope TEXT NOT NULL,evidence TEXT NOT NULL,independently_verified INTEGER NOT NULL DEFAULT 0,verification_evidence TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(candidate_key,pattern_id));
CREATE TABLE paper_inventory(paper_id TEXT NOT NULL REFERENCES papers(paper_id),candidate_key TEXT NOT NULL REFERENCES candidates(candidate_key),role TEXT NOT NULL,PRIMARY KEY(paper_id,candidate_key));
CREATE TABLE events(event_id TEXT PRIMARY KEY,event_type TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,recorded_at TEXT NOT NULL,reviewer TEXT NOT NULL,evidence TEXT NOT NULL,payload TEXT NOT NULL);
CREATE TABLE integrity_issues(kind TEXT,entity_id TEXT,detail TEXT);
'''

def initialise(c,library,rehash=False):
 hash_cache=readjson(library/'coverage/source-hash-cache.json',{});manifest=readjson(library/'manifest.json');digits=readjson(library/'digitization-manifest.json')['records'];papers=manifest['papers'];byfile={r['sourcePDF']:r for r in digits.values()};canon={};paperfiles=[];page_paths={}
 for p in sorted(papers,key=lambda x:x['id']):
  require(len(p.get('files',[]))==1,'Multiple source files require explicit file-alias support: '+p['id'])
  f=p['files'][0];h=f['sha256'];canon.setdefault(h,p['id']);paperfiles.append((p,f))
 for p,f in paperfiles:
  path=Path(f['localPath']);exists=path.is_file();header=False
  if exists:
   with path.open('rb') as handle:header=handle.read(5)==b'%PDF-'
  downloaded=exists and header and path.stat().st_size==f['bytes'];cached=hash_cache.get(str(path),{});signature={'bytes':path.stat().st_size,'mtimeNs':path.stat().st_mtime_ns,'expectedSha256':f['sha256']} if exists else {};hashok=False
  if downloaded and rehash:
   hashok=filehash(path)==f['sha256']
   if hashok:hash_cache[str(path)]={**signature,'verifiedAt':now(),'method':'full-sha256'}
  elif downloaded:hashok=all(cached.get(k)==v for k,v in signature.items()) and bool(cached.get('verifiedAt'))
  d=byfile.get(str(path),{});extracted=d.get('status','').startswith('extracted') and Path(d.get('pagesPath','nonexistent')).is_file()
  if rehash and downloaded and not hashok:c.execute('INSERT INTO integrity_issues VALUES (?,?,?)',('source-hash-mismatch',p['id'],str(path)))
  if not downloaded:c.execute('INSERT INTO integrity_issues VALUES (?,?,?)',('source-file-missing-or-invalid',p['id'],str(path)))
  c.execute('INSERT INTO papers(paper_id,title,level,year,page_url,source_url,source_pdf,file_sha,canonical_paper_id,downloaded,hash_verified,extracted,page_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',(p['id'],p['title'],p['level'],p['year'],p['pageURL'],f['sourceURL'],str(path),f['sha256'],canon[f['sha256']],int(downloaded),int(hashok),int(extracted),d.get('pageCount',0)))
  if extracted:page_paths.setdefault(f['sha256'],Path(d['pagesPath']))
 for h,path in page_paths.items():
  observed=[]
  with path.open() as f:
   for line in f:
    p=json.loads(line);n=p['pageNumber'];observed.append(n)
    c.execute('INSERT INTO pages(page_key,file_sha,page_number,method,recognition,text_sha,char_count,line_count,source_path) VALUES (?,?,?,?,?,?,?,?,?)',(h+':'+str(n),h,n,p.get('method'),p.get('recognitionLevel'),sha(p.get('text','')),len(p.get('text','')),len(p.get('lines',[])),str(path)))
    if p.get('error'):c.execute('INSERT INTO integrity_issues VALUES (?,?,?)',('page-extraction-error',h+':'+str(n),str(p['error'])))
  expected=c.execute('SELECT MAX(page_count) FROM papers WHERE file_sha=?',(h,)).fetchone()[0]
  if observed!=list(range(1,expected+1)):c.execute('INSERT INTO integrity_issues VALUES (?,?,?)',('page-sequence-mismatch',h,dump({'expected':expected,'observed':observed})))
 bank=library/'question-candidates.jsonl';count=0
 with bank.open('rb') as f:
  while True:
   offset=f.tell();line=f.readline()
   if not line:break
   count+=1;q=json.loads(line);src=q['source'];p=c.execute('SELECT * FROM papers WHERE paper_id=?',(src['paperId'],)).fetchone();require(p is not None,'Unknown candidate paper '+src['paperId']);require(src['sha256']==p['file_sha'],'Candidate source hash mismatch '+q['id'])
   text=q.get('rawText','');pages=q.get('pageNumbers',[]);require(pages and all(isinstance(x,int) and 1<=x<=p['page_count'] for x in pages),'Candidate page outside source '+q['id'])
   fingerprint=sha(dump({'pages':pages,'number':q.get('questionNumber'),'kind':q.get('kind'),'text':text,'blocks':[(b.get('pageNumber'),b.get('bbox'),b.get('text')) for b in q.get('textBlocks',[])]}));key=src['sha256']+':'+fingerprint[:24]
   flags=[]
   if q.get('kind')!='question-candidate':flags.append('answer-region-candidate-not-confirmed-question')
   if re.search(r'\b(diagram|figure|shaded|shown|picture|graph|clock|table|below|above)\b',text,re.I):flags.append('possible-diagram-dependency-needs-visual-review')
   if len(text.strip())<35:flags.append('short-region-needs-completeness-review')
   if len(pages)>1:flags.append('multi-page-region-needs-boundary-review')
   if any(b.get('recognitionLevel')=='fast' for b in q.get('textBlocks',[])):flags.append('contains-fast-ocr')
   if not q.get('textBlocks'):flags.append('missing-text-block-provenance')
   c.execute('INSERT OR IGNORE INTO candidates(candidate_key,file_sha,question_number,region_kind,source_pages,text_sha,text_preview,region_fingerprint,source_flags) VALUES (?,?,?,?,?,?,?,?,?)',(key,src['sha256'],q.get('questionNumber'),q.get('kind','unknown'),dump(pages),sha(text),text[:240],fingerprint,dump(flags)))
   c.execute('INSERT INTO candidate_aliases VALUES (?,?,?,?,?,?,?,?)',(q['id'],key,src['paperId'],count,offset,len(line),dump(q.get('sourcePageLinks',[])),dump(pages)))
 c.execute('INSERT INTO meta VALUES (?,?)',('candidateBankRows',str(count)))
 c.execute('INSERT INTO meta VALUES (?,?)',('sourceManifestSha256',filehash(library/'manifest.json')))
 c.execute('INSERT INTO meta VALUES (?,?)',('candidateBankSha256',filehash(bank)))
 atomic_json(library/'coverage/source-hash-cache.json',hash_cache)
 # Verify the pre-existing search index separately; never interpret an FTS hit as reviewed content.
 index=sqlite3.connect(f'file:{library / "search.sqlite"}?mode=ro',uri=True)
 index_counts={t:index.execute('SELECT COUNT(*) FROM '+t).fetchone()[0] for t in ['page_text','candidate_text']};index.close()
 c.execute('INSERT INTO meta VALUES (?,?)',('searchIndexCounts',dump(index_counts)))
 if index_counts['candidate_text']!=count:c.execute('INSERT INTO integrity_issues VALUES (?,?,?)',('search-candidate-count-mismatch','search.sqlite',dump(index_counts)))
 return count

def evidence_ok(evidence):
 require(isinstance(evidence,list) and evidence,'At least one evidence artifact is required')
 for item in evidence:
  require(isinstance(item,dict) and item.get('path') and item.get('sha256'),'Evidence needs path and sha256')
  p=Path(item['path']);require(p.is_file(),'Evidence file does not exist: '+str(p));require(filehash(p)==item['sha256'],'Evidence hash mismatch: '+str(p))

def candidate(c,ident):
 r=c.execute('SELECT * FROM candidates WHERE candidate_key=?',(ident,)).fetchone()
 if r is None:r=c.execute('SELECT candidates.* FROM candidates JOIN candidate_aliases USING(candidate_key) WHERE candidate_id=?',(ident,)).fetchone()
 require(r is not None,'Unknown candidate: '+ident);return r

def implementation_current(payload):
 tracked=[{'path':payload['codePath'],'sha256':payload['codeSha256']}]+payload.get('trackedFiles',[])
 return all(Path(f['path']).is_file() and filehash(f['path'])==f['sha256'] for f in tracked)

def apply_event(c,e,live=False):
 require(e.get('schemaVersion')==SCHEMA,'Unsupported event schema')
 for key in ['eventId','type','entityType','entityId','reviewer','recordedAt','payload','evidence']:require(key in e,'Missing event field '+key)
 require(isinstance(e['reviewer'],str) and e['reviewer'].strip(),'Reviewer required');datetime.datetime.fromisoformat(e['recordedAt'].replace('Z','+00:00'));evidence_ok(e['evidence']);typ=e['type'];ident=e['entityId'];p=e['payload'];ev=dump(e['evidence'])
 if c.execute('SELECT 1 FROM events WHERE event_id=?',(e['eventId'],)).fetchone():raise ValueError('Duplicate event ID '+e['eventId'])
 if typ=='pattern_registered':
  require(e['entityType']=='pattern','Pattern entity required');require(p.get('description') and p.get('title'),'Title and structural description required')
  c.execute('INSERT INTO patterns(pattern_id,title,description,structural_signature,canonical_pattern_id,metadata) VALUES (?,?,?,?,?,?)',(ident,p['title'],p['description'],p.get('structuralSignature'),ident,dump(p)))
 elif typ=='pattern_distinct_reviewed':
  require(c.execute('SELECT 1 FROM patterns WHERE pattern_id=?',(ident,)).fetchone(),'Unknown pattern');require(p.get('structuralSignature') and p.get('distinctnessRationale'),'Reviewed structural signature and distinctness rationale required');require(isinstance(p.get('comparedPatternIds'),list),'Comparison set must be explicit')
  for other in p['comparedPatternIds']:require(c.execute('SELECT 1 FROM patterns WHERE pattern_id=?',(other,)).fetchone(),'Unknown compared pattern')
  c.execute('UPDATE patterns SET structural_signature=?,uniqueness_reviewed=1 WHERE pattern_id=?',(p['structuralSignature'],ident))
 elif typ=='pattern_alias_reviewed':
  target=c.execute('SELECT * FROM patterns WHERE pattern_id=?',(p.get('canonicalPatternId'),)).fetchone();source=c.execute('SELECT * FROM patterns WHERE pattern_id=?',(ident,)).fetchone();require(target and source,'Both patterns must be registered');require(target['canonical_pattern_id']==target['pattern_id'],'Alias target must be canonical');require(p.get('structuralEquivalence'),'Explain structural equivalence; shared keywords do not qualify')
  c.execute('UPDATE patterns SET canonical_pattern_id=?,uniqueness_reviewed=1 WHERE pattern_id=?',(target['pattern_id'],ident))
 elif typ=='source_integrity_reviewed':
  require(e['entityType']=='paper','Paper entity required');require(p.get('completeness') in ['complete','incomplete'],'Source completeness must be complete or incomplete');require(c.execute('SELECT 1 FROM papers WHERE paper_id=?',(ident,)).fetchone(),'Unknown paper');require(p.get('notes'),'Source review notes required')
  require(p.get('sourceRole','unknown') in ['unknown','exam','answer-only','mixed'],'Invalid source role');c.execute('UPDATE papers SET source_completeness=?,source_role=?,source_issues=?,inventory_reviewed=0 WHERE paper_id=?',(p['completeness'],p.get('sourceRole','unknown'),dump(p.get('issues',[])),ident))
 elif typ=='page_visually_reviewed':
  require(e['entityType']=='page','Page entity required');require(c.execute('SELECT 1 FROM pages WHERE page_key=?',(ident,)).fetchone(),'Unknown page');require(p.get('observations'),'Page observations required');c.execute('UPDATE pages SET visually_reviewed=1,review_evidence=? WHERE page_key=?',(ev,ident))
 elif typ=='candidate_created':
  require(e['entityType']=='candidate','Candidate entity required');paper=c.execute('SELECT * FROM papers WHERE paper_id=?',(p.get('paperId'),)).fetchone();require(paper,'Unknown source paper');require(p.get('sourceSha256')==paper['file_sha'],'Manual candidate source hash mismatch');require(p.get('sourcePages') and all(1<=n<=paper['page_count'] for n in p['sourcePages']),'Invalid source pages');require(p.get('reason'),'Explain segmentation correction')
  c.execute('INSERT INTO candidates(candidate_key,file_sha,question_number,region_kind,source_pages,text_sha,text_preview,region_fingerprint,source_flags,manual) VALUES (?,?,?,?,?,?,?,?,?,1)',(ident,paper['file_sha'],p.get('questionNumber'),'manual-question-candidate',dump(p['sourcePages']),sha(p.get('workingTranscription','')),p.get('workingTranscription','')[:240],sha(dump(p)),dump(['manual-segmentation-correction'])))
  c.execute('INSERT INTO candidate_aliases VALUES (?,?,?,?,?,?,?,?)',(ident,ident,p['paperId'],None,None,None,dump([paper['source_pdf']+'#page='+str(n) for n in p['sourcePages']]),dump(p['sourcePages'])))
 elif typ=='candidate_visually_reviewed':
  r=candidate(c,ident);require(p.get('completeness') in ['complete','incomplete','not-question'],'Explicit candidate completeness required');require(p.get('diagramDependency') in ['required','not-required','uncertain'],'Explicit diagram dependency required');require(p.get('observations'),'Source observations required');require(p.get('sourceSha256')==r['file_sha'],'Review source hash mismatch');require(set(p.get('reviewedSourcePages',[]))==set(json.loads(r['source_pages'])),'Review must cover every source page of this candidate')
  disposition=p.get('disposition','question' if p['completeness']=='complete' else p['completeness']);c.execute('UPDATE candidates SET visual_status=?,completeness=?,diagram_dependency=?,disposition=?,review_evidence=?,review_details=? WHERE candidate_key=?',('reviewed',p['completeness'],p['diagramDependency'],disposition,ev,dump(p),r['candidate_key']));c.execute("UPDATE mappings SET independently_verified=0,verification_evidence='{}' WHERE candidate_key=?",(r['candidate_key'],));c.execute('UPDATE papers SET inventory_reviewed=0 WHERE paper_id IN (SELECT paper_id FROM candidate_aliases WHERE candidate_key=?)',(r['candidate_key'],))
 elif typ=='candidate_superseded':
  r=candidate(c,ident);require(not r['manual'],'Manual response units cannot be silently superseded');paper=c.execute('SELECT * FROM papers WHERE paper_id=?',(p.get('paperId'),)).fetchone();require(paper and paper['file_sha']==r['file_sha'],'Supersession must reference the same source paper');require(p.get('completeManualInventory') is True and p.get('reason'),'Explicit complete manual inventory and rationale required');require(c.execute('SELECT COUNT(*) FROM pages WHERE file_sha=? AND visually_reviewed=0',(r['file_sha'],)).fetchone()[0]==0,'All source pages need visual review before replacing OCR segmentation');require(p.get('replacementCandidateIds'),'Retain links to the complete replacement inventory')
  for key in p['replacementCandidateIds']:
   replacement=candidate(c,key);require(replacement['manual'] and replacement['file_sha']==r['file_sha'] and replacement['visual_status']=='reviewed','Every replacement must be a reviewed manual unit from the same source')
  c.execute("UPDATE candidates SET disposition='superseded-by-manual-inventory',review_details=?,review_evidence=? WHERE candidate_key=?",(dump(p),ev,r['candidate_key']))
  c.execute('UPDATE mappings SET independently_verified=0 WHERE candidate_key=?',(r['candidate_key'],))
 elif typ=='pattern_mapped':
  r=candidate(c,ident);require(r['visual_status']=='reviewed' and r['completeness']=='complete','Complete visual candidate review required before mapping');require(r['diagram_dependency']!='uncertain','Resolve diagram dependency before mapping');require(c.execute('SELECT 1 FROM patterns WHERE pattern_id=?',(p.get('patternId'),)).fetchone(),'Unknown pattern');require(p.get('relation') in ['same-structure','partial-adaptation'],'Mapping relation required');require(p.get('structuralRationale') and p.get('sourceVariantRequirements'),'Explain mathematical structure and source variant requirements')
  c.execute('INSERT OR REPLACE INTO mappings(candidate_key,pattern_id,relation,scope,evidence) VALUES (?,?,?,?,?)',(r['candidate_key'],p['patternId'],p['relation'],dump(p),ev))
 elif typ=='pattern_implemented':
  require(c.execute('SELECT 1 FROM patterns WHERE pattern_id=?',(ident,)).fetchone(),'Unknown pattern');require(p.get('originalContent') is True and p.get('parameterisedNumbers') is True,'Implementation must use original content and parameterised numbers');require(p.get('generatorId') and p.get('illustrationId') and p.get('parameterConstraints'),'Generator, original illustration and parameter constraints required');require(p.get('codePath') and p.get('codeSha256'),'Code path and hash required');require(not live or implementation_current(p),'Implementation source/dependency hash mismatch')
  c.execute("UPDATE patterns SET implementation_status='implemented',implementation_evidence=?,independent_status='unverified',independent_evidence='{}' WHERE pattern_id=?",(dump(p),ident))
  c.execute("UPDATE mappings SET independently_verified=0,verification_evidence='{}' WHERE pattern_id=?",(ident,))
 elif typ=='pattern_independently_verified':
  r=c.execute('SELECT * FROM patterns WHERE pattern_id=?',(ident,)).fetchone();require(r and r['implementation_status']=='implemented','Implemented pattern required');impl=json.loads(r['implementation_evidence']);require(p.get('codeSha256')==impl['codeSha256'],'Verification must match implementation version');require(not live or implementation_current(impl),'Implementation changed since evidence');require(not impl.get('implementationFingerprint') or p.get('implementationFingerprint')==impl['implementationFingerprint'],'Verification fingerprint must match all implementation files');require(p.get('method')=='independent-visible-givens-solver','Generator proof self-consistency is not independent verification');require(isinstance(p.get('sampleCount'),int) and p['sampleCount']>0 and p.get('solverPath') and p.get('solverSha256') and p.get('testedParameterScope'),'Solver path/hash, positive sample count and parameter scope required');require(not live or filehash(p['solverPath'])==p['solverSha256'],'Independent solver hash mismatch')
  c.execute("UPDATE patterns SET independent_status='verified',independent_evidence=? WHERE pattern_id=?",(dump(p),ident))
 elif typ=='mapping_independently_verified':
  r=candidate(c,ident);m=c.execute('SELECT * FROM mappings WHERE candidate_key=? AND pattern_id=?',(r['candidate_key'],p.get('patternId'))).fetchone();pat=c.execute('SELECT * FROM patterns WHERE pattern_id=?',(p.get('patternId'),)).fetchone();require(m and m['relation']=='same-structure' and pat and pat['independent_status']=='verified','A same-structure mapping and independently verified implementation are required');require(p.get('allSourceVariantRequirementsCovered') is True and p.get('scopeExplanation'),'Verify that the tested template actually covers this source variant');require(p.get('sourceSha256')==r['file_sha'],'Source hash mismatch')
  c.execute('UPDATE mappings SET independently_verified=1,verification_evidence=? WHERE candidate_key=? AND pattern_id=?',(dump(p),r['candidate_key'],p['patternId']))
 elif typ=='paper_inventory_reviewed':
  paper=c.execute('SELECT * FROM papers WHERE paper_id=?',(ident,)).fetchone();require(paper and paper['source_completeness']=='complete','Source paper must be reviewed as complete');pages=rows(c,'SELECT * FROM pages WHERE file_sha=?',(paper['file_sha'],));require(len(pages)==paper['page_count'] and all(x['visually_reviewed'] for x in pages),'Every physical PDF page requires visual review');confirmed=[candidate(c,x)['candidate_key'] for x in p.get('confirmedQuestionIds',[])];excluded=[candidate(c,x)['candidate_key'] for x in p.get('excludedCandidateIds',[])];require(len(set(confirmed))==len(confirmed) and not set(confirmed)&set(excluded),'Inventory has duplicate/overlapping dispositions');existing={x['candidate_key'] for x in rows(c,'SELECT DISTINCT candidate_key FROM candidate_aliases WHERE paper_id=?',(ident,))};require(set(confirmed)|set(excluded)==existing,'Every extracted/manual candidate must be accounted for');require(p.get('questionCount')==len(confirmed) and p.get('segmentationChecked') is True,'Explicit reconciled question count and segmentation check required')
  for key in confirmed:require(candidate(c,key)['visual_status']=='reviewed' and candidate(c,key)['completeness'] in ['complete','incomplete'],'Every inventory unit requires explicit complete/incomplete source review')
  for key in excluded:
   candidate_row=candidate(c,key);require(candidate_row['disposition']=='superseded-by-manual-inventory' or candidate_row['visual_status']=='reviewed' and candidate_row['disposition']!='question','Excluded candidate requires explicit reviewed disposition or reconciled manual-inventory supersession')
  c.execute('DELETE FROM paper_inventory WHERE paper_id=?',(ident,));c.executemany('INSERT INTO paper_inventory VALUES (?,?,?)',[(ident,k,'question') for k in confirmed]+[(ident,k,'excluded') for k in excluded]);c.execute('UPDATE papers SET inventory_reviewed=1,inventory_details=? WHERE paper_id=?',(dump(p),ident))
 else:raise ValueError('Unsupported event type: '+typ)
 c.execute('INSERT INTO events VALUES (?,?,?,?,?,?,?,?)',(e['eventId'],typ,e['entityType'],ident,e['recordedAt'],e['reviewer'],ev,dump(p)))

CANDIDATE_VIEW='''SELECT c.*,COUNT(DISTINCT a.candidate_id) alias_count,COUNT(DISTINCT m.pattern_id) mapping_count,MAX(COALESCE(p.implementation_status='implemented' AND m.relation='same-structure',0)) implemented,MAX(COALESCE(m.independently_verified,0)) independently_verified FROM candidates c LEFT JOIN candidate_aliases a USING(candidate_key) LEFT JOIN mappings m USING(candidate_key) LEFT JOIN patterns p USING(pattern_id) GROUP BY c.candidate_key'''

def invalidate_stale(c):
 for row in rows(c,"SELECT * FROM patterns WHERE implementation_status='implemented'"):
  impl=json.loads(row['implementation_evidence']);path=Path(impl['codePath'])
  if not implementation_current(impl):
   c.execute("UPDATE patterns SET implementation_status='stale',independent_status='stale' WHERE pattern_id=?",(row['pattern_id'],));c.execute('UPDATE mappings SET independently_verified=0 WHERE pattern_id=?',(row['pattern_id'],))

def export(c,out):
 invalidate_stale(c)
 summary={'schemaVersion':SCHEMA,'updatedAt':now(),'localOnly':True,'counts':{},'levels':{},'coverageMeaning':'Source completeness, visual review, pattern mapping, implementation and independent verification are separate. Keyword/OCR matches never establish coverage.'}
 summary['inputHashes']={r['key']:r['value'] for r in rows(c,"SELECT * FROM meta WHERE key LIKE '%Sha256'")};q=summary['counts'];q.update(papers=c.execute('SELECT COUNT(*) FROM papers').fetchone()[0],canonicalPdfFiles=c.execute('SELECT COUNT(DISTINCT file_sha) FROM papers').fetchone()[0],downloaded=c.execute('SELECT SUM(downloaded) FROM papers').fetchone()[0],hashVerified=c.execute('SELECT SUM(hash_verified) FROM papers').fetchone()[0],extracted=c.execute('SELECT SUM(extracted) FROM papers').fetchone()[0],pages=c.execute('SELECT COUNT(*) FROM pages').fetchone()[0],candidateAliases=c.execute('SELECT COUNT(*) FROM candidate_aliases').fetchone()[0],canonicalCandidateRegions=c.execute('SELECT COUNT(*) FROM candidates').fetchone()[0],sourceIncomplete=c.execute("SELECT COUNT(*) FROM papers WHERE source_completeness='incomplete'").fetchone()[0],pageVisualReviews=c.execute('SELECT SUM(visually_reviewed) FROM pages').fetchone()[0] or 0,registeredPatterns=c.execute('SELECT COUNT(*) FROM patterns').fetchone()[0],reviewedUniquePatterns=c.execute('SELECT COUNT(DISTINCT canonical_pattern_id) FROM patterns WHERE uniqueness_reviewed=1').fetchone()[0],integrityIssues=c.execute('SELECT COUNT(*) FROM integrity_issues').fetchone()[0]);q['duplicatePdfAliases']=q['papers']-q['canonicalPdfFiles'];q['extractedCandidateAliases']=int(c.execute("SELECT value FROM meta WHERE key='candidateBankRows'").fetchone()[0]);q['manualResponseUnits']=c.execute('SELECT COUNT(*) FROM candidates WHERE manual=1').fetchone()[0];q['supersededOcrRegions']=c.execute("SELECT COUNT(*) FROM candidates WHERE disposition='superseded-by-manual-inventory'").fetchone()[0];q['activeUnreviewedRegions']=c.execute("SELECT COUNT(*) FROM candidates WHERE visual_status='unreviewed' AND disposition!='superseded-by-manual-inventory'").fetchone()[0];q['sourceIncompleteUnits']=c.execute("SELECT COUNT(*) FROM candidates WHERE completeness='incomplete'").fetchone()[0]
 candidateCounts=collections.Counter();flags=collections.Counter();kinds=collections.Counter()
 with (out/'candidate-coverage.jsonl.tmp').open('w') as f:
  for row in c.execute(CANDIDATE_VIEW):
   r=dict(row);candidateCounts['visuallyReviewed']+=r['visual_status']=='reviewed';candidateCounts['completeQuestions']+=r['completeness']=='complete';candidateCounts['patternMapped']+=r['mapping_count']>0;candidateCounts['implementedThroughMapping']+=r['implemented'];candidateCounts['independentlyVerifiedThroughMapping']+=r['independently_verified'];flags.update(json.loads(r['source_flags']));kinds[r['region_kind']]+=1
   decode_fields(r,['source_pages','source_flags','review_evidence','review_details']);r['aliases']=[decode_fields(x,['source_pages','source_page_links']) for x in rows(c,'SELECT * FROM candidate_aliases WHERE candidate_key=?',(r['candidate_key'],))];r['mappings']=[decode_fields(x,['scope','evidence','verification_evidence']) for x in rows(c,'SELECT * FROM mappings WHERE candidate_key=?',(r['candidate_key'],))];f.write(dump(r)+'\n')
 (out/'candidate-coverage.jsonl.tmp').replace(out/'candidate-coverage.jsonl');q.update(candidateCounts);summary['candidateKinds']=dict(kinds);summary['triageFlagsNotCoverage']=dict(flags)
 paper_rows=[]
 for p in rows(c,'SELECT * FROM papers ORDER BY level,year DESC,paper_id'):
  counts=c.execute('''SELECT COUNT(DISTINCT a.candidate_key),COUNT(DISTINCT CASE WHEN c.visual_status='reviewed' THEN a.candidate_key END),COUNT(DISTINCT CASE WHEN m.pattern_id IS NOT NULL THEN a.candidate_key END),COUNT(DISTINCT CASE WHEN t.implementation_status='implemented' AND m.relation='same-structure' THEN a.candidate_key END),COUNT(DISTINCT CASE WHEN m.independently_verified=1 THEN a.candidate_key END) FROM candidate_aliases a JOIN candidates c USING(candidate_key) LEFT JOIN mappings m USING(candidate_key) LEFT JOIN patterns t USING(pattern_id) WHERE a.paper_id=?''',(p['paper_id'],)).fetchone();p['candidateCounts']=dict(zip(['regions','visuallyReviewed','patternMapped','implemented','independentlyVerified'],counts));expected=c.execute("SELECT COUNT(*) FROM paper_inventory WHERE paper_id=? AND role='question'",(p['paper_id'],)).fetchone()[0];p['confirmedInventoryUnitCount']=expected if p['inventory_reviewed'] else None;p['confirmedNumberedQuestionCount']=json.loads(p['inventory_details']).get('numberedQuestionCount') if p['inventory_reviewed'] else None;verified_inventory=c.execute("SELECT COUNT(DISTINCT i.candidate_key) FROM paper_inventory i JOIN mappings m USING(candidate_key) WHERE i.paper_id=? AND i.role='question' AND m.independently_verified=1",(p['paper_id'],)).fetchone()[0];p['verifiedInventoryUnits']=verified_inventory;p['allSourceQuestionsIndependentlyCovered']=bool(p['inventory_reviewed'] and expected and expected==verified_inventory);paper_rows.append(p)
  level=summary['levels'].setdefault(str(p['level']),collections.Counter());level.update(papers=1,candidateRegions=counts[0],visuallyReviewed=counts[1],mapped=counts[2],independentlyVerified=counts[4])
 q['fullyInventoriedPapers']=sum(p['inventory_reviewed'] for p in paper_rows);q['fullyCoveredPapers']=sum(p['allSourceQuestionsIndependentlyCovered'] for p in paper_rows)
 q['uniquenessReviewComplete']=bool(q['registeredPatterns']) and c.execute('SELECT COUNT(*) FROM patterns WHERE uniqueness_reviewed=0').fetchone()[0]==0
 queues={level:[p for p in paper_rows if p['level']==level and not p['allSourceQuestionsIndependentlyCovered']] for level in range(1,7)}
 with (out/'review-queue.jsonl.tmp').open('w') as f:
  order=0
  while any(queues.values()):
   for level in range(1,7):
    if not queues[level]:continue
    p=queues[level].pop(0);order+=1;f.write(dump({'order':order,'paperId':p['paper_id'],'level':level,'year':p['year'],'title':p['title'],'sourceSha256':p['file_sha'],'sourcePDF':p['source_pdf'],'physicalPages':p['page_count'],'candidateCounts':p['candidateCounts'],'sourceCompleteness':p['source_completeness'],'state':'source-incomplete-review-visible-questions-only' if p['source_completeness']=='incomplete' else 'needs-reconciled-question-inventory' if not p['inventory_reviewed'] else 'needs-pattern-coverage','scope':'Work alternates P1–P6; metadata is not a coverage claim.'})+'\n')
 (out/'review-queue.jsonl.tmp').replace(out/'review-queue.jsonl')
 with (out/'paper-coverage.jsonl.tmp').open('w') as f:
  for p in paper_rows:f.write(dump(decode_fields(p,['source_issues','inventory_details']))+'\n')
 (out/'paper-coverage.jsonl.tmp').replace(out/'paper-coverage.jsonl');atomic_json(out/'patterns.json',[decode_fields(x,['implementation_evidence','independent_evidence','metadata']) for x in rows(c,'SELECT * FROM patterns ORDER BY pattern_id')]);atomic_json(out/'summary.json',summary);atomic_json(out/'integrity-issues.json',rows(c,'SELECT * FROM integrity_issues'))
 c.commit();return summary

def build(library,rehash=False):
 out=library/'coverage';out.mkdir(exist_ok=True);db=out/'ledger.sqlite.tmp';db.unlink(missing_ok=True);c=connect(db);c.executescript(DDL);initialise(c,library,rehash)
 events=out/'events.jsonl';events.touch(exist_ok=True)
 with events.open() as f:
  for number,line in enumerate(f,1):
   if line.strip():
    try:apply_event(c,json.loads(line))
    except Exception as ex:raise ValueError(f'Event line {number}: {ex}') from ex
 c.execute('INSERT INTO meta VALUES (?,?)',('schemaVersion',str(SCHEMA)));c.execute('INSERT INTO meta VALUES (?,?)',('builtAt',now()));c.commit();summary=export(c,out);c.close();db.replace(out/'ledger.sqlite');atomic_json(out/'event-schema.json',{'schemaVersion':SCHEMA,'required':['schemaVersion','eventId','type','entityType','entityId','recordedAt','reviewer','evidence','payload'],'evidence':[{'path':'absolute local artifact path','sha256':'content hash'}],'eventTypes':['pattern_registered','pattern_distinct_reviewed','pattern_alias_reviewed','source_integrity_reviewed','page_visually_reviewed','candidate_created','candidate_visually_reviewed','candidate_superseded','pattern_mapped','pattern_implemented','pattern_independently_verified','mapping_independently_verified','paper_inventory_reviewed'],'policy':'No automatic promotion from extracted OCR, a keyword match or page review. Review every candidate and reconcile the whole-paper inventory before claiming paper coverage.'});return summary

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--library',type=Path,default=DEFAULT_LIBRARY);sub=parser.add_subparsers(dest='command',required=True);b=sub.add_parser('build');b.add_argument('--rehash',action='store_true');sub.add_parser('status');p=sub.add_parser('pending');p.add_argument('--level',type=int);p.add_argument('--paper');p.add_argument('--limit',type=int,default=20);e=sub.add_parser('record');e.add_argument('event_file',type=Path);sub.add_parser('self-test');args=parser.parse_args();library=args.library.resolve();out=library/'coverage';out.mkdir(exist_ok=True)
 if args.command=='self-test':self_test();return
 if args.command=='status':print(json.dumps(readjson(out/'summary.json'),indent=2));return
 if args.command=='pending':
  c=connect(out/'ledger.sqlite');sql='''SELECT a.candidate_id,a.paper_id,p.level,p.title,c.question_number,c.source_pages,c.text_preview,c.completeness,c.diagram_dependency,c.source_flags FROM candidate_aliases a JOIN candidates c USING(candidate_key) JOIN papers p USING(paper_id) WHERE c.visual_status='unreviewed' AND c.disposition!='superseded-by-manual-inventory' ''';params=[]
  if args.level:sql+='AND p.level=? ';params.append(args.level)
  if args.paper:sql+='AND p.paper_id=? ';params.append(args.paper)
  sql+='ORDER BY p.year DESC,p.title,a.bank_line LIMIT ?';params.append(args.limit);print(json.dumps(rows(c,sql,params),indent=2,ensure_ascii=False));return
 with (out/'.ledger.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  if args.command=='build':print(json.dumps(build(library,args.rehash),indent=2));return
  incoming=readjson(args.event_file);batch=incoming if isinstance(incoming,list) else [incoming]
  for event in batch:
   evidence_ok(event.get('evidence',[]));archived=[]
   for evidence in event['evidence']:
    original=Path(evidence['path']);target=out/'evidence'/(evidence['sha256']+original.suffix);target.parent.mkdir(exist_ok=True)
    if not target.exists():shutil.copyfile(original,target)
    archived.append({**evidence,'originalPath':str(original),'path':str(target)})
   event['evidence']=archived
  c=connect(out/'ledger.sqlite')
  try:
   c.execute('BEGIN IMMEDIATE')
   for event in batch:
    if event['entityType']=='candidate' and event['type']!='candidate_created':
     resolved=candidate(c,event['entityId']);event['payload'].setdefault('originalCandidateReference',event['entityId']);event['entityId']=resolved['candidate_key']
    apply_event(c,event,live=True)
   # Append only after every event validates; rollback keeps the DB as a derived cache.
   c.rollback()
   with (out/'events.jsonl').open('a') as f:
    for event in batch:f.write(dump(event)+'\n')
    f.flush();os.fsync(f.fileno())
   for event in batch:apply_event(c,event,live=True)
   c.commit();summary=export(c,out);print(json.dumps({'recorded':len(batch),'counts':summary['counts']},indent=2))
  finally:c.close()

# Meaningful lifecycle checks use temporary evidence and an isolated database; never touch the corpus.
def self_test():
 with tempfile.TemporaryDirectory() as temp:
  root=Path(temp);artifact=root/'evidence.txt';artifact.write_text('render reviewed; independently solved from visible givens');evidence=[{'path':str(artifact),'sha256':filehash(artifact)}];c=connect(root/'test.sqlite');c.executescript(DDL)
  c.execute("INSERT INTO papers(paper_id,file_sha,canonical_paper_id,downloaded,hash_verified,extracted,page_count) VALUES ('p','abc','p',1,1,1,1)");c.execute("INSERT INTO pages(page_key,file_sha,page_number) VALUES ('abc:1','abc',1)");c.execute("INSERT INTO candidates(candidate_key,file_sha,question_number,region_kind,source_pages) VALUES ('q','abc','1','question-candidate','[1]')");c.execute("INSERT INTO candidate_aliases VALUES ('alias','q','p',1,0,10,'[]','[1]')")
  n=0
  def event(typ,entity,ident,payload):
   nonlocal n;n+=1;return {'schemaVersion':1,'eventId':str(n),'type':typ,'entityType':entity,'entityId':ident,'recordedAt':now(),'reviewer':'independent-test','evidence':evidence,'payload':payload}
  apply_event(c,event('pattern_registered','pattern','pattern-a',{'title':'Join groups','description':'Two known parts determine a total'}))
  try:apply_event(c,event('pattern_mapped','candidate','alias',{'patternId':'pattern-a','relation':'same-structure','structuralRationale':'addition','sourceVariantRequirements':['two groups']}));raise AssertionError('Unreviewed mapping accepted')
  except ValueError:pass
  apply_event(c,event('source_integrity_reviewed','paper','p',{'completeness':'incomplete','notes':'Missing printed page','issues':['page 2 missing']}));assert c.execute('SELECT downloaded,extracted,source_completeness FROM papers').fetchone()[:]==(1,1,'incomplete')
  apply_event(c,event('candidate_visually_reviewed','candidate','alias',{'sourceSha256':'abc','reviewedSourcePages':[1],'completeness':'complete','diagramDependency':'required','observations':'Both groups counted from source'}));apply_event(c,event('pattern_mapped','candidate','alias',{'patternId':'pattern-a','relation':'same-structure','structuralRationale':'addition of two visible groups','sourceVariantRequirements':['two groups']}))
  code=root/'generator.py';code.write_text('def total(a,b): return a+b');impl={'originalContent':True,'parameterisedNumbers':True,'generatorId':'join','illustrationId':'original-counters','parameterConstraints':'a,b in 1..9','codePath':str(code),'codeSha256':filehash(code)};apply_event(c,event('pattern_implemented','pattern','pattern-a',impl))
  try:apply_event(c,event('pattern_independently_verified','pattern','pattern-a',{'codeSha256':impl['codeSha256'],'method':'proof-tree','sampleCount':10}));raise AssertionError('Proof self-consistency accepted')
  except ValueError:pass
  apply_event(c,event('pattern_independently_verified','pattern','pattern-a',{'codeSha256':impl['codeSha256'],'method':'independent-visible-givens-solver','sampleCount':81,'solverPath':str(artifact),'solverSha256':filehash(artifact),'testedParameterScope':'all a,b in1..9'}));apply_event(c,event('mapping_independently_verified','candidate','alias',{'patternId':'pattern-a','sourceSha256':'abc','allSourceVariantRequirementsCovered':True,'scopeExplanation':'Every two-group count in allowed range'}))
  assert c.execute('SELECT independently_verified FROM mappings').fetchone()[0]==1
  apply_event(c,event('pattern_implemented','pattern','pattern-a',impl));assert c.execute('SELECT independently_verified FROM mappings').fetchone()[0]==0
  try:apply_event(c,event('paper_inventory_reviewed','paper','p',{'confirmedQuestionIds':['alias'],'excludedCandidateIds':[],'questionCount':1,'segmentationChecked':True}));raise AssertionError('Incomplete source paper accepted')
  except ValueError:pass
  # A partial adaptation cannot receive source-question coverage even with a verified template.
  apply_event(c,event('pattern_mapped','candidate','alias',{'patternId':'pattern-a','relation':'partial-adaptation','structuralRationale':'Only one subcase adapted','sourceVariantRequirements':['two groups','additional source constraint']}))
  apply_event(c,event('pattern_independently_verified','pattern','pattern-a',{'codeSha256':impl['codeSha256'],'method':'independent-visible-givens-solver','sampleCount':81,'solverPath':str(artifact),'solverSha256':filehash(artifact),'testedParameterScope':'all a,b in1..9'}))
  try:apply_event(c,event('mapping_independently_verified','candidate','alias',{'patternId':'pattern-a','sourceSha256':'abc','allSourceVariantRequirementsCovered':True,'scopeExplanation':'test'}));raise AssertionError('Partial adaptation promoted')
  except ValueError:pass
  code.write_text('def total(a,b): return a-b');invalidate_stale(c);assert c.execute('SELECT implementation_status,independent_status FROM patterns').fetchone()[:]==('stale','stale')
  apply_event(c,event('source_integrity_reviewed','paper','p',{'completeness':'complete','notes':'All physical pages are present'}));apply_event(c,event('page_visually_reviewed','page','abc:1',{'observations':'One complete question, no other response units'}));apply_event(c,event('paper_inventory_reviewed','paper','p',{'confirmedQuestionIds':['alias'],'excludedCandidateIds':[],'questionCount':1,'numberedQuestionCount':1,'segmentationChecked':True}));assert c.execute('SELECT inventory_reviewed FROM papers').fetchone()[0]==1
  c.execute("INSERT INTO papers(paper_id,file_sha,canonical_paper_id,downloaded,hash_verified,extracted,page_count) VALUES ('p-alias','abc','p',1,1,1,1)");c.execute("INSERT INTO candidate_aliases VALUES ('alias-2','q','p-alias',2,11,10,'[]','[1]')");assert c.execute('SELECT COUNT(DISTINCT file_sha),COUNT(*) FROM papers').fetchone()[:]==(1,2);assert c.execute('SELECT COUNT(DISTINCT candidate_key),COUNT(*) FROM candidate_aliases').fetchone()[:]==(1,2)
  print('PASS: gated review/mapping/verification; source completeness separate; code changes stale coverage; partial mappings blocked; complete inventory reconciliation; exact aliases retain both source entries.')
if __name__=='__main__':main()
