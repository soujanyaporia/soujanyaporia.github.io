#!/usr/bin/env python3
"""Durable paper-by-paper adaptation memory. No decision grants source coverage.

A new-generator proposal is not reusable code until an exact checked registry
commit exists. Source/decision history remains attached to the code version used.
"""
import argparse
import hashlib
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = 'Code associations and automated checks are not teacher review, source completeness or verified coverage.'
SCHEMA = '''
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS code_snapshots(snapshot_hash TEXT PRIMARY KEY,files_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS generators(generator_id TEXT PRIMARY KEY,family_id TEXT NOT NULL,canonical_pattern_id TEXT,level INTEGER NOT NULL,title TEXT NOT NULL,objective TEXT NOT NULL,skill_ids_json TEXT NOT NULL,semantic_text TEXT NOT NULL,current_version TEXT NOT NULL,active INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS generator_versions(version_id TEXT PRIMARY KEY,generator_id TEXT NOT NULL,code_snapshot_hash TEXT NOT NULL,metadata_json TEXT NOT NULL,code_files_json TEXT NOT NULL,constraints_json TEXT NOT NULL,available INTEGER NOT NULL,binding_status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS binding_invalidations(event_id TEXT PRIMARY KEY,generator_id TEXT NOT NULL,old_version TEXT NOT NULL,new_version TEXT NOT NULL,reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS papers(paper_id TEXT PRIMARY KEY,level INTEGER,title TEXT,source_sha256 TEXT,source_pdf TEXT,ingest_state TEXT NOT NULL DEFAULT 'census-only');
CREATE TABLE IF NOT EXISTS regions(region_key TEXT PRIMARY KEY,paper_id TEXT NOT NULL,snapshot_id TEXT NOT NULL,bank_line INTEGER NOT NULL,candidate_id TEXT,question_number TEXT,page_numbers_json TEXT NOT NULL,source_sha256 TEXT NOT NULL,raw_text TEXT NOT NULL,raw_text_sha256 TEXT NOT NULL,subparts_json TEXT NOT NULL,diagram_dependencies_json TEXT NOT NULL,triage_flags_json TEXT NOT NULL,kind TEXT,source_state TEXT NOT NULL DEFAULT 'unresolved');
CREATE INDEX IF NOT EXISTS regions_paper ON regions(paper_id,bank_line);
CREATE TABLE IF NOT EXISTS decisions(decision_id TEXT PRIMARY KEY,job_id TEXT NOT NULL,packet_sha256 TEXT NOT NULL,candidate_sha256 TEXT NOT NULL,decision TEXT NOT NULL,target TEXT NOT NULL,reasoning TEXT NOT NULL,blocking_gaps_json TEXT NOT NULL,worker_status TEXT NOT NULL,check_report_sha256 TEXT,source_refs_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decision_sources(decision_id TEXT NOT NULL,paper_id TEXT NOT NULL,bank_line INTEGER NOT NULL,question_number TEXT NOT NULL,page_numbers_json TEXT NOT NULL,source_sha256 TEXT NOT NULL,PRIMARY KEY(decision_id,paper_id,bank_line,question_number));
CREATE TABLE IF NOT EXISTS decision_outcomes(event_id TEXT PRIMARY KEY,decision_id TEXT NOT NULL,outcome TEXT NOT NULL,generator_id TEXT,version_id TEXT,evidence_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pattern_dictionary(generator_id TEXT PRIMARY KEY,descriptor_json TEXT NOT NULL,structural_signature TEXT NOT NULL,numeric_signature TEXT NOT NULL,exact_signature TEXT NOT NULL,search_text TEXT NOT NULL);
CREATE VIRTUAL TABLE IF NOT EXISTS pattern_fts USING fts5(generator_id UNINDEXED,level UNINDEXED,search_text);
'''


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text())


def read_only(path):
    db = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    return db


def connect(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)
    db.execute("insert or ignore into meta values('schema','1')")
    initialize_revision_tracking(db)
    return db


def get_meta(db, key, default=None):
    row = db.execute('select value from meta where key=?', (key,)).fetchone()
    return json.loads(row[0]) if row else default


def set_meta(db, key, value):
    db.execute('insert into meta values(?,?) on conflict(key) do update set value=excluded.value', (key, canonical(value)))


# Each leaf binds one durable row's stable identity and compact semantic fields.
# Large OCR, model reasoning and code contents remain in their evidence tables;
# their existing content-addresses are included instead of copying payloads.
REVISION_TABLES = {
    'code_snapshots': (('snapshot_hash',), 'snapshot_hash'),
    'generators': (('generator_id',), 'generator_id,family_id,canonical_pattern_id,level,title,objective,skill_ids_json,current_version,active'),
    'generator_versions': (('version_id',), 'version_id'),
    'binding_invalidations': (('event_id',), 'event_id'),
    'papers': (('paper_id',), '*'),
    'regions': (('region_key',), 'region_key,paper_id,snapshot_id,bank_line,candidate_id,raw_text_sha256,source_sha256,page_numbers_json,question_number,subparts_json,diagram_dependencies_json,triage_flags_json,kind,source_state'),
    'decisions': (('decision_id',), 'decision_id,job_id,packet_sha256,candidate_sha256,decision,target,worker_status,check_report_sha256'),
    'decision_sources': (('decision_id','paper_id','bank_line','question_number'), '*'),
    'decision_outcomes': (('event_id',), 'event_id'),
    'pattern_dictionary': (('generator_id',), 'generator_id,descriptor_json,structural_signature,numeric_signature,exact_signature'),
}
REVISION_SCHEMA = """
CREATE TABLE IF NOT EXISTS revision_dirty(table_name TEXT NOT NULL,row_key TEXT NOT NULL,PRIMARY KEY(table_name,row_key)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS revision_leaves(table_name TEXT NOT NULL,row_key TEXT NOT NULL,bucket INTEGER NOT NULL,leaf_hash TEXT NOT NULL,PRIMARY KEY(table_name,row_key)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS revision_leaves_bucket ON revision_leaves(bucket,table_name,row_key);
CREATE TABLE IF NOT EXISTS revision_buckets(bucket INTEGER PRIMARY KEY,bucket_hash TEXT NOT NULL);
"""

