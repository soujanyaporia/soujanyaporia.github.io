import {describe,it,expect} from 'vitest';
import {Rng} from '../../engine/random';
import {PLAN} from './plan';
import {numberSpec} from './families/numbers';
import {words} from './families/wn';
import {isCorrect} from '../gen';

// Independent reading algorithm: accumulate units until a magnitude closes a group.
const small:Record<string,number>={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function readName(name:string){let value=0,part=0;for(const word of name.replaceAll('-',' ').split(/\s+/)){if(word==='and')continue;if(word==='hundred')part*=100;else if(word==='thousand'||word==='million'){value+=part*(word==='thousand'?1000:1e6);part=0;}else{if(!(word in small))throw Error(`Unknown number word ${word}`);part+=small[word];}}return value+part;}

describe('Writing and reading number names',()=>{
 it('covers zero, teens and the upper boundary in P1 instead of starting at twelve',()=>{
  const spec=numberSpec(PLAN.find(p=>p.id==='p1s-wn-03')!),seen=new Set<number>();
  for(let seed=0;seed<3000;seed++){
   const q=spec.example(new Rng(seed),seed%4),value=q.prompt.includes('in numerals')?Number(q.answer):readName(q.answer);
   expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(100);seen.add(value);
   if(q.prompt.includes('in numerals'))expect(readName(q.prompt.match(/“(.+)”/)![1])).toBe(value);
  }
  expect([...seen].sort((a,b)=>a-b)).toEqual(Array.from({length:101},(_,i)=>i));
 });
 it('offers real writing alongside recognition, for every number-name objective',()=>{
  for(const p of PLAN.filter(p=>p.code==='WN'&&/read and write|number names/i.test(p.objective))){
   const spec=numberSpec(p);let typed=0,recognition=0,numerals=0;
   for(let seed=0;seed<100;seed++)for(let variant=0;variant<4;variant++){
    const q=spec.example(new Rng(seed),variant);
    if(q.prompt.includes('in words')){expect(readName(q.answer)).toBe(Number(q.prompt.match(/[\d,]+/)![0].replaceAll(',','')));if(q.choices)recognition++;else{typed++;expect(q.exact).toBe(true);}}
    else{numerals++;expect(readName(q.prompt.match(/“(.+)”/)![1])).toBe(Number(q.answer));}
   }
   expect(typed,p.id).toBeGreaterThan(0);expect(recognition,p.id).toBeGreaterThan(0);expect(numerals,p.id).toBeGreaterThan(0);
  }
 });
 it('grades normal hyphen, spacing and British and variations without accepting a different number',()=>{
  const cases:[[number,string],[number,string],[number,string],[number,string]]=[[25,'TWENTY five'],[101,'one hundred one'],[1001,'one thousand and one'],[9999999,'nine million nine hundred ninety nine thousand nine hundred ninety nine']];
  for(const [n,input] of cases){const q={answer:words(n),exact:true};expect(isCorrect(q,input)).toBe(true);expect(isCorrect(q,words(n+1))).toBe(false);expect(readName(q.answer)).toBe(n);}
  expect(isCorrect({answer:'forty',exact:true},'fourty')).toBe(false);
  expect(isCorrect({answer:'one hundred and two',exact:true},'one thousand two')).toBe(false);
  expect(isCorrect({answer:'1/2',exact:true},'2/4')).toBe(false);
  expect(isCorrect({answer:'right angle',exact:true},'right-angle')).toBe(false);
 });
});
