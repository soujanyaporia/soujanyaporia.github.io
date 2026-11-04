import {describe,expect,it} from 'vitest';
import {answerStatsKey} from './answerSource';
import {initialProgress,sanitize} from '../state/progress';
import {reduceEvent,type ProgressEvent} from '../school/events';
import {learningRewards} from '../teach/rewards';
import {lessonMeta} from '../teach/index';
import {questionKey,nodeId} from '../teach/progress';
import {learningSummary} from '../screens/learningSummary';

const lesson=lessonMeta('p1s-wn-03')!;
const learned=(id:string,overrides:Partial<Extract<ProgressEvent,{kind:'primary_answer'}>>={}):Extract<ProgressEvent,{kind:'primary_answer'}>=>({
 id,at:1730700000000,kind:'primary_answer',activityId:lesson.activityId,
 questionKey:questionKey(lesson,5,'number-name'),answer:'forty-two',correct:true,firstTry:true,hints:0,tries:1,...overrides,
});

describe('Lesson evidence stays separate from linked practice',()=>{
 it('retains lesson history, totals, rewards and completion without starting the fallback drill',()=>{
  const event=learned('lesson-answer'),before=initialProgress(event.at),after=reduceEvent(before,event);
  expect(after.primary.activities[lesson.activityId]).toBeUndefined();
  expect(after.primary.activities[`learn.${lesson.id}`]).toMatchObject({attempts:1,correct:1,firstTry:1,sessions:0});
  expect(after.primary.history).toEqual([{activityId:lesson.activityId,at:event.at,questionKey:event.questionKey,answer:event.answer,correct:true,firstTry:true,hints:0}]);
  expect(after.totals).toMatchObject({attempted:1,correct:1,firstTry:1,tries:1});
  expect(learningRewards(after).xp).toBe(learningRewards(reduceEvent(before,{...event,questionKey:undefined})).xp);
  expect(learningSummary(after,1,'standard').attempts).toBe(0);
  expect(reduceEvent(after,event)).toBe(after);
  const complete=reduceEvent(after,{id:'lesson-complete',at:event.at,kind:'session',lessonId:nodeId(lesson),stars:3});
  expect(complete.nodes[nodeId(lesson)]).toMatchObject({completions:1,bestStars:3});
  expect(complete.primary.activities[lesson.activityId]).toBeUndefined();
  expect(learningSummary(complete,1,'standard').finishedLessons.map(l=>l.id)).toContain(lesson.id);
  expect(sanitize(JSON.parse(JSON.stringify(complete)))?.primary).toEqual(complete.primary);
 });
 it('keeps two lessons sharing a fallback separate from each other and actual activity answers',()=>{
  const events=[learned('first'),learned('second',{questionKey:'learn:p1s-wn-02:5:digit',correct:false,firstTry:false,hints:2,tries:3}),learned('drill',{questionKey:`${lesson.activityId}:1:0`,answer:'42'})];
  const after=events.reduce(reduceEvent,initialProgress());
  expect(after.primary.activities[`learn.${lesson.id}`]).toMatchObject({attempts:1,firstTry:1});
  expect(after.primary.activities['learn.p1s-wn-02']).toMatchObject({attempts:1,correct:0,hints:2,tries:3});
  expect(after.primary.activities[lesson.activityId]).toMatchObject({attempts:1,firstTry:1});
  expect(after.primary.history).toHaveLength(3);expect(after.totals.attempted).toBe(3);
  const done=reduceEvent(after,{id:'drill-complete',at:events[0].at,kind:'primary_complete',activityId:lesson.activityId,stars:2});
  expect(done.primary.activities[lesson.activityId]).toMatchObject({attempts:1,sessions:1,stars:2});
 });
 it('recognises only complete lesson question keys and preserves existing records',()=>{
  expect(answerStatsKey('fallback','learn:p1s-wn-03:5:word:42')).toBe('learn.p1s-wn-03');
  for(const key of [undefined,'','learn:','learn:p1s-wn-03:5:','learn:p1s-wn-03:no-stage:item','learn:bad/id:1:item','other:1:0'])expect(answerStatsKey('fallback',key)).toBe('fallback');
  const old=reduceEvent(initialProgress(),learned('older',{questionKey:undefined}));
  const after=reduceEvent(old,learned('new'));
  // Older aggregate evidence cannot be reliably separated from a bounded history; never erase it.
  expect(after.primary.activities[lesson.activityId]).toBe(old.primary.activities[lesson.activityId]);
  expect(after.totals.attempted).toBe(2);
 });
});
