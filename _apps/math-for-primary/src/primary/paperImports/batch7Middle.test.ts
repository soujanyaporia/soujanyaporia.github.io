import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch7Middle} from './batch7Middle';
import {BATCH7_MIDDLE_PARTS} from './batch7MiddleMeta';
import {correctAnswer,type Question} from '../generate';
import {Picture} from '../Picture';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(text:string)=>text.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const minutes=(text:string)=>[...text.matchAll(/(\d\d):(\d\d)/g)].map(m=>Number(m[1])*60+Number(m[2]));
/** Reconstruct only from the child-visible context, prompt, table and graph. */
export function solveBatch7Middle(q:Question,part:string):string|number{
 const text=(q.context??[]).join(' '),ns=nums(text);
 if(part==='working-time'){const [a,b,c,d]=minutes(text);let worked=0;for(let t=a;t<d;t++)if(t<b||t>=c)worked++;return worked;}
 if(part==='latest-start'){const [flight]=minutes(text),[buffer,walk]=nums(text.split('. ')[1]+' '+text.split('. ')[2]),result=flight-buffer-walk;return `${String(Math.floor(result/60)).padStart(2,'0')}:${String(result%60).padStart(2,'0')}`;}
 if(part==='unit-price-multiple'){const [count,cost,factor]=ns;return cost/count*factor;}
 if(part==='rectangle-measures'){const [l,w]=ns;let boundary=0;for(const side of [l,w,l,w])boundary+=side;return JSON.stringify([String(l*w),String(boundary)]);}
 if(part==='equal-start-gift'){const [loss,factor]=ns;for(let start=loss+1;start<=loss*2;start++)if(start===(start-loss)*factor)return start;throw Error('No valid initial amount');}
 if(part==='paired-price'){const [total,count,,gap]=ns,totalCents=Math.round(total*100),gapCents=Math.round(gap*100);for(let cheap=1;cheap<totalCents;cheap++)if(count*cheap+count*(cheap+gapCents)===totalCents)return (cheap/100).toFixed(2);throw Error('No item price');}
 if(part==='bundle-cost'){const [per,price,total]=ns;let count=0,packed=0;while(packed<total){count++;packed+=per;}if(packed!==total)throw Error('Incomplete bundle');return (count*Math.round(price*100)/100).toFixed(2);}
 if(part==='promotion-change'){const [paid,free,price,total,payment]=ns;let charged=0;for(let bars=0;bars<total;bars+=paid+free)charged+=paid;return ((Math.round(payment*100)-charged*Math.round(price*100))/100).toFixed(2);}
 if(part==='fraction-more-total'){const [n,d,extra,den]=ns,top=2*n*den+extra*d,bottom=d*den;let divisor=Math.min(top,bottom);while(top%divisor!==0||bottom%divisor!==0)divisor--;return `${top/divisor}/${bottom/divisor}`;}
 if(part==='remaining-pages'){const [n,d,m,e,left]=ns;for(let whole=left+1;whole<=left*3;whole++)if(whole-whole*n/d-whole*m/e===left)return whole;throw Error('No book size');}
 if(part==='rainfall-increase'){const p=q.picture;if(p?.type!=='bars')throw Error('Graph missing');const target=nums(q.prompt)[0],matches=p.labels.filter((_,i)=>i>0&&p.values[i]-p.values[i-1]===target);if(matches.length!==1)throw Error('Ambiguous month');return matches[0];}
 const p=q.picture;if(p?.type!=='nanyang-p4'||p.layout!=='table')throw Error('Table missing');const [a,b]=p.rows;return JSON.stringify([String(a.values[2]!-a.values[0]!),String(b.values[0]!+b.values[1]!)]);
}
describe('Batch7 middle rapid original expansion',()=>{
 it('provides12 configurations with existing curriculum skills',()=>{
  expect(BATCH7_MIDDLE_PARTS).toHaveLength(12);expect(new Set(BATCH7_MIDDLE_PARTS.map(p=>p.id)).size).toBe(12);
  for(const p of BATCH7_MIDDLE_PARTS)for(const id of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===id),id).toBe(true);
 });
 it('solves360 variants independently from all visible givens',()=>{
  for(const p of BATCH7_MIDDLE_PARTS)for(let seed=0;seed<30;seed++){
   const q=makeBatch7Middle(p.id,seed),solved=String(solveBatch7Middle(q,p.id));expect(correctAnswer(q,solved),`${p.id}:${seed} answer ${q.answer}, solved ${solved}`).toBe(true);
   expect(correctAnswer(q,'999999')).toBe(false);expect(q).toEqual(makeBatch7Middle(p.id,seed));expect(q.workedSteps!.length).toBeGreaterThan(0);expect(q.explanation.length).toBeGreaterThan(0);expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
   if(q.choices){expect(q.choices).toHaveLength(4);expect(new Set(q.choices).size).toBe(4);expect(q.choices.filter(v=>correctAnswer(q,v))).toHaveLength(1);}
  }
 });
 it('uses only necessary graph/table figures and existing paired controls',()=>{
  for(const p of BATCH7_MIDDLE_PARTS){const q=makeBatch7Middle(p.id,31,2);if(!['rainfall-increase','fruit-table'].includes(p.id))expect(q.picture).toBeUndefined();else{const html=renderToStaticMarkup(createElement(Picture,{model:q.picture!}));expect(html).not.toMatch(/NaN|undefined/);if(q.picture?.type==='bars'){const chart=q.picture;expect(chart.labels).toHaveLength(6);expect(chart.values.every(v=>v>0&&v%chart.scale===0)).toBe(true);for(const month of chart.labels)expect(html).toContain(month);}}
   if(['rectangle-measures','fruit-table'].includes(p.id)){expect(q.structuredResponse?.kind).toBe('number-pair');expect(q.structuredResponse).not.toHaveProperty('answer');}
  }
 });
 it('varies contexts and rejects unknown configurations',()=>{
  for(const p of BATCH7_MIDDLE_PARTS)expect(new Set(Array.from({length:20},(_,seed)=>{const q=makeBatch7Middle(p.id,seed);return JSON.stringify([q.context,q.prompt,q.picture]);})).size,p.id).toBeGreaterThan(5);
  expect(()=>makeBatch7Middle('not-a-part',1)).toThrow();
 });
});
