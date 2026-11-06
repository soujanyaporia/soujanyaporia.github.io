import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {packetHash,promoteJob,renderRegistry,sha,treeHash} from '../rag-promote.mjs';
const ROOT='src/primary/paperImports/';
function put(path,text){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text);}
function fixture(t,suffix='',canonicalOverride){
 const root=mkdtempSync(join(tmpdir(),'rag-promote-')),app=join(root,'app'),job=join(root,'job');t.after(()=>rmSync(root,{recursive:true,force:true}));
 put(join(app,'src/base.ts'),'export const base=1;\n');for(const file of ['package.json','tsconfig.json','vite.config.ts'])put(join(app,file),'{}');
 put(join(app,'src/school/curriculum.ts'),"export const CURRICULUM_SKILLS=[{id:'P3.S.MEASURE.03'}];");
 put(join(app,'cloudflare-worker/src/worker.ts'),'export const worker=1;');
 put(join(app,'.generated/question-pattern-inventory.json'),JSON.stringify({activities:[{id:'current',level:3,canonicalPatternId:'already-existing'}]}));
 for(const [path,text] of Object.entries(renderRegistry({schema:1,entries:[]})))put(join(app,path),text);
 const pdf=join(job,'source.pdf');put(pdf,'%PDF-private-fixture');
 const tail=suffix?'-'+suffix.toLowerCase():'';
 const pattern={id:'fixture-water'+tail,level:3,title:'Equal bottles',objective:'Find a capacity from equal bottles.',skillIds:['P3.S.MEASURE.03'],canonicalPatternId:canonicalOverride??'fixture-new-bottle-pattern'+tail};
 const files=[{path:'candidate/'+ROOT+'ragFixtureWater'+suffix+'.ts',content:`export const RAG_PATTERN=${JSON.stringify(pattern)}; export function makeRagQuestion(){return {};}`} ,{path:'candidate/'+ROOT+'ragFixtureWater'+suffix+'.test.ts',content:'// independent visible-givens fixture test'}];
 const packet={schema:1,jobId:'fixture-job'+tail,level:3,topic:'water',sourceRegions:[{bankLine:1,paperId:'abc123',level:3,questionNumber:'8a',pageNumbers:[2],rawText:'Private source wording.',rawTextSha256:sha('Private source wording.'),sourcePdf:pdf,sourceSha256:sha('%PDF-private-fixture'),pageTexts:[{page:2,text:'Private page wording.',textSha256:sha('Private page wording.')}],pageImages:[]}],referenceFiles:[],existingGenerators:[],requirements:[]};
 const proposal={decision:'new-generator',canonicalPatternId:pattern.canonicalPatternId,sourceRefs:[{bankLine:1,paperId:'abc123',questionNumber:'8a',pageNumbers:[2]}],files,blockingGaps:[],tests:['independent solver'],reasoning:'New structure.'};
 put(join(job,'packet.json'),JSON.stringify(packet));put(join(job,'candidate-attempt-1.json'),JSON.stringify(proposal));for(const file of files)put(join(job,file.path),file.content);
 const snapshot=join(job,'validation-app');cpSync(join(app,'src'),join(snapshot,'src'),{recursive:true});for(const file of ['package.json','tsconfig.json','vite.config.ts'])cpSync(join(app,file),join(snapshot,file));cpSync(join(app,'cloudflare-worker'),join(snapshot,'cloudflare-worker'),{recursive:true});put(join(snapshot,'.rag-validation-owner'),'rag-validation-v1\n');
 const report={schema:1,status:'checks-passed',checksExecuted:true,checks:[{name:'typecheck',exitCode:0},{name:'candidate-tests',exitCode:0}],candidateFiles:Object.fromEntries(files.map(f=>[f.path.slice(10),sha(f.content)])),baseSourceTreeSha256:treeHash(app),baseFiles:Object.fromEntries(['package.json','tsconfig.json','vite.config.ts'].map(p=>[p,sha('{}')])),auxiliarySourceFiles:{'cloudflare-worker/src/worker.ts':sha('export const worker=1;')},testSummary:{passed:5,failed:0,files:[ROOT+'ragFixtureWater'+suffix+'.test.ts']}};
 for(const file of files)put(join(snapshot,file.path.slice(10)),file.content);put(join(snapshot,ROOT+'ragWorkerContractCheck.test.ts'),'// checked contract fixture');report.contractTestSha256=sha('// checked contract fixture');
 const checkpoint={schema:1,jobId:packet.jobId,status:'checks-passed',decision:'new-generator',checksExecuted:true,checks:[{exitCode:0}],attempt:1,candidateFile:'candidate-attempt-1.json',packetSha256:packetHash(join(job,'packet.json')),candidateSha256:sha(readFileSync(join(job,'candidate-attempt-1.json'))),fileSha256:Object.fromEntries(files.map(f=>[f.path,sha(f.content)]))};
 const seal=()=>{put(join(job,'rag-check-report.json'),JSON.stringify(report));checkpoint.checkReportSha256=sha(readFileSync(join(job,'rag-check-report.json')));put(join(job,'checkpoint.json'),JSON.stringify(checkpoint));};seal();
 const invoke=(options={})=>promoteJob({job,appRoot:app,loadMetadata:async()=>({pattern,skillIds:['P3.S.MEASURE.03']}),...options});
 return {app,job,packet,proposal,pattern,checkpoint,report,seal,invoke};
}
test('dry-run writes no app files; integration generates bounded public metadata and is idempotent',async t=>{
 const f=fixture(t),before=treeHash(f.app);assert.equal((await f.invoke({dryRun:true})).status,'dry-run');assert.equal(treeHash(f.app),before);assert.equal(existsSync(join(f.app,ROOT+'ragFixtureWater.ts')),false);
 const result=await f.invoke();assert.equal(result.status,'integrated');assert.equal((await f.invoke()).status,'already-integrated');
 const registry=JSON.parse(readFileSync(join(f.app,ROOT+'ragRegistry.json'),'utf8'));assert.equal(registry.entries.length,1);assert.deepEqual(registry.entries[0].sourceRefs,[{paperId:'abc123',sourceQuestion:'8a',sourcePages:[2]}]);
 const publicText=readFileSync(join(f.app,ROOT+'ragRegistry.json'),'utf8')+readFileSync(join(f.app,ROOT+'ragCatalog.ts'),'utf8');assert.ok(!publicText.includes(f.job));assert.ok(!publicText.includes('Private source wording'));assert.ok(!publicText.includes('source.pdf'));assert.match(readFileSync(join(f.app,ROOT+'ragQuestions.ts'),'utf8'),/make0\(seed,index\)/);
});
test('requires passing checker and checkpoint, immutable report and candidate files',async t=>{
 for(const mutate of [f=>{f.checkpoint.status='generated-unverified';f.seal();},f=>{f.report.status='failed';f.seal();},f=>{put(join(f.job,'rag-check-report.json'),'{}');},f=>{put(join(f.job,'candidate/'+ROOT+'ragFixtureWater.ts'),'altered');},f=>{put(join(f.job,'candidate-attempt-1.json'),'{}');}]){const f=fixture(t);mutate(f);await assert.rejects(f.invoke());assert.equal(existsSync(join(f.app,ROOT+'ragFixtureWater.ts')),false);}
});
test('rejects source, snapshot, current app, auxiliary and check-code drift',async t=>{
 for(const mutate of [f=>put(join(f.job,'source.pdf'),'changed PDF'),f=>put(join(f.job,'validation-app/src/base.ts'),'changed snapshot'),f=>put(join(f.app,'src/base.ts'),'changed app'),f=>put(join(f.app,'cloudflare-worker/src/worker.ts'),'changed aux'),f=>put(join(f.job,'validation-app/cloudflare-worker/src/worker.ts'),'changed aux snapshot'),f=>put(join(f.job,'validation-app',ROOT+'ragWorkerContractCheck.test.ts'),'changed contract')]){const f=fixture(t);mutate(f);await assert.rejects(f.invoke());}
});
test('rejects known canonical patterns, runtime metadata errors and destination collisions',async t=>{
 const duplicate=fixture(t);put(join(duplicate.app,'.generated/question-pattern-inventory.json'),JSON.stringify({activities:[{id:'old',canonicalPatternId:duplicate.pattern.canonicalPatternId}]}));await assert.rejects(duplicate.invoke(),/reuse/);
 const invalid=fixture(t);invalid.pattern.skillIds=['P6.S.CIRCLE.01'];await assert.rejects(invalid.invoke(),/skill/);
 const collision=fixture(t);put(join(collision.app,ROOT+'ragFixtureWater.ts'),'existing different file');await assert.rejects(collision.invoke(),/overwrite/);assert.equal(readFileSync(join(collision.app,ROOT+'ragFixtureWater.ts'),'utf8'),'existing different file');
});
test('registry prevents duplicate canonical patterns even before inventory refresh',async t=>{
 const f=fixture(t),path=ROOT+'ragEarlier.ts',content='export const earlier=1;';put(join(f.app,path),content);
 const registry={schema:1,entries:[{...f.pattern,id:'earlier-entry',parameter:'rag-earlier-entry',entryFile:path,files:[{path,sha256:sha(content)}],sourceRefs:[{paperId:'previous-paper',sourceQuestion:'2',sourcePages:[1]}],jobId:'earlier-job'}]};
 for(const [rel,text] of Object.entries(renderRegistry(registry)))put(join(f.app,rel),text);
 cpSync(join(f.app,'src'),join(f.job,'validation-app/src'),{recursive:true});f.report.baseSourceTreeSha256=treeHash(f.app);f.seal();
 await assert.rejects(f.invoke(),/reuse/);assert.equal(existsSync(join(f.app,ROOT+'ragFixtureWater.ts')),false);
});
test('reads the direct entry and known skills through real private Vite SSR',async t=>{
 const f=fixture(t),before=treeHash(f.app);const result=await f.invoke({dryRun:true,loadMetadata:undefined});assert.equal(result.status,'dry-run');assert.equal(treeHash(f.app),before);
});
test('accepts hash-bound images kept in the original retrieval folder and rejects image tampering',async t=>{
 const f=fixture(t),image=join(dirname(f.job),'original-retrieval/page-2.png');put(image,Buffer.from('\x89PNG\r\n\x1a\nfixture','binary'));
 f.packet.sourceRegions[0].pageImages=[{page:2,path:image,sha256:sha(readFileSync(image))}];
 put(join(f.job,'packet.json'),JSON.stringify(f.packet));f.checkpoint.packetSha256=packetHash(join(f.job,'packet.json'));
 f.report.packetSha256=f.checkpoint.packetSha256;f.report.candidateSha256=f.checkpoint.candidateSha256;f.seal();
 assert.equal((await f.invoke({dryRun:true})).status,'dry-run');
 put(image,'altered retrieved image');await assert.rejects(f.invoke({dryRun:true}),/Source page image hash changed/);
 assert.equal(existsSync(join(f.app,ROOT+'ragFixtureWater.ts')),false);
});
test('rejects checker packet/candidate bindings that disagree with the checkpoint',async t=>{
 for(const field of ['packetSha256','candidateSha256']){const f=fixture(t);f.report[field]='0'.repeat(64);f.seal();await assert.rejects(f.invoke(),/Checker .* binding differs/);}
});
test('accepts other RAG promotions made after the check; any non-RAG source change still needs a recheck',async t=>{
 const f=fixture(t),path=ROOT+'ragOther.ts',content='export const other=1;';put(join(f.app,path),content);
 const registry={schema:1,entries:[{...f.pattern,id:'other-entry',canonicalPatternId:'other-pattern',parameter:'rag-other-entry',entryFile:path,files:[{path,sha256:sha(content)}],sourceRefs:[{paperId:'previous-paper',sourceQuestion:'2',sourcePages:[1]}],jobId:'other-job'}]};
 for(const [rel,text] of Object.entries(renderRegistry(registry)))put(join(f.app,rel),text);
 assert.notEqual(treeHash(f.app),f.report.baseSourceTreeSha256);
 assert.equal((await f.invoke()).status,'integrated');
 const g=fixture(t);put(join(g.app,ROOT+'ragOther.ts'),'export const other=1;');put(join(g.app,'src/base.ts'),'changed app');
 await assert.rejects(g.invoke(),/rerun checker/);assert.equal(existsSync(join(g.app,ROOT+'ragFixtureWater.ts')),false);
});
test('preserves a promotion completed while another candidate loads metadata',async t=>{
 const f=fixture(t),g=fixture(t,'Other');
 const result=await f.invoke({loadMetadata:async()=>{
  assert.equal((await g.invoke({appRoot:f.app})).status,'integrated');
  return {pattern:f.pattern,skillIds:['P3.S.MEASURE.03']};
 }});
 assert.equal(result.status,'integrated');
 const registry=JSON.parse(readFileSync(join(f.app,ROOT+'ragRegistry.json'),'utf8'));
 assert.deepEqual(new Set(registry.entries.map(e=>e.jobId)),new Set([f.packet.jobId,g.packet.jobId]));
 for(const [path,text] of Object.entries(renderRegistry(registry)))assert.equal(readFileSync(join(f.app,path),'utf8'),text);
 assert.ok(existsSync(join(f.app,ROOT+'ragFixtureWater.ts')));
 assert.ok(existsSync(join(f.app,ROOT+'ragFixtureWaterOther.ts')));
});
test('rejects a canonical collision added during asynchronous metadata loading',async t=>{
 const f=fixture(t),g=fixture(t,'Other',f.pattern.canonicalPatternId);
 await assert.rejects(f.invoke({loadMetadata:async()=>{
  assert.equal((await g.invoke({appRoot:f.app})).status,'integrated');
  return {pattern:f.pattern,skillIds:['P3.S.MEASURE.03']};
 }}),/reuse/);
 const registry=JSON.parse(readFileSync(join(f.app,ROOT+'ragRegistry.json'),'utf8'));
 assert.deepEqual(registry.entries.map(e=>e.jobId),[g.packet.jobId]);
 assert.equal(existsSync(join(f.app,ROOT+'ragFixtureWater.ts')),false);
 assert.ok(existsSync(join(f.app,ROOT+'ragFixtureWaterOther.ts')));
});
