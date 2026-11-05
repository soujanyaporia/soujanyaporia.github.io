#!/usr/bin/env python3
"""Local, corpus-wide adaptation work queue; OCR matches never grant coverage.

Builds on corpus-structure.py's existing region/cluster/bucket IDs, the source
ledger, generated app inventory, provenance manifests and existing arithmetic
leads. No PDF extraction, reclustering, app edits or ledger events are performed.
Full OCR, blocks, geometry and pages remain losslessly addressable in staging.
"""
import argparse, collections, hashlib, importlib.util, json, math, re, sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = ('OCR text clusters and coarse buckets are review conveniences, not unique reasoning '
          'patterns or complete questions. Every match is provisional; no coverage is granted.')
STOP = set(('the a an of and or to in on at is are was were be been being it its this that '
            'these those for with from by as you your answer answers question questions '
            'write correct below above shown show look find what which how many much '
            'following given each all some there then into their they them he she his her '
            'peter john mary ali jane tom mei hana ravi nila omar ben sam lily noor '
            'school primary mathematics maths marks mark section name class paper '
            'working workings carefully spaces space provided blanks blank').split())
TOPICS = [
 ('SYM',r'\b(?:symmetr\w*|reflect\w*|mirror|fold\w*)\b'),
 ('LINES',r'\b(?:parallel|perpendicular)\b'),
 ('ANGLE',r'\b(?:angles?|protractor|acute|obtuse|reflex)\b'),
 ('GRAPH',r'\b(?:graphs?|charts?|pictographs?|tally|each.{0,12}stands for)\b'),
 ('CIRCLE',r'\b(?:circumference|radius|diameter)\b'),
 ('VOL',r'\b(?:cuboid|cubic|volume.{0,30}(?:cm|cub)|tank.{0,60}(?:height|base area))\b'),
 ('AREA',r'\b(?:area|perimeter|square centimetres)\b'),
 ('SOLID',r'\b(?:solids?|cubes?|cuboids?|cones?|cylinders?|spheres?|flat faces)\b'),
 ('SHAPE',r'\b(?:shapes?|triangles?|rectangles?|semicircles?|quarter circles?|dot grid|square grid|vertices|straight lines|curves?)\b'),
 ('TIME',r'\b(?:clock|minutes?|hours?|duration|timetable|schedule|a\.m\.|p\.m\.)\b'),
 ('LENGTH',r'\b(?:length|longer|shorter|ruler|centimetres?|metres?)\b'),
 ('MEASURE',r'\b(?:mass|weigh\w*|kilograms?|grams?|litres?|liters?|capacity|beaker|balance)\b'),
 ('PCT',r'\b(?:percent\w*|discount|gst|interest)\b|%'),
 ('RATIO',r'\b(?:ratio|proportion)\b'),
 ('AVG',r'\baverages?\b'),
 ('RATE',r'\b(?:speed|rates?|km/h|per hour|per minute)\b'),
 ('ALG',r'\b(?:algebra|expressions?|simplify.{0,20}(?:x|y)|value of [a-z])\b'),
 ('FRAC',r'\b(?:fractions?|numerator|denominator|mixed number|equal parts|shaded)\b'),
 ('MONEY',r'\$|¢|\b(?:cents?|dollars?|money|price|cost|change|paid|pays|spend|spent)\b'),
 ('DEC',r'\b(?:decimal|tenths?|hundredths?|thousandths?)\b'),
 ('FACT',r'\b(?:factors?|multiples?|divisible)\b'),
 ('WN',r'\b(?:digits?|hundreds?|thousands?|number pattern|number bond|tens|ones|ordinal|position)\b'),
 ('MD',r'\b(?:groups?|equally|shared|sharing|times as|divide|multiply|multiplication|division)\b'),
 ('AS',r'\b(?:add|sum|subtract|difference|more|fewer|left|remaining|total)\b'),
]
TOPIC_RE = [(key,re.compile(pattern,re.I|re.S)) for key,pattern in TOPICS]
BAD = re.compile(r'paper\s*exchange|buy back program|cash up to|paperstoexchange|copyright|terms and conditions',re.I)
KEY = re.compile(r'answer\s*(?:key|sheet)|marking scheme|suggested answers|worked solutions',re.I)
FIGURE = re.compile(r'\b(?:picture|diagram|figure|clock|ruler|scale|grid|graph|chart|shaded|draw|fold|reflect)\b',re.I)
RULES = [
 ('grid-copy',r'\bcopy\b.{0,90}\b(?:figure|grid)\b',('copy-complete-figure-on-grid',)),
 ('length-construction',r'\bdraw\b.{0,65}\bline\b.{0,70}(?:\bcm\b|centimet)',('construct-given-centimetre-length',)),
 ('shape-composition',r'\b(?:formed|made up|form)\b.{0,70}\b(?:shapes?|circle|rectangle)\b',('identify-components-of-composite-shape','matching-pieces-compose-circle')),
 ('clock-error',r'\b(?:minutes?|min)\s+(?:slow|fast)\b',('correct-slow-clock-reading',)),
 ('container-tare',r'\b(?:empty bowl|empty container|empty jar|empty bag)\b',('gross-minus-tare-contents-mass',)),
 ('identical-weighed-items',r'\b(?:two|2)\s+identical\b.{0,160}\b(?:scale|mass|weigh)',('dial-total-to-identical-item-mass',)),
 ('fraction-unequal-pieces',r'\beach triangle\b.{0,80}\bsquare\b',('unequal-pieces-to-equal-area-fraction',)),
 ('coin-data-sufficiency',r'\b(?:not possible to tell|not enough information)\b',('coin-total-comparison-data-sufficiency',)),
 ('group-refill-shortage',r'\b(?:each basket|each box|each bag)\b.{0,120}\bhow many more\b',('group-capacity-target-shortage',)),
 ('arrival-from-duration',r'\b(?:journey|trip)\b.{0,120}\b(?:arrive|reach|finish)\b',('finish-time-from-start-and-duration',)),
 ('dividend-from-remainder',r'\b(?:quotient|remainder)\b.{0,120}\b(?:starting|original|number|dividend)\b',('recover-dividend-from-quotient-and-remainder',)),
]
COMPILED_RULES = [(name,re.compile(pattern,re.I|re.S),targets) for name,pattern,targets in RULES]

