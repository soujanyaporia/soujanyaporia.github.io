import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Batch6MiddleAnswer} from './batch6MiddleAnswer';
import {structuredResponseReady,structuredResponseCorrect,formatStructuredResponse,type Batch6MiddleResponseSpec} from './batch6MiddleResponse';
import {correctAnswer,type Question} from '../generate';
import {paperAnswerStatus} from '../paperAttempt';
import {PrintedStructuredResponse} from '../PracticePapers';
import {shownAnswer} from '../answerDisplay';
import {fingerprint} from '../sessionQuestions';
const spec:Extract<Batch6MiddleResponseSpec,{kind:'number-fields'}>={kind:'number-fields',fields:[{label:'(a) Total (g)'},{label:'(b) Kilograms'},{label:'(b) Grams',decimal:true}]};
const expected='["1250","1","250.5"]';
const q:Question={key:'fields',prompt:'How many complete grams are there? Then express the mass in kilograms and grams.',context:['A mass is 1250.5 g.'],answer:expected,hint:'Convert units.',explanation:'Use 1000 g per kilogram.',structuredResponse:spec};
describe('labelled numeric fields',()=>{
 it('requires two to six complete numeric entries and honours each field format',()=>{
  expect(structuredResponseReady(spec,expected)).toBe(true);expect(structuredResponseCorrect(spec,expected,'["01250","1","250.500"]')).toBe(true);
  for(const invalid of ['','["1250","1",""]','["1250","1"]','["1250.0","1","250.5"]','["1250","1","2e2"]','["1250","1","NaN"]','[1250,"1","250.5"]','["1250","1","."]'])expect(structuredResponseReady(spec,invalid),invalid).toBe(false);
  expect(structuredResponseCorrect(spec,expected,'["1","1250","250.5"]')).toBe(false);expect(structuredResponseReady({...spec,fields:spec.fields.slice(0,1)},'["1"]')).toBe(false);expect(structuredResponseReady({...spec,fields:Array(7).fill({label:'x'})},JSON.stringify(Array(7).fill('1')))).toBe(false);
 });
 it('integrates grading, readiness, display and resume identity without exposing raw JSON',()=>{
  expect(paperAnswerStatus(q,expected)).toBe('complete');expect(correctAnswer(q,expected)).toBe(true);expect(paperAnswerStatus(q,'["1250","",""]')).toBe('partial');
  expect(shownAnswer(q,expected)).toBe('(a) Total (g): 1250; (b) Kilograms: 1; (b) Grams: 250.5');expect(formatStructuredResponse(spec,'["1250",""]')).toContain('(b) Kilograms: ?');
  expect(fingerprint({...q,structuredResponse:{...spec,fields:spec.fields.map((f,i)=>i===2?{...f,decimal:false}:f)}})).not.toBe(fingerprint(q));
 });
 it('renders a labelled, touch-sized input per field with the right keyboards',()=>{
  const html=renderToStaticMarkup(createElement(Batch6MiddleAnswer,{spec,value:expected,onChange:()=>{}}));expect((html.match(/<input/g)??[])).toHaveLength(3);for(const field of spec.fields)expect(html).toContain(field.label);expect((html.match(/inputMode="numeric"/g)??[])).toHaveLength(2);expect((html.match(/inputMode="decimal"/g)??[])).toHaveLength(1);expect((html.match(/min-height:44px/g)??[])).toHaveLength(3);const printed=renderToStaticMarkup(createElement(PrintedStructuredResponse,{spec}));for(const field of spec.fields)expect(printed).toContain(field.label);expect((printed.match(/__________/g)??[])).toHaveLength(3);
 });
});
