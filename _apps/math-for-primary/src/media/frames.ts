import type {RevealStep} from '../teach/model';
const sentence=(s:string)=>/[.!?]$/.test(s.trim())?s.trim():s.trim()+'.';
/** Spoken explanation is a connected script, rather than every label and note read out in turn. */
export function frameNarration(f:RevealStep,waiting=false):string{
 if(f.narration&&!waiting)return f.narration;
 const parts=[sentence(f.text)];
 if(waiting&&f.ask)parts.push(sentence(f.ask.prompt));
 else if(f.math&&!f.text.replace(/\s/g,'').includes(f.math.replace(/\s/g,'')))parts.push(`That gives us ${f.math.replace(/[.]$/,'')}.`);
 return parts.join(' ');
}
export const sequenceNarration=(parts:string[])=>parts.join(' ');