def initialize_revision_tracking(db):
    # SQL-only triggers mark keys even when another SQLite connection performs
    # writes; no connection-specific Python functions are needed by the trigger.
    db.executescript(REVISION_SCHEMA)
    for table,(keys,_) in REVISION_TABLES.items():
        for operation,prefix in (('INSERT','NEW'),('DELETE','OLD')):
            key=','.join(f'{prefix}.{column}' for column in keys)
            db.execute(f"CREATE TRIGGER IF NOT EXISTS rev_{table}_{operation.lower()} AFTER {operation} ON {table} BEGIN INSERT INTO revision_dirty VALUES ('{table}',json_array({key})) ON CONFLICT(table_name,row_key) DO NOTHING; END")
        old=','.join(f'OLD.{column}' for column in keys);new=','.join(f'NEW.{column}' for column in keys)
        db.execute(f"CREATE TRIGGER IF NOT EXISTS rev_{table}_update AFTER UPDATE ON {table} BEGIN INSERT INTO revision_dirty VALUES ('{table}',json_array({old})) ON CONFLICT(table_name,row_key) DO NOTHING; INSERT INTO revision_dirty VALUES ('{table}',json_array({new})) ON CONFLICT(table_name,row_key) DO NOTHING; END")
    for operation,predicate in (('INSERT',"NEW.key='inputs'"),('DELETE',"OLD.key='inputs'"),('UPDATE',"OLD.key='inputs' OR NEW.key='inputs'")):
        db.execute(f"CREATE TRIGGER IF NOT EXISTS rev_meta_{operation.lower()} AFTER {operation} ON meta WHEN {predicate} BEGIN INSERT INTO revision_dirty VALUES ('@meta',json_array('inputs')) ON CONFLICT(table_name,row_key) DO NOTHING; END")

def revision_bucket(table, key):
    return int(hashlib.sha256((table+'\0'+key).encode('utf-8')).hexdigest()[:2],16)

def revision_leaf(table, key, row):
    return digest(canonical([table,json.loads(key),list(row)]))

def revision_root(bucket_hashes):
    return digest(canonical(['rag-memory-revision-v2',list(bucket_hashes)]))

def revision_recompute(db):
    """Full independent recomputation, intended for tests and offline audits."""
    buckets=[[] for _ in range(256)]
    for table,(keys,fields) in REVISION_TABLES.items():
        key_expr=','.join(keys)
        for row in db.execute(f'SELECT json_array({key_expr}) AS revision_key,{fields} FROM {table}'):
            key=row[0];buckets[revision_bucket(table,key)].append((table,key,revision_leaf(table,key,row[1:])))
    key=canonical(['inputs']);buckets[revision_bucket('@meta',key)].append(('@meta',key,revision_leaf('@meta',key,[get_meta(db,'inputs',{})])))
    return revision_root([digest(canonical(sorted(bucket))) for bucket in buckets])

def _bootstrap_revision(db):
    db.execute('DELETE FROM revision_leaves');db.execute('DELETE FROM revision_buckets')
    for table,(keys,fields) in REVISION_TABLES.items():
        key_expr=','.join(keys)
        for row in db.execute(f'SELECT json_array({key_expr}) AS revision_key,{fields} FROM {table}'):
            key=row[0];db.execute('INSERT INTO revision_leaves VALUES(?,?,?,?)',(table,key,revision_bucket(table,key),revision_leaf(table,key,row[1:])))
    key=canonical(['inputs']);db.execute('INSERT INTO revision_leaves VALUES(?,?,?,?)',('@meta',key,revision_bucket('@meta',key),revision_leaf('@meta',key,[get_meta(db,'inputs',{})])))
    for bucket in range(256):_refresh_bucket(db,bucket)
    db.execute('DELETE FROM revision_dirty')
    set_meta(db,'revision_tracking_schema',2)

def _refresh_bucket(db,bucket):
    rows=[tuple(row) for row in db.execute('SELECT table_name,row_key,leaf_hash FROM revision_leaves WHERE bucket=? ORDER BY table_name,row_key',(bucket,))]
    db.execute('INSERT INTO revision_buckets VALUES(?,?) ON CONFLICT(bucket) DO UPDATE SET bucket_hash=excluded.bucket_hash',(bucket,digest(canonical(rows))))

def revise(db):
    """Update only dirty leaves and buckets, within the caller's transaction."""
    # Acquire a writer snapshot before reading dirty keys. Otherwise an external
    # writer could add a key between the read and the eventual dirty-key delete.
    if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
    if get_meta(db,'revision_tracking_schema')!=2:
        _bootstrap_revision(db)
        buckets=[row[0] for row in db.execute('SELECT bucket_hash FROM revision_buckets ORDER BY bucket')]
        revision=revision_root(buckets);set_meta(db,'memory_revision',revision);return revision
    dirty=[tuple(row) for row in db.execute('SELECT table_name,row_key FROM revision_dirty ORDER BY table_name,row_key')]
    if not dirty:
        return get_meta(db,'memory_revision')
    changed=set()
    for table,key in dirty:
        old=db.execute('SELECT bucket FROM revision_leaves WHERE table_name=? AND row_key=?',(table,key)).fetchone()
        if old:changed.add(old[0])
        if table=='@meta':
            row=[get_meta(db,'inputs',{})]
        else:
            keys,fields=REVISION_TABLES[table];values=json.loads(key)
            row=db.execute(f"SELECT {fields} FROM {table} WHERE "+' AND '.join(f'{column}=?' for column in keys),values).fetchone()
        if row is None:
            db.execute('DELETE FROM revision_leaves WHERE table_name=? AND row_key=?',(table,key))
        else:
            bucket=revision_bucket(table,key);changed.add(bucket)
            db.execute('INSERT INTO revision_leaves VALUES(?,?,?,?) ON CONFLICT(table_name,row_key) DO UPDATE SET bucket=excluded.bucket,leaf_hash=excluded.leaf_hash',(table,key,bucket,revision_leaf(table,key,row)))
    for bucket in sorted(changed):_refresh_bucket(db,bucket)
    db.execute('DELETE FROM revision_dirty')
    buckets=[row[0] for row in db.execute('SELECT bucket_hash FROM revision_buckets ORDER BY bucket')]
    revision=revision_root(buckets);set_meta(db,'memory_revision',revision);return revision


