import {createElement} from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ToolView} from './Tools';
import {questionModel} from './questionModel';
import type {Tool} from '../model';
import {P4_LESSONS} from '../lessons/p4';

describe('Questions keep their required model without supplying computed answers',()=>{
 it('keeps inputs visible and removes computed summaries for arrays, groups, decimals and percentages',()=>{
  const examples:Tool[]=[{kind:'array',rows:3,cols:7},{kind:'groups',groups:3,size:7},{kind:'hundred',shaded:35},{kind:'place',wholes:2,digits:[4,5]},{kind:'percent',whole:80,percent:25},{kind:'fractions',denominators:[2,4],shaded:[1,2]}];
  for(const tool of examples){
   const question=renderToStaticMarkup(createElement(ToolView,{tool:questionModel(tool)})),explanation=renderToStaticMarkup(createElement(ToolView,{tool}));
   expect(question).not.toContain('tool-sum');expect(explanation).toContain('tool-sum');
   expect(question).toContain('role="img"');
  }
  const array=renderToStaticMarkup(createElement(ToolView,{tool:questionModel(examples[0])}));
  expect(array).toContain('3 rows and 7 columns');expect(array).not.toContain('21 dots');
 });
 it('does not print an unknown bag value just because a bar knows its layout',()=>{
  const tool=questionModel({kind:'bar',whole:12,parts:[4,4,4],labels:['x','x','x']});
  expect(tool.kind==='bar'&&tool.parts).toEqual([null,null,null]);
  expect(renderToStaticMarkup(createElement(ToolView,{tool}))).not.toContain('>4<');
 });
 it('assesses decimal operations through visual sums, missing addends and change',()=>{
  const mastery=P4_LESSONS[1].stages.find(s=>s.kind==='mastery');if(mastery?.kind!=='mastery')throw Error('Missing mastery');
  for(const seed of [0,7,23,47,129])for(const facet of ['visual','missing','unfamiliar']){
   const item=mastery.gens.find(g=>g.facet===facet)!.gen(seed,0);expect(item.tool?.kind).toBe('bar');if(item.tool?.kind!=='bar')continue;
   const known=item.tool.parts.filter((n):n is number=>n!==null);
   const expected=item.tool.whole===null?known.reduce((a,b)=>a+b,0):item.tool.whole-known.reduce((a,b)=>a+b,0);
   expect(Number(item.answer)).toBeCloseTo(expected,8);
   if(facet!=='missing'){expect(item.display).toBeUndefined();expect(item.prompt).not.toMatch(/\d/);}
  }
 });
});
