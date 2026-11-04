import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {makeP1HenryPark2025Question,makeP1HenryPark2025Set,type P1ImportedQuestion} from './p1HenryPark2025';
import {P1_HENRY_PARK_2025_PATTERNS} from './p1HenryPark2025Meta';
import {MissingDigitColumn} from './MissingDigitColumn';
import {Picture as PictureView} from '../Picture';
import {correctAnswer,type Question,type Proof} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

type AnyQuestion=Question|P1ImportedQuestion;
const numbers=(text:string)=>[...text.matchAll(/\d+/g)].map(m=>Number(m[0]));
const countCards=(q:AnyQuestion)=>{if(q.picture?.type!=='paper'||q.picture.layout!=='cards')throw Error('Missing visible cards');return q.picture.cards;};
const tiles=(q:AnyQuestion)=>{if(q.picture?.type!=='pattern')throw Error('Missing number cards');return q.picture.items;};
const numericCard=(q:AnyQuestion,index:number)=>numbers(countCards(q)[index].value)[0];
const answerOnly=(q:AnyQuestion)=>({...q,picture:undefined,workedSteps:undefined});
function spelled(n:number){const below20='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '),decades=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];return n<20?below20[n]:[decades[Math.trunc(n/10)],n%10?below20[n%10]:''].filter(Boolean).join('-');}
function valueOfRepresentation(text:string):number{
 if(text.includes('+'))return text.split('+').map(Number).reduce((a,b)=>a+b,0);
 if(text.includes('tens')){const [t,o]=numbers(text);return 10*t+o;}
 return Array.from({length:100},(_,i)=>i).find(n=>spelled(n)===text)??NaN;
}
function storyFacts(q:AnyQuestion,group:string):[number,'+'|'-',number]{
 if(group==='20'){
  const p=q.picture;if(p?.type!=='paper'||p.layout!=='bars')throw Error('Missing comparison');
  return [numbers(p.totalLabel!)[0],'-',numbers(p.rows[0].parts[1].label)[0]];
 }
 return [numericCard(q,0),'+',numericCard(q,1)];
}

/** Derive a valid response only from visible givens, not from the answer, solution or proof. */
export function solveP1Imported(q:AnyQuestion,parameter:string):string|number{
 const slug=parameter.replace(/^hp25-/,'');
 switch(slug){
  case '01':return countCards(q)[0].count!*10+countCards(q)[1].count!;
  case '02':{const target=numericCard(q,0),different=q.choices!.filter(c=>valueOfRepresentation(c)!==target);if(different.length!==1)throw Error('Ambiguous representation options');return different[0];}
  case '03':return countCards(q)[0].count!-countCards(q)[1].count!;
  case '04':return numericCard(q,0)-numericCard(q,1)*10;
  case '05':case '09':return numericCard(q,0)+numericCard(q,1);
  case '06':return spelled(numericCard(q,0));
  case '07':return tiles(q).map(Number).sort((a,b)=>a-b).join(',');
  case '08-tens':return countCards(q)[0].count!;
  case '08-ones':return countCards(q)[1].count!;
  case '10':{const values=tiles(q),jump=Number(values[1])-Number(values[0]);return Number(values[0])+values.indexOf('?')*jump;}
  case '11':{const digits=tiles(q).map(Number),[lower,upper]=numbers(q.context!.join(' '));let best=-1;for(let i=0;i<digits.length;i++)for(let j=0;j<digits.length;j++){const candidate=digits[i]*10+digits[j];if(i!==j&&candidate>lower&&candidate<upper)best=Math.max(best,candidate);}if(best<0)throw Error('No allowed two-card number');return best;}
  case '12':{const pool=tiles(q).map(Number);for(let i=0;i<pool.length;i++)for(let j=0;j<pool.length;j++)for(let k=0;k<pool.length;k++)if(i!==j&&i!==k&&j!==k&&pool[i]-pool[j]===pool[k])return `${pool[i]} - ${pool[j]} = ${pool[k]}`;throw Error('No valid subtraction');}
  case '13-a':return 10*countCards(q)[0].count!+countCards(q)[1].count!;
  case '13-b':return 10*countCards(q)[2].count!+countCards(q)[3].count!;
  case '14':return countCards(q).reduce((sum,c,i)=>sum+c.count!*(i%2===0?10:1),0);
  case '15':return numericCard(q,0)*10+numericCard(q,1);
  case '16':{const p=q.picture;if(p?.type!=='paper'||p.layout!=='timeline')throw Error('Missing before/after');return numbers(p.points[1].label)[0]-numbers(p.gaps[0])[0]*10;}
  case '17':return numericCard(q,2)-countCards(q)[0].count!-countCards(q)[1].count!;
  case '18-a':case '18-b':{
   const p=q.picture;if(p?.type!=='missing-column')throw Error('Missing aligned digits');
   const possible:{A:number;B:number}[]=[];
   for(let A=1;A<=9;A++)for(let B=0;B<=9;B++){
    const number=(row:(number|'A'|'B')[])=>row.reduce<number>((n,d)=>n*10+(d==='A'?A:d==='B'?B:d),0);
    if(number(p.top)+number(p.bottom)===number(p.total))possible.push({A,B});
   }
   if(possible.length!==1)throw Error('Missing digits are not uniquely determined');return possible[0][p.target];
  }
  default:{
   if(!/^(19|20|21)-(equation|answer)$/.test(slug))throw Error(`No source-task solver for ${parameter}`);
   const [a,operation,b]=storyFacts(q,slug.slice(0,2)),answer=operation==='+'?a+b:a-b;
   return slug.endsWith('equation')?`${a} ${operation} ${b} = ${answer}`:answer;
  }
 }
}
function proofValue(p:Proof):number{if(typeof p==='number')return p;const a=proofValue(p.a),b=proofValue(p.b);switch(p.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case 'round':return Math.round(a/b)*b;case 'floor':return Math.floor(a/b)*b;}}
const activity=(p:typeof P1_HENRY_PARK_2025_PATTERNS[number])=>({...p,id:`p1s-pilot-${p.parameter}`,track:'standard' as const,kind:'paper' as const});