def normalized_words(value):
    return re.sub(r'\s+', ' ', re.sub(r'\d+(?:[.,]\d+)*', '#', str(value).lower())).strip()


def compact_descriptor(activity):
    """Conservative lookup fingerprints, never a semantic-equivalence proof."""
    examples = activity.get('examples') or []
    shapes, counts, representations, templates, literal_classes = set(), set(), set(), [], set()
    for ex in examples:
        spec = ex.get('structuredResponse') or {}
        kind = spec.get('kind') or ex.get('response') or 'entry'
        count = len(spec.get('fields', [])) if kind == 'number-fields' else 2 * spec.get('rows', 1) if kind == 'factor-pairs' else 2 if kind in ('number-pair', 'named-pair', 'fraction-pair', 'interval') or kind.startswith('constructed:') and kind.endswith(('pair', 'interval')) else 1
        shapes.add(kind + (':decimal' if spec.get('decimal') else '') + (':' + ex['answerFormat'] if ex.get('answerFormat') else ''))
        counts.add(count)
        picture = ex.get('figure') or ex.get('picture') or {}
        representation = ('grid:' + ex['gridDrawing'].get('kind', 'drawing')) if ex.get('gridDrawing') else 'angle-construction' if ex.get('angleConstruction') else picture.get('type', 'plain-text') + (':' + str(picture['layout']) if picture.get('layout') else '')
        representations.add(representation)
        text = ' '.join([*(ex.get('context') or []), ex.get('prompt', ''), ex.get('display') or ''])
        templates.append({'text': normalized_words(text), 'shape': kind, 'parts': count,
                          'decimalFields': spec.get('decimal', False),
                          'fieldTypes': [bool(f.get('decimal')) for f in spec.get('fields', [])],
                          'fieldLabels': [normalized_words(f.get('label', '')) for f in spec.get('fields', [])] + [normalized_words(spec[k]) for k in ('firstLabel', 'secondLabel') if k in spec],
                          'optionCount': len(spec.get('options', [])),
                          'representation': representation, 'unit': ex.get('unit', '')})
        for literal in re.findall(r'\d+(?:\.\d+)?', text):
            literal_classes.add('decimal:' + str(len(literal.split('.')[1])) + 'dp' if '.' in literal else 'integer:' + str(len(literal)) + 'digits')
    if not examples:
        shapes.add('unknown'); counts.add(0); representations.add('unknown')
    numeric = {'observedLiteralClasses': sorted(literal_classes), 'declared': activity.get('constraints', []),
               'scope': 'sampled-numeric-forms-not-complete-domain'}
    structural = digest(canonical(sorted(templates, key=canonical)))
    numeric_sig = digest(canonical(numeric))
    descriptor = {'pattern': activity.get('canonicalPatternId') or activity['id'], 'grade': activity['level'],
                  'title': activity.get('title', '')[:80], 'skills': activity.get('skillIds', [])[:4],
                  'responses': sorted(shapes), 'parts': sorted(counts), 'representation': sorted(representations),
                  'numeric': ','.join(sorted(literal_classes))[:100], 'objective': activity.get('objective', '')[:100]}
    # Bound the actual serialized descriptor, not just each individual field.
    while len(canonical(descriptor)) > 600:
        field = max(('objective', 'title', 'numeric', 'pattern'), key=lambda k: len(descriptor[k]))
        if len(descriptor[field]) > 16:
            descriptor[field] = descriptor[field][:-8]
        elif len(descriptor['skills']) > 1:
            descriptor['skills'].pop()
        else:
            descriptor['representation'] = descriptor['representation'][:1]
            descriptor['responses'] = descriptor['responses'][:1]
            break
    exact = digest(canonical({'structural': structural, 'numeric': numeric_sig, 'responses': sorted(shapes), 'parts': sorted(counts)}))
    return descriptor, structural, numeric_sig, exact


def index_descriptor(db, activity):
    descriptor, structural, numeric, exact = compact_descriptor(activity)
    text = ' '.join([activity.get('canonicalPatternId') or '', activity.get('title', ''), activity.get('objective', ''), *activity.get('skillIds', []), canonical(descriptor)])
    values = (activity['id'], canonical(descriptor), structural, numeric, exact, text)
    old = db.execute('select * from pattern_dictionary where generator_id=?', (activity['id'],)).fetchone()
    if old and tuple(old) == values:
        return
    db.execute('insert into pattern_dictionary values(?,?,?,?,?,?) on conflict(generator_id) do update set descriptor_json=excluded.descriptor_json,structural_signature=excluded.structural_signature,numeric_signature=excluded.numeric_signature,exact_signature=excluded.exact_signature,search_text=excluded.search_text', values)
    db.execute('delete from pattern_fts where generator_id=?', (activity['id'],))
    db.execute('insert into pattern_fts(generator_id,level,search_text) values(?,?,?)', (activity['id'], activity['level'], text))


def app_file(app, relative):
    if not isinstance(relative, str) or not relative.startswith('src/') or '\\' in relative or any(part in ('', '.', '..') for part in relative.split('/')):
        raise ValueError(f'Unsafe application binding: {relative}')
    path = Path(app) / relative
    if not path.resolve().is_relative_to(Path(app).resolve()) or path.is_symlink():
        raise ValueError(f'Unsafe application binding: {relative}')
    return path


