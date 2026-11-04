import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {PaperDiagram,toggleCountMark} from './PaperDiagram';
import type {PaperPicture} from './paperPicture';
import {activityById} from './catalog';
import {makeQuestion} from './generate';

const picture=(count:number,removed=0):PaperPicture=>({type:'paper',layout:'cards',heading:'The picnic',cards:[{label:'Apples',value:'Count them',icon:'fruit',count,removed}]});
const render=(model:PaperPicture)=>renderToStaticMarkup(createElement(PaperDiagram,{model}));
describe('Touch and keyboard counting pictures',()=>{
 it('offers one native toggle per object without printing the total or numbered answer in advance',()=>{
  const html=render(picture(11));
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(11);
  expect(html.match(/aria-label="Count this apple"/g)).toHaveLength(11);
  expect(html.match(/type="button"/g)).toHaveLength(12); // 11 apples and the reset control.
  expect(html).toContain('role="group" aria-label="Apples: count the apples"');
  expect(html).toContain('Count again');expect(html).not.toContain('11 apples');expect(html).not.toContain('paper-count-badge');expect(html).not.toContain('<strong>11</strong>');
 });
 it('keeps eaten objects visibly crossed out and excludes them from counting controls',()=>{
  const html=render(picture(9,4));
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(5);
  expect(html.match(/aria-label="Crossed-out apple; do not count"/g)).toHaveLength(4);
  expect(html.match(/class="paper-object object-fruit"/g)).toHaveLength(9);
  expect(html).toContain('count the apples left');expect(html).not.toContain('9 apples');
 });
 it('counts in the child’s chosen order and unmarks without duplicating or mutating other marks',()=>{
  const initial:number[]=[],one=toggleCountMark(initial,5),two=toggleCountMark(one,1),three=toggleCountMark(two,4);
  expect(initial).toEqual([]);expect(one).toEqual([5]);expect(three).toEqual([5,1,4]);
  const removed=toggleCountMark(three,1);expect(removed).toEqual([5,4]);expect(three).toEqual([5,1,4]);
  expect(toggleCountMark(removed,1)).toEqual([5,4,1]);expect(toggleCountMark([5],5)).toEqual([]);
 });
 it('reveals apples inside the missing-part bag, rather than replacing them with bags',()=>{
  const activity=activityById('p1s-paper-p1-missing')!;
  for(let seed=0;seed<30;seed++){
   const q=makeQuestion(activity,seed,0),contents=q.workedSteps!.flatMap(s=>s.picture?.type==='paper'&&s.picture.layout==='cards'?s.picture.cards:[]).filter(c=>c.label==='Inside the bag');
   expect(contents.length).toBeGreaterThan(0);
   for(const c of contents){expect(c.icon).toBe('fruit');expect(c.count).toBe(Number(q.answer));}
  }
 });
});
