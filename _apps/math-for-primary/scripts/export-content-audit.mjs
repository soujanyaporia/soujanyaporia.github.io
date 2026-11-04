import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {LESSONS}=await server.ssrLoadModule('/src/teach/catalog.ts');
 const {CURRICULUM_SKILLS}=await server.ssrLoadModule('/src/school/curriculum.ts');
 const {ACTIVITIES}=await server.ssrLoadModule('/src/primary/catalog.ts');
 const {makeQuestion}=await server.ssrLoadModule('/src/primary/generate.ts');
 const seeds=[0,1,7,31,129,217,7919];
 const lessons=LESSONS.map(l=>({...l,stages:l.stages.map((s,si)=>({...s,items:['readiness','reason'].includes(s.kind)?s.items:seeds.flatMap(seed=>s.kind==='practice'||s.kind==='apply'?Array.from({length:s.count},(_,i)=>({seed,...s.gen(seed+si*1009,i)})):s.kind==='mastery'?s.gens.map((g,i)=>({seed,...g.gen(seed+si*1009,i),facet:g.facet})):[])}))}));
 const activities=ACTIVITIES.map(a=>({...a,questions:seeds.flatMap(seed=>Array.from({length:6},(_,index)=>({seed,index,...makeQuestion(a,seed,index)})))}));
 await mkdir('.generated/content-audit',{recursive:true});
 await writeFile('.generated/content-audit/snapshot.json',JSON.stringify({skills:CURRICULUM_SKILLS,lessons,activities}));
 console.log(JSON.stringify({lessons:lessons.length,activities:activities.length,skills:CURRICULUM_SKILLS.length}));
}finally{await server.close()}