def code_files(app):
    app = Path(app)
    paths = {p for p in (app / 'src/primary').rglob('*') if p.is_file() and p.suffix in ('.ts', '.tsx')}
    paths |= {app / 'src/engine/random.ts', app / 'src/school/curriculum.ts'}
    return {str(p.relative_to(app)): file_hash(p) for p in sorted(paths) if p.is_file()}


def input_state(app, inventory, registry):
    files = code_files(app)
    return {'appRoot': str(Path(app).resolve()), 'inventory': str(Path(inventory).resolve()),
            'registry': str(Path(registry).resolve()), 'inventorySha256': file_hash(inventory),
            'registrySha256': file_hash(registry) if Path(registry).exists() else None,
            'codeSnapshotHash': digest(canonical(files))}, files


def freshness(db, app):
    indexed = get_meta(db, 'inputs', {})
    if not indexed:
        return {'fresh': False, 'reason': 'not-synced', 'memory_revision': get_meta(db, 'memory_revision')}
    try:
        current, _ = input_state(app, indexed['inventory'], indexed['registry'])
    except OSError:
        return {'memory_revision': get_meta(db, 'memory_revision'), 'fresh': False,
                'reason': 'indexed-input-missing', 'indexedInventorySha256': indexed['inventorySha256'],
                'indexedCodeHash': indexed['codeSnapshotHash'], 'policy': POLICY}
    dictionary_ready = get_meta(db, 'dictionary_schema') == 1
    fresh = dictionary_ready and all(current[k] == indexed.get(k) for k in ['appRoot', 'inventorySha256', 'registrySha256', 'codeSnapshotHash'])
    return {'memory_revision': get_meta(db, 'memory_revision'), 'fresh': fresh,
            'indexedCodeHash': indexed['codeSnapshotHash'], 'currentCodeHash': current['codeSnapshotHash'],
            'indexedInventorySha256': indexed['inventorySha256'], 'currentInventorySha256': current['inventorySha256'],
            'indexedRegistrySha256': indexed['registrySha256'], 'currentRegistrySha256': current['registrySha256'],
            'reason': 'current-indexed-bindings' if fresh else 'compressed-dictionary-sync-required' if not dictionary_ready else 'bindings-changed-explicit-sync-required', 'policy': POLICY}


def registry_entries(app, registry):
    if not Path(registry).exists():
        return []
    raw = read_json(registry)
    if raw.get('schema') != 1 or not isinstance(raw.get('entries'), list):
        raise ValueError('Invalid RAG registry')
    entries = []
    for entry in raw['entries']:
        if not entry.get('canonicalPatternId') or not entry.get('files') or not entry.get('parameter'):
            raise ValueError('Registry entry lacks code bindings')
        valid = all(app_file(app, f['path']).is_file() and file_hash(app_file(app, f['path'])) == f['sha256'] for f in entry['files'])
        entries.append((entry, valid))
    return entries


def owner_files(app, activity, registry, bindings, texts):
    if registry:
        return [{'path': f['path'], 'sha256': bindings.get(f['path']), 'expectedSha256': f['sha256']} for f in registry['files']]
    paths = {'src/primary/generate.ts'}
    parameter = activity.get('parameter') or ''
    batch = re.match(r'^b(\d+)([emu])-', parameter)
    if batch:
        name = 'batch' + batch[1] + {'e': 'Early', 'm': 'Middle', 'u': 'Upper'}[batch[2]]
        paths |= {f'src/primary/paperImports/{name}.ts', f'src/primary/paperImports/{name}Meta.ts'}
    pattern = activity.get('canonicalPatternId')
    if pattern:
        for path, text in texts.items():
            if path.endswith('Meta.ts') and pattern in text:
                paths.add(path); paths.add(path.replace('Meta.ts', '.ts')); break
    if '-paper-' in activity['id']:
        paths |= {'src/primary/paperQuestions.ts', 'src/primary/paperImports/questions.ts', 'src/primary/paperImports/catalog.ts'}
    return [{'path': p, 'sha256': bindings[p]} for p in sorted(paths) if p in bindings]


