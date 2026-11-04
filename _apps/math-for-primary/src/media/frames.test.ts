import {describe,expect,it} from 'vitest';
import {frameNarration} from './frames';
import {solutionFrames,solutionNarration,proofValue} from './solution';
import {speechText,narrationKey} from '../lib/speechText';
import type {Question} from '../primary/generate';
describe('spoken teaching scripts',()=>{
 it('does not stitch generic notes or repeated maths into the spoken sentence',()=>{expect(frameNarration({text:'Three tens and two ones make 32.',math:'32',because:'Repeated generic explanation.'})).toBe('Three tens and two ones make 32.');});
 it('keeps answers hidden during a pupil turn',()=>{const f={text:'Look at the two parts.',math:'4 + 5 = 9',narration:'The answer is 9.',ask:{prompt:'What is the whole?',answer:'9'}};expect(frameNarration(f,true)).toBe('Look at the two parts. What is the whole?');});
 it('makes one synced counting frame for every number without changing the total',()=>{for(let total=3;total<=20;total++){const q={prompt:'How many fireflies are in the forest?',picture:{type:'counters',count:total},answer:String(total),explanation:`There are ${total} fireflies.`} as Question;const frames=solutionFrames(q);expect(frames).toHaveLength(total+2);expect(frames.map(f=>f.counting?.lit)).toEqual([0,...Array.from({length:total},(_,i)=>i+1),total]);expect(frames.map(solutionNarration).join(' ')).toContain(`there are ${total} fireflies altogether`);}});
 it('reads money, fractions and units as words',()=>{expect(speechText('$1.05 + 2/3 cm²')).toBe('1 dollar and 5 cents plus 2 over 3 square centimetres');expect(narrationKey('3 + 4')).toBe(narrationKey('3 plus 4'));});
 it('solves nested calculations, rounding and complete-group floors',()=>{expect(proofValue({op:'-',a:{op:'*',a:3,b:4},b:2})).toBe(10);expect(proofValue({op:'floor',a:29,b:5})).toBe(25);expect(proofValue({op:'round',a:26,b:10})).toBe(30);});
});
