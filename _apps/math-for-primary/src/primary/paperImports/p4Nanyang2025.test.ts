import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeP4Nanyang2025,NANYANG_2025_PARTS,type NanyangQuestion} from './p4Nanyang2025';
import {P4NanyangDiagram} from './P4NanyangDiagram';
import {correctAnswer,numberValue,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const rational=(s:string):[number,number]=>{const m=s.match(/(\d+)\/(\d+)/);if(!m)throw Error(`Missing visible fraction: ${s}`);return [Number(m[1]),Number(m[2])];};
const value=(s:string)=>{const [n,d]=rational(s);return n/d;};
const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);
const fraction=(n:number,d:number)=>{const k=gcd(n,d);return d/k===1?String(n/k):`${n/k}/${d/k}`;};
const mixed=(n:number,d:number)=>`${Math.floor(n/d)} ${fraction(n%d,d)}`;
const cards=(q:NanyangQuestion)=>{if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Missing visible cards');return q.picture.cards;};
const diagram=(q:NanyangQuestion)=>{if(q.picture.type!=='nanyang-p4')throw Error('Missing diagram');return q.picture;};
const gradeable=(q:NanyangQuestion):Question=>({...q,picture:undefined,workedSteps:undefined});

/** Independent audit solver; uses visible givens only, never answer/proof/workedSteps. */
export function solveP4Imported(q:NanyangQuestion,part:string):string|number{
 switch(part){
  case '1':{
   const m=diagram(q);if(m.layout!=='fraction-sets')throw Error('Missing sets');const wanted=value(q.prompt),matches=m.sets.filter(s=>s.shadedIndices.length/s.total===wanted);
   if(matches.length!==1)throw Error('Set choice is ambiguous');return matches[0].label;
  }
  case '2':{const m=diagram(q);if(m.layout!=='table')throw Error('Missing table');const cells=m.rows.find(row=>q.prompt.includes(row.label))!.values;return cells[3]!-cells[1]!-cells[2]!;}
  case '3':{const m=diagram(q);if(m.layout!=='table')throw Error('Missing table');const cells=m.rows.find(row=>q.prompt.includes(row.label))!.values,multiplier=nums(q.context![0])[0];return (cells[3]!-cells[1]!)/(1+multiplier);}
  case '4':{const m=diagram(q);if(m.layout!=='line-graph')throw Error('Missing line graph');const values=m.labels.flatMap((label,i)=>q.prompt.includes(label)?[m.values[i]]:[]);if(values.length!==2)throw Error('Need two named months');return Math.abs(values[0]-values[1]);}
  case '5':{const [money,spent]=cards(q);return nums(money.value)[0]*(1-value(spent.value));}
  case '6a':{
   const items=cards(q),pairs:string[]=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(value(items[i].value)+value(items[j].value)>1+1e-9)pairs.push(`${items[i].label.replace('Bag ','')} and ${items[j].label.replace('Bag ','')}`);
   if(pairs.length!==1)throw Error('Bag pair is ambiguous');return pairs[0];
  }
  case '6b':{const text=q.context![0],label=text.match(/Bag ([PQR])/)![1],total=Number(text.match(/mass of (\d+) kg/)![1]),bag=cards(q).find(c=>c.label===`Bag ${label}`)!;return total-value(bag.value);}
  case '7':{const [given,difference]=cards(q).map(c=>rational(c.value)),top=2*given[0]*difference[1]-difference[0]*given[1],bottom=given[1]*difference[1];return mixed(top,bottom);}
  case '8a':case '8b':{const [a,gap,next]=cards(q);return value(a.value)-value(gap.value)+(part==='8b'?value(next.value):0);}
  case '9a':case '9b':{
   const [first,second]=cards(q).map(c=>c.value),p=value(first),s=value(second),remaining=1-p-s,difference=nums(q.context![1])[0],whole=difference/(s-remaining);return part==='9a'?whole*p:whole;
  }
  default:throw Error(`Unknown part ${part}`);
 }
}

describe('complete original Nanyang P4 2025 WA2 adaptation',()=>{
 it('offers at least six different complete mixed-number examples',()=>{const seen=new Set(Array.from({length:200},(_,seed)=>JSON.stringify(makeP4Nanyang2025('7',seed).picture)));expect(seen.size).toBeGreaterThanOrEqual(6);});
 it('accounts for every response unit with real curriculum objectives',()=>{
  expect(NANYANG_2025_PARTS.map(p=>p.id)).toEqual(['1','2','3','4','5','6a','6b','7','8a','8b','9a','9b']);
  expect(new Set(NANYANG_2025_PARTS.map(p=>p.id.replace(/[ab]$/,''))).size).toBe(9);
  expect(new Set(NANYANG_2025_PARTS.map(p=>p.canonicalPatternId)).size).toBe(12);
  for(const p of NANYANG_2025_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves 10800 variations from the visible givens',()=>{
  for(const part of NANYANG_2025_PARTS)for(let seed=0;seed<300;seed++)for(let index=0;index<3;index++){
   const q=makeP4Nanyang2025(part.id,seed,index),solved=solveP4Imported(q,part.id),expected=numberValue(String(solved)),answer=numberValue(q.answer);
   if(expected===null)expect(q.answer,`${part.id}/${seed}/${index}`).toBe(solved);else expect(answer,`${part.id}/${seed}/${index}`).toBeCloseTo(expected,8);
   expect(q.workedSteps.length).toBeGreaterThan(0);expect(q.hint.length).toBeGreaterThan(10);expect(q.picture).toBeDefined();expect(q.key).toBe(`p4-nanyang-${part.id}:${seed}:${index}`);
   expect(correctAnswer(gradeable(q),q.answer)).toBe(true);
   if(q.choices){expect(new Set(q.choices).size).toBe(q.choices.length);expect(q.choices.filter(c=>correctAnswer(gradeable(q),c))).toEqual([q.answer]);}
   expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
 it('keeps related parts coherent while each response has complete givens',()=>{
  for(let seed=0;seed<100;seed++){
   expect(makeP4Nanyang2025('2',seed).picture).toEqual(makeP4Nanyang2025('3',seed).picture);
   expect(makeP4Nanyang2025('6a',seed).picture).toEqual(makeP4Nanyang2025('6b',seed).picture);
   expect(cards(makeP4Nanyang2025('8a',seed))).toEqual(cards(makeP4Nanyang2025('8b',seed)).slice(0,2));
   expect(makeP4Nanyang2025('9a',seed).picture).toEqual(makeP4Nanyang2025('9b',seed).picture);
   const a=makeP4Nanyang2025('9a',seed),b=makeP4Nanyang2025('9b',seed);expect(a.context).toEqual(b.context);expect(Number(a.answer)).toBeLessThan(Number(b.answer));
  }
 });
 it('retains constructed mixed-number and simplest-fraction requirements',()=>{
  for(let seed=0;seed<100;seed++){
   const mixedQuestion=makeP4Nanyang2025('7',seed),q=gradeable(mixedQuestion),[whole,n,d]=nums(mixedQuestion.answer);
   expect(q.requireMixed).toBe(true);expect(q.choices).toBeUndefined();expect(correctAnswer(q,`${whole*d+n}/${d}`)).toBe(false);
   expect(correctAnswer(q,`${whole} ${n*2}/${d*2}`)).toBe(true); // Source asks mixed, not simplest.
   const simple=gradeable(makeP4Nanyang2025('8a',seed)),[a,b]=rational(simple.answer);expect(simple.requireSimplified).toBe(true);expect(correctAnswer(simple,`${a*2}/${b*2}`)).toBe(false);
  }
 });
 it('keeps positive ordered lengths, unlike denominators and level-sized fractions',()=>{
  for(let seed=0;seed<300;seed++){
   const q=makeP4Nanyang2025('8b',seed),[a,gap,next]=cards(q),av=value(a.value),gv=value(gap.value),nv=value(next.value),b=av-gv,c=Number(numberValue(q.answer));
   expect(b).toBeGreaterThan(0);expect(c).toBeGreaterThan(b);expect(c).toBeLessThan(av);expect(c).toBeCloseTo(b+nv,10);
   const [,ad]=rational(a.value),[,gd]=rational(gap.value);expect(ad%gd).not.toBe(0);expect(gd%ad).not.toBe(0);
   for(const card of cards(q))expect(rational(card.value)[1]).toBeLessThanOrEqual(12);
   for(const part of ['6a','7','9a'])for(const card of cards(makeP4Nanyang2025(part,seed)).filter(c=>c.value.includes('/')))expect(rational(card.value)[1]).toBeLessThanOrEqual(12);
  }
 });
 it('varies meaningful answers and replaces source variable quantities',()=>{
  const choices=new Set<string>(),diffs=new Set<string>(),lengths=new Set<string>(),sets=new Set<string>();
  for(let seed=0;seed<200;seed++){
   choices.add(makeP4Nanyang2025('6a',seed).answer);diffs.add(makeP4Nanyang2025('4',seed).answer);lengths.add(makeP4Nanyang2025('8a',seed).answer);sets.add(makeP4Nanyang2025('1',seed).answer);
   expect(cards(makeP4Nanyang2025('5',seed))[0].value).not.toBe('$954');
   expect(makeP4Nanyang2025('9b',seed).answer).not.toBe('840');
   const graph=diagram(makeP4Nanyang2025('4',seed));if(graph.layout!=='line-graph')throw Error('Missing line graph');for(const n of graph.values)expect([14,36,20,48]).not.toContain(n);
   for(const bag of cards(makeP4Nanyang2025('6a',seed)))expect(['1/4 kg','3/5 kg','5/8 kg']).not.toContain(bag.value);
  }
  expect(choices.size).toBe(3);expect(sets.size).toBe(4);expect(diffs.size).toBeGreaterThan(10);expect(lengths.size).toBeGreaterThan(10);
 });
 it('renders separate fraction objects, genuine line points and a semantic table',()=>{
  for(let seed=0;seed<100;seed++)for(const part of ['1','2','4']){
   const model=diagram(makeP4Nanyang2025(part,seed)),markup=renderToStaticMarkup(createElement(P4NanyangDiagram,{model}));
   expect(markup).not.toMatch(/NaN|undefined/);
   if(model.layout==='fraction-sets'){
    expect((markup.match(/data-set-tile=/g)??[]).length).toBe(model.sets.reduce((n,s)=>n+s.total,0));
    expect((markup.match(/data-shaded="true"/g)??[]).length).toBe(model.sets.reduce((n,s)=>n+s.shadedIndices.length,0));
    for(const set of model.sets){expect(new Set(set.shadedIndices).size).toBe(set.shadedIndices.length);expect(set.total).toBeLessThanOrEqual(12);expect(set.shadedIndices.every(i=>i>=0&&i<set.total)).toBe(true);}
    expect(model.sets.length).toBe(4);expect(markup).toContain('separate tiles');
   }else if(model.layout==='line-graph'){
    expect(markup).toContain('<polyline');expect(markup).toContain('<desc');
    const points=[...markup.matchAll(/data-chart-point="(\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)];expect(points.length).toBe(4);
    const max=Math.max(...model.values);for(const p of points){const i=Number(p[1]);expect(Number(p[2])).toBe(64+i*84);expect((220-Number(p[3]))/184*max).toBeCloseTo(model.values[i],8);}
    expect(max/model.scale).toBeLessThanOrEqual(8);expect(markup).toContain('font-size="15"');
   }else{
    expect(markup).toContain('<caption>Items sold at a craft fair</caption>');expect((markup.match(/scope="col"/g)??[]).length).toBe(5);expect((markup.match(/scope="row"/g)??[]).length).toBe(2);
    for(const row of model.rows)for(const n of row.values.filter(v=>v!==null))expect(markup).toContain(`>${n}</td>`);
   }
  }
 });
 it('records independently verified source calculations, including the erroneous key intermediate',()=>{
  expect(1830-425-878).toBe(527);expect((1150-670)/3).toBe(160);expect(48-20).toBe(28);
  expect(954/9).toBe(106);expect(954/9).not.toBe(105);expect(954*(1-5/9)).toBe(424);
  expect(3-3/5).toBe(2.4);expect(7/10+(7/10-1/5)).toBeCloseTo(1.2,10);
  expect(9/10-3/4).toBeCloseTo(3/20,10);expect(9/10-3/4+1/2).toBeCloseTo(13/20,10);
  expect(360/(4/7-(1-2/7-4/7))).toBeCloseTo(840,10);expect(840*2/7).toBe(240);
 });
});
