import indexData from './narration-index.json';
import {narrationKey} from '../lib/speechText';
export interface Recording {duration:number;voice:string;cues?:number[];style?:string;approved?:boolean;}
const index=indexData as Record<string,Recording>;
export const recordingFor=(text:string)=>{const entry=index[narrationKey(text)];return entry?.approved?entry:undefined;};
export const recordingUrl=(text:string)=>`${import.meta.env.BASE_URL}audio/${narrationKey(text)}.mp3?v=${recordingFor(text)?.style??'natural'}`;
export interface VoicePlayback {pause:()=>void;resume:()=>void;stop:()=>void;seek?:(seconds:number)=>void;setRate?:(rate:number)=>void;}
export interface VoiceOptions {rate?:number;startAt?:number;onTime?:(seconds:number)=>void;onStatus?:(status:string)=>void;onInterrupt?:()=>void;onEnd?:()=>void;onProgress?:(fraction:number)=>void;onError?:()=>void;}
let current:VoicePlayback|null=null,interrupt:(()=>void)|undefined;
export function stopNarration(){const notify=interrupt;current?.stop();current=null;interrupt=undefined;notify?.();}
/** Only reviewed recordings are used. Missing clips never fall back to a rejected voice. */
export function playNarration(text:string,options:VoiceOptions={}):VoicePlayback{
 stopNarration();let stopped=false,paused=false,audio:HTMLAudioElement|null=null,rate=options.rate??1;
 const release=()=>{if(current===handle){current=null;interrupt=undefined;}};
 const error=()=>{if(!stopped){release();options.onStatus?.('');options.onError?.();}};
 const play=()=>{if(stopped||!audio)return;if(current!==handle){stopNarration();current=handle;interrupt=options.onInterrupt;}try{void audio.play().catch(error);}catch{error();}};
 const handle:VoicePlayback={pause:()=>{paused=true;audio?.pause();},resume:()=>{paused=false;play();},seek:seconds=>{if(audio)audio.currentTime=seconds;},setRate:r=>{rate=r;if(audio)audio.playbackRate=r;},stop:()=>{stopped=true;release();if(audio){audio.pause();audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;audio.removeAttribute('src');audio.load();}}};
 current=handle;interrupt=options.onInterrupt;
 const ready=(url:string)=>{if(stopped)return;audio=new Audio(url);audio.preload='auto';audio.playbackRate=rate;if(options.startAt)audio.currentTime=options.startAt;
  audio.onended=()=>{if(!stopped){release();options.onEnd?.();}};audio.onerror=error;audio.ontimeupdate=()=>{if(stopped||!audio)return;options.onTime?.(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)options.onProgress?.(audio.currentTime/audio.duration);};options.onStatus?.('');if(!paused)play();};
 if(typeof Audio==='undefined')queueMicrotask(error);
 else if(recordingFor(text))ready(recordingUrl(text));
 else queueMicrotask(error);
 return handle;
}