def read_only(path):
    db=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True)
    db.row_factory=sqlite3.Row
    return db

def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def tokens(text):
    return {word[:-1] if word.endswith('s') and len(word)>4 else word
            for word in re.findall(r'[a-z]{3,}',text.lower()) if word not in STOP}

def question_base(value):
    match=re.match(r'\s*(\d+)',str(value))
    return match.group(1) if match else None

def load_inventory(path):
    raw=json.loads(Path(path).read_text());docs=[];canonical=collections.defaultdict(list)
    for activity in raw['activities']:
        words=tokens(' '.join([activity.get('title',''),activity.get('objective','')]+
            [s for ex in activity.get('examples',[]) for s in
             [ex.get('prompt',''),*(ex.get('context') or []),ex.get('display') or '']]))
        doc={k:activity.get(k) for k in ['id','level','track','parameter','title','canonicalPatternId','observedFamilies']}
        doc['words']=words;docs.append(doc)
        if activity.get('canonicalPatternId'):canonical[activity['canonicalPatternId']].append(activity['id'])
    frequency=collections.Counter(word for doc in docs for word in doc['words'])
    idf={word:math.log(1+len(docs)/(1+n)) for word,n in frequency.items()}
    for doc in docs:doc['weight']=sum(idf[word] for word in doc['words']) or 1
    return raw,docs,canonical,idf