def sync(db, app, inventory, registry, queue=None):
    inputs, bindings = input_state(app, inventory, registry)
    activities = read_json(inventory)['activities']
    rag = registry_entries(app, registry)
    by_parameter = {entry['parameter']: (entry, valid) for entry, valid in rag}
    indexed = {a['id']: a for a in activities if a.get('parameter') != 'mixed'}
    for entry, _ in rag:
        identity = f'p{entry["level"]}s-paper-{entry["parameter"]}'
        indexed.setdefault(identity, {**entry, 'id': identity, 'track': 'standard', 'examples': []})
    texts = {path: (Path(app) / path).read_text() for path in bindings if path.endswith('Meta.ts')}
    # Full file hashes still gate every lookup. Only per-generator version identity
    # can ignore unrelated, proven isolated registrations and their generated glue.
    import subprocess
    scope = inputs['codeSnapshotHash']
    if Path(registry).exists():
        try:
            payload = {'app':str(Path(app).resolve()),'registry':read_json(registry),'bindings':bindings}
            result = subprocess.run(['node',str(ROOT/'scripts/rag-binding-scope.mjs')], input=canonical(payload),capture_output=True,text=True,check=True,timeout=20)
            scope = digest(canonical(json.loads(result.stdout)))
        except (OSError,ValueError,subprocess.SubprocessError): pass  # Full hash on any uncertainty.
    with db:
        db.execute('insert or ignore into code_snapshots values(?,?)', (inputs['codeSnapshotHash'], canonical(bindings)))
        db.execute('update generators set active=0')
        for activity in sorted(indexed.values(), key=lambda a: a['id']):
            entry, exact = by_parameter.get(activity.get('parameter'), (None, True))
            family = activity.get('canonicalPatternId') or 'activity:' + activity['id']
            files = owner_files(app, activity, entry, bindings, texts)
            constraints = {'declared': activity.get('constraints', entry.get('constraints', []) if entry else []),
                           'status': 'metadata-only-domain-not-independently-reviewed',
                           'sampledExamples': activity.get('examples', [])[:2]}
            metadata = {k: activity.get(k) for k in ['id', 'level', 'track', 'title', 'objective', 'skillIds', 'canonicalPatternId', 'parameter', 'observedFamilies', 'examples']}
            available = bool(exact and files)
            binding = 'indexed-current-code-not-source-verified' if available else 'registry-code-binding-stale' if entry else 'implementation-binding-unresolved'
            version = digest(canonical({'metadata': metadata, 'constraints': constraints, 'files': files, 'snapshot': scope, 'registry': entry, 'available': available}))
            prior = db.execute('select current_version from generators where generator_id=?', (activity['id'],)).fetchone()
            db.execute('insert or ignore into generator_versions values(?,?,?,?,?,?,?,?)', (version, activity['id'], inputs['codeSnapshotHash'], canonical(metadata), canonical(files), canonical(constraints), int(available), binding))
            semantic = ' '.join([activity.get('title', ''), activity.get('objective', ''), activity.get('canonicalPatternId') or '', *activity.get('skillIds', []), canonical(activity.get('examples', []))])
            db.execute('insert into generators values(?,?,?,?,?,?,?,?,?,1) on conflict(generator_id) do update set family_id=excluded.family_id,canonical_pattern_id=excluded.canonical_pattern_id,level=excluded.level,title=excluded.title,objective=excluded.objective,skill_ids_json=excluded.skill_ids_json,semantic_text=excluded.semantic_text,current_version=excluded.current_version,active=1', (activity['id'], family, activity.get('canonicalPatternId'), activity['level'], activity.get('title', ''), activity.get('objective', ''), canonical(activity.get('skillIds', [])), semantic, version))
            index_descriptor(db, activity)
            if prior and prior[0] != version:
                event = digest(canonical([activity['id'], prior[0], version]))
                db.execute('insert or ignore into binding_invalidations values(?,?,?,?,?)', (event, activity['id'], prior[0], version, 'metadata-or-conservative-runtime-code-binding-changed'))
        if queue and Path(queue).exists():
            with read_only(queue) as source:
                for paper in source.execute('select paper_id,level,title,source_sha256,source_pdf from papers'):
                    db.execute('insert into papers(paper_id,level,title,source_sha256,source_pdf) values(?,?,?,?,?) on conflict(paper_id) do update set level=excluded.level,title=excluded.title,source_sha256=excluded.source_sha256,source_pdf=excluded.source_pdf', tuple(paper))
        db.execute('delete from pattern_fts where generator_id in (select generator_id from generators where active=0)')
        set_meta(db, 'inputs', inputs)
        set_meta(db, 'dictionary_schema', 1)
        revision = revise(db)
    return {'memory_revision': revision, 'generators': len(indexed), 'availableGenerators': db.execute('select count(*) from generators g join generator_versions v on g.current_version=v.version_id where g.active=1 and v.available=1').fetchone()[0], 'policy': POLICY}


def queue_staging(queue):
    with read_only(queue) as source:
        return Path(json.loads(source.execute("select value from meta where key='inputs'").fetchone()[0])['staging'])


def ingest(db, paper_id, queue):
    staging = queue_staging(queue)
    with read_only(queue) as q, read_only(staging) as source, db:
        paper = q.execute('select * from papers where paper_id=?', (paper_id,)).fetchone()
        if paper is None:
            raise ValueError('Unknown source paper')
        snapshot = dict(source.execute('select key,value from meta')).get('snapshotId', str(staging.resolve()))
        db.execute("insert into papers(paper_id,level,title,source_sha256,source_pdf,ingest_state) values(?,?,?,?,?,'regions-ingested') on conflict(paper_id) do update set ingest_state='regions-ingested'", (paper_id, paper['level'], paper['title'], paper['source_sha256'], paper['source_pdf']))
        for queued in q.execute('select bank_line from region_queue where paper_id=? order by bank_line', (paper_id,)):
            line = queued['bank_line']; row = source.execute('select * from regions where bank_line=? and paper_id=?', (line, paper_id)).fetchone()
            if row is None:
                raise ValueError(f'Queue region {line} missing from staging')
            key = f'{snapshot}:{line}'
            values = (key, paper_id, snapshot, line, row['candidate_id'], row['question_number'], row['page_numbers_json'], row['source_sha256'], row['raw_text'], row['raw_text_sha256'], canonical([dict(r) for r in source.execute('select * from subpart_candidates where bank_line=? order by ordinal', (line,))]), canonical([dict(r) for r in source.execute('select * from diagram_dependencies where bank_line=? order by page_number', (line,))]), row['triage_flags_json'], row['kind'], 'unresolved')
            prior = db.execute('select * from regions where region_key=?', (key,)).fetchone()
            if prior and tuple(prior) != values:
                raise ValueError('Immutable staged region changed; use a new staging snapshot')
            db.execute('insert or ignore into regions values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', values)
        revise(db)
    return inspect_paper(db, paper_id)


def outcome(db, decision_id, kind, generator_id=None, version=None, evidence=None):
    evidence = evidence or {}
    event = digest(canonical([decision_id, kind, generator_id, version, evidence]))
    db.execute('insert or ignore into decision_outcomes values(?,?,?,?,?,?)', (event, decision_id, kind, generator_id, version, canonical(evidence)))


def verify(path, expected, label):
    path = Path(path)
    if not isinstance(expected, str) or not re.fullmatch(r'[a-f0-9]{64}', expected) or not path.is_file() or path.is_symlink() or file_hash(path) != expected:
        raise ValueError(f'{label} hash mismatch/missing: {path}')


