#!/usr/bin/env python3
"""Lossless, local-only OCR staging and deterministic *candidate* triage.
This is preparation for source review, never a question/answer verification system.
"""
from pathlib import Path
import argparse
import collections
import datetime
import fcntl
import hashlib
import json
import os
import re
import sqlite3
import tempfile
import unicodedata
import zlib

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY = ROOT.parent / 'Singapore Maths Paper Library'
VERSION = 1
POLICY = ('All regions, boundaries, subparts, tags and clusters are unverified candidates. '
          'Clusters do not establish mathematical equivalence. Diagram dependency remains '
          'unresolved until visual review. No exact source coverage is earned by this staging database.')


def js(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def filehash(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def require(test, message):
    if not test:
        raise ValueError(message)


def connect(path, readonly=False):
    c = sqlite3.connect('file:' + str(Path(path).resolve()) + '?mode=ro', uri=True) if readonly else sqlite3.connect(path)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c


DDL = '''
CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE source_artifacts(path TEXT PRIMARY KEY, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, raw_zlib BLOB);
CREATE TABLE papers(paper_id TEXT PRIMARY KEY, level INTEGER, year INTEGER, title TEXT, source_sha256 TEXT NOT NULL, source_pdf TEXT NOT NULL, page_count INTEGER NOT NULL, raw_manifest_json TEXT NOT NULL, raw_digitization_json TEXT NOT NULL, exact_source_coverage INTEGER NOT NULL DEFAULT 0 CHECK(exact_source_coverage=0));
CREATE TABLE pages(paper_id TEXT NOT NULL REFERENCES papers, page_number INTEGER NOT NULL, source_sha256 TEXT NOT NULL, artifact_path TEXT NOT NULL REFERENCES source_artifacts, source_line INTEGER NOT NULL, source_byte_offset INTEGER NOT NULL, source_byte_length INTEGER NOT NULL, raw_line_sha256 TEXT NOT NULL, raw_line_zlib BLOB NOT NULL, method TEXT, recognition_level TEXT, coordinate_system TEXT, page_bounds_json TEXT, mean_confidence REAL, text TEXT, PRIMARY KEY(paper_id,page_number));
CREATE TABLE page_blocks(paper_id TEXT NOT NULL, page_number INTEGER NOT NULL, block_index INTEGER NOT NULL, text TEXT, bbox_json TEXT, confidence REAL, raw_json TEXT NOT NULL, match_signature TEXT NOT NULL, PRIMARY KEY(paper_id,page_number,block_index), FOREIGN KEY(paper_id,page_number) REFERENCES pages);
CREATE INDEX page_block_match ON page_blocks(paper_id,page_number,match_signature);
CREATE TABLE regions(bank_line INTEGER PRIMARY KEY, candidate_id TEXT NOT NULL, paper_id TEXT NOT NULL REFERENCES papers, source_sha256 TEXT NOT NULL, source_byte_offset INTEGER NOT NULL, source_byte_length INTEGER NOT NULL, raw_line_sha256 TEXT NOT NULL, raw_line_zlib BLOB NOT NULL, question_number TEXT, kind TEXT, start_page INTEGER, page_numbers_json TEXT NOT NULL, raw_text TEXT NOT NULL, raw_text_sha256 TEXT NOT NULL, confidence_json TEXT, boundaries_status TEXT NOT NULL DEFAULT 'heuristic-unverified', completeness TEXT NOT NULL DEFAULT 'unknown', answer_verified INTEGER NOT NULL DEFAULT 0 CHECK(answer_verified=0), exact_source_coverage INTEGER NOT NULL DEFAULT 0 CHECK(exact_source_coverage=0), visual_review_required INTEGER NOT NULL DEFAULT 1 CHECK(visual_review_required=1), number_normalized_text TEXT NOT NULL, number_profile_json TEXT NOT NULL, tags_json TEXT NOT NULL, triage_flags_json TEXT NOT NULL, text_cluster_id TEXT NOT NULL, family_bucket_id TEXT NOT NULL);
CREATE INDEX region_candidate_id ON regions(candidate_id);
CREATE INDEX region_paper ON regions(paper_id,bank_line);
CREATE INDEX region_cluster ON regions(text_cluster_id,bank_line);
CREATE INDEX region_family ON regions(family_bucket_id,bank_line);
CREATE TABLE region_pages(bank_line INTEGER NOT NULL REFERENCES regions, page_number INTEGER NOT NULL, ordinal INTEGER NOT NULL, source_link TEXT, has_page_record INTEGER NOT NULL, PRIMARY KEY(bank_line,ordinal));
CREATE TABLE region_blocks(bank_line INTEGER NOT NULL REFERENCES regions, block_index INTEGER NOT NULL, page_number INTEGER, text TEXT, bbox_json TEXT, confidence REAL, method TEXT, recognition_level TEXT, raw_json TEXT NOT NULL, matched_page_block_indices_json TEXT NOT NULL, PRIMARY KEY(bank_line,block_index));
CREATE TABLE subpart_candidates(bank_line INTEGER NOT NULL REFERENCES regions, ordinal INTEGER NOT NULL, label TEXT NOT NULL, character_offset INTEGER NOT NULL, marker_end INTEGER NOT NULL, proposed_end INTEGER NOT NULL, marker_text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unverified-marker-only', PRIMARY KEY(bank_line,ordinal));
CREATE TABLE diagram_dependencies(bank_line INTEGER NOT NULL REFERENCES regions, page_number INTEGER NOT NULL, source_sha256 TEXT NOT NULL, source_link TEXT NOT NULL, dependency TEXT NOT NULL DEFAULT 'unresolved', cues_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'needs-source-page-visual-review', PRIMARY KEY(bank_line,page_number));
CREATE TABLE candidate_clusters(cluster_id TEXT PRIMARY KEY, level INTEGER, region_count INTEGER NOT NULL, representative_bank_line INTEGER NOT NULL REFERENCES regions, normalized_text_sha256 TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unverified-number-normalized-text-candidate', exact_source_coverage INTEGER NOT NULL DEFAULT 0 CHECK(exact_source_coverage=0));
CREATE TABLE family_buckets(bucket_id TEXT PRIMARY KEY, level INTEGER, tags_json TEXT NOT NULL, region_count INTEGER NOT NULL, text_cluster_count INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'unverified-coarse-triage-only');
CREATE TABLE issues(kind TEXT NOT NULL, entity TEXT NOT NULL, detail TEXT NOT NULL);
'''

TAGS = {
    'counting-place-value': r'\b(count|counting|digit|place value|tens|hundreds|thousands|number bonds?)\b',
    'four-operations': r'\b(add|addition|subtract|subtraction|multiply|multiplication|divide|division|sum|difference|product|quotient|remainder|total|altogether|left)\b|[+×÷−]',
    'fractions': r'\b(fraction|numerator|denominator|half|halves|quarter|thirds|fifths|sixths|sevenths|eighths)\b|\d\s*/\s*\d',
    'decimals': r'\b(decimal|tenths|hundredths|thousandths)\b|\d+\.\d+',
    'percentage': r'\b(percent|percentage|discount|gst|interest)\b|%',
    'ratio-rate-speed': r'\b(ratio|rate|speed|average|per hour|per minute|km/h)\b|\d\s*:\s*\d',
    'money': r'\b(dollar|dollars|cent|cents|cost|price|paid|change)\b|\$',
    'measurement-time': r'\b(length|height|mass|weight|capacity|volume|litre|litres|millilitre|kilogram|gram|minute|hour|second|time|clock|cm|kg|ml|km)\b',
    'geometry-area-volume': r'\b(angle|angles|triangle|square|rectangle|circle|semicircle|perimeter|area|volume|cube|cuboid|parallel|perpendicular|radius|diameter|circumference|symmetry)\b',
    'data-tables-graphs': r'\b(graph|chart|table|pictogram|pie chart|bar graph|line graph|data|tally)\b',
    'patterns-algebra': r'\b(pattern|sequence|equation|algebra|unknown)\b',
}
TAG_REGEX = {name: re.compile(pattern, re.I) for name, pattern in TAGS.items()}
DIAGRAM_REGEX = re.compile(r'\b(diagram|figure|shown|shaded|drawing|draw|picture|graph|chart|table|clock|grid|number line|net|nets|shape|shapes|triangle|rectangle|circle|square|box|boxes|balls|beads|cubes|coins)\b', re.I)
NUMBER_REGEX = re.compile(r'\d+(?:[,.]\d+)*')
SUBPART_REGEX = re.compile(r'(?<!\w)(?:\(([a-h]|i{1,3}|iv|vi{0,3}|ix)\)|([a-h])\))(?=\s|$)', re.I)


def features(text, candidate):
    # Preserve the verbatim source and quantities separately. This lossy text is ONLY a review index.
    normalized = unicodedata.normalize('NFKC', text).lower()
    normalized = re.sub(r'^\s*\d+[.)]?\s+', '', normalized, count=1)
    normalized = re.sub(r'\s+', ' ', NUMBER_REGEX.sub('<n>', normalized)).strip()
    tags = sorted(name for name, pattern in TAG_REGEX.items() if pattern.search(text))
    markers = list(SUBPART_REGEX.finditer(text))
    cues = sorted(set(m.group(0).lower() for m in DIAGRAM_REGEX.finditer(text)))
    flags = ['all-boundaries-need-review', 'diagram-dependency-unresolved']
    if cues:
        flags.append('visual-cue-present')
    if len(candidate.get('pageNumbers', [])) > 1:
        flags.append('cross-page-region')
    confidence = candidate.get('confidence') or {}
    mean = confidence.get('meanOcrConfidence') if isinstance(confidence, dict) else None
    if mean is not None and mean < .85:
        flags.append('low-ocr-confidence')
    if not text.strip():
        flags.append('empty-text')
    if candidate.get('kind') != 'question-candidate':
        flags.append('non-question-region-kind')
    if not tags:
        flags.append('unclassified-mathematics')
    return normalized, tags, markers, cues, flags


def match_signature(block):
    return digest(js([block.get('text'), block.get('bbox'), block.get('confidence')]))


def input_files(library):
    manifest = json.loads((library / 'manifest.json').read_bytes())
    digitization = json.loads((library / 'digitization-manifest.json').read_bytes())
    paths = [library / name for name in ('manifest.json', 'digitization-manifest.json', 'question-candidates.jsonl')]
    paths += [Path(r['pagesPath']) for r in digitization['records'].values() if r.get('pagesPath')]
    return manifest, digitization, sorted(set(paths), key=str)


def input_fingerprint(library):
    manifest, digitization, paths = input_files(library)
    hashes = {str(p): {'sha256': filehash(p), 'bytes': p.stat().st_size} for p in paths}
    snapshot = digest(js({'algorithmVersion': VERSION, 'sources': hashes}))
    return manifest, digitization, hashes, snapshot


def add_issue(c, kind, entity, detail):
    c.execute('INSERT INTO issues VALUES (?,?,?)', (kind, str(entity), str(detail)))


def build(library):
    library = library.resolve()
    require(library != ROOT and ROOT not in library.parents, 'Source staging must live outside the application workspace')
    manifest, digitization, inputs, snapshot = input_fingerprint(library)
    out = library / 'structure' / snapshot
    out.mkdir(parents=True, exist_ok=True)
    db = out / 'staging.sqlite'
    if db.exists():
        return audit(db, library, deep=False)
    temporary = out / 'staging.sqlite.building'
    require(not temporary.exists(), 'Interrupted staging file exists; inspect it before explicitly removing: ' + str(temporary))
    c = connect(temporary)
    c.execute('PRAGMA journal_mode=DELETE')
    c.executescript(DDL)
    c.executemany('INSERT INTO meta VALUES (?,?)', [('schemaVersion', str(VERSION)), ('snapshotId', snapshot), ('policy', POLICY), ('localOnly', 'true')])
    for path, receipt in inputs.items():
        raw = Path(path).read_bytes() if Path(path).name in ('manifest.json', 'digitization-manifest.json') else None
        c.execute('INSERT INTO source_artifacts VALUES (?,?,?,?)', (path, receipt['sha256'], receipt['bytes'], zlib.compress(raw, 6) if raw else None))
    records = digitization['records']
    counts = collections.Counter()
    for p in sorted(manifest['papers'], key=lambda p: p['id']):
        ident = p['id']
        require(len(p.get('files', [])) == 1, 'Expected exactly one source PDF per paper: ' + ident)
        source = p['files'][0]
        d = records.get(ident, {})
        require(d.get('sourceSha256') == source['sha256'], 'Digitization/source hash mismatch: ' + ident)
        c.execute('INSERT INTO papers(paper_id,level,year,title,source_sha256,source_pdf,page_count,raw_manifest_json,raw_digitization_json) VALUES (?,?,?,?,?,?,?,?,?)',
                  (ident, p['level'], p['year'], p['title'], source['sha256'], source['localPath'], d.get('pageCount', 0), js(p), js(d)))
        if not d.get('pagesPath'):
            add_issue(c, 'missing-pages-artifact', ident, 'No pagesPath in extraction record')
            continue
        offset = 0
        pages = 0
        with Path(d['pagesPath']).open('rb') as stream:
            for line, raw in enumerate(stream, 1):
                require(bool(raw.strip()), 'Blank page artifact line: ' + str(d['pagesPath']))
                page = json.loads(raw)
                number = page['pageNumber']
                c.execute('INSERT INTO pages VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (ident, number, source['sha256'], d['pagesPath'], line, offset, len(raw), digest(raw), zlib.compress(raw, 6), page.get('method'), page.get('recognitionLevel'), page.get('bboxCoordinateSystem'), js(page.get('pageBounds')), page.get('meanOcrConfidence'), page.get('text', ''),))
                offset += len(raw)
                pages += 1
                for index, block in enumerate(page.get('lines', [])):
                    c.execute('INSERT INTO page_blocks VALUES (?,?,?,?,?,?,?,?)', (ident, number, index, block.get('text'), js(block.get('bbox')), block.get('confidence'), js(block), match_signature(block)))
                    counts['pageBlocks'] += 1
        require(pages == d.get('pageCount'), 'Page count mismatch: ' + ident)
        counts['pages'] += pages
        counts['papers'] += 1
    # Index once; each source region keeps its own identity even if two IDs/texts repeat.
    offset = 0
    bank = library / 'question-candidates.jsonl'
    with bank.open('rb') as stream:
        for line, raw in enumerate(stream, 1):
            require(bool(raw.strip()), 'Blank raw candidate line: ' + str(line))
            candidate = json.loads(raw)
            source = candidate['source']
            paper = c.execute('SELECT * FROM papers WHERE paper_id=?', (source['paperId'],)).fetchone()
            require(paper and paper['source_sha256'] == source['sha256'], 'Region source hash mismatch at line ' + str(line))
            text = candidate.get('rawText', '')
            normal, tags, markers, cues, flags = features(text, candidate)
            pages = candidate.get('pageNumbers', [])
            level = paper['level']
            cluster = 'text:' + digest(js([VERSION, level, candidate.get('kind'), normal]))
            # Coarse candidate buckets deliberately retain operation/quantity shape, not just topic words.
            math_shape = re.findall(r'<n>|[%$+×÷−=<>:/]|\b(?:more|less|than|each|times|remaining|left|total|altogether|twice|thrice|equal)\b', normal)
            family = 'family:' + digest(js([VERSION, level, candidate.get('kind'), tags, math_shape, len(markers), bool(cues)]))
            c.execute('INSERT INTO regions(bank_line,candidate_id,paper_id,source_sha256,source_byte_offset,source_byte_length,raw_line_sha256,raw_line_zlib,question_number,kind,start_page,page_numbers_json,raw_text,raw_text_sha256,confidence_json,number_normalized_text,number_profile_json,tags_json,triage_flags_json,text_cluster_id,family_bucket_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                      (line, candidate['id'], source['paperId'], source['sha256'], offset, len(raw), digest(raw), zlib.compress(raw, 6), candidate.get('questionNumber'), candidate.get('kind'), candidate.get('startPage'), js(pages), text, digest(text), js(candidate.get('confidence')), normal, js([{'text': m.group(0), 'start': m.start(), 'end': m.end()} for m in NUMBER_REGEX.finditer(text)]), js(tags), js(flags), cluster, family))
            offset += len(raw)
            links = candidate.get('sourcePageLinks', [])
            for ordinal, page in enumerate(pages):
                present = c.execute('SELECT 1 FROM pages WHERE paper_id=? AND page_number=?', (source['paperId'], page)).fetchone() is not None
                link = links[ordinal] if ordinal < len(links) else source['localPath'] + '#page=' + str(page)
                c.execute('INSERT INTO region_pages VALUES (?,?,?,?,?)', (line, page, ordinal, link, int(present)))
                c.execute('INSERT INTO diagram_dependencies(bank_line,page_number,source_sha256,source_link,cues_json) VALUES (?,?,?,?,?)', (line, page, source['sha256'], link, js(cues)))
                if not present:
                    add_issue(c, 'region-page-missing', line, str(page))
            if not pages:
                add_issue(c, 'region-without-pages', line, 'Diagram/page dependency cannot be resolved')
            for index, block in enumerate(candidate.get('textBlocks', [])):
                matches = [r[0] for r in c.execute('SELECT block_index FROM page_blocks WHERE paper_id=? AND page_number=? AND match_signature=? ORDER BY block_index', (source['paperId'], block.get('pageNumber'), match_signature(block)))]
                c.execute('INSERT INTO region_blocks VALUES (?,?,?,?,?,?,?,?,?,?)', (line, index, block.get('pageNumber'), block.get('text'), js(block.get('bbox')), block.get('confidence'), block.get('method'), block.get('recognitionLevel'), js(block), js(matches)))
                counts['regionBlocks'] += 1
                counts['matchedRegionBlocks'] += bool(matches)
                if not matches:
                    add_issue(c, 'region-block-no-exact-page-match', str(line) + ':' + str(index), 'Preserved raw block; reconcile during review')
            for ordinal, marker in enumerate(markers):
                end = markers[ordinal + 1].start() if ordinal + 1 < len(markers) else len(text)
                c.execute('INSERT INTO subpart_candidates(bank_line,ordinal,label,character_offset,marker_end,proposed_end,marker_text) VALUES (?,?,?,?,?,?,?)', (line, ordinal, (marker.group(1) or marker.group(2)).lower(), marker.start(), marker.end(), end, marker.group(0)))
                counts['subpartMarkers'] += 1
            counts['regions'] += 1
            if line % 20000 == 0:
                print(js({'progress': dict(counts), 'state': 'unverified-local-staging'}), flush=True)
    c.execute('INSERT INTO candidate_clusters(cluster_id,level,region_count,representative_bank_line,normalized_text_sha256) SELECT r.text_cluster_id,p.level,COUNT(*),MIN(r.bank_line),\'\' FROM regions r JOIN papers p USING(paper_id) GROUP BY r.text_cluster_id,p.level')
    # This hash describes the actual normalized text rather than the representative raw text.
    for r in c.execute('SELECT cluster_id,number_normalized_text FROM candidate_clusters JOIN regions ON bank_line=representative_bank_line').fetchall():
        c.execute('UPDATE candidate_clusters SET normalized_text_sha256=? WHERE cluster_id=?', (digest(r['number_normalized_text']), r['cluster_id']))
    c.execute('INSERT INTO family_buckets(bucket_id,level,tags_json,region_count,text_cluster_count) SELECT r.family_bucket_id,p.level,r.tags_json,COUNT(*),COUNT(DISTINCT text_cluster_id) FROM regions r JOIN papers p USING(paper_id) GROUP BY family_bucket_id,p.level,r.tags_json')
    c.execute('INSERT INTO meta VALUES (?,?)', ('expectedCounts', js(dict(counts))))
    c.commit()
    # Reject a mixed snapshot if another worker replaced any source input during the build.
    for path, receipt in inputs.items():
        require(filehash(path) == receipt['sha256'], 'Source changed during staging build: ' + path)
    c.execute('PRAGMA optimize')
    c.close()
    temporary.replace(db)
    report = audit(db, library, deep=True)
    (out / 'audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    write_queue(db, out / 'review-queue.jsonl')
    return report


def audit(db, library=None, deep=False):
    c = connect(db, readonly=True)
    require(c.execute('PRAGMA integrity_check').fetchone()[0] == 'ok', 'SQLite integrity check failed')
    require(not c.execute('PRAGMA foreign_key_check').fetchall(), 'Foreign-key check failed')
    tables = ['papers', 'pages', 'page_blocks', 'regions', 'region_blocks', 'subpart_candidates', 'diagram_dependencies', 'candidate_clusters', 'family_buckets', 'issues']
    counts = {name: c.execute('SELECT COUNT(*) FROM ' + name).fetchone()[0] for name in tables}
    require(c.execute('SELECT COUNT(*) FROM regions WHERE exact_source_coverage!=0 OR answer_verified!=0 OR completeness!=\'unknown\' OR visual_review_required!=1').fetchone()[0] == 0, 'Unsupported review/coverage credit')
    require(c.execute('SELECT SUM(region_count) FROM candidate_clusters').fetchone()[0] == counts['regions'], 'Cluster membership lost a raw region')
    require(c.execute('SELECT SUM(region_count) FROM family_buckets').fetchone()[0] == counts['regions'], 'Family bucket membership lost a raw region')
    receipts = list(c.execute('SELECT * FROM source_artifacts'))
    input_checks = 0
    if deep:
        for receipt in receipts:
            path = Path(receipt['path'])
            require(path.is_file() and filehash(path) == receipt['sha256'], 'Source artifact drift: ' + str(path))
            if receipt['raw_zlib'] is not None:
                require(digest(zlib.decompress(receipt['raw_zlib'])) == receipt['sha256'], 'Manifest snapshot corruption: ' + str(path))
            input_checks += 1
        # Stream every stored raw byte back into the original artifact hashes: includes all whitespace/newlines.
        for table, key in [('regions', None), ('pages', 'artifact_path')]:
            sql = 'SELECT * FROM ' + table + (' ORDER BY artifact_path,source_line' if key else ' ORDER BY bank_line')
            hashes = {}
            offsets = collections.Counter()
            for row in c.execute(sql):
                path = row[key] if key else str(Path(library).resolve() / 'question-candidates.jsonl')
                raw = zlib.decompress(row['raw_line_zlib'])
                require(len(raw) == row['source_byte_length'] and digest(raw) == row['raw_line_sha256'], 'Stored raw line corruption')
                require(offsets[path] == row['source_byte_offset'], 'Gap/overlap in source byte inventory: ' + path)
                hashes.setdefault(path, hashlib.sha256()).update(raw)
                offsets[path] += len(raw)
            for path, h in hashes.items():
                receipt = next(r for r in receipts if r['path'] == path)
                require(h.hexdigest() == receipt['sha256'] and offsets[path] == receipt['bytes'], 'Raw source regions/pages were dropped: ' + path)
    levels = []
    for row in c.execute('SELECT p.level,COUNT(DISTINCT p.paper_id) papers,COUNT(r.bank_line) regions,COUNT(DISTINCT r.text_cluster_id) candidate_clusters,COUNT(DISTINCT r.family_bucket_id) family_buckets FROM papers p LEFT JOIN regions r USING(paper_id) GROUP BY p.level ORDER BY p.level'):
        levels.append(dict(row))
    duplicate_groups = c.execute('SELECT COUNT(*),COALESCE(SUM(region_count-1),0) FROM candidate_clusters WHERE region_count>1').fetchone()
    report = {'schemaVersion': VERSION, 'snapshotId': c.execute("SELECT value FROM meta WHERE key='snapshotId'").fetchone()[0], 'database': str(Path(db).resolve()), 'localOnly': True, 'exactSourceCoverage': False, 'answersVerified': False, 'allRawRegionsAccountedFor': True, 'deepRawByteRoundTripChecked': deep, 'inputArtifactsHashChecked': input_checks, 'sourcePdfHashVerification': 'Declared manifest hashes preserved; source PDFs are not rehashed by staging.', 'counts': counts, 'levels': levels, 'candidateDuplicateGroups': duplicate_groups[0], 'repeatRegionsInCandidateGroups': duplicate_groups[1], 'meaning': POLICY}
    c.close()
    return report


def queue_rows(c):
    # Stable representatives, substantive math text before boundary fragments; alternate levels.
    # Priority is preparation triage only. Even low-information clusters retain every member.

    queues = {}
    for level in range(1, 7):
        queues[level] = iter(c.execute('''SELECT cc.cluster_id,cc.region_count,r.bank_line,r.candidate_id,r.paper_id,r.source_sha256,r.page_numbers_json,r.tags_json,r.triage_flags_json,r.family_bucket_id,CASE WHEN r.kind='question-candidate' AND length(r.raw_text)>=40 AND r.tags_json!='[]' THEN 'mathematical-content-candidate' ELSE 'boundary-and-context-reconciliation' END review_track,p.level,p.year,p.title,p.source_pdf FROM candidate_clusters cc JOIN regions r ON r.bank_line=cc.representative_bank_line JOIN papers p USING(paper_id) WHERE p.level=? ORDER BY CASE WHEN r.kind='question-candidate' AND length(r.raw_text)>=40 AND r.tags_json!='[]' THEN 0 ELSE 1 END,p.year DESC,cc.region_count DESC,p.paper_id,r.bank_line''', (level,)).fetchall())
    order = 0
    while queues:
        for level in list(queues):
            row = next(queues[level], None)
            if row is None:
                del queues[level]
                continue
            order += 1
            value = dict(row)
            for field in ['page_numbers_json', 'tags_json', 'triage_flags_json']:
                value[field.removesuffix('_json')] = json.loads(value.pop(field))
            yield {'order': order, **value, 'reviewState': 'candidate-only-needs-page-and-question-reconciliation', 'exactSourceCoverage': False, 'answersVerified': False}


def write_queue(db, output, per_level=None):
    c = connect(db, readonly=True)
    output = Path(output).resolve()
    require(ROOT not in output.parents, 'Do not write source review bundles into the public application workspace')
    output.parent.mkdir(parents=True, exist_ok=True)
    require(not output.exists(), 'Refusing to overwrite an existing review bundle: ' + str(output))
    counts = collections.Counter()
    with output.open('x') as stream:
        for row in queue_rows(c):
            if per_level is not None and counts[row['level']] >= per_level:
                continue
            # A batch contains full prepared OCR, geometry, source dependencies and all repeat IDs for review.
            if per_level is not None:
                region = c.execute('SELECT * FROM regions WHERE bank_line=?', (row['bank_line'],)).fetchone()
                row['rawCandidate'] = json.loads(zlib.decompress(region['raw_line_zlib']))
                row['sourcePageContext'] = [json.loads(zlib.decompress(r['raw_line_zlib'])) for r in c.execute('SELECT raw_line_zlib FROM pages WHERE paper_id=? AND page_number IN (SELECT page_number FROM region_pages WHERE bank_line=?) ORDER BY page_number', (row['paper_id'], row['bank_line']))]
                row['subpartCandidates'] = [dict(r) for r in c.execute('SELECT * FROM subpart_candidates WHERE bank_line=? ORDER BY ordinal', (row['bank_line'],))]
                row['diagramDependencies'] = [dict(r) for r in c.execute('SELECT * FROM diagram_dependencies WHERE bank_line=? ORDER BY page_number', (row['bank_line'],))]
                row['candidateClusterMembers'] = [dict(r) for r in c.execute('SELECT bank_line,candidate_id,paper_id,source_sha256,page_numbers_json FROM regions WHERE text_cluster_id=? ORDER BY bank_line', (row['cluster_id'],))]
            stream.write(js(row) + '\n')
            counts[row['level']] += 1
    c.close()
    return {'output': str(output), 'perLevel': dict(sorted(counts.items())), 'regions': sum(counts.values()), 'exactSourceCoverage': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library', type=Path, default=DEFAULT_LIBRARY)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('build')
    a = sub.add_parser('audit')
    a.add_argument('database', type=Path)
    a.add_argument('--deep', action='store_true')
    b = sub.add_parser('batch')
    b.add_argument('database', type=Path)
    b.add_argument('--per-level', type=int, default=10)
    b.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'build':
        lock_dir = args.library.resolve() / 'structure'
        lock_dir.mkdir(parents=True, exist_ok=True)
        with (lock_dir / '.build.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            result = build(args.library)
    elif args.command == 'audit':
        result = audit(args.database, args.library, args.deep)
    else:
        require(args.per_level > 0, '--per-level must be positive')
        result = write_queue(args.database, args.output, args.per_level)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