def load_associations(root,docs):
    """Source pointers are associations, never source-unit verification inferred from code."""
    associations=collections.defaultdict(list);inputs=[];dedup=set()
    paths=sorted(set(root.glob('.generated/*provenance.json')) |
                 set(root.glob('.generated/corpus-template-reuse/partial-*-manifest.json')) |
                 {root/'.generated/arithmetic-implementation-first.json'})
    def add(source,path,identity):
        paper=source.get('paperId') or source.get('paper_id')
        question=source.get('sourceQuestion',source.get('question'))
        page=source.get('sourcePage',source.get('page'))
        if not paper or question is None or not isinstance(page,int):return
        key=(paper,str(question),page,str(path),identity)
        if key in dedup:return
        dedup.add(key)
        batch=re.search(r'batch(\d+)[-_]?(early|middle|upper)',path.name,re.I)
        inferred=f'b{batch[1]}{batch[2][0].lower()}-{identity}' if batch else None
        registered=[doc['id'] for doc in docs if identity in (doc['id'],doc.get('parameter'),doc.get('canonicalPatternId')) or inferred==doc.get('parameter')]
        associations[paper].append({'sourceQuestion':str(question),'sourcePage':page,
            'implementationReference':identity,'evidencePath':str(path),'status':'source-association-not-coverage',
            'registrationStatus':'registered-in-local-inventory' if registered else 'not-registered-or-unresolved',
            'registeredActivityIds':registered,
            'deploymentStatus':'not-determined-from-local-inventory'})
    def visit(value,path):
        if isinstance(value,list):
            for item in value:visit(item,path)
        elif isinstance(value,dict):
            identity=str(value.get('canonicalPatternId') or value.get('patternId') or value.get('part') or value.get('id') or value.get('familyId') or 'provenance-source')
            for source in value.get('sourceUnits',[]):
                if isinstance(source,dict):add(source,path,identity)
            if 'paperId' in value and 'sourceQuestion' in value and 'sourcePage' in value:add(value,path,identity)
            for child_key,child in value.items():
                if child_key!='sourceUnits' and isinstance(child,(dict,list)):visit(child,path)
    for path in paths:
        if not path.exists():continue
        try:raw=json.loads(path.read_text())
        except (ValueError,OSError):continue
        inputs.append({'path':str(path),'sha256':sha(path)});visit(raw,path)
    return associations,inputs

def similarity(text,level,docs,idf):
    words=tokens(text);matches=[]
    for doc in docs:
        if doc['level']!=level or doc.get('track')!='standard':continue
        overlap=words&doc['words']
        if len(overlap)<4:continue
        score=sum(idf.get(word,0) for word in overlap)/doc['weight']
        if score>=0.36:matches.append({'kind':'lexical-template-lead','targetId':doc['id'],
            'score':round(score,4),'matchedAnchors':sorted(overlap),
            'canonicalPatternId':doc['canonicalPatternId'],'status':'provisional-text-similarity-not-equivalence'})
    # Several response variants of the same scheduling family get only one lead.
    out=[];seen=set()
    for match in sorted(matches,key=lambda m:(-m['score'],m['targetId'])):
        key=match['canonicalPatternId'] or match['targetId']
        if key in seen:continue
        seen.add(key);out.append(match)
        if len(out)==3:break
    return out

