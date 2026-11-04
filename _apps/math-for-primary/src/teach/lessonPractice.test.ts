import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DiscoveryPath} from '../primary/DiscoveryPath';
import {LESSON_INDEX,lessonMeta} from './index';
import {lessonPractice} from './lessonPractice';
import {FOUR_ADDENDS_ID} from './lessons/fourAddendsMeta';

describe('Honest lesson-to-practice links',()=>{
 it('identifies the number-name fallback as related counting practice',()=>{
  const lesson=lessonMeta('p1s-wn-03')!,link=lessonPractice(lesson)!;
  expect(link.activity.id).toBe(lesson.activityId);
  expect(link.activity.skillIds).not.toContain(lesson.skillIds[0]);
  expect(link.exact).toBe(false);
  expect(link.label).toBe(`Related practice: ${link.activity.title}`);
 });
 it('keeps the exact addition link and names its destination',()=>{
  const lesson=lessonMeta('p1-written-addition')!,link=lessonPractice(lesson)!;
  expect(link.exact).toBe(true);
  expect(link.label).toBe(`Practise: ${link.activity.title}`);
 });
 it('does not call three-addend practice an exact drill for four addends',()=>{
  const link=lessonPractice(lessonMeta(FOUR_ADDENDS_ID)!)!;
  expect(link.activity.parameter).toBe('three');expect(link.exact).toBe(false);
 });
 it('names related practice visibly and accessibly in the discovery path',()=>{
  const html=renderToStaticMarkup(createElement(DiscoveryPath,{lesson:lessonMeta('p1s-wn-03')}));
  expect(html).toContain('Related practice');
  expect(html).toContain('Explore this lesson and related practice');
  expect(html).not.toContain('ONE IDEA. THREE LITTLE STEPS.');
  expect(html).toContain(`href="#/activity/${lessonMeta('p1s-wn-03')!.activityId}"`);
 });
 it('requires all lesson objectives and the same level/path, and tolerates a missing route',()=>{
  const lesson=lessonMeta('p1-written-addition')!;
  expect(lessonPractice({...lesson,skillIds:[...lesson.skillIds,'P1.S.AS.06']})?.exact).toBe(false);
  expect(lessonPractice({...lesson,level:2})?.exact).toBe(false);
  expect(lessonPractice({...lesson,track:'foundation'})?.exact).toBe(false);
  expect(lessonPractice({...lesson,skillIds:[]})?.exact).toBe(false);
  expect(lessonPractice({...lesson,activityId:'does-not-exist'})).toBeUndefined();
 });
 it('labels every current fallback honestly without changing the linked route',()=>{
  let unmatched=0;
  for(const lesson of LESSON_INDEX){
   const link=lessonPractice(lesson)!;
   expect(link.activity.id).toBe(lesson.activityId);
   if(lesson.skillIds.some(id=>!link.activity.skillIds.includes(id))){
    unmatched++;expect(link.label,lesson.id).toMatch(/^Related practice: /);
   }
  }
  expect(unmatched).toBeGreaterThan(90);
 });
});
