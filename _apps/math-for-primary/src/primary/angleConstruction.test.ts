import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ACTIVITIES} from './catalog';
import {makeQuestion,correctAnswer} from './generate';
import {PaperAnswer,PaperMarkedAnswer} from './PracticePapers';
import {blankDraft,draftReady} from './sessionDraft';
import {paperAnswerStatus} from './paperAttempt';
import {fingerprint} from './sessionQuestions';
import {visibleQuestionKey} from './practicePaper';

const activity=ACTIVITIES.find(a=>a.parameter==='b8a-construct-ray')!;
const q=()=>makeQuestion(activity,42,0);
it('keeps an undrawn or invalid angle incomplete and grades the constructed ray',()=>{
 const question=q(),draft=blankDraft(0,'practice');
 expect(draftReady(question,draft)).toBe(false);
 expect(paperAnswerStatus(question,'')).toBe('blank');
 for(const value of ['-1','181','30.5','no ray']){
  expect(draftReady(question,{...draft,value})).toBe(false);
  expect(paperAnswerStatus(question,value)).toBe('partial');
 }
 expect(draftReady(question,{...draft,value:question.answer})).toBe(true);
 expect(paperAnswerStatus(question,question.answer)).toBe('complete');
 expect(correctAnswer(question,question.answer)).toBe(true);
 expect(correctAnswer(question,String(Number(question.answer)+1))).toBe(false);
});
it('draws a saved ray in both answer and marked review without a second answer field',()=>{
 const question=q(),props={question,value:question.answer,onChange:()=>{},level:4};
 const blank=renderToStaticMarkup(createElement(PaperAnswer,{...props,value:''}));
 const filled=renderToStaticMarkup(createElement(PaperAnswer,props));
 const marked=renderToStaticMarkup(createElement(PaperMarkedAnswer,{question,value:question.answer,correct:true}));
 expect(blank).not.toContain('data-constructed-ray');
 for(const html of [filled,marked]){expect(html).toContain('data-constructed-ray');expect(html).toContain('Ray angle');expect((html.match(/<input/g)??[]).length).toBe(1);}
 expect(marked).toContain('disabled=""');
});
it('includes the fixed baseline in saved-question identity',()=>{
 const question=q(),changed={...question,angleConstruction:{...question.angleConstruction!,baseline:question.angleConstruction!.baseline+10}};
 expect(fingerprint(changed)).not.toBe(fingerprint(question));
 expect(visibleQuestionKey(changed)).not.toBe(visibleQuestionKey(question));
});