def record(db, job, app):
    job = Path(job).resolve(); packet = read_json(job / 'packet.json'); state = read_json(job / 'checkpoint.json')
    if state.get('status') not in ('reuse', 'needs-review', 'checks-passed', 'generated-unverified') or state.get('schema') != 1 or state.get('jobId') != packet.get('jobId') or state.get('packetSha256') != digest(canonical(packet)):
        raise ValueError('Invalid/nonterminal worker checkpoint or changed packet')
    name = state.get('candidateFile', '')
    if not re.fullmatch(r'candidate-attempt-[1-3]\.json', name):
        raise ValueError('Invalid candidate receipt path')
    verify(job / name, state.get('candidateSha256'), 'Candidate receipt')
    proposal = read_json(job / name); decision = proposal.get('decision')
    if decision not in ('reuse', 'needs-review', 'new-generator') or decision != state.get('decision') or not proposal.get('sourceRefs'):
        raise ValueError('Decision mismatch or missing source references')
    if decision in ('reuse', 'needs-review') and state['status'] != decision or decision == 'new-generator' and state['status'] not in ('checks-passed', 'generated-unverified'):
        raise ValueError('Worker status does not match decision')
    expected = {}
    for file in proposal.get('files', []):
        rel = file.get('path', '')
        if not re.fullmatch(r'candidate/src/primary/paperImports/rag[A-Za-z0-9_-]+(?:\.test)?\.tsx?', rel) or not isinstance(file.get('content'), str):
            raise ValueError('Invalid candidate binding path')
        expected[rel] = digest(file['content']); verify(job / rel, expected[rel], 'Candidate code')
    if expected != state.get('fileSha256', {}) or decision != 'new-generator' and expected:
        raise ValueError('Candidate code binding differs')
    if state['status'] == 'checks-passed':
        report_path = job / 'rag-check-report.json'; verify(report_path, state.get('checkReportSha256'), 'Checker report')
        report = read_json(report_path)
        if report.get('status') != 'checks-passed' or report.get('candidateFiles') != {p.removeprefix('candidate/'): h for p, h in expected.items()} or report.get('packetSha256', state['packetSha256']) != state['packetSha256'] or report.get('candidateSha256', state['candidateSha256']) != state['candidateSha256']:
            raise ValueError('Checker receipt differs')
    refs = proposal['sourceRefs']; sources = []
    for ref in refs:
        source = next((s for s in packet['sourceRegions'] if (s['bankLine'], s['paperId'], s['questionNumber']) == (ref.get('bankLine'), ref.get('paperId'), ref.get('questionNumber'))), None)
        if not source or not ref.get('pageNumbers') or any(not isinstance(p, int) or isinstance(p, bool) or p not in source['pageNumbers'] for p in ref['pageNumbers']):
            raise ValueError('Out-of-packet source reference')
        verify(source['sourcePdf'], source['sourceSha256'], 'Source PDF')
        if decision != 'needs-review' and (ref['questionNumber'] == 'unresolved' or any(not any(t['page'] == p and t.get('text', '').strip() and not t.get('missing') for t in source['pageTexts']) for p in ref['pageNumbers'])):
            raise ValueError('Unresolved cited source requires needs-review')
        sources.append(source)
    fresh = freshness(db, app)
    targets = []
    if decision == 'reuse':
        if not fresh['fresh']:
            raise ValueError('Stale memory: sync current code before reuse')
        targets = list(db.execute('select g.*,v.available from generators g join generator_versions v on v.version_id=g.current_version where g.active=1 and v.available=1 and g.level=? and (g.generator_id=? or g.canonical_pattern_id=?) order by g.generator_id', (packet['level'], proposal['canonicalPatternId'], proposal['canonicalPatternId'])))
        if not targets:
            raise ValueError('Unknown/unavailable reuse target')
    identity = digest(canonical([packet['jobId'], state['packetSha256'], state['candidateSha256']]))
    integrated = False
    with db:
        values = (identity, packet['jobId'], state['packetSha256'], state['candidateSha256'], decision, proposal.get('canonicalPatternId', ''), proposal.get('reasoning', ''), canonical(proposal.get('blockingGaps', [])), state['status'], state.get('checkReportSha256'), canonical(refs))
        old = db.execute('select * from decisions where decision_id=?', (identity,)).fetchone()
        if old and tuple(old) != values:
            raise ValueError('Immutable decision receipt changed')
        db.execute('insert or ignore into decisions values(?,?,?,?,?,?,?,?,?,?,?)', values)
        for ref, source in zip(refs, sources):
            db.execute('insert into papers(paper_id,level,title,source_sha256,source_pdf) values(?,?,?,?,?) on conflict(paper_id) do nothing', (source['paperId'], source['level'], source.get('title', ''), source['sourceSha256'], source['sourcePdf']))
            db.execute('insert or ignore into decision_sources values(?,?,?,?,?,?)', (identity, ref['paperId'], ref['bankLine'], ref['questionNumber'], canonical(ref['pageNumbers']), source['sourceSha256']))
        outcome(db, identity, decision, evidence={'workerStatus': state['status'], 'indexedCodeSnapshot': get_meta(db, 'inputs', {}).get('codeSnapshotHash'), 'memoryFresh': fresh['fresh'], 'policy': POLICY})
        for target in targets:
            outcome(db, identity, 'reuse', target['generator_id'], target['current_version'], {'binding': 'indexed-current-code', 'sourceReview': 'not-asserted'})
        if decision == 'new-generator' and state['status'] == 'checks-passed' and fresh['fresh']:
            inputs = get_meta(db, 'inputs')
            for entry, valid in registry_entries(app, inputs['registry']):
                public_refs = [{'paperId': r['paperId'], 'sourceQuestion': r['questionNumber'], 'sourcePages': sorted(set(r['pageNumbers']))} for r in refs]
                exact = valid and entry.get('jobId') == packet['jobId'] and entry.get('packetSha256') == state['packetSha256'] and entry.get('candidateSha256') == state['candidateSha256'] and entry.get('checkReportSha256') == state.get('checkReportSha256') and entry.get('canonicalPatternId') == proposal.get('canonicalPatternId') and entry.get('sourceRefs') == public_refs and {f['path']: f['sha256'] for f in entry['files']} == {p.removeprefix('candidate/'): h for p, h in expected.items()}
                if exact:
                    target = db.execute('select * from generators where active=1 and generator_id=?', (f'p{entry["level"]}s-paper-{entry["parameter"]}',)).fetchone()
                    if target:
                        outcome(db, identity, 'code-integrated', target['generator_id'], target['current_version'], {'registryEntrySha256': digest(canonical(entry)), 'sourceReview': 'not-asserted'}); integrated = True
        revision = revise(db)
    return {'memory_revision': revision, 'decisionId': identity, 'decision': decision, 'integration': 'code-integrated' if integrated else 'not-integrated', 'reuseTargets': [t['generator_id'] for t in targets], 'policy': POLICY}


