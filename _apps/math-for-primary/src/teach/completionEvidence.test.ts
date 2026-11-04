import {expect,it} from 'vitest';
import {challengeEvidence} from './completionEvidence';
it('routes revealed or assisted challenges back to practice even after a clean learning check',()=>{
 expect(challengeEvidence([{correct:false,firstTry:false},{correct:true,firstTry:false},{correct:true,firstTry:true}])).toEqual({independent:1,supported:1,shown:1,total:3,needsPractice:true});
 expect(challengeEvidence(Array.from({length:3},()=>({correct:false,firstTry:false})))).toMatchObject({shown:3,needsPractice:true});
 expect(challengeEvidence(Array.from({length:3},()=>({correct:true,firstTry:true})))).toMatchObject({independent:3,needsPractice:false});
 expect(challengeEvidence([]).needsPractice).toBe(false);
});
