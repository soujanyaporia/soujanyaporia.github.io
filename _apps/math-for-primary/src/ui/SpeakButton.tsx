import {useEffect,useRef,useState} from 'react';
import { canSpeak } from '../lib/speech';
import {playNarration,recordingFor,type VoicePlayback} from '../media/narration';
import { Icon } from './Icon';

/** Reads text aloud; hidden on devices without speech synthesis. */
export function SpeakButton({ text, label = 'Read aloud' }: { text: string; label?: string }) {
  const [playing,setPlaying]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),handle=useRef<VoicePlayback|null>(null);
  useEffect(()=>{setPlaying(false);return()=>handle.current?.stop();},[text]);
  if (!canSpeak||!recordingFor(text)) return null;
  const description=playing?'Stop narration':status?'Preparing natural voice':label;
  const toggle=()=>{if(playing){handle.current?.stop();setPlaying(false);return;}setPlaying(true);setError('');handle.current=playNarration(text,{onStatus:setStatus,onEnd:()=>setPlaying(false),onInterrupt:()=>setPlaying(false),onError:()=>{setPlaying(false);setError('Audio could not load. Please try again.');}});};
  return (
    <span className="speak-control"><button type="button" data-no-tap="true" className="icon-btn small speak-btn" onClick={toggle} aria-label={description} title={description} aria-pressed={playing}>
      <Icon name={playing?'pause':'speaker'} size={22} />
    </button>{(status||error)&&<span className="voice-loading" role="status">{status||error}</span>}</span>
  );
}