describe('Complete P1 paper-pattern pilot: original Quiz3 adaptations',()=>{
 it('accounts for every source question, subpart and story equation without inflating pattern counts',()=>{
  expect(P1_HENRY_PARK_2025_PATTERNS).toHaveLength(27);
  const refs=P1_HENRY_PARK_2025_PATTERNS.flatMap(p=>p.sourceParts);
  expect(new Set(refs).size).toBe(27);
  expect([...new Set(refs.map(s=>Number(s.split('.')[0])))].sort((a,b)=>a-b)).toEqual(Array.from({length:21},(_,i)=>i+1));
  expect(refs.filter(s=>!s.endsWith('.equation'))).toHaveLength(24);
  expect(new Set(P1_HENRY_PARK_2025_PATTERNS.map(p=>p.canonicalPatternId)).size).toBe(16);
  for(const p of P1_HENRY_PARK_2025_PATTERNS){expect(p.coverage).toBe('complete');for(const id of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===id),id).toBe(true);}
 });
 it.each(P1_HENRY_PARK_2025_PATTERNS.map(p=>[p.parameter,p] as const))('%s is independently solvable and deterministic through 250 variants',(parameter,pattern)=>{
  for(let seed=0;seed<250;seed++){
   const index=seed%7,q=makeP1HenryPark2025Question(activity(pattern),seed,index),expected=solveP1Imported(q,parameter),where=`${parameter}:${seed}:${index}`;
   expect(correctAnswer(answerOnly(q),String(expected)),where).toBe(true);
   expect(correctAnswer(answerOnly(q),q.answer),where).toBe(true);
   expect(makeP1HenryPark2025Question(activity(pattern),seed,index),where).toEqual(q);
   expect(q.picture,where).toBeDefined();expect(q.workedSteps.length,where).toBeGreaterThanOrEqual(1);
   expect(q.workedSteps.every(s=>s.text.length>10&&s.picture),where).toBe(true);
   expect(q.hint.length,where).toBeGreaterThan(10);expect(q.prompt.split(/\s+/).length,where).toBeLessThanOrEqual(18);
   expect(JSON.stringify(q),where).not.toMatch(/NaN|Infinity|undefined/);
   if(typeof expected==='number'){expect(Number(q.answer),where).toBe(expected);expect(expected,where).toBeGreaterThanOrEqual(0);expect(expected,where).toBeLessThanOrEqual(100);expect(correctAnswer(answerOnly(q),String(expected+1)),where).toBe(false);}
   if(q.proof!==undefined){const evaluated=proofValue(q.proof);expect(Number.isFinite(evaluated),where).toBe(true);if(typeof expected==='number')expect(evaluated,where).toBe(expected);if(q.numberSentence)expect(evaluated,where).toBe(Number(q.answer.split('=').at(-1)));}
   if(q.choices){expect(new Set(q.choices).size,where).toBe(4);expect(q.choices.filter(c=>correctAnswer(answerOnly(q),c)),where).toEqual([q.answer]);}
   if(q.picture.type==='paper'&&q.picture.layout==='cards')for(const c of q.picture.cards)if(c.count!==undefined){expect(c.count,where).toBeGreaterThan(0);expect(c.count,where).toBeLessThanOrEqual(12);}
  }
 });
 it('preserves shared givens across subparts and full original sets',()=>{
  for(const seed of [0,17,7919,15841,0xffffffff]){
   const set=makeP1HenryPark2025Set(seed),q=(slug:string)=>set.find(s=>s.pattern.parameter===`hp25-${slug}`)!.question;
   expect(set).toHaveLength(27);expect(makeP1HenryPark2025Set(seed)).toEqual(set);
   expect(q('08-tens').picture).toEqual(q('08-ones').picture);
   expect(q('13-a').picture).toEqual(q('13-b').picture);expect(q('13-a').picture).toEqual(q('14').picture);
   expect(Number(q('13-a').answer)+Number(q('13-b').answer)).toBe(Number(q('14').answer));
   const a=q('18-a').picture,b=q('18-b').picture;expect({...a,target:undefined}).toEqual({...b,target:undefined});
   for(const group of ['19','20','21'])expect(q(`${group}-equation`).picture).toEqual(q(`${group}-answer`).picture);
  }
 });
 it('keeps both valid source-style subtraction constructions while leaving the distractor unused',()=>{
  const p=P1_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter==='hp25-12')!;
  for(let seed=0;seed<100;seed++){
   const q=makeP1HenryPark2025Question(activity(p),seed),pool=q.numberSentence!.numbers,valid=new Set<string>();
   for(const a of pool)for(const b of pool)for(const c of pool)if(a!==b&&a!==c&&b!==c&&a-b===c)valid.add(`${a} - ${b} = ${c}`);
   expect(valid.size).toBe(2);for(const sentence of valid)expect(correctAnswer(answerOnly(q),sentence)).toBe(true);
   expect(q.choices).toBeUndefined();expect(q.numberSentence?.numbers).toHaveLength(4);
   expect(q.explanation).toContain('One correct subtraction sentence');
  }
 });
 it('requires pupils to choose the story operation and calculate the result instead of giving an answer card',()=>{
  for(const p of P1_HENRY_PARK_2025_PATTERNS.filter(p=>p.parameter.endsWith('equation'))){
   for(let seed=0;seed<50;seed++){
    const q=makeP1HenryPark2025Question(activity(p),seed),[a,operation,b]=storyFacts(q,p.group),answer=operation==='+'?a+b:a-b;
    expect(q.numberSentence).toMatchObject({missingResult:true,chooseOperation:true});
    expect([...q.numberSentence!.numbers].sort((x,y)=>x-y)).toEqual([a,b].sort((x,y)=>x-y));
    expect(q.numberSentence!.numbers).not.toContain(answer);
    expect(q.context?.at(-1)).toMatch(/How many/);
    expect(correctAnswer(answerOnly(q),`${a} ${operation} ${b} = ${answer+1}`)).toBe(false);
    const wrong=operation==='+'?'-':'+';expect(correctAnswer(answerOnly(q),`${a} ${wrong} ${b} = ${wrong==='+'?a+b:a-b}`)).toBe(false);
   }
  }
 });
 it('accepts ordinary hyphen and space spellings for written number names',()=>{
  const p=P1_HENRY_PARK_2025_PATTERNS.find(p=>p.parameter==='hp25-06')!;
  for(let seed=0;seed<100;seed++){
   const q=makeP1HenryPark2025Question(activity(p),seed);
   expect(q.answerFormat).toBe('number-words');expect(q.choices).toBeUndefined();
   expect(correctAnswer(answerOnly(q),q.answer.replaceAll('-',' '))).toBe(true);
   expect(correctAnswer(answerOnly(q),q.answer.toUpperCase())).toBe(true);
   expect(correctAnswer(answerOnly(q),String(numericCard(q,0)))).toBe(false);
  }
 });
 it('renders every task and shows aligned missing-digit givens without storing the hidden answers in its model',()=>{
  for(const seed of [0,1,7,31,129])for(const {pattern,question:q} of makeP1HenryPark2025Set(seed)){
   const html=q.picture.type==='missing-column'?renderToStaticMarkup(createElement(MissingDigitColumn,{model:q.picture})):renderToStaticMarkup(createElement(PictureView,{model:q.picture}));
   expect(html.length,pattern.parameter).toBeGreaterThan(100);expect(html,pattern.parameter).not.toMatch(/NaN|Infinity|undefined/);
   if(q.picture.type==='paper'&&q.picture.layout==='cards'){
    for(const c of q.picture.cards){expect(html).toContain(c.value);if(c.count!==undefined)expect(html).toContain('Count this');}
   }
   if(q.picture.type==='missing-column'){
    expect(q.picture.top[0]).toBe('A');expect(q.picture.bottom[1]).toBe('B');
    expect(Object.keys(q.picture).sort()).toEqual(['bottom','operation','target','top','total','type']);
    expect(html).toContain('Missing tens digit A');expect(html).toContain('Missing ones digit B');
    expect(html.match(/class="missing-digit-box/g)).toHaveLength(2);expect(html).toContain('scope="col">tens');expect(html).toContain('scope="col">ones');
   }
  }
 });
});
