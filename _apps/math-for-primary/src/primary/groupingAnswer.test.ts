import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {GroupingBuilder} from './GroupingBuilder';
import {exampleGrouping,groupingReady,groupingValue,placedGroups,validGrouping,type GroupingSpec} from './groupingAnswer';
describe('Construct equal groups',()=>{
 it('accepts every partition satisfying the given size or count, independent of order',()=>{
  for(let size=2;size<=6;size++)for(let count=2;count<=8;count++)for(const target of [{kind:'size' as const,value:size},{kind:'count' as const,value:count}]){
   const spec={total:size*count,objectLabel:'gift',target};const groups=exampleGrouping(spec);
   expect(validGrouping(spec,groupingValue(groups))).toBe(true);
   expect(validGrouping(spec,groupingValue(groups.reverse().map(g=>g.reverse())))).toBe(true);
  }
 });
 it('rejects repeated, missing, out-of-range and unequal object memberships',()=>{
  const spec:GroupingSpec={total:6,objectLabel:'gift',target:{kind:'count',value:2}};
  for(const groups of [[[0,1,2],[2,4,5]],[[0,1],[2,3,4]],[[0,1,2],[3,4,6]],[[0,1],[2,3,4,5]],[[0,1],[2,3],[4,5]]])expect(validGrouping(spec,groupingValue(groups))).toBe(false);
  expect(groupingReady(spec,'[[0,1],[2,3,4,5]]')).toBe(true); // complete but wrong is markable
  expect(groupingReady(spec,'[[0,1,2]]')).toBe(false);
  for(const value of ['[]','{}','null','[[0,1.5]]','[[0,1],[]]'])expect(validGrouping(spec,value)).toBe(false);
 });
 it('sanitises damaged saved membership and gives every object a named keyboard button',()=>{
  const spec:GroupingSpec={total:6,objectLabel:'gift',target:{kind:'size',value:2}};
  expect(placedGroups(spec,'[[0,1],[1,2,99],[-1,3]]')).toEqual([[0,1],[2],[3]]);
  const html=renderToStaticMarkup(createElement(GroupingBuilder,{spec,value:'[[0,1]]',onChange:()=>{}}));
  expect(html).toContain('Return gift 1 from group 1');expect(html).toContain('Select gift 6');expect(html).not.toContain('Select gift 1"');expect(html).toContain('2 of 6 objects grouped');
 });
});
