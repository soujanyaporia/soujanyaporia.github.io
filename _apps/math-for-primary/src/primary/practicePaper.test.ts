import {describe,it,expect} from 'vitest';
import {ACTIVITIES} from './catalog';
import {correctAnswer,numberValue,type Question} from './generate';
import {proofValue} from '../media/solution';
import type {Track} from '../school/curriculum';
import {generatePracticePaper,practicePaperTopics,parsePracticePaperCode,serializePracticePaper,serializePaperResume,restorePaperResume,visibleQuestionKey,PracticePaperCapacityError,PRACTICE_PAPER_COUNTS,PRACTICE_PAPER_VERSION,type PaperRequest} from './practicePaper';

const paths:readonly [number,Track][]=[[1,'standard'],[2,'standard'],[3,'standard'],[4,'standard'],[5,'standard'],[6,'standard'],[5,'foundation'],[6,'foundation']];
const request=(level=1,track:Track='standard'):PaperRequest=>({level,track,count:6,topic:'mixed',seed:42});

describe('On-demand original practice papers',()=>{
 it.each(paths)('P%s %s papers are deterministic, varied, valid and visibly distinct',(level,track)=>{
  for(const count of PRACTICE_PAPER_COUNTS)for(let seed=0;seed<25;seed++){
   const input={...request(level,track),count,seed},paper=generatePracticePaper(input),where=`P${level} ${track} ${count} seed ${seed}`;
   expect(paper.version,where).toBe(PRACTICE_PAPER_VERSION);
   expect(paper.request,where).toEqual(input);
   expect(paper.items,where).toHaveLength(count);
   expect(new Set(paper.items.map(item=>visibleQuestionKey(item.question))).size,where).toBe(count);
   expect(generatePracticePaper(parsePracticePaperCode(paper.code)!),where).toEqual(paper);
   expect(generatePracticePaper({...input,seed:seed+1000}).items.map(i=>visibleQuestionKey(i.question)),where).not.toEqual(paper.items.map(i=>visibleQuestionKey(i.question)));
   for(const [i,item] of paper.items.entries()){
    const q=item.question;
    expect(item.number,where).toBe(i+1);expect(item.activity.level,where).toBe(level);expect(item.activity.track,where).toBe(track);
    expect(q.sourceActivityId,where).toBe(item.activity.id);expect(q.key,where).toBe(`paper:${paper.code}:${i}`);
    expect(correctAnswer(q,q.answer),where).toBe(true);expect(q.workedSteps!.length,where).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);
    if(q.proof!==undefined&&!q.numberSentence&&numberValue(q.answer)!==null)expect(numberValue(q.answer),where).toBeCloseTo(proofValue(q.proof),5);
    if(q.choices)expect(q.choices.filter(choice=>correctAnswer(q,choice)),where).toHaveLength(1);
    if(track==='foundation')expect(['paper','ratio','ratioShare','algebra','equation','circle','reversePercent','percentChange'],where).not.toContain(item.activity.kind);
   }
  }
 });

 it('starts with six distinct illustrated tasks, adds baseline variety, and continues through the task pool',()=>{
  for(let level=1;level<=6;level++)for(const seed of [0,23,7919,0xffffffff]){
   const input={...request(level),count:18 as const,seed},paper=generatePracticePaper(input);
   const expected=ACTIVITIES.filter(a=>a.level===level&&a.track==='standard'&&a.kind==='paper'&&a.parameter!=='mixed').map(a=>a.id).sort();
   expect(new Set(paper.items.slice(0,6).map(i=>i.activity.id)).size).toBe(6);
   expect(new Set(paper.items.slice(0,6).map(i=>i.activity.canonicalPatternId??i.activity.id)).size).toBe(6);
   expect(new Set(paper.items.filter(i=>i.activity.kind==='paper').map(i=>i.activity.id)).size).toBe(Math.min(12,expected.length));
   expect(paper.items.slice(0,6).every(i=>i.question.picture)).toBe(true);
   expect(paper.items.slice(6,12).every(i=>i.activity.kind!=='paper')).toBe(true);
   expect(new Set(paper.items.slice(6,12).map(i=>i.activity.strand)).size).toBeGreaterThanOrEqual(2);
   expect(paper.items.slice(12).every(i=>i.activity.kind==='paper')).toBe(true);
  }
 });

 it('uses only activities belonging to the selected topic, with earlier-year review references intact',()=>{
  const selections:readonly [number,Track,string][]=[[1,'standard','AS'],[2,'standard','FRAC'],[3,'standard','MD'],[4,'standard','AREA'],[5,'standard','VOL'],[6,'standard','RATIO'],[6,'standard','RATE'],[5,'foundation','DEC'],[6,'foundation','AREA']];
  for(const [level,track,topic] of selections)for(let seed=0;seed<12;seed++){
   const paper=generatePracticePaper({...request(level,track),topic,count:18,seed});
   expect(paper.items).toHaveLength(18);
   for(const item of paper.items)expect(item.activity.skillIds[0].split('.')[2]).toBe(topic);
   expect(new Set(paper.items.map(i=>visibleQuestionKey(i.question))).size).toBe(18);
  }
  const review=generatePracticePaper({...request(6),topic:'RATE'});
  expect(review.items.every(i=>i.activity.skillIds.includes('P5.S.RATE.02'))).toBe(true);
 });

 it('derives topic options from the actual selected catalogue and rejects unsupported paths',()=>{
  for(const [level,track] of paths){
   const topics=practicePaperTopics(level,track),available=ACTIVITIES.filter(a=>a.level===level&&a.track===track&&a.kind!=='daily'&&a.parameter!=='mixed');
   expect(topics[0].id).toBe('mixed');expect(topics[0].activityCount).toBe(available.length);
   for(const topic of topics.slice(1)){
    const pool=available.filter(a=>a.skillIds[0].split('.')[2]===topic.id);
    expect(topic.activityCount).toBe(pool.length);expect(topic.paperFamilyCount).toBe(pool.filter(a=>a.kind==='paper').length);
   }
  }
  expect(practicePaperTopics(2,'foundation')).toEqual([]);
  expect(()=>generatePracticePaper(request(2,'foundation'))).toThrow(/P5–P6 Foundation/);
  expect(()=>generatePracticePaper({...request(),topic:'ALG'})).toThrow(/not available/);
  expect(()=>generatePracticePaper({...request(),count:7 as 6})).toThrow(/6, 12 or 18/);
  for(const seed of [-1,1.5,NaN,Infinity,0x100000000])expect(()=>generatePracticePaper({...request(),seed})).toThrow(/seed/);
 });

 it('hides topics below six variants and advertises only constructible sizes',()=>{
  // The adapted paper adds genuine parallel-segment arrangements to the P3 lines pool.
  expect(practicePaperTopics(3,'standard').some(t=>t.id==='LINES')).toBe(true);
  expect(practicePaperTopics(4,'standard').some(t=>t.id==='SYM')).toBe(false);
  expect(practicePaperTopics(5,'foundation').some(t=>t.id==='LINES')).toBe(false);
  expect(practicePaperTopics(1,'standard').find(t=>t.id==='LENGTH')!.maxCount).toBe(6);
  expect(practicePaperTopics(2,'standard').find(t=>t.id==='SHAPE')!.maxCount).toBe(12);
  expect(generatePracticePaper({...request(3),topic:'LINES'}).items).toHaveLength(6);
  expect(()=>generatePracticePaper({...request(1),topic:'LENGTH',count:18})).toThrow(PracticePaperCapacityError);
  expect(generatePracticePaper({...request(1),topic:'LENGTH',count:6}).items).toHaveLength(6);
  for(const [level,track] of paths)for(const topic of practicePaperTopics(level,track))for(const count of PRACTICE_PAPER_COUNTS.filter(n=>n<=topic.maxCount))for(const seed of [0,17,7919]){
   const paper=generatePracticePaper({...request(level,track),topic:topic.id,count,seed});
   expect(paper.items).toHaveLength(count);
   expect(new Set(paper.items.map(i=>visibleQuestionKey(i.question))).size,`P${level} ${track} ${topic.id} ${count}`).toBe(count);
  }
 });

 it('ignores invisible answers, alternative distractors and shuffled ordering tiles when deduplicating',()=>{
  const q:Question={key:'a',prompt:' Arrange these numbers. ',display:'Smallest   first',answer:'1,2,3',order:['3','1','2'],hint:'h',explanation:'e',choices:['1,2,3','3,2,1']};
  const copy={...q,key:'b',prompt:'Arrange these numbers.',display:'Smallest first',answer:'wrong',order:['2','3','1'],choices:['other','wrong'],hint:'different hint'};
  expect(visibleQuestionKey(copy)).toBe(visibleQuestionKey(q));
  expect(visibleQuestionKey({...copy,display:'Greatest first'})).not.toBe(visibleQuestionKey(q));
 });

 it('round-trips compact codes, including boundary seeds, and rejects altered or older codes',()=>{
  for(const [level,track] of paths)for(const seed of [0,1,0x7fffffff,0xffffffff])for(const count of PRACTICE_PAPER_COUNTS){
   const input={...request(level,track),seed,count},code=serializePracticePaper(input);
   expect(parsePracticePaperCode(code)).toEqual(input);expect(parsePracticePaperCode(` ${code.toLowerCase()} `)).toEqual(input);
   expect(parsePracticePaperCode(code.replace(/^SGM\d+/,`SGM${PRACTICE_PAPER_VERSION+1}`))).toBeNull();
   expect(parsePracticePaperCode(code+'A')).toBeNull();expect(parsePracticePaperCode(code.replace('-MIX-','-FRAC-'))).toBeNull();
  }
  for(const code of ['', '{}','SGM1-P0S-6-MIX-1-A','SGM1-P2F-6-MIX-1-A','SGM1-P1S-100-MIX-1-A'])expect(parsePracticePaperCode(code)).toBeNull();
 });

 it('restores answers at the same position and rejects changed questions or malformed saved state',()=>{
  const paper=generatePracticePaper(request(5)),answers=paper.items.map((item,i)=>i<2?item.question.answer:null),serialized=serializePaperResume(paper,answers,2);
  expect(restorePaperResume(serialized)).toEqual({paper,answers,cursor:2});
  const saved=JSON.parse(serialized);
  for(const override of [{version:999},{cursor:-1},{cursor:7},{cursor:1.5},{answers:['2']},{answers:[{},null,null,null,null,null]},{fingerprints:['changed',...saved.fingerprints.slice(1)]}])expect(restorePaperResume(JSON.stringify({...saved,...override}))).toBeNull();
  for(const invalid of ['{','[]','null','"hello"'])expect(restorePaperResume(invalid)).toBeNull();
  const changed=ACTIVITIES.map(a=>a.id===paper.items[0].activity.id?{...a,parameter:'p5-convert'}:a);
  // Force a different family even when the first random family already happens to be conversion.
  changed.find(a=>a.id===paper.items[0].activity.id)!.parameter=paper.items[0].activity.parameter==='p5-convert'?'p5-percent':'p5-convert';
  expect(restorePaperResume(serialized,changed)).toBeNull();
  expect(()=>serializePaperResume(paper,[],0)).toThrow(/one answer/);
  expect(()=>serializePaperResume(paper,answers,99)).toThrow(/position/);
 });
});
