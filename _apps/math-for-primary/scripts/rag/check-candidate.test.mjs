import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const checker=resolve('scripts/rag-check-candidate.mjs');
function put(path,text){mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,text);}
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'rag-check-')),app=join(root,'app'),job=join(root,'job');mkdirSync(job,{recursive:true});
 put(join(app,'src','baseline.ts'),'export const base = 1;\n');put(join(app,'package.json'),'{}');put(join(app,'tsconfig.json'),'{}');put(join(app,'vite.config.ts'),'export default {};');
 put(join(app,'node_modules','typescript','bin','tsc'),"process.exit(process.env.FAKE_TSC_FAIL==='1'?1:0);\n");
 put(join(app,'node_modules','vitest','vitest.mjs'),`import {writeFileSync} from 'node:fs';import {resolve} from 'node:path';const out=process.argv.find(x=>x.startsWith('--outputFile=')).slice(13),tests=process.argv.filter(x=>x.endsWith('.test.ts'));const passed=process.env.FAKE_ZERO==='1'?0:2;writeFileSync(out,JSON.stringify({success:true,numPassedTests:passed,numFailedTests:0,testResults:tests.map(name=>({name:resolve(name),assertionResults:passed?[{status:'passed'}]:[]}))}));`);
 put(join(job,'candidate','src','primary','paperImports','ragExample.ts'),'export const RAG_PATTERN={}; export function makeRagQuestion(){return {};}');put(join(job,'packet.json'),JSON.stringify({schema:1,level:5}));put(join(job,'checkpoint.json'),JSON.stringify({attempt:1,packetSha256:'a'.repeat(64)}));put(join(job,'candidate-attempt-1.json'),JSON.stringify({decision:'new-generator',canonicalPatternId:'example-pattern'}));
 const invoke=(extraEnv={})=>spawnSync(process.execPath,[checker,'--app-root',app],{cwd:job,encoding:'utf8',env:{...process.env,...extraEnv}});
 return {root,app,job,invoke,cleanup(){rmSync(root,{recursive:true,force:true});}};
}
test('checks staged files in a private snapshot and leaves live source unchanged',()=>{const f=fixture();try{
 put(join(f.job,'candidate','src','primary','paperImports','ragExample.test.ts'),'// test');const p=f.invoke();assert.equal(p.status,0,p.stderr+' '+p.stdout);const report=JSON.parse(readFileSync(join(f.job,'rag-check-report.json'),'utf8'));assert.equal(report.status,'checks-passed');assert.equal(report.testSummary.passed,2);assert.equal(report.checks.length,2);assert.equal(readFileSync(join(f.app,'src','baseline.ts'),'utf8'),'export const base = 1;\n');assert.ok(report.baseSourceTreeSha256);
 }finally{f.cleanup();}});
test('rejects a missing test, zero tests, and failed typecheck',()=>{const f=fixture();try{
 assert.equal(f.invoke().status,1);put(join(f.job,'candidate','src','primary','paperImports','ragExample.test.ts'),'// test');assert.equal(f.invoke({FAKE_ZERO:'1'}).status,1);assert.equal(f.invoke({FAKE_TSC_FAIL:'1'}).status,1);
 }finally{f.cleanup();}});
test('rejects a missing promotion contract',()=>{const f=fixture();try{put(join(f.job,'candidate','src','primary','paperImports','ragExample.test.ts'),'// test');put(join(f.job,'candidate','src','primary','paperImports','ragExample.ts'),'export const value=2;');const p=f.invoke();assert.equal(p.status,1);assert.match(p.stdout,/RAG_PATTERN/);}finally{f.cleanup();}});
test('rejects candidate symlinks',()=>{const f=fixture();try{
 symlinkSync(join(f.app,'src','baseline.ts'),join(f.job,'candidate','src','primary','paperImports','ragBad.test.ts'));const p=f.invoke();assert.equal(p.status,1);assert.match(p.stdout,/Symlink/);
 }finally{f.cleanup();}});
