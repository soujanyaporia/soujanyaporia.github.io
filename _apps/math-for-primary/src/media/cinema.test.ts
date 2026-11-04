import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CinemaModel,placeColumns} from './CinemaModel';
import {quickCheck} from './CinemaCheck';
import {LESSONS} from '../teach/catalog';
import type {Tool} from '../teach/model';
describe('picture-first maths',()=>{
 it('retains zero places and exact decimal values',()=>{
  expect(placeColumns(304)).toEqual([{digit:3,unit:100,value:300,name:'hundreds'},{digit:0,unit:10,value:0,name:'tens'},{digit:4,unit:1,value:4,name:'ones'}]);
  expect(placeColumns(7,3).map(c=>[c.digit,c.unit,c.value])).toEqual([[0,1,0],[0,.1,0],[0,.01,0],[7,.001,.007]]);
 });
 it('place columns add back to the represented number, including internal zeros',()=>{
  for(const n of [0,3,32,101,2004,234567,1000000])for(const d of [0,1,2,3])expect(placeColumns(n,d).reduce((s,c)=>s+c.value,0)).toBeCloseTo(n/10**d,8);
 });
 it('makes the place columns accessible buttons without changing the represented quantity',()=>{
  const markup=renderToStaticMarkup(createElement(CinemaModel,{tool:{kind:'scene',scene:'place',values:[32],phase:0}}));
  expect(markup).toContain('Place-value model for 32');expect(markup).toContain('3 tens');expect(markup).toContain('2 ones');expect(markup.match(/<button/g)).toHaveLength(2);
 });
 it('avoids duplicate choices for palindromes, zero and arrays with equal sum/product',()=>{
  const tools:Tool[]=[{kind:'scene',scene:'place',values:[11],phase:2},{kind:'counters',count:0},{kind:'array',rows:2,cols:2}];
  for(const t of tools){const q=quickCheck(t);expect(q).not.toBeNull();expect(new Set(q!.choices).size).toBe(3);expect(q!.choices.filter(n=>n===q!.answer)).toHaveLength(1);}
 });
 it('checks the actual final quantities for older pupils too',()=>{
  expect(quickCheck({kind:'scene',scene:'triangle',values:[8,5],phase:2})?.answer).toBe(20);
  expect(quickCheck({kind:'scene',scene:'triangle-angles',values:[40,80],phase:2})?.answer).toBe(60);
  expect(quickCheck({kind:'percent',whole:240,percent:15})?.answer).toBe(36);
  expect(quickCheck({kind:'balance',left:{x:3,n:2},right:{x:0,n:14},xValue:4})?.answer).toBe(4);
 });
 it('offers valid checks throughout every level and both upper-primary tracks',()=>{
  const coverage=new Set<string>();
  for(const l of LESSONS){const s=l.stages.find(s=>s.kind==='explain'&&s.frames?.length);if(s?.kind!=='explain')continue;const q=quickCheck(s.frames?.at(-1)?.tool);if(!q)continue;
   coverage.add(`${l.level}:${l.track}`);expect(q.prompt.length,l.id).toBeGreaterThan(10);expect(q.choices,l.id).toHaveLength(3);expect(new Set(q.choices).size,l.id).toBe(3);expect(q.choices.every(Number.isFinite),l.id).toBe(true);expect(q.choices.filter(n=>n===q.answer),l.id).toHaveLength(1);
  }
  for(let n=1;n<=6;n++)expect([...coverage].some(k=>k.startsWith(`${n}:`))).toBe(true);
  expect(coverage.has('5:foundation')).toBe(true);expect(coverage.has('6:foundation')).toBe(true);
 });
});
