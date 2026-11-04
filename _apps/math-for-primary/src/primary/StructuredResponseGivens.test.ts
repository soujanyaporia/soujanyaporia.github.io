import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StructuredResponseGivens} from './StructuredResponseGivens';
import {RepairExplain,AnswerReview} from './PrimaryGame';
import {PaperMarkedAnswer} from './PracticePapers';
import {activityById} from './catalog';
import {makeQuestion} from './generate';
import {makeBatch6Early} from './paperImports/batch6Early';
import {fingerprint} from './sessionQuestions';
import type {ScoredResult} from './session';

function visibleOptions(html:string,options:string[]){
 const givens=html.match(/<p class="structured-response-givens">([\s\S]*?)<\/p>/)?.[1];
 expect(givens,'Review must retain the question’s options').toBeDefined();
 for(const option of options)expect(givens).toContain(`>${option}</span>`);
 expect((givens!.match(/<span /g)??[]).length).toBe(options.length);
 expect(givens).not.toMatch(/<button|<input|aria-pressed|selected/);
}

function visibleChoices(html:string,choices:string[]){
 const givens=html.match(/<div class="question-choice-givens">([\s\S]*?)<\/div>/)?.[1];
 expect(givens,'Review must retain every original multiple-choice option').toBeDefined();
 expect([...givens!.matchAll(/<li>(.*?)<\/li>/g)].map(match=>match[1])).toEqual(choices);
 expect(givens).not.toMatch(/<button|<input|aria-pressed|selected|right|wrong/);
}

describe('Structured response givens in completed and repair views',()=>{
 it('retains all four real P4 Q9 fractions in the original repair question and activity answer review',()=>{
  const activity=activityById('p4s-paper-b6m-9')!;expect(activity).toBeDefined();
  for(const seed of [0,17,99])for(const index of [0,1]){
   const q=makeQuestion(activity,seed,index),spec=q.structuredResponse!;
   if(spec.kind!=='fraction-pair')throw Error('Real P4 Q9 must supply its fraction options');
   expect(spec.options).toHaveLength(4);expect(q.picture).toBeUndefined();expect(q.choices).toBeUndefined();
   const item={key:q.key,fingerprint:fingerprint(q),wrong:[JSON.stringify(spec.options.slice(0,2))],revealed:false};
   const repair=renderToStaticMarkup(createElement(RepairExplain,{activity,item,onTry:()=>{}}));
   expect(repair).toContain(q.prompt);visibleOptions(repair,spec.options);
   const result:ScoredResult={answer:q.answer,correct:true,firstTry:false,hints:1,tries:1,wrong:item.wrong,at:1000};
   const review=renderToStaticMarkup(createElement(AnswerReview,{questions:[q],results:[result]}));
   expect(review).toContain(q.prompt);visibleOptions(review,spec.options);
   expect(repair).not.toContain(q.answer);expect(review).not.toContain(q.answer);
  }
 });
 it('retains the four real P4 Q9 fractions after marking, including wrong or blank responses',()=>{
  const activity=activityById('p4s-paper-b6m-9')!,q=makeQuestion(activity,17,0),spec=q.structuredResponse!;
  if(spec.kind!=='fraction-pair')throw Error('Missing fraction options');
  for(const [value,correct] of [[q.answer,true],[JSON.stringify(spec.options.slice(0,2)),false],['',false]] as const){
   const html=renderToStaticMarkup(createElement(PaperMarkedAnswer,{question:q,value,correct}));
   visibleOptions(html,spec.options);expect(html).toContain('One correct answer:');expect(html).not.toContain(q.answer);
   if(!value)expect(html).toContain('Not answered');
  }
 });
 it('also keeps the four actual P2 Q12 item names visible without selecting or combining them',()=>{
  const q=makeBatch6Early('12',17),spec=q.structuredResponse!;
  if(spec.kind!=='named-pair')throw Error('Missing source item-name response');
  const html=renderToStaticMarkup(createElement(PaperMarkedAnswer,{question:q,value:'',correct:false}));
  visibleOptions(html,spec.options);expect(html).toContain('Items:');
 });
 it.each(['p1s-paper-b4e-three-addend-choice','p1s-paper-hp25-02'])('retains every original choice for %s in repair, activity review and marked answers',id=>{
  const activity=activityById(id)!;expect(activity).toBeDefined();
  const q=makeQuestion(activity,17,0),choices=q.choices!;
  expect(q.prompt).toMatch(/^Which (addition|choice)/);expect(choices).toHaveLength(4);
  const wrong=choices.find(choice=>choice!==q.answer)!;
  const item={key:q.key,fingerprint:fingerprint(q),wrong:[wrong],revealed:false};
  const repair=renderToStaticMarkup(createElement(RepairExplain,{activity,item,onTry:()=>{}}));
  expect(repair).toContain(q.prompt);visibleChoices(repair,choices);
  for(const [answer,correct] of [[q.answer,true],[wrong,false],['',false]] as const){
   const result:ScoredResult={answer,correct,firstTry:false,hints:1,tries:1,wrong:[wrong],at:1000};
   const review=renderToStaticMarkup(createElement(AnswerReview,{questions:[q],results:[result]}));
   expect(review).toContain(q.prompt);visibleChoices(review,choices);
   const marked=renderToStaticMarkup(createElement(PaperMarkedAnswer,{question:q,value:answer,correct}));
   visibleChoices(marked,choices);
   if(!answer){expect(marked).toContain('Not answered');expect(review).toContain('Not answered');}
  }
 });
 it('adds no passive options to other response forms or ordinary questions',()=>{
  for(const spec of [undefined,{kind:'number-pair',firstLabel:'First',secondLabel:'Second'},{kind:'factor-pairs',total:24,rows:3},{kind:'interval',labels:['8:00','8:30']}] as const){
   expect(renderToStaticMarkup(createElement(StructuredResponseGivens,{spec:spec as Parameters<typeof StructuredResponseGivens>[0]['spec']}))).toBe('');
  }
 });
});
