import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {PaperMaterials} from './PaperMaterials';
import {ACTIVITIES} from './catalog';
import {makeQuestion} from './generate';

describe('Essential figures and complete paper givens',()=>{
 it('keeps all card facts while omitting decorative artwork across the paper bank',()=>{
  let checked=0;
  for(const a of ACTIVITIES.filter(a=>a.kind==='paper'&&a.parameter!=='mixed'))for(let seed=0;seed<3;seed++){
   const q=makeQuestion(a,seed,0),m=q.picture;
   if(m?.type!=='paper'||m.layout!=='cards'||m.cards.some(c=>c.count!==undefined))continue;
   const html=renderToStaticMarkup(createElement(PaperMaterials,{model:m}));
   expect(html).not.toContain('<svg');
   for(const c of m.cards){expect(html).toContain(renderToStaticMarkup(createElement('dt',null,c.label)));expect(html).toContain(renderToStaticMarkup(createElement('dd',null,c.value)));}
   if(m.heading)expect(html).toContain(renderToStaticMarkup(createElement('p',{className:'paper-facts-heading'},m.heading)));
   checked++;
  }
  expect(checked).toBeGreaterThan(100);
 });
 it('retains figures whose appearance is needed to solve the question',()=>{
  const html=renderToStaticMarkup(createElement(PaperMaterials,{model:{type:'clock',minutes:195}}));
  expect(html).toContain('<svg');expect(html).toContain('Analogue clock');
  const counted=renderToStaticMarkup(createElement(PaperMaterials,{model:{type:'paper',layout:'cards',cards:[{label:'Apples',value:'?',icon:'fruit',count:5,removed:2}]}}));
  expect((counted.match(/class="paper-object object-fruit"/g)??[]).length).toBe(5);expect(counted).toContain('Crossed-out');
 });
 it('retains every timeline endpoint and interval without decorative clocks',()=>{
  const html=renderToStaticMarkup(createElement(PaperMaterials,{model:{type:'paper',layout:'timeline',heading:'Journey',points:[{label:'9:20 a.m.'},{label:'Bus stop'},{label:'10:45 a.m.'}],gaps:['25 minutes','? minutes'],caption:'The journey is on the same morning.'}}));
  for(const text of ['9:20 a.m.','Bus stop','10:45 a.m.','25 minutes','? minutes','same morning'])expect(html).toContain(text);
  expect(html).not.toContain('<svg');
 });
});