def build(args):
    staging=Path(args.staging);ledger=Path(args.ledger);inventory=Path(args.inventory)
    output=Path(args.output);database=Path(args.database)
    for path in [output,database]:
        if path.exists() and not args.replace:raise FileExistsError(f'{path} exists; use --replace for this derived queue only.')
        path.parent.mkdir(parents=True,exist_ok=True)
    db=read_only(staging);cov=read_only(ledger);inventory_raw,docs,canonical,idf=load_inventory(inventory)
    db.execute('BEGIN');cov.execute('BEGIN')
    associations,provenance_inputs=load_associations(ROOT,docs)
    spec=importlib.util.spec_from_file_location('existing_reuse_rules',ROOT/'scripts/corpus-template-reuse.py')
    reuse=importlib.util.module_from_spec(spec);spec.loader.exec_module(reuse)
    aliases={r['bank_line']:dict(r) for r in cov.execute('select a.bank_line,c.candidate_key,c.disposition,c.completeness,c.visual_status from candidate_aliases a join candidates c using(candidate_key) where a.bank_line is not null')}
    ledger_papers={r['paper_id']:dict(r) for r in cov.execute('select paper_id,inventory_reviewed,source_completeness from papers')}
    thin={(row['level'],row['id']):row['structureCount'] for row in inventory_raw['topics']}
    arithmetic=collections.defaultdict(list);leadpath=staging.parent/'literal-arithmetic-review-leads-v6.jsonl'
    if leadpath.exists():
        for line in leadpath.open():
            value=json.loads(line);arithmetic[value['bankLine']].append({'kind':'existing-literal-arithmetic-lead',
                'targetId':value['proposalId'],'sourceSlice':value.get('sourceSlice'),
                'operandDomain':value.get('operandDomain'),'generatorCandidates':value.get('generatorCandidates'),
                'status':'provisional-OCR-parse-not-source-verification'})
        provenance_inputs.append({'path':str(leadpath),'sha256':sha(leadpath)})
    temp=database.with_suffix(database.suffix+'.building')
    if temp.exists():
        if args.replace:temp.unlink()
        else:raise FileExistsError(f'Interrupted build exists: {temp}')
    queue=sqlite3.connect(temp);queue.row_factory=sqlite3.Row
    queue.executescript('''
      PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
      CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE papers(paper_id TEXT PRIMARY KEY,level INTEGER,year INTEGER,title TEXT,source_pdf TEXT,source_sha256 TEXT,page_count INTEGER,staged_pages INTEGER,region_count INTEGER,inventory_reviewed INTEGER);
      CREATE TABLE region_queue(bank_line INTEGER PRIMARY KEY,candidate_id TEXT,paper_id TEXT REFERENCES papers,level INTEGER,question_number TEXT,start_page INTEGER,page_numbers_json TEXT,source_sha256 TEXT,raw_text_sha256 TEXT,raw_line_sha256 TEXT,text_cluster_id TEXT,family_bucket_id TEXT,number_profile_json TEXT,tags_json TEXT,triage_flags_json TEXT,confidence_json TEXT,topic_cues_json TEXT,primary_topic TEXT,track TEXT,priority INTEGER,ledger_candidate_key TEXT,ledger_disposition TEXT,association_count INTEGER,match_count INTEGER,visual_cue INTEGER,source_covered INTEGER NOT NULL DEFAULT 0 CHECK(source_covered=0));
      CREATE TABLE provisional_matches(match_id INTEGER PRIMARY KEY,bank_line INTEGER REFERENCES region_queue,kind TEXT,target_id TEXT,evidence_json TEXT,status TEXT NOT NULL DEFAULT 'provisional-unreviewed');
      CREATE TABLE clusters(cluster_id TEXT PRIMARY KEY,level INTEGER,total_regions INTEGER,remaining_regions INTEGER,representative_bank_line INTEGER,best_priority INTEGER,provisional_match_regions INTEGER);
      CREATE TABLE manual_followup(candidate_key TEXT PRIMARY KEY,paper_id TEXT,question_number TEXT,source_pages_json TEXT,disposition TEXT,completeness TEXT,source_flags_json TEXT,review_details_json TEXT);
    ''')
    page_counts=dict(db.execute('select paper_id,count(*) from pages group by paper_id'))
    region_counts=dict(db.execute('select paper_id,count(*) from regions group by paper_id'))
    for paper in db.execute('select * from papers order by paper_id'):
        queue.execute('insert into papers values(?,?,?,?,?,?,?,?,?,?)',(paper['paper_id'],paper['level'],paper['year'],paper['title'],paper['source_pdf'],paper['source_sha256'],paper['page_count'],page_counts.get(paper['paper_id'],0),region_counts.get(paper['paper_id'],0),ledger_papers.get(paper['paper_id'],{}).get('inventory_reviewed',0)))
    cache={};cluster_rows={};processed=0;tracks=collections.Counter();by_level=collections.defaultdict(collections.Counter)
    query='''select r.*,p.level,p.year,c.region_count as cluster_regions from regions r join papers p using(paper_id) join candidate_clusters c on c.cluster_id=r.text_cluster_id order by r.bank_line'''
    for r in db.execute(query):
        text=r['raw_text'];level=r['level'];cid=r['text_cluster_id'];alias=aliases.get(r['bank_line'],{})
        feature_text=re.sub(r'\bAngl[eo][ -]Chinese\b','',text,flags=re.I)
        topics=[key for key,pattern in TOPIC_RE if pattern.search(feature_text)]
        primary=topics[0] if topics else 'UNCLASSIFIED'
        pages=json.loads(r['page_numbers_json']);base=question_base(r['question_number'])
        assoc=[a for a in associations.get(r['paper_id'],[]) if a['sourcePage'] in pages and base and question_base(a['sourceQuestion'])==base]
        poor=bool(BAD.search(text) or KEY.search(text) or r['kind']=='answer-region-candidate' or len(text.strip())<45)
        merged=len(pages)>2 or len(re.findall(r'(?:^|\n)\s*\d{1,2}[.)]\s+\w',text))>3
        matches=[]
        registered_assoc=[a for a in assoc if a['registrationStatus']=='registered-in-local-inventory']
        for a in assoc:matches.append({'kind':'registered-source-association' if a in registered_assoc else 'pending-source-association','targetId':a['implementationReference'],'sourceAssociation':a,'status':'provisional-region-overlap-not-complete-unit-mapping'})
        matches.extend(arithmetic.get(r['bank_line'],[]))
        if not poor:
            cached=cache.get(cid)
            if cached is None:
                leads=similarity(text,level,docs,idf)
                for lead in reuse.matches(text):leads.append({'kind':'existing-narrow-reuse-rule','targetId':lead['proposedPatternId'],'evidence':lead,'status':'provisional-rule-match-not-source-verification'})
                for name,pattern,targets in COMPILED_RULES:
                    m=pattern.search(text)
                    if m:
                        for target in targets:
                            if target in canonical:leads.append({'kind':'specific-task-cue','targetId':target,'appActivityIds':canonical[target],
                                'rule':name,'matchedText':m.group(),'characterSpan':[m.start(),m.end()],
                                'status':'provisional-task-cue-domain-and-figure-review-required'})
                if r['cluster_regions']>1:cache[cid]=leads
                cached=leads
            matches.extend(cached)
        if alias.get('disposition')=='superseded-by-manual-inventory':track='ledger-superseded-region'
        elif poor or merged:track='boundary-context-reconciliation'
        elif registered_assoc:track='previous-source-association-review'
        elif assoc:track='pending-implementation-association-review'
        elif matches:track='existing-template-review'
        else:track='unmatched-pattern-review'
        observed=thin.get((level,primary));priority=30+(35 if observed is not None and observed<=3 else 24 if observed is not None and observed<=6 else 8)
        priority+=min(20,round(5*math.log2(1+r['cluster_regions'])))+min(10,len(tokens(text))//6)
        priority+=5 if r['year'] and r['year']>=2024 else 0
        priority+=8 if track=='unmatched-pattern-review' else 0
        priority-=45 if track=='boundary-context-reconciliation' else 15 if registered_assoc else 5 if assoc else 100 if track=='ledger-superseded-region' else 0
        priority-=5*max(0,len(pages)-1)
        row=(r['bank_line'],r['candidate_id'],r['paper_id'],level,r['question_number'],r['start_page'],r['page_numbers_json'],r['source_sha256'],r['raw_text_sha256'],r['raw_line_sha256'],cid,r['family_bucket_id'],r['number_profile_json'],r['tags_json'],r['triage_flags_json'],r['confidence_json'],json.dumps(topics),primary,track,priority,alias.get('candidate_key'),alias.get('disposition','not-in-ledger'),len(assoc),len(matches),int(bool(FIGURE.search(text))),0)
        queue.execute('insert into region_queue values('+','.join('?'*len(row))+')',row)
        for match in matches:queue.execute('insert into provisional_matches(bank_line,kind,target_id,evidence_json) values(?,?,?,?)',(r['bank_line'],match['kind'],match['targetId'],json.dumps(match,ensure_ascii=False,separators=(',',':'))))
        cluster=cluster_rows.setdefault(cid,[level,0,0,None,-10000,0]);cluster[1]+=1
        if track!='ledger-superseded-region':
            cluster[2]+=1;cluster[5]+=int(bool(matches))
            if priority>cluster[4]:cluster[3]=r['bank_line'];cluster[4]=priority
        tracks[track]+=1;by_level[level]['regions']+=1;by_level[level][track]+=1
        by_level[level]['regionsWithProvisionalMatches']+=int(bool(matches));processed+=1
    for cid,data in cluster_rows.items():queue.execute('insert into clusters values(?,?,?,?,?,?,?)',(cid,*data))
    followup=cov.execute("select c.*,p.paper_id from candidates c join papers p on p.file_sha=c.file_sha where c.manual=1 and (c.completeness!='complete' or c.disposition!='question')").fetchall()
    for r in followup:queue.execute('insert or ignore into manual_followup values(?,?,?,?,?,?,?,?)',(r['candidate_key'],r['paper_id'],r['question_number'],r['source_pages'],r['disposition'],r['completeness'],r['source_flags'],r['review_details']))
    queue.executescript('CREATE INDEX queue_priority ON region_queue(level,track,priority DESC); CREATE INDEX queue_cluster ON region_queue(text_cluster_id); CREATE INDEX queue_source ON region_queue(paper_id,question_number); CREATE INDEX match_region ON provisional_matches(bank_line);')
    source_meta=dict(db.execute('select key,value from meta'));inputs={'staging':str(staging.resolve()),'stagingSnapshot':source_meta.get('snapshotId'),'ledger':str(ledger.resolve()),'inventory':str(inventory.resolve()),'inventorySha256':sha(inventory),'inventoryGeneratedAt':inventory_raw.get('generatedAt'),'provenanceInputs':provenance_inputs}
    for key,value in {'policy':POLICY,'inputs':inputs,'schemaVersion':1,'localOnly':True,'sourceContextLookup':{'regions':'staging.regions by bank_line','pages':'staging.pages by paper_id/page_number','blocks':'staging.region_blocks by bank_line','diagramDependencies':'staging.diagram_dependencies by bank_line','subparts':'staging.subpart_candidates by bank_line'}}.items():queue.execute('insert into meta values(?,?)',(key,json.dumps(value)))
    queue.commit()
    assert queue.execute('select count(*) from region_queue').fetchone()[0]==db.execute('select count(*) from regions').fetchone()[0]
    assert queue.execute('select count(*) from papers').fetchone()[0]==db.execute('select count(*) from papers').fetchone()[0]
    assert queue.execute('select count(*) from region_queue where source_covered!=0').fetchone()[0]==0
    integrity=queue.execute('pragma integrity_check').fetchone()[0];assert integrity=='ok',integrity
    top={}
    for level in range(1,7):
        selected=[];papers=collections.Counter();topics=collections.Counter()
        candidates=queue.execute("select q.* from region_queue q join clusters c on c.representative_bank_line=q.bank_line where q.level=? and q.track in ('existing-template-review','unmatched-pattern-review') order by q.priority desc,q.bank_line limit 1500",(level,)).fetchall()
        for q in sorted(candidates,key=lambda q:(-q['priority'],q['bank_line'])):
            if papers[q['paper_id']]>=2 or topics[q['primary_topic']]>=3:continue
            raw=db.execute('select raw_text from regions where bank_line=?',(q['bank_line'],)).fetchone()[0]
            # Fast-start examples favour clean, bounded OCR. Other regions stay in SQLite.
            if (raw.count('\uffff')+raw.count('\ufffd'))/max(1,len(raw))>0.015 or len(raw)>1600:continue
            if re.search(r'\bans(?:wer)?\s*[:.]\s*\$?\s*\d',raw,re.I):continue
            if len(re.findall(r'(?:^|\n)\s*\d{1,2}[.]?\s*\n[A-Z]',raw))>1:continue
            paper=queue.execute('select title,source_pdf from papers where paper_id=?',(q['paper_id'],)).fetchone()
            selected.append({'bankLine':q['bank_line'],'candidateId':q['candidate_id'],'paperId':q['paper_id'],'sourceQuestionLabel':q['question_number'],'sourcePages':json.loads(q['page_numbers_json']),'sourcePdf':paper['source_pdf'],'title':paper['title'],'textClusterId':q['text_cluster_id'],'topic':q['primary_topic'],'observedAppTopicFamilies':thin.get((level,q['primary_topic'])),'priority':q['priority'],'track':q['track'],'rawOcrText':raw,'numerals':json.loads(q['number_profile_json']),'tags':json.loads(q['tags_json']),'diagramReviewRequired':True,'provisionalMatches':[json.loads(m[0]) for m in queue.execute('select evidence_json from provisional_matches where bank_line=?',(q['bank_line'],))],'sourceCovered':False})
            papers[q['paper_id']]+=1;topics[q['primary_topic']]+=1
            if len(selected)>=args.per_level:break
        top[str(level)]=selected
    census={'papersProcessed':queue.execute('select count(*) from papers').fetchone()[0],'ocrPagesAddressable':sum(page_counts.values()),'regionsProcessed':processed,'observedTextClusters':len(cluster_rows),'existingCoarseFamilyBuckets':db.execute('select count(*) from family_buckets').fetchone()[0],'regionsLedgerSuperseded':tracks['ledger-superseded-region'],'regionsRequiringDisposition':processed-tracks['ledger-superseded-region'],'clustersWithRemainingRegions':sum(d[2]>0 for d in cluster_rows.values()),'regionsWithProvisionalMatches':sum(v['regionsWithProvisionalMatches'] for v in by_level.values()),'regionsWithoutProvisionalMatches':processed-sum(v['regionsWithProvisionalMatches'] for v in by_level.values()),'remainingRegionsWithProvisionalMatches':queue.execute("select count(*) from region_queue where track!='ledger-superseded-region' and match_count>0").fetchone()[0],'remainingRegionsWithoutProvisionalMatches':queue.execute("select count(*) from region_queue where track!='ledger-superseded-region' and match_count=0").fetchone()[0],'provisionalMatchOccurrences':queue.execute('select count(*) from provisional_matches').fetchone()[0],'unresolvedManualSourceUnits':len(followup),'sourceCoverageGrantedByThisTool':0,'uniqueReasoningPatternsInCorpus':None,'byTrack':dict(tracks),'byLevel':{str(k):dict(v) for k,v in sorted(by_level.items())}}
    for level,counts in census['byLevel'].items():
        grade=int(level)
        counts['papersProcessed']=queue.execute('select count(*) from papers where level=?',(grade,)).fetchone()[0]
        counts['ocrPagesAddressable']=queue.execute('select sum(staged_pages) from papers where level=?',(grade,)).fetchone()[0]
        counts['observedTextClusters']=queue.execute('select count(*) from clusters where level=?',(grade,)).fetchone()[0]
        counts['regionsRequiringDisposition']=counts['regions']-counts.get('ledger-superseded-region',0)
        counts['remainingRegionsWithProvisionalMatches']=queue.execute("select count(*) from region_queue where level=? and track!='ledger-superseded-region' and match_count>0",(grade,)).fetchone()[0]
        counts['remainingRegionsWithoutProvisionalMatches']=counts['regionsRequiringDisposition']-counts['remainingRegionsWithProvisionalMatches']
    summary={'schemaVersion':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'policy':POLICY,'census':census,'inputs':inputs,'implementedInventory':{'activities':len(docs),'paperConfigurations':sum('-paper-' in d['id'] for d in docs),'observedSchedulingFamilies':len({f for d in docs for f in d.get('observedFamilies') or []}),'registrationStatus':'only activities present in the captured local inventory are counted','deploymentStatus':'not-determined-from-local-inventory','note':'App scheduling-family labels are conservative observed aliases, not reviewed corpus pattern counts. Pending provenance references never increase these counts.'},'queueDatabase':str(database.resolve()),'schema':{'region_queue':'One row for EVERY staged raw region, including ledger-superseded and unresolved fragments. Original identifiers, hashes, numeral spans, tags and page references retained.','clusters':'Reuses staging text_cluster_id; selects a remaining representative, never mathematical deduplication.','provisional_matches':'Narrow existing rules, existing arithmetic leads, source associations or lexical inventory anchors; never verified equivalence.','manual_followup':'Explicit unresolved manual source units preserved separately from OCR regions.','context':'Attach the recorded staging database read-only to retrieve full raw OCR, every page/block/bbox/confidence/subpart/diagram dependency without duplicate extraction.'},'topCandidatesByLevel':top,'checks':{'allPapersRetained':True,'allRawRegionsRetained':True,'sourceCoveragePromotion':False,'sqliteIntegrity':integrity},'limitations':['No source PDF or exact mathematical boundary was verified by this build.','Matches can occur in merged questions, examples, headers or answer material; inspect all physical pages.','Remaining raw-region counts are not remaining questions or papers.','Only ledger-superseded raw regions leave the primary queue; recent code/provenance associations remain provisional.','Lexical matches and topic cues do not prove the same reasoning, supported numbers, response type, givens or figures.']}
    queue.close();temp.replace(database);output.write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'report':str(output.resolve()),'database':str(database.resolve()),'census':census},indent=2))

