import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('../lib/speechText',()=>({narrationKey:(t:string)=>t,speechText:(t:string)=>t}));
vi.mock('./narration-index.json',()=>({default:{recorded:{duration:10,voice:'reviewed-tutor',approved:true,cues:[0,3,7]}}}));
import {playNarration,stopNarration,recordingFor} from './narration';
import {frameAtTime} from './WalkthroughControls';
class FakeAudio{
 static all:FakeAudio[]=[];currentTime=0;duration=10;playbackRate=1;preload='';onended:(()=>void)|null=null;onerror:(()=>void)|null=null;ontimeupdate:(()=>void)|null=null;
 play=vi.fn(()=>Promise.resolve());pause=vi.fn();removeAttribute=vi.fn();load=vi.fn();constructor(public src:string){FakeAudio.all.push(this);}
}
afterEach(()=>{stopNarration();vi.unstubAllGlobals();FakeAudio.all=[];});
describe('recorded narration',()=>{
 it('uses a single seekable audio file and preserves speed through picture changes',()=>{vi.stubGlobal('Audio',FakeAudio);const times:number[]=[];const p=playNarration('recorded',{startAt:3,rate:.8,onTime:t=>times.push(t)}),a=FakeAudio.all[0];expect(a.src).toContain('audio/recorded.mp3');expect(a.currentTime).toBe(3);expect(a.playbackRate).toBe(.8);p.seek?.(7);a.ontimeupdate?.();expect(times).toEqual([7]);p.setRate?.(1.2);expect(a.playbackRate).toBe(1.2);expect(FakeAudio.all).toHaveLength(1);});
 it('interrupts the prior owner without firing its completion callback',()=>{vi.stubGlobal('Audio',FakeAudio);const end=vi.fn(),interrupt=vi.fn();playNarration('recorded',{onEnd:end,onInterrupt:interrupt});const old=FakeAudio.all[0];playNarration('recorded');expect(interrupt).toHaveBeenCalledOnce();expect(old.onended).toBeNull();expect(end).not.toHaveBeenCalled();});
 it('explicit stop is silent so frame cleanup does not reset playback intent',()=>{vi.stubGlobal('Audio',FakeAudio);const interrupt=vi.fn();playNarration('recorded',{onInterrupt:interrupt}).stop();playNarration('recorded');expect(interrupt).not.toHaveBeenCalled();});
 it('does not keep an ended recording as the active owner',()=>{vi.stubGlobal('Audio',FakeAudio);const interrupt=vi.fn(),end=vi.fn();playNarration('recorded',{onInterrupt:interrupt,onEnd:end});FakeAudio.all[0].onended?.();stopNarration();expect(end).toHaveBeenCalledOnce();expect(interrupt).not.toHaveBeenCalled();});
 it('reports missing narration honestly',()=>expect(recordingFor('not recorded')).toBeUndefined());
 it('changes frames at measured speech cues, including exact boundaries',()=>{expect([-1,0,2.99,3,6.9,7,10].map(t=>frameAtTime([0,3,7],t))).toEqual([0,0,0,1,1,2,2]);});
});
