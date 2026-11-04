import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {correctAnswer,type Question} from './generate';
import {paperAnswerStatus,paperMarks} from './paperAttempt';
import {blankDraft,draftAnswer,draftReady} from './sessionDraft';
import {checkSession,createSession,fingerprint} from './sessionQuestions';
import {activityById} from './catalog';
import {validateSession} from './session';
import {generatePracticePaper,serializePaperResume,restorePaperResume} from './practicePaper';
import {visibleQuestionKey} from './practicePaper';
import {shownAnswer} from './answerDisplay';
import {PaperAnswer,PrintedStructuredResponse} from './PracticePapers';
import {solutionFrames} from '../media/solution';
const base:Question={key:'structured-test',prompt:'Find the answer.',answer:'',hint:'Look carefully.',explanation:'Compare the information.'};
const fraction:Question={...base,answer:'["1/2","2/4"]',structuredResponse:{kind:'fraction-pair',options:['1/2','2/4','1/3','3/5']}};
const factors:Question={...base,answer:'[["2","12"],["3","8"],["4","6"]]',structuredResponse:{kind:'factor-pairs',total:24,rows:3}};
const named:Question={...base,answer:'["pencil","ruler"]',structuredResponse:{kind:'named-pair',options:['pencil','ruler','eraser','pen']}};
const pair:Question={...base,answer:'["18","36"]',structuredResponse:{kind:'number-pair',firstLabel:'First multiple',secondLabel:'Second multiple'}};
const interval:Question={...base,answer:'["2 pm","3 pm"]',structuredResponse:{kind:'interval',labels:['1 pm','2 pm','3 pm','4 pm']}};
describe('structured response integration',()=>{
 it('grades alternative equivalent choices, three valid factor groupings, and graph intervals',()=>{
  expect(correctAnswer(fraction,'["2/4","1/2"]')).toBe(true);
  expect(correctAnswer(fraction,'["1/2","1/3"]')).toBe(false);
  expect(correctAnswer(fraction,'["1/2","1/2"]')).toBe(false);
  expect(correctAnswer(factors,'[["12","2"],["6","4"],["8","3"]]')).toBe(true);
  expect(correctAnswer(factors,'[["2","12"],["2","12"],["4","6"]]')).toBe(false);
  expect(correctAnswer(factors,'[["1","24"],["3","8"],["4","6"]]')).toBe(false);
  expect(correctAnswer(named,'["ruler","pencil"]')).toBe(true);expect(correctAnswer(named,'["ruler","pen"]')).toBe(false);
  expect(correctAnswer(pair,'["18","36"]')).toBe(true);expect(correctAnswer(pair,'["36","18"]')).toBe(false);
  expect(correctAnswer(interval,'["2 pm","3 pm"]')).toBe(true);
  expect(correctAnswer(interval,'["3 pm","2 pm"]')).toBe(false);
 });
 it('tracks blank, partial and complete answers in papers and resumable activity drafts',()=>{
  for(const [q,partial,complete] of [[fraction,'["1/2"]','["2/4","1/2"]'],[factors,'[["2","12"],["3",""] ,["",""]]','[["2","12"],["3","8"],["4","6"]]'],[interval,'["2 pm",""]','["2 pm","3 pm"]'],[pair,'["18",""]','["18","36"]'],[named,'["pencil"]','["ruler","pencil"]']] as const){
   expect(paperAnswerStatus(q,'')).toBe('blank');expect(paperAnswerStatus(q,partial)).toBe('partial');expect(paperAnswerStatus(q,complete)).toBe('complete');
   const d={...blankDraft(0,'practice'),value:complete};expect(draftReady(q,d)).toBe(true);expect(draftAnswer(q,d)).toBe(complete);
   expect(draftReady(q,{...d,value:partial})).toBe(false);
  }
  const paper={items:[fraction,factors,interval].map(question=>({question}))} as Parameters<typeof paperMarks>[0];
  expect(paperMarks(paper,['["2/4","1/2"]','[["12","2"],["6","4"],["8","3"]]','["2 pm","3 pm"]']).correct).toBe(3);
 });
 it('renders controls, printed givens and human-readable answers without exposing JSON',()=>{
  for(const q of [fraction,factors,interval,pair,named]){
   const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:q.answer,onChange:()=>{},level:4}));
   expect(html).not.toContain(q.answer);expect(shownAnswer(q,q.answer)).not.toContain('[');
   const printed=renderToStaticMarkup(createElement(PrintedStructuredResponse,{spec:q.structuredResponse!}));
   expect(printed).not.toContain(q.answer);expect(printed).toContain('_____');
   expect(solutionFrames(q).map(f=>f.equation??'').join(' ')).not.toContain('[');
  }
  expect(renderToStaticMarkup(createElement(PrintedStructuredResponse,{spec:fraction.structuredResponse!}))).toContain('1/2');
  expect(shownAnswer(named,named.answer)).toBe('pencil and ruler');expect(shownAnswer(interval,interval.answer)).toBe('2 pm to 3 pm');expect(shownAnswer(pair,pair.answer)).toBe('First multiple: 18; Second multiple: 36');
  expect(renderToStaticMarkup(createElement(PrintedStructuredResponse,{spec:pair.structuredResponse!}))).toContain('First multiple');
  expect(renderToStaticMarkup(createElement(PrintedStructuredResponse,{spec:named.structuredResponse!}))).toContain('pencil');
 });
 it('round-trips a real multiple-pair activity draft through the saved session contract',()=>{
  const activity=activityById('p6s-paper-b6u-1b');expect(activity).toBeDefined();
  const {session,questions}=createSession(activity!,{seed:91,now:1000});const q=questions[0];
  expect(q.structuredResponse?.kind).toBe('number-pair');
  const draft={...blankDraft(0,'practice'),value:q.answer,at:1001},saved=validateSession({...session,draft,updatedAt:1001},2000);
  expect(saved?.draft?.value).toBe(q.answer);const restored=checkSession(activity!,saved!);expect(restored.ok).toBe(true);
  expect(paperAnswerStatus(q,saved!.draft!.value)).toBe('complete');expect(correctAnswer(q,saved!.draft!.value)).toBe(true);
 });
 it('round-trips a generated paper containing a number-pair response',()=>{
  let found:ReturnType<typeof generatePracticePaper>|undefined;
  for(let seed=0;seed<80&&!found;seed++){const p=generatePracticePaper({level:6,track:'standard',count:6,topic:'mixed',seed});if(p.items.some(i=>i.question.structuredResponse?.kind==='number-pair'))found=p;}
  expect(found).toBeDefined();const answers=found!.items.map(i=>i.question.structuredResponse?.kind==='number-pair'?i.question.answer:null);
  const restored=restorePaperResume(serializePaperResume(found!,answers,0));expect(restored?.answers).toEqual(answers);
  const at=found!.items.findIndex(i=>i.question.structuredResponse?.kind==='number-pair');expect(paperAnswerStatus(restored!.paper.items[at].question,restored!.answers[at]!)).toBe('complete');
 });
 it('binds visible constraints to session and paper identity',()=>{
  const changed={...factors,structuredResponse:{kind:'factor-pairs' as const,total:36,rows:3}};
  expect(fingerprint(changed)).not.toBe(fingerprint(factors));expect(visibleQuestionKey(changed)).not.toBe(visibleQuestionKey(factors));
  const shuffled={...named,structuredResponse:{kind:'named-pair' as const,options:['pen','eraser','ruler','pencil']}};
  expect(visibleQuestionKey(shuffled)).toBe(visibleQuestionKey(named));expect(fingerprint(shuffled)).not.toBe(fingerprint(named));
 });
});
