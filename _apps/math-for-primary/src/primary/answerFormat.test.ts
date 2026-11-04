import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {correctAnswer,type Question} from './generate';
import {PaperAnswer} from './PracticePapers';
import {numberEntry,answerInputMode,sentenceSlots,sentenceValue,validNumberSentence} from './answerFormat';
import {blankDraft,draftReady} from './sessionDraft';
import {paperAnswerStatus} from './paperAttempt';
import {fingerprint} from './sessionQuestions';
import {visibleQuestionKey} from './practicePaper';

const base:Question={key:'format-test',prompt:'Build a subtraction sentence.',answer:'38 - 29 = 9',hint:'Start with the whole.',explanation:'One correct sentence is 38 − 29 = 9.',numberSentence:{numbers:[38,9,37,29],operation:'-'}};
describe('Adapted question responses',()=>{
 it('accepts both valid sentences from a four-card source pattern, without requiring the distractor',()=>{
  for(const answer of ['38 - 29 = 9','38 − 9 = 29','38-9=29'])expect(correctAnswer(base,answer),answer).toBe(true);
  for(const answer of ['38 - 37 = 1','29 - 9 = 38','38 + 9 = 47','38 - 29 = ?','38 - 38 = 0','38 - 9 = 29 extra'])expect(correctAnswer(base,answer),answer).toBe(false);
 });
 it('respects the number of repeated cards and checks arithmetic independently of the stored example answer',()=>{
  expect(validNumberSentence({numbers:[4,8,9],operation:'+'},'4 + 4 = 8')).toBe(false);
  expect(validNumberSentence({numbers:[4,4,8],operation:'+'},'4 + 4 = 8')).toBe(true);
  for(let a=1;a<=30;a++)for(let b=1;b<=30;b++){
   const q={...base,answer:'not used for semantic grading',numberSentence:{numbers:[a,b,a+b],operation:'+' as const}};
   expect(correctAnswer(q,`${a} + ${b} = ${a+b}`)).toBe(true);
   expect(correctAnswer(q,`${a+b} + ${b} = ${a}`)).toBe(false);
  }
 });
 it('preserves partial slots and counts only a complete response as answered',()=>{
  const draft={...blankDraft(0,'practice'),value:'38 - ? = 9'};
  expect(sentenceSlots(draft.value,'-')).toEqual([38,null,9]);expect(sentenceValue([38,null,9],'-')).toBe(draft.value);
  expect(draftReady(base,draft)).toBe(false);expect(paperAnswerStatus(base,draft.value)).toBe('partial');
  expect(draftReady(base,{...draft,value:'38 - 29 = 9'})).toBe(true);expect(paperAnswerStatus(base,'38 - 29 = 9')).toBe('complete');
  expect(paperAnswerStatus(base,'')).toBe('blank');
 });
 it('distinguishes changed card pools and answer formats in saved-question identity',()=>{
  expect(fingerprint({...base,numberSentence:{numbers:[38,9,36,29],operation:'-'}})).not.toBe(fingerprint(base));
  expect(visibleQuestionKey({...base,numberSentence:{numbers:[38,9,36,29],operation:'-'}})).not.toBe(visibleQuestionKey(base));
  expect(fingerprint({...base,answerFormat:'number-words'})).not.toBe(fingerprint(base));
 });
 it('asks pupils to choose the story operation and calculate a result without supplying it on a card',()=>{
  const q:Question={...base,answer:'27 - 8 = 19',numberSentence:{numbers:[27,8],operation:'-',missingResult:true,chooseOperation:true}};
  expect(correctAnswer(q,'27 - 8 = 19')).toBe(true);expect(correctAnswer(q,'27 - 19 = 8')).toBe(false);
  expect(correctAnswer(q,'27 + 8 = 35')).toBe(false);
  expect(draftReady(q,{...blankDraft(0,'practice'),value:'27 ? 8 = 19'})).toBe(false);
  expect(draftReady(q,{...blankDraft(0,'practice'),value:'27 + 8 = 19'})).toBe(true);
  const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:1}));
  expect(html).toContain('Use addition');expect(html).toContain('Use subtraction');expect(html).toContain('Answer in your number sentence');
  expect(html).not.toContain('Place 19');expect(html).not.toContain('27 - 8 = 19');
 });
 it('accepts standard number-word spelling variants but rejects a different number',()=>{
  const q={...base,numberSentence:undefined,answerFormat:'number-words' as const,answer:'one hundred and twenty-three'};
  for(const value of ['one hundred twenty three','One Hundred And Twenty-Three','one hundred and twenty-three'])expect(correctAnswer(q,value)).toBe(true);
  for(const value of ['123','one hundred and thirty-two','one thousand twenty-three'])expect(correctAnswer(q,value)).toBe(false);
  expect(numberEntry(q)).toBe(false);expect(answerInputMode(q)).toBe('text');
  for(const answer of ['0','42','3.5','2/3','1 1/2'])expect(numberEntry({...q,answerFormat:undefined,answer}),answer).toBe(true);
 });
 it('renders a text keyboard for writing words and touch cards for constructing equations',()=>{
  const wordHtml=renderToStaticMarkup(createElement(PaperAnswer,{question:{...base,numberSentence:undefined,answer:'seventy-six',answerFormat:'number-words'},value:'',onChange:()=>{},level:1}));
  expect(wordHtml).toContain('inputMode="text"');expect(wordHtml).not.toContain('Number keypad');
  const html=renderToStaticMarkup(createElement(PaperAnswer,{question:base,value:'38 - ? = 9',onChange:()=>{},level:1}));
  expect(html).toContain('Choose three number cards');expect(html).toContain('Remove 38 from box 1');expect(html).toContain('Empty number box 2');
  expect(html).toContain('aria-label="Place 29"');expect(html).not.toContain('<input');
 });
});

describe('Multiplication and division construction',()=>{
 it('accepts related facts and Unicode operation symbols, but never division by zero',()=>{
  const multiply={numbers:[4,5,20],operation:'*' as const};const divide={...multiply,operation:'/' as const};
  for(const answer of ['4 * 5 = 20','5 × 4 = 20','4x5=20'])expect(validNumberSentence(multiply,answer)).toBe(true);
  for(const answer of ['20 / 4 = 5','20 ÷ 5 = 4'])expect(validNumberSentence(divide,answer)).toBe(true);
  expect(validNumberSentence(divide,'4 / 20 = 5')).toBe(false);expect(validNumberSentence({numbers:[0,0,0],operation:'/'},'0 / 0 = 0')).toBe(false);
 });
 it('keeps picture construction counts hidden and the operation choice in the multiplication family',()=>{
  const q:Question={...base,answer:'4 * 5 = 20',numberSentence:{numbers:[4,5,20],operation:'*',freeEntry:true,chooseOperation:true}};
  const html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:2}));
  expect((html.match(/<input/g)??[]).length).toBe(3);expect(html).toContain('Use multiplication');expect(html).toContain('Use division');
  expect(html).not.toContain('Use addition');expect(html).not.toContain('Number cards');expect(html).not.toContain('Place 20');
  expect(correctAnswer(q,'5 * 4 = 20')).toBe(true);expect(correctAnswer(q,'20 / 5 = 4')).toBe(false);
 });
});
