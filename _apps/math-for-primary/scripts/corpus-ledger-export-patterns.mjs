// Register existing authored families as candidates for structural deduplication.
// This does not map or verify any source-paper question.
import {createServer} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const library=resolve(process.argv[2]??'../Singapore Maths Paper Library');
const files=['src/primary/paperCatalog.ts','src/primary/corpusPaperCatalog.ts'];
const evidence=await Promise.all(files.map(async p=>({path:resolve(p),sha256:createHash('sha256').update(await readFile(p)).digest('hex')})));
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {PAPER_PATTERNS}=await server.ssrLoadModule('/src/primary/paperCatalog.ts');
 const prior=await readFile(resolve(library,'coverage/events.jsonl'),'utf8').catch(()=> '');
 const existing=new Set(prior.split('\n').filter(Boolean).map(line=>JSON.parse(line).eventId));
 const events=PAPER_PATTERNS.map(p=>({schemaVersion:1,eventId:`register-existing-app-${p.parameter}-v1`,type:'pattern_registered',entityType:'pattern',entityId:`app:paper:${p.parameter}`,recordedAt:new Date().toISOString(),reviewer:'content-syllabus-audit:catalogue-registration',evidence,payload:{title:p.title,description:p.objective,existingAppParameter:p.parameter,level:p.level,skillIds:p.skillIds,existingAppImplementationObserved:true,uniquenessStatus:'not-reviewed',sourceCoverage:'No source question is mapped by this metadata registration.',registrationScope:'An authored family may overlap another family structurally. It is not yet counted as a reviewed unique mathematical pattern.'}})).filter(event=>!existing.has(event.eventId));
 await mkdir(resolve(library,'coverage/imports'),{recursive:true});
 const path=resolve(library,'coverage/imports/existing-app-patterns.events.json');
 await writeFile(path,JSON.stringify(events,null,2)+'\n');
 process.stdout.write(JSON.stringify({patterns:events.length,eventFile:path})+'\n');
}finally{await server.close()}