def inspect_region(args):
    """Fetch lossless context on demand instead of copying the OCR corpus again."""
    queue=read_only(args.database);db=read_only(args.staging)
    row=queue.execute('select * from region_queue where bank_line=?',(args.inspect,)).fetchone()
    if row is None:raise ValueError(f'Unknown bank line {args.inspect}')
    source=db.execute('select raw_text,raw_text_sha256,number_profile_json from regions where bank_line=?',(args.inspect,)).fetchone()
    if source['raw_text_sha256']!=row['raw_text_sha256']:raise ValueError('Staging content differs from queue snapshot')
    pages=[dict(p) for p in db.execute('select page_number,text,coordinate_system,page_bounds_json,mean_confidence from pages where paper_id=? and page_number in (select page_number from region_pages where bank_line=?) order by page_number',(row['paper_id'],args.inspect))]
    result={'queueRegion':dict(row),'rawOcrText':source['raw_text'],'fullPageContext':pages,
        'blocks':[dict(r) for r in db.execute('select * from region_blocks where bank_line=? order by block_index',(args.inspect,))],
        'diagramDependencies':[dict(r) for r in db.execute('select * from diagram_dependencies where bank_line=?',(args.inspect,))],
        'subpartMarkers':[dict(r) for r in db.execute('select * from subpart_candidates where bank_line=?',(args.inspect,))],
        'provisionalMatches':[json.loads(r[0]) for r in queue.execute('select evidence_json from provisional_matches where bank_line=?',(args.inspect,))],
        'policy':POLICY}
    print(json.dumps(result,indent=2,ensure_ascii=False))

def main():
    defaults=json.loads((ROOT/'.generated/reuse-release-accounting.json').read_text())['reports']
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--staging',default=defaults['stagingDatabase']);p.add_argument('--ledger',default=Path(defaults['stagingDatabase']).parents[2]/'coverage/ledger.sqlite');p.add_argument('--inventory',default=ROOT/'.generated/question-pattern-inventory.json');p.add_argument('--output',default=ROOT/'.generated/corpus-pattern-queue.json');p.add_argument('--database',default=ROOT/'.generated/corpus-pattern-queue.sqlite');p.add_argument('--per-level',type=int,default=20);p.add_argument('--replace',action='store_true');p.add_argument('--inspect',type=int,help='Fetch one existing queue region with every page, OCR block, bbox and diagram dependency; does not rebuild.');args=p.parse_args()
    if args.inspect is not None:inspect_region(args)
    else:build(args)
if __name__=='__main__':main()
