import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {renderSpeech} from './lib/premium-narration.mjs';
const root=resolve(import.meta.dirname,'..'),out=join(root,'.generated/premium-narration');
const scripts=JSON.parse(await readFile(join(root,'.generated/narration-scripts.json'),'utf8'));
const args=new Set(process.argv.slice(2)),voice=process.env.ELEVENLABS_VOICE_ID,model=process.env.ELEVENLABS_MODEL_ID??'eleven_v3';
let clips=args.has('--all')?scripts.filter(s=>s.segments||s.text==='How many fireflies are in the forest?'):[scripts.find(s=>s.segments?.length===8&&s.text.includes('fireflies altogether'))];
if(args.has('--include-steps'))clips=scripts;
if(clips.some(c=>!c))throw Error('Export the current narration scripts first.');
console.log(`${clips.length} recordings · ${clips.reduce((n,c)=>n+c.text.length,0).toLocaleString()} characters · ${args.has('--publish-reviewed')?'publishing reviewed staged recordings':'preview output only'}`);
if(args.has('--dry-run'))process.exit(0);
await mkdir(out,{recursive:true});const stagedIndex=join(out,'index.json');let index={};try{index=JSON.parse(await readFile(stagedIndex,'utf8'));}catch{}
if(!args.has('--publish-reviewed')){
 const key=process.env.ELEVENLABS_API_KEY;if(!key||!voice)throw Error('Voice recording needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the private environment. Do not use VITE_ variables for secrets.');
 for(const clip of clips){const version=`elevenlabs:${voice}:${model}`;if(index[clip.id]?.voice===version)continue;const {audio,cues,duration}=await renderSpeech(clip,{key,voice,model});await writeFile(join(out,clip.id+'.mp3'),audio);index[clip.id]={duration,voice:version,style:model,...(clip.segments?{cues}:{}),approved:false};await writeFile(stagedIndex,JSON.stringify(index,null,2)+'\n');console.log(`Prepared ${clip.id}`);}
 console.log('Preview the staged MP3 before publishing this voice. No pupil data or account details are included in the scripts.');
}else{
 const target=join(root,'public/audio');await mkdir(target,{recursive:true});const live=JSON.parse(await readFile(join(root,'src/media/narration-index.json'),'utf8'));
 for(const clip of clips){if(!index[clip.id])throw Error(`No staged recording for ${clip.id}`);await copyFile(join(out,clip.id+'.mp3'),join(target,clip.id+'.mp3'));live[clip.id]={...index[clip.id],approved:true};}
 await writeFile(join(root,'src/media/narration-index.json'),JSON.stringify(live)+'\n');console.log('Reviewed recordings are available in the app.');
}
