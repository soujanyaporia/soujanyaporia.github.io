import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {makeBatch10Early,BATCH10_EARLY_PARTS} from './batch10Early';
import {Batch10EarlyDiagram} from './Batch10EarlyDiagram';
import {correctAnswer,type Question} from '../generate';
import {responseReady} from '../answerFormat';
import {Picture} from '../Picture';
import {PaperAnswer} from '../PracticePapers';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const numbers=(s:string)=>s.match(/\d+/g)?.map(Number)??[];
const only=<T,>(items:T[])=>{if(items.length!==1)throw Error(`Expected a unique visible solution, found ${items.length}`);return items[0];};
const prices=(q:Question)=>(q.context??[]).flatMap(s=>{const m=/^(.+): \$(\d+)$/.exec(s);return m?[{name:m[1],cost:Number(m[2])}]:[];});
const flatFaces:Record<string,number>={sphere:0,cone:1,cylinder:2,'square pyramid':5,cube:6,cuboid:6};
/** Independently solve only the public prompt, context and mathematical figure. */
export function solveBatch10Early(q:Question,part:string):string|number{
 const text=(q.context??[]).join(' '),n=numbers(text);
 if(part==='coin-exchange'){
  const value=text.includes('for $1 coins')?100:n[1];let cents=0,count=0;while(cents<n[0]*100){cents+=value;count++;}if(cents!==n[0]*100)throw Error('Cannot make an exact exchange');return count;
 }
 if(part==='budget-item'){
  const budget=Array(n[0]).fill(n[1]).reduce((a:number,b:number)=>a+b,0);return only(prices(q).filter(item=>item.cost<=budget)).name;
 }
 if(part==='known-item-partner'){
  const known=only(prices(q).filter(item=>item.name===text.match(/One is the (.+?)\./)![1]));return only(prices(q).filter(item=>item.name!==known.name&&item.cost+known.cost===n[0])).name;
 }
 if(part==='shop-pair-total'){
  const catalogue=prices(q),target=numbers(q.prompt)[0],pairs:string[][]=[];
  for(let i=0;i<catalogue.length;i++)for(let j=i+1;j<catalogue.length;j++)if(catalogue[i].cost+catalogue[j].cost===target)pairs.push([catalogue[i].name,catalogue[j].name]);return JSON.stringify(only(pairs));
 }
 if(part==='graph-equal-pair'||part==='graph-extreme'){
  if(q.picture?.type!=='bars'||!q.picture.pictures)throw Error('Missing necessary symbol graph');const {labels,values,scale}=q.picture;
  if(scale!==1)throw Error('P1 graph must retain one object per symbol');
  if(part==='graph-equal-pair'){
   const pairs:string[][]=[];for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(values[i]===values[j])pairs.push([labels[i],labels[j]]);return JSON.stringify(only(pairs));
  }
  const most=q.prompt.includes('most');return only(labels.filter((_,i)=>values.every(value=>most?values[i]>=value:values[i]<=value)));
 }
 if(part==='am-pm')return text.includes('morning')?'am':'pm';
 if(part==='reverse-ordinal'){
  if(q.picture?.type!=='pattern')throw Error('Missing row');let remaining=numbers(q.prompt)[0],selected=-1;for(let i=q.picture.items.length-1;i>=0;i--){remaining--;if(!remaining){selected=i;break;}}return selected+1;
 }
 if(part==='distant-pattern'){
  if(q.picture?.type!=='pattern')throw Error('Missing shape pattern');const items=q.picture.items.filter(v=>v!=='…'),period=only([1,2,3,4].filter(size=>items.every((item,i)=>item===items[i%size]))),target=numbers(q.prompt)[0];let at=0,shape='';for(let i=1;i<=target;i++){shape=items[at];at++;if(at===period)at=0;}return shape;
 }
 if(part==='ticket-saving'){
  const party=numbers(q.context![0]),single=numbers(q.context![1]),packageCost=numbers(q.context![2]).at(-1)!;let separate=0,packages=0;
  for(let adult=0;adult<party[0];adult++)separate+=single[0];for(let child=0;child<party[1];child++)separate+=single[1];
  let adults=party[0],children=party[1];while(adults&&children){adults--;children--;packages+=packageCost;}if(adults||children)throw Error('Packages do not cover party');return separate-packages;
 }
 if(part==='solid-face-order'){
  if(q.picture?.type!=='batch10-early')throw Error('Missing grouped solids');const html=renderToStaticMarkup(createElement(Batch10EarlyDiagram,{model:q.picture})),objects=[...html.matchAll(/data-solid-label="([^"]+)" data-solid-shape="([^"]+)"/g)].map(m=>({label:m[1],count:flatFaces[m[2]]}));
  if(objects.length!==3)throw Error('Every solid must be visible');return objects.sort((a,b)=>a.count-b.count).map(o=>o.label).join(',');
 }
 if(part==='solid-property'){
  const flat=Number(text.match(/and (\d+) flat/)![1]),curved=['sphere','cone','cylinder'];return only(curved.filter(shape=>flatFaces[shape]===flat&&(q.choices??[]).includes(shape)));
 }
 if(part==='undo-sale-double'){
  const count=numbers(q.context![1]),possible:number[]=[];for(let initial=1;initial<50;initial++)if(initial-count[0]===count[1])possible.push(initial);const original=only(possible);return Array(original).fill(2).reduce((a:number,b:number)=>a+b,0);
 }
 if(part==='double-share-total')return only(Array.from({length:n[0]+1},(_,amount)=>amount).filter(amount=>amount+amount+amount===n[0]));
 if(part==='length-estimate'){
  const pencil=q.prompt.includes('pencil'),range=pencil?[10,25]:[20,35];return only((q.choices??[]).filter(choice=>{const m=/^(\d+) (cm|m)$/.exec(choice);if(!m)throw Error('Malformed measurement');const cm=Number(m[1])*(m[2]==='m'?100:1);return cm>=range[0]&&cm<=range[1];}));
 }
 if(part==='share-includes-owner'){
  const recipients=['Mira',...Array.from({length:n[0]},(_,i)=>`friend ${i+1}`)];return `1/${recipients.length}`;
 }
 throw Error(`Missing independent visible-givens solver for ${part}`);
}

