import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pictureCues,renderSpeech} from './premium-narration.mjs';
const align=text=>({characters:[...text],character_start_times_seconds:[...text].map((_,i)=>i/10),character_end_times_seconds:[...text].map((_,i)=>(i+1)/10)});
test('uses speech timestamps to advance at the start of each caption',()=>{assert.deepEqual(pictureCues(['One.','Two.'],align('One. Two.')).cues,[0,.5]);});
test('rejects a different spoken script or malformed timing',()=>{assert.throws(()=>pictureCues(['Six.'],align('Five.')),/does not match/);assert.throws(()=>pictureCues(['Hi'],{...align('Hi'),character_start_times_seconds:[1,0]}),/Invalid/);});
test('fails before contacting the provider without credentials',async()=>{let called=false;await assert.rejects(renderSpeech({text:'One.'},{},()=>{called=true;}),/private environment/);assert.equal(called,false);});
test('generates a whole script through the authenticated API without publishing it',async()=>{let request;const result=await renderSpeech({text:'One. Two.',segments:['One.','Two.']},{key:'test-secret',voice:'test-voice'},async(url,options)=>{request={url,options};return {ok:true,json:async()=>({audio_base64:Buffer.alloc(2000).toString('base64'),alignment:align('One. Two.')})};});assert.equal(JSON.parse(request.options.body).text,'One. Two.');assert.equal(request.options.headers['xi-api-key'],'test-secret');assert.deepEqual(result.cues,[0,.5]);});