def inspect_paper(db, paper_id):
    paper = db.execute('select * from papers where paper_id=?', (paper_id,)).fetchone()
    if not paper:
        raise ValueError('Paper is not in memory')
    sources = [dict(r) for r in db.execute('select s.*,d.decision,d.target,d.worker_status from decision_sources s join decisions d using(decision_id) where s.paper_id=? order by s.bank_line,s.decision_id', (paper_id,))]
    current = {r[0] for r in db.execute("select distinct s.bank_line from decision_sources s join decision_outcomes o using(decision_id) join generators g on g.generator_id=o.generator_id join generator_versions v on v.version_id=g.current_version where s.paper_id=? and o.outcome in ('reuse','code-integrated') and g.active=1 and v.available=1 and o.version_id=g.current_version", (paper_id,))}
    inputs = get_meta(db, 'inputs', {})
    binding_fresh = freshness(db, inputs['appRoot'])['fresh'] if inputs else False
    if not binding_fresh:
        current = set()
    regions = [dict(r) for r in db.execute('select region_key,bank_line,candidate_id,question_number,page_numbers_json,subparts_json,diagram_dependencies_json,source_state from regions where paper_id=? order by bank_line', (paper_id,))]
    for row in regions:
        for key in ['page_numbers_json', 'subparts_json', 'diagram_dependencies_json']:
            row[key.removesuffix('_json')] = json.loads(row.pop(key))
    return {'memory_revision': get_meta(db, 'memory_revision'), 'paper': {k: paper[k] for k in ['paper_id', 'level', 'title', 'source_sha256', 'ingest_state']}, 'regions': regions, 'decisions': sources,
            'pendingBankLines': sorted({r['bank_line'] for r in regions} - current),
            'pendingMeaning': 'No current reuse/code-integrated association; associations do not assert complete source questions.',
            'sourceCompleteness': 'unknown', 'bindingsFresh': binding_fresh, 'policy': POLICY}


def review_backlog(db, level, text, limit):
    wanted = set(re.findall(r'[a-z0-9]{3,}', text.lower())); ranked = []
    for row in db.execute("select distinct d.* from decisions d join decision_sources s using(decision_id) join papers p using(paper_id) where p.level=? and d.blocking_gaps_json!='[]' order by d.decision_id", (level,)):
        terms = set(re.findall(r'[a-z0-9]{3,}', (row['reasoning'] + ' ' + row['blocking_gaps_json']).lower()))
        score = len(wanted & terms)
        if wanted and not score:
            continue
        ranked.append((-score, row['decision_id'], {'decisionId': row['decision_id'], 'jobId': row['job_id'], 'target': row['target'], 'reasoning': row['reasoning'], 'blockingGaps': json.loads(row['blocking_gaps_json']), 'sourceRefs': json.loads(row['source_refs_json']), 'status': 'historical-review-gap-not-asserted-current', 'workerStatus': row['worker_status']}))
    return [entry for _, _, entry in sorted(ranked)[:limit]]


def query_shape_hint(text):
    parts = sorted(set(re.findall(r"\(([a-f])\)", text.lower())))
    return {'partCount': len(parts) if len(parts) >= 2 else None,
            'construction': bool(re.search(r'\b(?:draw|construct|reflect)\b', text, re.I)),
            'status': 'provisional-text-hint-not-task-verification'}


def inspect_generator(db, generator_id):
    row = db.execute('select g.*,v.* from generators g join generator_versions v on v.version_id=g.current_version where g.generator_id=?', (generator_id,)).fetchone()
    if not row:
        raise ValueError('Unknown generator')
    result = dict(row)
    for field in ['metadata_json', 'code_files_json', 'constraints_json', 'skill_ids_json']:
        result[field.removesuffix('_json')] = json.loads(result.pop(field))
    result['sourceEvidence'] = [dict(r) for r in db.execute('select s.*,d.reasoning,d.blocking_gaps_json,o.outcome,o.version_id from decision_sources s join decisions d using(decision_id) join decision_outcomes o using(decision_id) where o.generator_id=? order by s.paper_id,s.bank_line', (generator_id,))]
    result['policy'] = POLICY
    return result


