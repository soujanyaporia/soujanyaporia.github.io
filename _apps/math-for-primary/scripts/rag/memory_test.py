import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('memory', Path(__file__).parents[1] / 'rag-memory.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.app = self.root / 'app'
        self.inventory = self.app / '.generated/question-pattern-inventory.json'
        self.registry = self.app / 'src/primary/paperImports/ragRegistry.json'
        self.put(self.app / 'src/primary/generate.ts', 'export const baseline=1;')
        self.put(self.inventory, json.dumps({'activities': [{'id': 'existing-capacity', 'level': 3, 'track': 'standard', 'title': 'Known bottle capacity', 'objective': 'Find capacity', 'skillIds': ['P3.S.MEASURE.03'], 'canonicalPatternId': 'known-capacity', 'examples': []}]}))
        self.put(self.registry, '{"schema":1,"entries":[]}')
        self.queue = self.root / 'queue.sqlite'; self.staging = self.root / 'staging.sqlite'
        with sqlite3.connect(self.staging) as db:
            db.executescript('''CREATE TABLE meta(key TEXT,value TEXT); INSERT INTO meta VALUES('snapshotId','fixture-snapshot');
                CREATE TABLE regions(bank_line INTEGER,paper_id TEXT,candidate_id TEXT,question_number TEXT,page_numbers_json TEXT,source_sha256 TEXT,raw_text TEXT,raw_text_sha256 TEXT,triage_flags_json TEXT,kind TEXT);
                CREATE TABLE subpart_candidates(bank_line INTEGER,ordinal INTEGER,label TEXT,character_offset INTEGER,marker_end INTEGER,proposed_end INTEGER,marker_text TEXT,status TEXT);
                CREATE TABLE diagram_dependencies(bank_line INTEGER,page_number INTEGER,dependency TEXT);''')
            for i in [1, 2]:
                text = f'{i}. Shared story givens.\n(a) Find one bottle.\n(b) Find all bottles.'
                db.execute('insert into regions values(?,?,?,?,?,?,?,?,?,?)', (i, f'paper{i}', f'candidate-{i}', str(i), '[2]', m.digest('PDF'+str(i)), text, m.digest(text), '["boundaries-unverified"]', 'question-region-candidate'))
                for n, label in enumerate(['a', 'b']):
                    offset = text.index('('+label+')'); db.execute('insert into subpart_candidates values(?,?,?,?,?,?,?,?)', (i,n,label,offset,offset+3,len(text),'('+label+')','unverified-marker-only'))
                db.execute('insert into diagram_dependencies values(?,?,?)', (i,2,'unresolved'))
        with sqlite3.connect(self.queue) as db:
            db.executescript('CREATE TABLE meta(key TEXT,value TEXT); CREATE TABLE papers(paper_id TEXT,level INTEGER,title TEXT,source_sha256 TEXT,source_pdf TEXT); CREATE TABLE region_queue(bank_line INTEGER,paper_id TEXT);')
            db.execute('insert into meta values(?,?)', ('inputs', json.dumps({'staging': str(self.staging)})))
            for i in [1, 2]:
                pdf = self.root / f'paper{i}.pdf'; self.put(pdf, 'PDF'+str(i))
                db.execute('insert into papers values(?,?,?,?,?)', (f'paper{i}',3,f'Paper {i}',m.file_hash(pdf),str(pdf)));db.execute('insert into region_queue values(?,?)',(i,f'paper{i}'))
        self.db = m.connect(self.root / 'memory.sqlite'); self.addCleanup(self.db.close)
        m.sync(self.db,self.app,self.inventory,self.registry,self.queue)

    def put(self,path,text):
        path.parent.mkdir(parents=True,exist_ok=True); path.write_text(text)

    def job(self,number,decision,target='new-bottle-capacity'):
        job = self.root / ('job'+str(number)); job.mkdir(exist_ok=True)
        source = {'bankLine':number,'paperId':f'paper{number}','level':3,'title':f'Paper {number}','questionNumber':str(number),'pageNumbers':[2],'rawText':'Complete parent reference','sourcePdf':str(self.root/f'paper{number}.pdf'),'sourceSha256':m.file_hash(self.root/f'paper{number}.pdf'),'pageTexts':[{'page':2,'text':'Complete parent page.'}],'pageImages':[]}
        packet = {'schema':1,'jobId':'job'+str(number),'level':3,'topic':'capacity','sourceRegions':[source]}
        files = [{'path':'candidate/src/primary/paperImports/ragBottle.ts','content':'export const bottle=1;'}, {'path':'candidate/src/primary/paperImports/ragBottle.test.ts','content':'// independent solver'}] if decision=='new-generator' else []
        proposal = {'decision':decision,'canonicalPatternId':target,'sourceRefs':[{k:source[k] for k in ['bankLine','paperId','questionNumber','pageNumbers']}],'files':files,'reasoning':'Equal containers with one shared capacity.', 'blockingGaps':['Diagram missing'] if decision=='needs-review' else [],'tests':['independent visible-givens solve'] if files else []}
        self.put(job/'packet.json',json.dumps(packet)); self.put(job/'candidate-attempt-1.json',json.dumps(proposal))
        for file in files: self.put(job/file['path'],file['content'])
        state = {'schema':1,'jobId':packet['jobId'],'status':'checks-passed' if files else decision,'decision':decision,'candidateFile':'candidate-attempt-1.json','candidateSha256':m.file_hash(job/'candidate-attempt-1.json'),'packetSha256':m.digest(m.canonical(packet)),'fileSha256':{f['path']:m.digest(f['content']) for f in files}}
        if files:
            report = {'status':'checks-passed','packetSha256':state['packetSha256'],'candidateSha256':state['candidateSha256'],'candidateFiles':{f['path'].removeprefix('candidate/'):m.digest(f['content']) for f in files}}
            self.put(job/'rag-check-report.json',json.dumps(report));state['checkReportSha256']=m.file_hash(job/'rag-check-report.json')
        self.put(job/'checkpoint.json',json.dumps(state))
        return job,packet,proposal,state

    def register(self,job,proposal,state):
        files=[]
        for file in proposal['files']:
            path=file['path'].removeprefix('candidate/');self.put(self.app/path,file['content']);files.append({'path':path,'sha256':m.digest(file['content'])})
        entry={'id':'bottle','level':3,'parameter':'rag-bottle','title':'New bottle capacity','objective':'Use equal bottles','skillIds':['P3.S.MEASURE.03'],'canonicalPatternId':proposal['canonicalPatternId'],'files':files,'sourceRefs':[{'paperId':'paper1','sourceQuestion':'1','sourcePages':[2]}],'jobId':state['jobId'],'packetSha256':state['packetSha256'],'candidateSha256':state['candidateSha256'],'checkReportSha256':state['checkReportSha256']}
        self.put(self.registry,json.dumps({'schema':1,'entries':[entry]}));return entry

    def test_paper_one_register_then_paper_two_reuses_durable_current_family(self):
        first=m.ingest(self.db,'paper1',self.queue);self.assertEqual(first['pendingBankLines'],[1]);self.assertEqual([p['label'] for p in first['regions'][0]['subparts']],['a','b']);self.assertEqual(first['sourceCompleteness'],'unknown')
        job,packet,proposal,state=self.job(1,'new-generator')
        unintegrated=m.record(self.db,job,self.app);self.assertEqual(unintegrated['integration'],'not-integrated');self.assertEqual(m.inspect_paper(self.db,'paper1')['pendingBankLines'],[1]);self.assertFalse(any(g['canonicalPatternId']=='new-bottle-capacity' for g in m.query(self.db,self.app,3,'bottle',20)['generators']))
        self.register(job,proposal,state);m.sync(self.db,self.app,self.inventory,self.registry,self.queue)
        integrated=m.record(self.db,job,self.app);self.assertEqual(integrated['integration'],'code-integrated');self.assertEqual(m.inspect_paper(self.db,'paper1')['pendingBankLines'],[])
        m.ingest(self.db,'paper2',self.queue);second=self.job(2,'reuse')[0];reuse=m.record(self.db,second,self.app);self.assertEqual(reuse['reuseTargets'],['p3s-paper-rag-bottle']);self.assertEqual(m.inspect_paper(self.db,'paper2')['pendingBankLines'],[])
        queried=m.query(self.db,self.app,3,'bottle',20);target=next(g for g in queried['generators'] if g['canonicalPatternId']=='new-bottle-capacity');self.assertEqual({s['paper_id'] for s in target['priorSources']},{'paper1','paper2'})
        self.assertEqual(m.inspect_paper(self.db,'paper1')['regions'][0]['source_state'],'unresolved')
        self.assertEqual(m.record(self.db,second,self.app)['memory_revision'],reuse['memory_revision'])

    def test_idempotent_sync_ingest_and_unknown_reuse_rejection(self):
        first=m.sync(self.db,self.app,self.inventory,self.registry,self.queue);self.assertEqual(m.sync(self.db,self.app,self.inventory,self.registry,self.queue),first)
        ingested=m.ingest(self.db,'paper1',self.queue);self.assertEqual(m.ingest(self.db,'paper1',self.queue)['memory_revision'],ingested['memory_revision'])
        job=self.job(2,'reuse','missing-family')[0]
        with self.assertRaisesRegex(ValueError,'Unknown/unavailable'):m.record(self.db,job,self.app)
        self.assertEqual(self.db.execute('select count(*) from decisions').fetchone()[0],0)

    def test_changed_code_is_stale_and_history_is_retained(self):
        job,packet,proposal,state=self.job(1,'new-generator');self.register(job,proposal,state);m.sync(self.db,self.app,self.inventory,self.registry,self.queue);m.record(self.db,job,self.app)
        version=self.db.execute("select current_version from generators where generator_id='p3s-paper-rag-bottle'").fetchone()[0]
        self.put(self.app/'src/primary/paperImports/ragBottle.ts','changed code')
        self.assertFalse(m.freshness(self.db,self.app)['fresh']);self.assertEqual(m.query(self.db,self.app,3,'bottle',10)['generators'],[])
        reuse=self.job(2,'reuse')[0]
        with self.assertRaisesRegex(ValueError,'Stale memory'):m.record(self.db,reuse,self.app)
        m.sync(self.db,self.app,self.inventory,self.registry,self.queue);self.assertTrue(m.freshness(self.db,self.app)['fresh'])
        self.assertFalse(any(g['canonicalPatternId']=='new-bottle-capacity' for g in m.query(self.db,self.app,3,'bottle',10)['generators']))
        self.assertIsNotNone(self.db.execute('select * from generator_versions where version_id=?',(version,)).fetchone());self.assertGreater(self.db.execute('select count(*) from binding_invalidations').fetchone()[0],0)
        with self.assertRaisesRegex(ValueError,'Unknown/unavailable'):m.record(self.db,reuse,self.app)

    def test_changed_packet_candidate_source_or_report_is_not_recorded(self):
        for filename in ['packet.json','candidate-attempt-1.json','rag-check-report.json','candidate/src/primary/paperImports/ragBottle.ts']:
            job=self.job(1,'new-generator')[0];self.put(job/filename,'{}')
            with self.assertRaises((ValueError,KeyError)):m.record(self.db,job,self.app)
        job=self.job(1,'new-generator')[0];self.put(self.root/'paper1.pdf','changed PDF')
        with self.assertRaisesRegex(ValueError,'Source PDF'):m.record(self.db,job,self.app)

    def test_needs_review_stays_pending_and_census_does_not_claim_paper_read(self):
        self.assertEqual(m.inspect_paper(self.db,'paper1')['paper']['ingest_state'],'census-only')
        m.ingest(self.db,'paper1',self.queue);job=self.job(1,'needs-review')[0];result=m.record(self.db,job,self.app)
        self.assertEqual(result['decision'],'needs-review');view=m.inspect_paper(self.db,'paper1');self.assertEqual(view['pendingBankLines'],[1]);self.assertEqual(view['sourceCompleteness'],'unknown')
        backlog=m.query(self.db,self.app,3,'diagram',5)['reviewBacklog'];self.assertEqual(backlog[0]['blockingGaps'],['Diagram missing']);self.assertEqual(backlog[0]['sourceRefs'][0]['paperId'],'paper1')

    def test_numeric_variant_fingerprints_preserve_response_and_wording_constraints(self):
        base={'id':'sample','level':3,'title':'Mass comparison','objective':'Compare mass','canonicalPatternId':'mass-compare','skillIds':['P3.S.MEASURE.03'],'examples':[{'prompt':'Find the mass after removing 3 g from 12 g.','response':'entry'}]}
        changed=json.loads(json.dumps(base));changed['examples'][0]['prompt']='Find the mass after removing 5 g from 14 g.'
        self.assertEqual(m.compact_descriptor(base)[1:],m.compact_descriptor(changed)[1:])
        changed['examples'][0]['prompt']='Find the total mass of 5 g and 14 g.'
        self.assertNotEqual(m.compact_descriptor(base)[1],m.compact_descriptor(changed)[1])
        pair=json.loads(json.dumps(base));pair['examples'][0]['structuredResponse']={'kind':'number-pair','decimal':True}
        self.assertNotEqual(m.compact_descriptor(base)[3],m.compact_descriptor(pair)[3]);self.assertEqual(m.compact_descriptor(pair)[0]['parts'],[2])

    def test_bounded_fts_descriptors_update_and_multipart_is_not_collapsed(self):
        activities=[]
        for i in range(8):
            activities.append({'id':f'compact-{i}','level':3,'title':'water bottle uniqueoldterm '+('long '*100),'objective':'Capacity '+('explanation '*100),'canonicalPatternId':'shared-family','skillIds':['P3.S.MEASURE.03'],'examples':[{'prompt':'Find water in 12 bottles.','response':'entry',**({'structuredResponse':{'kind':'number-pair','decimal':True}} if i%2 else {})}]})
        self.put(self.inventory,json.dumps({'activities':activities}));m.sync(self.db,self.app,self.inventory,self.registry,self.queue)
        result=m.query(self.db,self.app,3,'(a) Find water. (b) Find bottle capacity.',5)
        self.assertLessEqual(len(result['generators']),5);self.assertEqual(len(result['generators']),2)
        self.assertEqual({tuple(g['partCounts']) for g in result['generators']},{(1,),(2,)})
        self.assertFalse(result['generators'][0]['responseShapeMismatch']);self.assertTrue(result['generators'][1]['responseShapeMismatch'])
        for entry in result['generators']:
            self.assertLessEqual(len(entry['descriptor']),600);self.assertNotIn('sampledExamples',json.dumps(entry));self.assertNotIn('reasoning',json.dumps(entry));self.assertEqual(entry['signatureMeaning'],'candidate-lookup-not-semantic-proof')
        activities[0]['title']='newuniqueword';activities[0]['objective']='newuniqueword';self.put(self.inventory,json.dumps({'activities':activities}));m.sync(self.db,self.app,self.inventory,self.registry,self.queue)
        self.assertEqual(self.db.execute("select count(*) from pattern_fts where generator_id='compact-0'").fetchone()[0],1)
        self.assertEqual(m.query(self.db,self.app,3,'newuniqueword',1)['generators'][0]['id'],'compact-0')
        evidence=m.inspect_generator(self.db,'compact-0');self.assertIn('sampledExamples',evidence['constraints'])

    def test_incremental_revision_tracks_add_update_delete_rollback_and_reopen(self):
        self.db.commit();base=m.revise(self.db);self.assertEqual(base,m.revision_recompute(self.db))
        with self.db:
            self.db.execute("insert into papers(paper_id,level,title,source_sha256,source_pdf) values('added',3,'One','sha','path')")
            added=m.revise(self.db);self.assertNotEqual(added,base);self.assertEqual(added,m.revision_recompute(self.db))
        with self.db:
            self.db.execute("update papers set title='Two' where paper_id='added'")
            changed=m.revise(self.db);self.assertNotEqual(changed,added);self.assertEqual(changed,m.revision_recompute(self.db))
        with self.assertRaisesRegex(RuntimeError,'rollback'):
            with self.db:
                self.db.execute("delete from papers where paper_id='added'")
                self.assertNotEqual(m.revise(self.db),changed)
                raise RuntimeError('rollback')
        self.assertEqual(m.get_meta(self.db,'memory_revision'),changed);self.assertEqual(m.revision_recompute(self.db),changed)
        with self.db:
            self.db.execute("delete from papers where paper_id='added'")
            self.assertEqual(m.revise(self.db),base)
        with self.db:
            self.db.execute("update generators set title='Changed title' where generator_id='existing-capacity'")
            changed_title=m.revise(self.db);self.assertNotEqual(changed_title,base);self.assertEqual(changed_title,m.revision_recompute(self.db))
            self.db.execute("update generators set title='Known bottle capacity' where generator_id='existing-capacity'")
            self.assertEqual(m.revise(self.db),base)
        self.db.commit();path=self.root/'memory.sqlite'
        with m.connect(path) as reopened:
            self.assertEqual(m.revise(reopened),base);self.assertEqual(m.revision_recompute(reopened),base)

    def test_revision_hot_path_avoids_full_tables_and_refreshes_only_dirty_bucket(self):
        self.db.commit();queries=[];self.db.set_trace_callback(queries.append);base=m.revise(self.db);self.db.set_trace_callback(None)
        self.assertFalse(any('from revision_leaves' in q.lower() for q in queries));self.assertEqual(base,m.get_meta(self.db,'memory_revision'))
        self.db.commit()
        with sqlite3.connect(self.root/'memory.sqlite') as external:
            external.execute("insert into papers(paper_id,level,title,source_sha256,source_pdf) values('external',3,'External','sha','path')")
        queries=[];self.db.set_trace_callback(queries.append)
        with self.db:updated=m.revise(self.db)
        self.db.set_trace_callback(None);self.assertNotEqual(updated,base);self.assertEqual(updated,m.revision_recompute(self.db))
        source_reads=[q.lower() for q in queries if 'from papers' in q.lower() or 'from regions' in q.lower()]
        self.assertTrue(source_reads);self.assertTrue(all(' where ' in q for q in source_reads))
        bucket_reads=[q for q in queries if 'select table_name,row_key,leaf_hash from revision_leaves where bucket=' in q.lower()]
        self.assertEqual(len(bucket_reads),1)

    def test_legacy_database_bootstraps_without_losing_history_and_is_idempotent(self):
        path=self.root/'legacy.sqlite'
        with sqlite3.connect(path) as legacy:
            legacy.executescript(m.SCHEMA)
            legacy.execute("insert into meta values('memory_revision',?)",(json.dumps('legacy-hash'),))
            legacy.execute("insert into papers(paper_id,level,title,source_sha256,source_pdf) values('old',3,'Old','sha','path')")
            legacy.execute("insert into decisions values('decision','job','packet','candidate','needs-review','','reason','[]','needs-review',NULL,'[]')")
            legacy.execute("insert into decision_sources values('decision','old',7,'2','[1]','sha')")
        with m.connect(path) as migrated:
            first=m.revise(migrated);self.assertEqual(first,m.revision_recompute(migrated));self.assertEqual(m.revise(migrated),first)
            self.assertEqual(migrated.execute("select title from papers where paper_id='old'").fetchone()[0],'Old');self.assertEqual(migrated.execute("select count(*) from decision_sources").fetchone()[0],1);self.assertEqual(migrated.execute("select reasoning from decisions").fetchone()[0],'reason');migrated.commit()
        with m.connect(path) as reopened:self.assertEqual(m.revise(reopened),first)

    def test_query_does_not_load_full_generator_payloads(self):
        queries=[];self.db.set_trace_callback(queries.append);m.query(self.db,self.app,3,'bottle capacity',5);self.db.set_trace_callback(None)
        self.assertFalse(any('select g.*' in q.lower() for q in queries))

    def test_revision_reads_content_addresses_instead_of_full_payloads(self):
        m.ingest(self.db,'paper1',self.queue);queries=[];self.db.set_trace_callback(queries.append)
        before=m.get_meta(self.db,'memory_revision');after=m.revise(self.db);self.db.set_trace_callback(None)
        self.assertEqual(before,after)
        self.assertFalse(any('select * from regions' in q.lower() or 'select * from code_snapshots' in q.lower() or 'select * from generator_versions' in q.lower() for q in queries))


if __name__=='__main__': unittest.main()
