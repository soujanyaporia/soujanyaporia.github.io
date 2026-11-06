#!/usr/bin/env node
/** Typecheck and test staged rag files in a private source snapshot, never the live src. */
import {cpSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';

const job=realpathSync(process.cwd());
const argv=process.argv.slice(2),at=argv.indexOf('--app-root');
let report={schema:1,status:'failed',checksExecuted:false,checks:[],candidateFiles:{},message:''};
const reportPath=join(job,'rag-check-report.json');
const hash=data=>createHash('sha256').update(data).digest('hex');
function inside(base,path){const r=relative(base,path);return r!==''&&!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r);}
function walk(root){
 const out=[];function go(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isSymbolicLink())throw Error(`Symlink not permitted in copied files: ${p}`);if(entry.isDirectory())go(p);else if(entry.isFile())out.push(p);else throw Error(`Unsupported file: ${p}`);}}go(root);return out.sort();
}
function run(name,args,dir){
 const run=spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',timeout:180000,maxBuffer:12_000_000,env:{...process.env,TMPDIR:join(dir,'.tmp'),TEMP:join(dir,'.tmp'),TMP:join(dir,'.tmp')}});
 const result={name,exitCode:run.status,signal:run.signal??null,error:run.error?.message??null,stdout:(run.stdout??'').slice(-12000),stderr:(run.stderr??'').slice(-12000)};report.checksExecuted=true;report.checks.push(result);return result;
}
try{
 if(at<0||!argv[at+1]||argv.length!==2)throw Error('Usage: node rag-check-candidate.mjs --app-root /absolute/app/path');
 const app=realpathSync(resolve(argv[at+1]));if(app===job||inside(join(app,'src'),job)||inside(join(app,'node_modules'),job))throw Error('Job directory must be outside live source and node_modules.');
 for(const p of ['src','package.json','tsconfig.json','vite.config.ts','node_modules'])if(!existsSync(join(app,p)))throw Error(`Missing app input: ${p}`);
 const source=join(job,'candidate','src','primary','paperImports');if(!existsSync(source)||!lstatSync(source).isDirectory())throw Error('Missing staged candidate/src/primary/paperImports.');
 const candidateRoot=join(job,'candidate');if(lstatSync(candidateRoot).isSymbolicLink())throw Error('Candidate root cannot be a symlink.');
 const files=walk(candidateRoot);if(!files.length||files.length>24)throw Error('Expected 1–24 staged candidate files.');
 for(const file of files){const rel=relative(candidateRoot,file).split(sep).join('/');if(!/^src\/primary\/paperImports\/rag[A-Za-z0-9_-]+(?:\.test)?\.tsx?$/.test(rel))throw Error(`Not an allowed new rag file: ${rel}`);if(existsSync(join(app,rel)))throw Error(`Candidate would overwrite a live app file: ${rel}`);report.candidateFiles[rel]=hash(readFileSync(file));}
 const packet=JSON.parse(readFileSync(join(job,'packet.json'),'utf8')),checkpoint=JSON.parse(readFileSync(join(job,'checkpoint.json'),'utf8'));
 if(packet.schema!==1||!Number.isInteger(packet.level)||packet.level<1||packet.level>6||!Number.isInteger(checkpoint.attempt)||checkpoint.attempt<1||checkpoint.attempt>3)throw Error('Invalid packet or active attempt.');
 const proposalBytes=readFileSync(join(job,`candidate-attempt-${checkpoint.attempt}.json`)),proposal=JSON.parse(proposalBytes);
 report.packetSha256=checkpoint.packetSha256;report.candidateSha256=hash(proposalBytes);
 if(typeof report.packetSha256!=='string'||!/^[a-f0-9]{64}$/.test(report.packetSha256))throw Error('Checkpoint packet SHA-256 is missing or invalid.');
 if(proposal.decision!=='new-generator'||typeof proposal.canonicalPatternId!=='string'||!/^[a-z0-9][a-z0-9-]{0,119}$/.test(proposal.canonicalPatternId))throw Error('Invalid candidate generator decision or canonical pattern.');
 const entries=files.filter(file=>!file.endsWith('.test.ts')&&!file.endsWith('.test.tsx')&&/\bexport\s+const\s+RAG_PATTERN\b/.test(readFileSync(file,'utf8'))&&/\bexport\s+function\s+makeRagQuestion\b/.test(readFileSync(file,'utf8')));
 if(entries.length!==1||!/^rag[A-Z][A-Za-z0-9]*\.ts$/.test(basename(entries[0])))throw Error('Exactly one rag<PascalName>.ts must directly export RAG_PATTERN and makeRagQuestion.');
 const tests=files.map(f=>relative(candidateRoot,f).split(sep).join('/')).filter(f=>/\.test\.ts$/.test(f));
 if(!tests.length)throw Error('At least one new rag*.test.ts file is required.');
 if(!files.some(f=>!f.endsWith('.test.ts')&&!f.endsWith('.test.tsx')))throw Error('A separate generator implementation file is required.');
 const target=join(job,'validation-app'),marker=join(target,'.rag-validation-owner');
 if(existsSync(target)){if(lstatSync(target).isSymbolicLink()||!existsSync(marker)||readFileSync(marker,'utf8')!=='rag-validation-v1\n')throw Error('Refusing to replace an unowned validation directory.');rmSync(target,{recursive:true});}
 mkdirSync(target,{recursive:true});writeFileSync(marker,'rag-validation-v1\n');
 // Freeze promotion writes during the input copy so aggregates and modules agree.
 const promotionLock=join(app,'src/primary/paperImports/.rag-promotion-lock');
 let locked=false;for(let attempt=0;attempt<120;attempt++){try{mkdirSync(promotionLock);locked=true;break;}catch(error){if(error.code!=='EEXIST')throw error;await new Promise(resolve=>setTimeout(resolve,500));}}
 if(!locked)throw Error('Timed out waiting for a stable source snapshot.');
 report.auxiliarySourceFiles={};
 try{
  cpSync(join(app,'src'),join(target,'src'),{recursive:true,filter:path=>path!==promotionLock});for(const f of ['package.json','tsconfig.json','vite.config.ts'])cpSync(join(app,f),join(target,f));
  // Preserve the Cloud Pass source dependency without deployment settings or credentials.
  if(existsSync(join(app,'cloudflare-worker','src'))){
   cpSync(join(app,'cloudflare-worker','src'),join(target,'cloudflare-worker','src'),{recursive:true});
   for(const f of walk(join(target,'cloudflare-worker','src')))report.auxiliarySourceFiles[relative(target,f).split(sep).join('/')]=hash(readFileSync(f));
  }
 }finally{rmSync(promotionLock,{recursive:true,force:true});}
 const sourceFiles=walk(join(target,'src'));const h=createHash('sha256');for(const p of sourceFiles){const rel=relative(target,p).split(sep).join('/');h.update(rel+'\0'+hash(readFileSync(p))+'\n');}
 report.baseSourceTreeSha256=h.digest('hex');report.baseFiles={};for(const file of ['package.json','tsconfig.json','vite.config.ts'])report.baseFiles[file]=hash(readFileSync(join(target,file)));
 symlinkSync(realpathSync(join(app,'node_modules')),join(target,'node_modules'),'dir');mkdirSync(join(target,'.tmp'));
 for(const file of files){const rel=relative(candidateRoot,file),dest=join(target,rel);mkdirSync(dirname(dest),{recursive:true});cpSync(file,dest,{errorOnExist:true,force:false});}
 // The bridge is generated only in the disposable snapshot. It checks the promotion contract independently of candidate tests.
 const contractRel='src/primary/paperImports/ragWorkerContractCheck.test.ts',contract=join(target,contractRel);
 if(existsSync(contract))throw Error('Reserved contract-test path already exists.');
 const entry='./'+basename(entries[0],'.ts');
 writeFileSync(contract,`import {describe,it,expect} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {RAG_PATTERN,makeRagQuestion} from ${JSON.stringify(entry)};
describe('RAG promotion contract',()=>{
 it('has bounded metadata and known curriculum skills',()=>{expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);expect(RAG_PATTERN.level).toBe(${packet.level});expect(RAG_PATTERN.canonicalPatternId).toBe(${JSON.stringify(proposal.canonicalPatternId)});expect(RAG_PATTERN.title.trim()).not.toBe('');expect(RAG_PATTERN.objective.trim()).not.toBe('');expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));for(const id of RAG_PATTERN.skillIds)expect(ids.has(id),id).toBe(true);});
 it('builds ready, correct, explained, reproducible questions',()=>{for(let seed=0;seed<20;seed++){const q:Question=makeRagQuestion(seed,0);expect(q.prompt.trim()).not.toBe('');expect(q.answer.trim()).not.toBe('');expect(q.hint.trim()).not.toBe('');expect(q.explanation.trim()).not.toBe('');expect(q.workedSteps?.length??0).toBeGreaterThan(0);for(const s of q.workedSteps??[])expect(s.text.trim()).not.toBe('');expect(paperAnswerStatus(q,q.answer)).toBe('complete');expect(correctAnswer(q,q.answer)).toBe(true);expect(correctAnswer(q,'__rag_invalid_answer__')).toBe(false);if(q.choices)expect(q.choices.filter(x=>correctAnswer(q,x))).toHaveLength(1);expect(makeRagQuestion(seed,0)).toEqual(q);}});
});
`);
 // Keep Vite caches in the disposable snapshot, not in the linked node_modules.
 writeFileSync(join(target,'rag-vitest.config.ts'),`import {mergeConfig,defineConfig} from 'vitest/config';\nimport base from './vite.config';\nexport default mergeConfig(base,defineConfig({cacheDir:'./.rag-vite-cache'}));\n`);
 const tsc=join(target,'node_modules','typescript','bin','tsc');const vitest=join(target,'node_modules','vitest','vitest.mjs');
 if(!existsSync(tsc)||!existsSync(vitest))throw Error('TypeScript or Vitest is missing from existing node_modules.');
 const typecheck=run('typecheck',[tsc,'--noEmit','-p','tsconfig.json'],target);
 if(typecheck.exitCode!==0)throw Error('Typecheck failed; candidate tests were not run.');
 const vitestFile=join(target,'rag-vitest-result.json');const test=run('candidate-tests',[vitest,'run','--config','rag-vitest.config.ts','--maxWorkers=1','--reporter=json',`--outputFile=${vitestFile}`,...tests,contractRel],target);
 if(test.exitCode!==0||!existsSync(vitestFile)){
  if(existsSync(vitestFile)){
   const failed=JSON.parse(readFileSync(vitestFile,'utf8'));
   report.testFailures=(failed.testResults??[]).filter(t=>t.status!=='passed').map(t=>({file:relative(target,t.name),message:String(t.message??'').slice(-4000),assertions:(t.assertionResults??[]).filter(a=>a.status==='failed').map(a=>({name:a.fullName,messages:a.failureMessages}))}));
  }
  throw Error('Candidate tests failed. Use Vitest imports; inspect testFailures for suite and assertion errors.');
 }
 const result=JSON.parse(readFileSync(vitestFile,'utf8'));if(result.success!==true||!Number.isInteger(result.numPassedTests)||result.numPassedTests<1||result.numFailedTests!==0)throw Error('Candidate tests must execute at least one passing test with zero failures.');
 const executed=new Map((result.testResults??[]).map(t=>[resolve(t.name),t]));for(const file of [...tests,contractRel]){const entry=executed.get(resolve(target,file));if(!entry)throw Error(`Required test file was not executed: ${file}`);if(!(entry.assertionResults??[]).some(x=>x.status==='passed'))throw Error(`Required test file has no passing tests: ${file}`);}
 report.testSummary={passed:result.numPassedTests,failed:result.numFailedTests,files:tests};report.status='checks-passed';report.message='Typecheck and explicitly staged candidate test files passed in the snapshot.';
}catch(error){report.message=error instanceof Error?error.message:String(error);}
try{writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}catch(error){console.error(`Unable to write report: ${error}`);process.exitCode=2;}
console.log(JSON.stringify(report));if(report.status!=='checks-passed')process.exitCode=1;