def query(db, app, level, text, limit):
    if not 1 <= limit <= 100:
        raise ValueError('Limit must be 1..100')
    state = freshness(db, app)
    backlog = review_backlog(db, level, text, min(limit, 5))
    if not state['fresh']:
        return {**state, 'generators': [], 'reviewBacklog': backlog}
    hint = query_shape_hint(text)
    terms = list(dict.fromkeys(re.findall(r'[a-z0-9]{2,}', text.lower())))[:48]
    if terms:
        expression = ' OR '.join('"' + word + '"' for word in terms)
        ranked = list(db.execute('select generator_id,bm25(pattern_fts) as rank from pattern_fts where pattern_fts match ? and level=? order by rank,generator_id limit ?', (expression, level, min(500, max(40, limit * 12)))))
    else:
        ranked = list(db.execute('select generator_id,0 as rank from pattern_fts where level=? order by generator_id limit ?', (level, min(500, max(40, limit * 12)))))
    candidates = []
    for matched in ranked:
        row = db.execute('select g.generator_id,g.family_id,g.canonical_pattern_id,g.level,g.current_version,v.code_files_json,v.binding_status,d.descriptor_json,d.structural_signature,d.numeric_signature,d.exact_signature from generators g join generator_versions v on v.version_id=g.current_version join pattern_dictionary d using(generator_id) where g.active=1 and v.available=1 and g.generator_id=?', (matched['generator_id'],)).fetchone()
        if not row:
            continue
        descriptor = json.loads(row['descriptor_json']); mismatches = []
        if hint['partCount'] and hint['partCount'] not in descriptor['parts']:
            mismatches.append('source-text-parts:' + str(hint['partCount']) + ';generator-parts:' + ','.join(map(str, descriptor['parts'])))
        if hint['construction'] and not any('construction' in rep or 'grid:' in rep for rep in descriptor['representation']):
            mismatches.append('source-text-suggests-construction;generator-is-not-construction')
        candidates.append((bool(mismatches), matched['rank'], row['generator_id'], row, descriptor, mismatches))
    results = []; fingerprints = set()
    for _, _, _, row, descriptor, mismatches in sorted(candidates):
        key = (row['family_id'], row['exact_signature'])
        if key in fingerprints:
            continue
        fingerprints.add(key)
        prior = [dict(p) for p in db.execute('select distinct s.paper_id,s.bank_line,s.question_number,s.page_numbers_json,o.outcome,o.version_id from decision_outcomes o join decision_sources s using(decision_id) where o.generator_id=? order by s.paper_id,s.bank_line limit 3', (row['generator_id'],))]
        for source in prior:
            source['bindingCurrent'] = source['version_id'] == row['current_version']
            source['pageNumbers'] = json.loads(source.pop('page_numbers_json'))
        results.append({'id': row['generator_id'], 'familyId': row['family_id'], 'canonicalPatternId': row['canonical_pattern_id'], 'level': row['level'], 'title': descriptor['title'], 'objective': descriptor['objective'], 'skillIds': descriptor['skills'], 'codeVersion': row['current_version'], 'codeFiles': json.loads(row['code_files_json']),
                        'descriptor': row['descriptor_json'], 'responseShapes': descriptor['responses'], 'partCounts': descriptor['parts'], 'representations': descriptor['representation'], 'numericConstraints': descriptor['numeric'],
                        'structuralSignature': row['structural_signature'], 'numericSignature': row['numeric_signature'], 'exactSignature': row['exact_signature'], 'signatureMeaning': 'candidate-lookup-not-semantic-proof', 'responseShapeMismatch': mismatches,
                        'constraints': {'declared': [], 'status': 'full-declared-constraints-on-demand;numeric-forms-sampled-only'}, 'priorSources': prior, 'bindingStatus': row['binding_status'], 'evidenceReference': {'command': 'inspect-generator', 'generatorId': row['generator_id']}})
        if len(results) >= limit:
            break
    return {**state, 'generators': results, 'reviewBacklog': backlog, 'queryResponseHint': hint,
            'retrieval': {'method': 'persistent-fts5-bm25-with-provisional-response-hints', 'topK': limit, 'descriptorCharacterLimit': 600, 'matchesAreProvisional': True}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--database', type=Path, default=ROOT / '.generated/rag-memory.sqlite')
    sub = p.add_subparsers(dest='command', required=True)
    for name in ['sync', 'status', 'query', 'record']:
        cmd = sub.add_parser(name); cmd.add_argument('--app-root', type=Path, default=ROOT)
        if name == 'sync':
            cmd.add_argument('--inventory', type=Path); cmd.add_argument('--registry', type=Path); cmd.add_argument('--queue', type=Path, default=ROOT / '.generated/corpus-pattern-queue.sqlite')
        elif name == 'query':
            cmd.add_argument('--level', type=int, choices=range(1, 7), required=True); cmd.add_argument('--query', default=''); cmd.add_argument('--limit', type=int, default=5)
        elif name == 'record':
            cmd.add_argument('--job', type=Path, required=True)
    cmd = sub.add_parser('ingest'); cmd.add_argument('--paper-id', required=True); cmd.add_argument('--queue', type=Path, default=ROOT / '.generated/corpus-pattern-queue.sqlite')
    cmd = sub.add_parser('inspect'); cmd.add_argument('--paper-id', required=True)
    cmd = sub.add_parser('inspect-generator'); cmd.add_argument('--generator-id', required=True)
    args = p.parse_args()
    try:
        if args.command in ('status', 'query', 'inspect', 'inspect-generator'):
            if not args.database.exists():
                raise ValueError('Memory not initialized; run sync first')
            with read_only(args.database) as db:
                if args.command == 'status': result = freshness(db, args.app_root)
                elif args.command == 'query':
                    if not 1 <= args.limit <= 100: raise ValueError('Limit must be 1..100')
                    result = query(db, args.app_root, args.level, args.query, args.limit)
                elif args.command == 'inspect': result = inspect_paper(db, args.paper_id)
                else: result = inspect_generator(db, args.generator_id)
        else:
            with connect(args.database) as db:
                if args.command == 'sync': result = sync(db, args.app_root, args.inventory or args.app_root / '.generated/question-pattern-inventory.json', args.registry or args.app_root / 'src/primary/paperImports/ragRegistry.json', args.queue)
                elif args.command == 'ingest': result = ingest(db, args.paper_id, args.queue)
                else: result = record(db, args.job, args.app_root)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError, sqlite3.Error, KeyError, TypeError) as exc:
        p.exit(1, f'Memory rejected: {exc}\n')


if __name__ == '__main__':
    main()
