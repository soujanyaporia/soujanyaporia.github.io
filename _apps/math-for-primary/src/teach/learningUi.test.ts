import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {lessonById,lessonsFor} from './catalog';
import {answerFormat,matchesLesson,workedFeedback,workedSpeech} from './learningUi';
import {fractionItem} from './depth/items';
import {ToolView} from './tools/Tools';
import {movesFor,goalReachable} from './tools/moves';
import {toggleFractionPiece} from './tools/geometry';
import type {RevealStep,Tool} from './model';

describe('Learning interface and support',()=>{
 it('searches a grade catalogue by topic and words, including a pictured example',()=>{
  const grade=lessonsFor(2,'standard');
  const fractions=grade.filter(l=>matchesLesson(l,'  FRACTION   '));
  expect(fractions.length).toBeGreaterThan(0);
  expect(fractions.every(l=>l.level===2)).toBe(true);
  expect(grade.filter(l=>matchesLesson(l,'fraction sandwich')).some(l=>l.id==='p2s-frac-01')).toBe(true);
  expect(grade.filter(l=>matchesLesson(l,'not-a-lesson'))).toHaveLength(0);
  expect(grade.filter(l=>matchesLesson(l,'  '))).toHaveLength(grade.length);
 });
 it('does not speak the hidden answer while a worked question is waiting',()=>{
  const step:RevealStep={text:'Count the counters that stay.',math:'17 − 3 = 14',ask:{prompt:'How many stay?',answer:'14'}};
  expect(workedSpeech('Take 3 from 17.',step,true)).not.toContain('14');
  expect(workedSpeech('Take 3 from 17.',step,true)).toContain('How many stay?');
  expect(workedSpeech('Take 3 from 17.',step,false)).toContain('17 − 3 = 14');
 });
 it('gives the misconception for an actual worked-example mistake',()=>{
  const worked=lessonById('p1s-as-07')!.stages.find(s=>s.kind==='worked')!;
  if(worked.kind!=='worked')throw Error('worked example missing');
  const step=worked.steps.find(s=>s.ask)!;
  expect(workedFeedback(step,'3')).toContain('took away');
  expect(workedFeedback(step,'20')).toContain('adds');
  expect(workedFeedback(step,'99')).toContain('without a cross');
  const fraction=lessonById('p2s-frac-01')!.stages.find(s=>s.kind==='worked')!;
  if(fraction.kind!=='worked')throw Error('worked example missing');
  expect(workedFeedback(fraction.steps[1],'2/3')).toContain('include blue');
 });
 it('uses text keyboards for fractions, times and words without putting the answer in the placeholder',()=>{
  for(const answer of ['7/9','3 1/2','10:45 am','square'])expect(answerFormat(answer).inputMode).toBe('text');
  expect(answerFormat('0.38').inputMode).toBe('decimal');
  expect(answerFormat('7/9').placeholder).not.toContain('7/9');
 });
});

describe('Fractions in different arrangements',()=>{
 it('can choose separated pieces, undo one choice, and keep the same whole',()=>{
  const start:Extract<Tool,{kind:'fraction-pieces'}>={kind:'fraction-pieces',widths:[1,1,1,1],selected:[]};
  const spread=toggleFractionPiece(toggleFractionPiece(start,0),3);
  expect(spread.selected).toEqual([0,3]);
  expect(spread.widths).toEqual(start.widths);
  expect(toggleFractionPiece(spread,0).selected).toEqual([3]);
  expect(movesFor(start)).toContainEqual(toggleFractionPiece(start,3));
  const stage=lessonById('p2s-frac-01')!.stages.find(s=>s.kind==='explore')!;
  if(stage.kind!=='explore')throw Error('exploration missing');
  expect(goalReachable(stage.tool,stage.goal)).toBe(true);
  for(const leftWhite of [0,1,2,3])expect(stage.goal({...start,selected:[0,1,2,3].filter(i=>i!==leftWhite)})).toBe(true);
 });
 it('uses varied arrangements in transfer questions while preserving the requested fraction',()=>{
  let separated=0;
  for(let seed=0;seed<100;seed++)for(const index of [0,1]){
   const item=fractionItem(seed,index,'unfamiliar'),tool=item.tool;
   if(tool?.kind!=='fraction-pieces')throw Error('missing parts');
   expect(item.answer).toBe(`${tool.selected.length}/${tool.widths.length}`);
   expect(new Set(tool.selected).size).toBe(tool.selected.length);
   expect(tool.widths.every(w=>w===1)).toBe(true);
   expect(tool.shape).toBe(index?'circle':'strip');
   if(tool.selected.some((v,i)=>i>0&&v>tool.selected[i-1]+1))separated++;
  }
  expect(separated).toBeGreaterThan(30);
 });
 it('offers individually labelled controls in explorations and keeps assessment pictures read-only',()=>{
  const tool:Tool={kind:'fraction-pieces',widths:[1,1,1,1],selected:[0,3]};
  const active=renderToStaticMarkup(createElement(ToolView,{tool,onChange:()=>{}}));
  expect(active).toContain('Unshade piece 1');expect(active).toContain('Shade piece 2');
  expect(active.match(/aria-pressed="true"/g)).toHaveLength(2);
  const passive=renderToStaticMarkup(createElement(ToolView,{tool}));
  expect(passive).not.toContain('<button');expect(passive).not.toContain('aria-pressed');
 });
});
