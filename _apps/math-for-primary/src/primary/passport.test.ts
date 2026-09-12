import {describe,it,expect} from 'vitest';
import {activityById} from './catalog';
import {createSession} from './sessionQuestions';
import {makePassport,readPassport,PASSPORT_PREFIX} from './passport';
import {reduceEvent} from '../school/events';
import {initialProgress} from '../state/progress';
const b64url=(text:string)=>btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
describe('guest learning passport',()=>{
 const a=activityById('p2s-add-n5')!,now=Date.now();
 const progress=reduceEvent({...initialProgress(),profile:{name:'Should not travel',onboarded:true}},{id:'00000000-0000-4000-8000-000000000001',at:now,kind:'primary_answer',activityId:a.id,correct:true,firstTry:true,hints:0,tries:1});
 const {session}=createSession(a,{seed:12,now});
 const unfinished={...session,draft:{position:0,value:'4',picks:[],shaded:[],tries:1,wrong:['3'],hint:true,status:'wrong' as const,stage:'try' as const,at:now}};
 it('carries progress and unfinished work to another browser without personal details',async()=>{
  const code=await makePassport(progress,[unfinished],{now});expect(code.startsWith(PASSPORT_PREFIX)).toBe(true);expect(code).toMatch(/^MFP1-[A-Za-z0-9_-]+$/);
  const opened=await readPassport(`  ${code.slice(0,40)}\n${code.slice(40)}  `);
  expect(opened.progress.totals.attempted).toBe(1);expect(opened.progress.primary.activities[a.id].attempts).toBe(1);expect(opened.progress.profile.name).toBe('');
  expect(opened.sessions).toEqual([unfinished]);expect(opened.at).toBe(now);
  expect(code).not.toMatch(/Should not travel/);
 });
 it('refuses codes that are not passports, damaged or incomplete',async()=>{
  const code=await makePassport(progress,[unfinished],{now});
  await expect(readPassport('hello')).rejects.toThrow(/not a Maths/);
  await expect(readPassport(code.slice(0,code.length-12))).rejects.toThrow(/damaged|incomplete/);
  await expect(readPassport('MFP1-***')).rejects.toThrow(/incomplete/);
  await expect(readPassport('MFP0-'+b64url(JSON.stringify({kind:'other'})))).rejects.toThrow(/not a Maths/);
  await expect(readPassport('MFP0-'+b64url(JSON.stringify({kind:'maths-for-sg-primary-passport',v:2})))).rejects.toThrow(/newer version/);
 });
 it('drops invalid sessions rather than trusting them',async()=>{
  const code=await makePassport(progress,[unfinished,{...unfinished,activityId:'not-an-activity'} as never],{now});
  expect((await readPassport(code)).sessions).toEqual([unfinished]);
 });
});
