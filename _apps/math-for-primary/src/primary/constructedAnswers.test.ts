import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {correctAnswer,type Question} from './generate';
import {exampleGrouping,groupingValue} from './groupingAnswer';
import {paperAnswerStatus} from './paperAttempt';
import {blankDraft,draftReady} from './sessionDraft';
import {fingerprint} from './sessionQuestions';
import {visibleQuestionKey} from './practicePaper';
import {shownAnswer} from './answerDisplay';
import {PaperAnswer} from './PracticePapers';
const base:Question={key:'test',prompt:'Make equal groups.',answer:'',hint:'Use every object.',explanation:'Each group has the same number.'};
describe('Constructed response integration',()=>{
 it('enforces requested fraction notation while retaining equivalence for unrestricted questions',()=>{
  const proper={...base,answer:'1/4',requireSimplified:true};
  expect(correctAnswer(proper,'1/4')).toBe(true);expect(correctAnswer(proper,'0.25')).toBe(false);expect(correctAnswer(proper,'2/8')).toBe(false);
  expect(correctAnswer({...proper,requireSimplified:false},'0.25')).toBe(true);
  const improper={...base,answer:'3/2',requireImproper:true};
  for(const input of ['3/2','6/4'])expect(correctAnswer(improper,input)).toBe(true);
  for(const input of ['1.5','1 1/2','0 3/2'])expect(correctAnswer(improper,input)).toBe(false);
 });
 it('keeps circumference answers exact in terms of pi',()=>{
  const q:Question={...base,answer:'42π',answerFormat:'pi'};
  for(const value of ['42π','42 pi','42*pi','42 * π','84/2π'])expect(correctAnswer(q,value),value).toBe(true);
  for(const value of ['42','131.946891451','41π','42+π','42/0pi','Infinitypi','NaNpi','42pi+0'])expect(correctAnswer(q,value),value).toBe(false);
  expect(correctAnswer({...q,answer:'1π'},'π')).toBe(true);
 });
 it('grades different correct groupings, preserves partial status, and shows readable feedback',()=>{
  const grouping={total:12,objectLabel:'gift',target:{kind:'size' as const,value:3}},q={...base,grouping,answer:groupingValue(exampleGrouping(grouping))};
  const alternative='[[0,4,8],[1,5,9],[2,6,10],[3,7,11]]';
  expect(correctAnswer(q,alternative)).toBe(true);expect(correctAnswer(q,'[[0,1,2],[0,1,2],[6,7,8],[9,10,11]]')).toBe(false);
  expect(paperAnswerStatus(q,'[[0,1,2]]')).toBe('partial');expect(draftReady(q,{...blankDraft(0,'practice'),value:'[[0,1,2]]'})).toBe(false);
  expect(paperAnswerStatus(q,alternative)).toBe('complete');expect(draftReady(q,{...blankDraft(0,'practice'),value:alternative})).toBe(true);
  expect(shownAnswer(q,alternative)).toBe('4 groups: 3 + 3 + 3 + 3 objects');
  const changed={...q,grouping:{...grouping,target:{kind:'count' as const,value:3}}};
  expect(fingerprint(changed)).not.toBe(fingerprint(q));expect(visibleQuestionKey(changed)).not.toBe(visibleQuestionKey(q));
  const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:2}));expect(html).toContain('Make equal groups');expect(html).not.toContain('paper-answer');
 });
 it('requires a proper mixed-number representation when explicitly requested',()=>{
  const q={...base,answer:'2 1/3',requireMixed:true,requireSimplified:true};
  for(const value of ['2 1/3',' 2  1/3 '])expect(correctAnswer(q,value)).toBe(true);
  for(const value of ['7/3','2.3333333333333333','2 2/6','1 4/3','0 7/3','2 1/0','2 0/3','2 foo/3'])expect(correctAnswer(q,value),value).toBe(false);
  expect(correctAnswer({...q,requireSimplified:false},'2 2/6')).toBe(true);
  expect(fingerprint(q)).not.toBe(fingerprint({...q,requireMixed:false}));
 });
});
