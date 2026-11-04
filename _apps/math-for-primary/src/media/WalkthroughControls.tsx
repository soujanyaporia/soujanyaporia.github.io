import {useEffect,useRef,useState} from 'react';
import {playNarration,recordingFor,type VoicePlayback} from './narration';
import {sequenceNarration} from './frames';
import {PlaybackControls} from './PlaybackControls';
import {Icon} from '../ui/Icon';
import './studio.css';
/** One recording preserves the tutor's phrasing across picture changes. */
export function WalkthroughControls({segments,index,onFrame,compact=false}:{segments:string[];index:number;onFrame:(at:number)=>void;compact?:boolean}){
 const script=sequenceNarration(segments),recording=recordingFor(script);
 if(!recording?.cues)return <PlaybackControls compact={compact} text={segments[index]} index={index} total={segments.length} onNext={index<segments.length-1?()=>onFrame(index+1):undefined} label="Play narration"/>;
 return <ContinuousControls compact={compact} key={script} script={script} cues={recording.cues} duration={recording.duration} index={index} onFrame={onFrame}/>;
}
export function frameAtTime(cues:number[],time:number){let at=0;for(let i=1;i<cues.length;i++){if(cues[i]>time)break;at=i;}return at;}
function ContinuousControls({script,cues,duration,index,onFrame,compact}:{compact?:boolean;script:string;cues:number[];duration:number;index:number;onFrame:(at:number)=>void}){
 const [state,setState]=useState<'idle'|'playing'|'paused'>('idle'),[time,setTime]=useState(0),[rate,setRate]=useState(1),[error,setError]=useState(false);
 const handle=useRef<VoicePlayback|null>(null),shown=useRef(index),frame=useRef(onFrame);frame.current=onFrame;
 useEffect(()=>()=>handle.current?.stop(),[]);
 useEffect(()=>{if(index!==shown.current){shown.current=index;const seconds=cues[index]??0;handle.current?.seek?.(seconds);setTime(seconds);}},[index,cues]);
 function start(){handle.current?.stop();setError(false);setState('playing');handle.current=playNarration(script,{rate,startAt:cues[index]??0,onTime:seconds=>{setTime(seconds);const next=frameAtTime(cues,seconds);if(next!==shown.current){shown.current=next;frame.current(next);}},onEnd:()=>{setState('idle');setTime(duration);},onInterrupt:()=>{setState('idle');handle.current=null;},onError:()=>{setState('idle');setError(true);}});}
 function toggle(){if(state==='idle')start();else if(state==='playing'){handle.current?.pause();setState('paused');}else{handle.current?.resume();setState('playing');}}
 function replay(){if(handle.current){handle.current.seek?.(cues[index]??0);handle.current.resume();setState('playing');}else start();}
 const fraction=Math.max(0,Math.min(1,(time-(cues[index]??0))/((cues[index+1]??duration)-(cues[index]??0))));
 return <div className="narration-player"><div className="narration-controls"><button className="narration-play" data-no-tap="true" onClick={toggle} aria-label={state==='playing'?'Pause narration':state==='paused'?'Resume narration':'Play walkthrough'}><Icon name={state==='playing'?'pause':'play'} size={19} filled/><span>{state==='playing'?'Pause':state==='paused'?'Resume':'Play walkthrough'}</span></button><button className="narration-replay" aria-label="Replay this step" onClick={replay}><Icon name="refresh" size={18}/></button>{!compact&&<label className="narration-speed"><span>Speed</span><select aria-label="Narration speed" value={rate} onChange={e=>{const n=Number(e.target.value);setRate(n);handle.current?.setRate?.(n);}}><option value={.8}>0.8×</option><option value={1}>1×</option><option value={1.2}>1.2×</option></select></label>}{!compact&&<span className="narration-voice"><i/>Continuous tutor narration</span>}</div><div className="narration-timeline" role="progressbar" aria-label="Walkthrough playback" aria-valuemin={0} aria-valuemax={cues.length} aria-valuenow={index+fraction}>{cues.map((_,i)=><span key={i}><i style={{width:i<index?'100%':i===index?`${fraction*100}%`:'0%'}}/></span>)}</div>{!compact&&<p className="narration-caption">The pictures follow the voice. Pause, replay or change the pace.</p>}{error&&<p role="status" className="narration-error">Audio could not play. Try again, or follow the captions.</p>}</div>;
}
