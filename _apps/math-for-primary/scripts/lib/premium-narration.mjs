/** Align a whole spoken script to picture frames using provider-supplied character times. */
export function pictureCues(segments,alignment){
 if(!alignment||!Array.isArray(alignment.characters)||!Array.isArray(alignment.character_start_times_seconds)||!Array.isArray(alignment.character_end_times_seconds))throw Error('The voice service did not return speech timing.');
 const chars=alignment.characters,times=alignment.character_start_times_seconds,ends=alignment.character_end_times_seconds;
 if(chars.length!==times.length||chars.length!==ends.length||!times.length||times.some((t,i)=>!Number.isFinite(t)||t<0||(i>0&&t<times[i-1]))||ends.some((t,i)=>!Number.isFinite(t)||t<times[i]))throw Error('Invalid speech timing.');
 const normalize=s=>[...s].filter(c=>/[\p{L}\p{N}]/u.test(c)).join('').toLowerCase();
 const characters=chars.flatMap((c,i)=>[...c].filter(c=>/[\p{L}\p{N}]/u.test(c)).map(c=>({char:c.toLowerCase(),time:times[i]})));
 if(characters.map(c=>c.char).join('')!==normalize(segments.join(' ')))throw Error('The spoken script does not match the picture captions.');
 const cues=[0];let at=0;for(const segment of segments.slice(0,-1)){at+=normalize(segment).length;if(!characters[at])throw Error('Missing frame timing.');cues.push(characters[at].time);}
 return {cues,duration:Math.max(...ends)+.2};
}
export async function renderSpeech(clip,{key,voice,model='eleven_v3'},fetcher=fetch){
 if(!key||!voice)throw Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the private environment.');
 const result=await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',headers:{'content-type':'application/json','xi-api-key':key},body:JSON.stringify({text:clip.text,model_id:model,language_code:'en',voice_settings:{stability:.5,similarity_boost:.75},apply_text_normalization:'on'}),signal:AbortSignal.timeout(120000)});
 if(!result.ok)throw Error(`Voice service returned HTTP ${result.status}. No recording was published.`);
 const payload=await result.json();if(typeof payload.audio_base64!=='string')throw Error('Missing voice audio.');
 const audio=Buffer.from(payload.audio_base64,'base64');if(audio.length<1000||audio.length>20_000_000)throw Error('Invalid voice audio size.');
 const timing=pictureCues(clip.segments??[clip.text],payload.alignment);
 return {audio,...timing};
}
