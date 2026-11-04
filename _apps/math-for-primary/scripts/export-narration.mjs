import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {LESSONS}=await server.ssrLoadModule('/src/teach/catalog.ts');
 const {frameNarration,sequenceNarration}=await server.ssrLoadModule('/src/media/frames.ts');
 const {speechText,narrationKey}=await server.ssrLoadModule('/src/lib/speechText.ts');
 const {solutionFrames,solutionNarration}=await server.ssrLoadModule('/src/media/solution.ts');
 const clips=new Map();const add=(text,segments)=>{if(!text?.trim())return;const key=narrationKey(text),spoken=speechText(text);if(clips.has(key)&&clips.get(key).text!==spoken)throw Error('Narration hash collision');clips.set(key,{id:key,text:spoken,...(segments?{segments:segments.map(speechText)}:{})});};
 const sequence=parts=>add(sequenceNarration(parts),parts);
 add('How many fireflies are in the forest?');
 for(let count=3;count<=20;count++){const q={key:'voice-count-'+count,prompt:'How many fireflies are in the forest?',answer:String(count),hint:'Count each firefly once.',explanation:`There are ${count} fireflies.`,picture:{type:'counters',count}};sequence(solutionFrames(q).map(solutionNarration));}
 // Continuous recordings come first; a single voice performance follows all the picture changes.
 for(const l of LESSONS)for(const s of l.stages)if(s.kind==='explain')for(const fs of [s.frames,...(s.alternatives??[]).map(a=>a.frames)])if(fs?.length)sequence(fs.map(f=>frameNarration(f)));
 for(const l of LESSONS)for(const s of l.stages){
  if(s.kind==='explain'){for(const f of [...(s.frames??[]),...(s.alternatives??[]).flatMap(a=>a.frames)])add(frameNarration(f));}
  if(s.kind==='worked')for(const f of s.steps){add(frameNarration(f,!!f.ask));add(frameNarration(f));}
 }
 await mkdir('.generated',{recursive:true});await writeFile('.generated/narration-scripts.json',JSON.stringify([...clips.values()],null,2));console.log(`Prepared ${clips.size} narration recordings (${[...clips.values()].filter(c=>c.segments).length} continuous) for ${LESSONS.length} lessons.`);
}finally{await server.close();}
