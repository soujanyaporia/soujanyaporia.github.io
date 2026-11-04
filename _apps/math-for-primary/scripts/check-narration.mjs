import {createServer} from 'vite';
import {readFile,stat} from 'node:fs/promises';
const index=JSON.parse(await readFile('src/media/narration-index.json','utf8'));
let bytes=0;
for(const [key,r] of Object.entries(index)){
 if(!/^[a-z0-9-]+$/.test(key)||!r.approved||!(r.duration>0)||!Number.isFinite(r.duration))throw Error(`Invalid reviewed recording: ${key}`);
 const file=await stat(`public/audio/${key}.mp3`);if(file.size<1000)throw Error(`Empty recording: ${key}`);bytes+=file.size;
 if(r.cues&&(r.cues[0]!==0||r.cues.some((n,i)=>!Number.isFinite(n)||n<0||n>=r.duration||(i>0&&n<=r.cues[i-1]))))throw Error(`Invalid picture cues: ${key}`);
}
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {LESSONS}=await server.ssrLoadModule('/src/teach/catalog.ts');
 const {frameNarration,sequenceNarration}=await server.ssrLoadModule('/src/media/frames.ts');
 const {narrationKey}=await server.ssrLoadModule('/src/lib/speechText.ts');
 let checks=0;
 for(const lesson of LESSONS){
  const stage=lesson.stages.find(s=>s.kind==='explain'&&s.frames?.length),worked=lesson.stages.find(s=>s.kind==='worked');
  const frames=stage?.frames??worked?.steps??[];
  if(!frames.length)throw Error(`Missing walkthrough: ${lesson.id}`);
  const r=index[narrationKey(sequenceNarration(frames.map(f=>frameNarration(f))))];
  if(!r?.approved||r.cues?.length!==frames.length)throw Error(`Missing continuous narration or picture cues: ${lesson.id}`);
  checks++;
 }
 console.log(`Narration audit: ${checks} lesson walkthroughs covered; ${Object.keys(index).length} reviewed audio clips; ${(bytes/1024/1024).toFixed(1)} MiB, loaded only on play.`);
}finally{await server.close();}
