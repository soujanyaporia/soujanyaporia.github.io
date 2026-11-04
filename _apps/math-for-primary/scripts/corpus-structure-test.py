#!/usr/bin/env python3
"""Adversarial staging checks: byte roundtrip, repeated IDs, markers, missing context, corruption."""
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('structure', Path(__file__).with_name('corpus-structure.py'))
staging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(staging)


class StagingTest(unittest.TestCase):
    def test_lossless_and_no_coverage(self):
        with tempfile.TemporaryDirectory() as name:
            library = Path(name)
            source = {'paperId': 'p1', 'sha256': 'a' * 64, 'localPath': '/private/source.pdf'}
            block = {'text': '(a) Add 12 and 3 to find the total number of blocks. (b) Draw a box.', 'bbox': [.1, .2, .3, .4], 'confidence': .7}
            page = {'pageNumber': 1, 'text': block['text'], 'lines': [block], 'method': 'ocr', 'meanOcrConfidence': .7,
                    'bboxCoordinateSystem': 'normalised page, origin bottom-left', 'pageBounds': [600, 800], 'extra': {'unknown': True}}
            page_path = library / 'pages.jsonl'
            page_bytes = (json.dumps(page, ensure_ascii=False, indent=None) + '\r\n').encode()
            page_path.write_bytes(page_bytes)
            paper = {'id': 'p1', 'level': 1, 'year': 2025, 'title': 'Fixture', 'files': [{'sha256': source['sha256'], 'localPath': source['localPath']}]}
            (library / 'manifest.json').write_text(json.dumps({'papers': [paper]}))
            (library / 'digitization-manifest.json').write_text(json.dumps({'records': {'p1': {'sourceSha256': source['sha256'], 'pagesPath': str(page_path), 'pageCount': 1}}}))
            candidate = {'id': 'duplicate-id-is-not-a-primary-key', 'source': source, 'questionNumber': '1', 'kind': 'question-candidate',
                         'rawText': block['text'], 'pageNumbers': [1, 2], 'textBlocks': [{**block, 'pageNumber': 1}], 'extraField': ['do not drop', 10]}
            bank = library / 'question-candidates.jsonl'
            fragment = {**candidate, 'id': 'numeric-fragment', 'rawText': '5', 'pageNumbers': [1], 'textBlocks': []}
            bank_bytes = ((json.dumps(candidate, ensure_ascii=False) + '\r\n') * 2 + json.dumps(fragment)).encode()
            bank.write_bytes(bank_bytes)
            result = staging.build(library)
            self.assertTrue(result['deepRawByteRoundTripChecked'])
            self.assertEqual(result['counts']['regions'], 3)
            self.assertEqual(result['counts']['page_blocks'], 1)
            self.assertEqual(result['counts']['region_blocks'], 2)
            self.assertEqual(result['counts']['subpart_candidates'], 4)
            self.assertEqual(result['counts']['candidate_clusters'], 2)
            self.assertEqual(result['counts']['diagram_dependencies'], 5)
            self.assertFalse(result['exactSourceCoverage'])
            db = Path(result['database'])
            c = staging.connect(db)
            self.assertEqual(c.execute('SELECT COUNT(*) FROM issues WHERE kind=?', ('region-page-missing',)).fetchone()[0], 2)
            self.assertEqual(c.execute('SELECT matched_page_block_indices_json FROM region_blocks LIMIT 1').fetchone()[0], '[0]')
            self.assertEqual(b''.join(staging.zlib.decompress(r[0]) for r in c.execute('SELECT raw_line_zlib FROM regions ORDER BY bank_line')), bank_bytes)
            self.assertEqual(staging.zlib.decompress(c.execute('SELECT raw_line_zlib FROM pages').fetchone()[0]), page_bytes)
            with self.assertRaises(sqlite3.IntegrityError):
                c.execute('UPDATE regions SET answer_verified=1')
            c.rollback()
            c.close()
            output = library / 'batch.jsonl'
            batch = staging.write_queue(db, output, 1)
            self.assertEqual(batch['regions'], 1)
            exported = json.loads(output.read_text())
            self.assertEqual(exported['rawCandidate'], candidate)
            self.assertEqual(exported['review_track'], 'mathematical-content-candidate')
            self.assertEqual(exported['sourcePageContext'], [page])
            self.assertEqual(len(exported['candidateClusterMembers']), 2)
            with self.assertRaises(ValueError):
                staging.write_queue(db, output, 1)
            # Idempotent reuse does not rebuild or replace source/review artifacts.
            self.assertEqual(staging.build(library)['snapshotId'], result['snapshotId'])
            bank.write_bytes(bank_bytes + b'changed')
            with self.assertRaisesRegex(ValueError, 'Source artifact drift'):
                staging.audit(db, library, deep=True)

    def test_quantity_values_survive_only_index_is_normalized(self):
        text = '(a) Find 3/4 of $120. (b) Increase 2.5 kg by 10%.'
        normal, tags, markers, cues, flags = staging.features(text, {'kind': 'question-candidate', 'pageNumbers': [1]})
        self.assertIn('<n>/<n>', normal)
        self.assertIn('$<n>', normal)
        self.assertIn('fractions', tags)
        self.assertIn('percentage', tags)
        self.assertEqual(len(markers), 2)
        self.assertIn('diagram-dependency-unresolved', flags)


if __name__ == '__main__':
    unittest.main()