describe('Batch10 selected early source patterns',()=>{
 it('declares eight tasks per grade with curriculum skills and exact selected source units',()=>{
  expect(BATCH10_EARLY_PARTS).toHaveLength(16);for(const level of [1,2])expect(BATCH10_EARLY_PARTS.filter(p=>p.level===level)).toHaveLength(8);
  expect(BATCH10_EARLY_PARTS.find(p=>p.id==='shop-pair-total')!.canonicalPatternId).toBe('pair-search-given-total');
  for(const part of BATCH10_EARLY_PARTS){expect(part.sourceUnits).toHaveLength(1);expect(part.sourceUnits[0].sourcePage).toBeGreaterThan(0);for(const id of part.skillIds)expect(CURRICULUM_SKILLS.some(skill=>skill.id===id),id).toBe(true);}
 });
 it('independently solves twenty seeds per task with deterministic complete visible givens and ready controls',()=>{
  for(const part of BATCH10_EARLY_PARTS)for(let seed=0;seed<20;seed++){
   const index=seed%3,q=makeBatch10Early(part.id,seed,index),where=`${part.id}/${seed}/${index}`,solved=String(solveBatch10Early(q,part.id));
   expect(correctAnswer(q,solved),where).toBe(true);expect(responseReady(q,solved),where).toBe(true);expect(responseReady(q,q.answer),where).toBe(true);expect(correctAnswer(q,'__wrong__'),where).toBe(false);
   expect(q,where).toEqual(makeBatch10Early(part.id,seed,index));expect(q.workedSteps!.length,where).toBeGreaterThanOrEqual(2);expect(q.explanation,where).toBe(q.workedSteps!.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '));expect(JSON.stringify(q),where).not.toMatch(/NaN|undefined|Infinity/);
   const poisoned={...q,answer:'hidden',hint:'hidden',explanation:'hidden',proof:999,workedSteps:[{text:'hidden'}]};expect(solveBatch10Early(poisoned,part.id),where).toEqual(solveBatch10Early(q,part.id));
   if(q.choices)expect(q.choices.filter(choice=>choice===q.answer),where).toHaveLength(1);
  }
 });
 it('renders every graph symbol, row label, ordinal triangle and grouped solid',()=>{
  for(const part of ['graph-equal-pair','graph-extreme']){
   const q=makeBatch10Early(part,11);if(q.picture?.type!=='bars')throw Error('Missing graph');const html=renderToStaticMarkup(createElement(Picture,{model:q.picture}));
   for(const label of q.picture.labels)expect(html).toContain(label);expect((html.match(/<i /g)??[]).length).toBe(q.picture.values.reduce((a,b)=>a+b,0));expect(html).toContain('Each ● = 1');
  }
  const ordinal=makeBatch10Early('reverse-ordinal',11);if(ordinal.picture?.type!=='pattern')throw Error('Missing row');const row=renderToStaticMarkup(createElement(Picture,{model:ordinal.picture}));expect((row.match(/<span>▲<\/span>/g)??[]).length).toBe(ordinal.picture.items.length);
  const solid=makeBatch10Early('solid-face-order',11);if(solid.picture?.type!=='batch10-early')throw Error('Missing solids');const html=renderToStaticMarkup(createElement(Batch10EarlyDiagram,{model:solid.picture}));
  expect((html.match(/<svg/g)??[]).length).toBe(3);for(const o of solid.picture.objects){expect(html).toContain(`Object ${o.label}`);expect(html).toContain(`aria-label="Object ${o.label}: ${o.shape}"`);}expect(html).not.toContain('flat faces');expect(html).toContain('font-size:16px');
 });
 it('retains constructed pair and ordering controls and rejects missing or repeated selections',()=>{
  for(const id of ['shop-pair-total','graph-equal-pair']){
   const q=makeBatch10Early(id,14),selected=JSON.parse(q.answer) as string[],html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:1}));
   expect(html.toLowerCase()).toContain('two');expect(correctAnswer(q,JSON.stringify(selected.slice().reverse()))).toBe(true);expect(correctAnswer(q,JSON.stringify([selected[0],selected[0]]))).toBe(false);expect(responseReady(q,'')).toBe(false);const spec=q.structuredResponse;if(spec?.kind!=='named-pair')throw Error('Missing named-pair controls');for(const item of spec.options)expect(html).toContain(item);
  }
  const q=makeBatch10Early('solid-face-order',14),html=renderToStaticMarkup(createElement(PaperAnswer,{question:q,value:'',onChange:()=>{},level:2}));for(const label of q.order!)expect(html).toContain(`>${label}</button>`);expect(correctAnswer(q,q.answer.split(',').reverse().join(','))).toBe(false);
 });
 it('varies both graph goals, three time contexts and the visible solid properties without losing constraints',()=>{
  const goals=new Set<string>(),times=new Set<string>(),properties=new Set<string>();for(let seed=0;seed<20;seed++){
   goals.add(makeBatch10Early('graph-extreme',seed).prompt);times.add(makeBatch10Early('am-pm',seed).answer);properties.add(makeBatch10Early('solid-property',seed).answer);
   const coin=makeBatch10Early('coin-exchange',seed);expect(Number(coin.answer)).toBeLessThanOrEqual(100);const share=makeBatch10Early('share-includes-owner',seed);expect(Number(share.answer.split('/')[1])).toBeLessThanOrEqual(10);
  }
  expect(goals.size).toBe(2);expect(times).toEqual(new Set(['am','pm']));expect(properties).toEqual(new Set(['sphere','cone','cylinder']));
 });
});
