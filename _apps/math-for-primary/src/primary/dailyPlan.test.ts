import {describe,it,expect} from 'vitest';
import {ACTIVITIES,activityById} from './catalog';
import {DAILY_DAYS,DAILY_QUESTIONS,dailyId,parseDailyId,dailyActivity,dailyPlanDay,dailySources,dailyTopics,firstDayForTopic,nextDailyDay} from './dailyPlan';
import {applyPrimary,initialPrimary,type ActivityProgress} from './progress';
import {makeQuestion} from './generate';
import {checkSession,createSession,nearTransfer,questionFromKey} from './sessionQuestions';
import {parseRoute,href} from '../app/router';
import {validateSession} from './session';
import type {Track} from '../school/curriculum';
import {paperCompositionGroup,paperReasoningFamily} from './paperBlueprints';
const paths:Array<[number,Track]>=[[1,'standard'],[2,'standard'],[3,'standard'],[4,'standard'],[5,'standard'],[6,'standard'],[5,'foundation'],[6,'foundation']];
const done:ActivityProgress={attempts:6,correct:6,firstTry:5,hints:0,tries:7,sessions:1,stars:2,lastAt:1,days:[],recent:[]};

describe('Paced daily practice',()=>{
 it('resolves all 1,600 days lazily without expanding the browsing catalogue',()=>{
  const size=ACTIVITIES.length,ids=new Set<string>();
  for(const [level,track] of paths)for(let day=1;day<=DAILY_DAYS;day++){
   const id=dailyId(level,track,day),a=activityById(id)!;ids.add(id);
   expect(a?.kind,id).toBe('daily');expect(a.level,id).toBe(level);expect(a.track,id).toBe(track);
   const sources=dailySources(a,ACTIVITIES);expect(sources,id).toHaveLength(DAILY_QUESTIONS);
   expect(sources.every(s=>s.level===level&&s.track===track&&ACTIVITIES.includes(s)&&s.kind!=='daily'&&s.parameter!=='mixed'),id).toBe(true);
   expect(a.skillIds,id).toEqual([...new Set(sources.flatMap(s=>s.skillIds))]);
  }
  expect(ids.size).toBe(1600);expect(ACTIVITIES.length).toBe(size);expect(ACTIVITIES.some(a=>a.kind==='daily')).toBe(false);
  for(const bad of ['p1f-daily-001','p7s-daily-001','p3s-daily-000','p3s-daily-201','p3s-daily-1','p3s-daily-001x']){expect(parseDailyId(bad)).toBeNull();expect(dailyActivity(bad,ACTIVITIES)).toBeUndefined();}
 });
 it('provides four topical days then cumulative review, introducing only taught sources',()=>{
  for(const [level,track] of paths){
   const topics=dailyTopics(level,track,ACTIVITIES),encountered=new Set<string>();
   for(let day=1;day<=200;day++){
    const plan=dailyPlanDay(level,track,day,ACTIVITIES)!,a=activityById(plan.id)!,sources=dailySources(a,ACTIVITIES);
    expect(plan.review).toBe(day%5===0);expect(plan.term).toBe(Math.ceil(day/50));
    const introduced=[...topics.slice(0,plan.topicIndex).flatMap(t=>t.activities),...plan.available];
    const introducedIds=new Set(introduced.map(a=>a.id)),introducedSkills=new Set(introduced.flatMap(a=>a.skillIds));
    for(const source of sources){
     encountered.add(source.id);
     expect(source.kind==='paper'?source.skillIds.every(id=>{
      if(introducedSkills.has(id)||Number(id.match(/^P(\d+)/)?.[1])<level)return true;
      const prerequisite=topics.findIndex(t=>t.code===id.split('.')[2]);
      return prerequisite>=0&&(prerequisite<plan.topicIndex||prerequisite===plan.topicIndex&&plan.available.length===plan.topic.activities.length);
     }):introducedIds.has(source.id),`${a.id} → ${source.id}`).toBe(true);
     if(!plan.review&&source.kind!=='paper')expect(plan.available.includes(source)).toBe(true);
    }
    if(plan.review)expect(plan.available).toEqual(dailyPlanDay(level,track,day-1,ACTIVITIES)!.available);
   }
   // Every baseline activity receives practice; a long path must not silently omit its last topic.
   for(const a of topics.flatMap(t=>t.activities))expect(encountered.has(a.id),`${level} ${track}: ${a.id}`).toBe(true);
   for(const topic of topics){const first=firstDayForTopic(level,track,topic.code,ACTIVITIES);expect(dailyPlanDay(level,track,first,ACTIVITIES)!.topic.code).toBe(topic.code);}
   if(track==='standard')for(const a of ACTIVITIES.filter(a=>a.level===level&&a.kind==='paper'&&a.parameter!=='mixed'))expect(encountered.has(a.id),`${level}: missing original ${a.id}`).toBe(true);
   else expect([...encountered].some(id=>id.includes('-paper-'))).toBe(false);
  }
 });
 it('resumes unfinished work before choosing the first uncompleted day, independently by path',()=>{
  const records={'p3s-daily-001':done,'p3s-daily-002':done,'p3s-daily-004':done};
  expect(nextDailyDay(3,'standard',records)).toBe(3);
  expect(nextDailyDay(3,'standard',records,[{activityId:'p5f-daily-010'},{activityId:'p3s-daily-008'}])).toBe(8);
  expect(nextDailyDay(5,'foundation',records)).toBe(1);
  expect(nextDailyDay(3,'standard',Object.fromEntries(Array.from({length:200},(_,i)=>[dailyId(3,'standard',i+1),done])))).toBe(200);
  let progress=initialPrimary();
  progress=applyPrimary(progress,{kind:'primary_complete',id:'one',at:1,activityId:'p3s-daily-001',stars:2});
  progress=applyPrimary(progress,{kind:'primary_complete',id:'two',at:2,activityId:'p3s-daily-002',stars:3});
  expect(Object.keys(progress.activities)).toEqual(['p3s-daily-001','p3s-daily-002']);expect(progress.activities['p3s-daily-001'].sessions).toBe(1);
 });
 it('uses distinct ready sources and applied reasoning across every grade',()=>{
  for(const [level,track] of paths){
   let varied=0,appliedDays=0;
   for(let day=1;day<=200;day++){
    const a=activityById(dailyId(level,track,day))!,sources=dailySources(a,ACTIVITIES);
    const questions=sources.map(source=>makeQuestion(source,127,0));
    const families=new Set(questions.map((q,i)=>paperReasoningFamily(sources[i],q)));
    if(families.size>=4)varied++;
    if(questions.filter((q,i)=>['story','visual-data'].includes(paperCompositionGroup(sources[i],q))||q.gridDrawing||q.angleConstruction||q.structuredResponse||q.numberSentence||q.grouping).length>=2)appliedDays++;
   }
   // This is a global policy, including Foundation, rather than a P5-only exception.
   expect(varied,`${level} ${track} varied days`).toBeGreaterThan(track==='standard'?100:0);
   expect(appliedDays,`${level} ${track} applied days`).toBeGreaterThan(track==='standard'?100:0);
  }
  for(const day of [41,42,43,44,46,47,48,49]){
   const a=activityById(dailyId(5,'standard',day))!,sources=dailySources(a,ACTIVITIES);
   expect(new Set(sources.map(a=>a.id)).size).toBe(6);
   expect(new Set(sources.map(a=>paperReasoningFamily(a,makeQuestion(a,127,0)))).size).toBeGreaterThanOrEqual(5);
  }
 });
 it('keeps six-question sessions, question identity, and source-specific repairs reproducible',()=>{
  for(const [level,track] of paths)for(const day of [1,55,105,170,200]){
   const a=activityById(dailyId(level,track,day))!,{session,questions}=createSession(a,{seed:127,now:1});
   expect(session.count).toBe(6);expect(validateSession(session,1)).not.toBeNull();expect(checkSession(a,session).ok).toBe(true);
   questions.forEach((original,slot)=>{
    // A small finite generator may need a later index to avoid a duplicate.
    expect(original.key.startsWith(`${a.id}:127:`)).toBe(true);expect(original.sourceActivityId).toBeTruthy();
    const transfer=nearTransfer(a,original,774,slot,new Set());
    expect(transfer.sourceActivityId,`${a.id} position ${slot}`).toBe(original.sourceActivityId);
    expect(questionFromKey(a,transfer.key)).toEqual(transfer);
    expect(questionFromKey(a,original.key)).toEqual(original);
   });
  }
 });
 it('opens the new route and keeps individual daily links shareable',()=>{
  expect(parseRoute('#/daily')).toEqual({name:'daily'});expect(href({name:'daily'})).toBe('#/daily');
  expect(parseRoute(href({name:'activity',id:'p6f-daily-200'}))).toEqual({name:'activity',id:'p6f-daily-200'});
 });
});
