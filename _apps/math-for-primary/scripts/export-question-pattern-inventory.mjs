// A local adaptation aid: observed scheduling families are not verified corpus coverage.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve(process.argv[2]??'.generated/question-pattern-inventory.json');
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {ACTIVITIES}=await server.ssrLoadModule('/src/primary/catalog.ts');
 const {makeQuestion}=await server.ssrLoadModule('/src/primary/generate.ts');
 const {paperReasoningFamily,paperResponseForm}=await server.ssrLoadModule('/src/primary/paperBlueprints.ts');
 const {practicePaperTopics}=await server.ssrLoadModule('/src/primary/practicePaper.ts');
 const rows=ACTIVITIES.filter(a=>a.kind!=='daily'&&a.parameter!=='mixed').map(a=>{
  const examples=[17,37,83].map((seed,i)=>{const q=makeQuestion(a,seed,i);return {reasoningFamily:paperReasoningFamily(a,q),response:paperResponseForm(q),prompt:q.prompt,context:q.context,display:q.display,figure:q.picture,answer:q.answer,workedSteps:q.workedSteps};});
  return {id:a.id,level:a.level,track:a.track,title:a.title,objective:a.objective,skillIds:a.skillIds,parameter:a.parameter,canonicalPatternId:a.canonicalPatternId,observedFamilies:[...new Set(examples.map(e=>e.reasoningFamily))],examples};
 });
 const topics=[1,2,3,4,5,6].flatMap(level=>practicePaperTopics(level,'standard').filter(t=>t.id!=='mixed').map(t=>({level,...t})));
 await mkdir(resolve(output,'..'),{recursive:true});
 await writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),scope:'Generated app examples for finding adaptation gaps and duplicate reasoning. Three draws per activity; not exhaustive pattern enumeration or source-paper coverage.',topics,activities:rows},null,2)+'\n');
 console.log(JSON.stringify({output,activities:rows.length,thinTopics:topics.filter(t=>t.structureCount<4).map(t=>({level:t.level,topic:t.title,observedFamilies:t.structureCount}))}));
}finally{await server.close();}
