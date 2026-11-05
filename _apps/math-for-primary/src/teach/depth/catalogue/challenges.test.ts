import {describe,it,expect} from 'vitest';
import {LESSONS,lessonById} from '../../catalog';
import {isCorrect,feedbackFor} from '../../gen';
import {stagesFor} from '../../LessonPlayer';
import {questionKey} from '../../distinct';
import type {Item,Lesson,Stage} from '../../model';

const challengeOf=(l:Lesson)=>l.stages.find((s):s is Extract<Stage,{kind:'practice'}>=>s.kind==='practice'&&!!s.challenge);
const setOf=(l:Lesson,seed:number)=>{const s=challengeOf(l)!;return Array.from({length:s.count},(_,i)=>s.gen(seed,i));};
const SEEDS=Array.from({length:24},(_,i)=>i*7919+3);
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const close=(a:number,b:number)=>Math.abs(a-b)<1e-6;
const n=(s:string)=>Number(s);

/** Re-solve a problem from its own wording, without using the generator's arithmetic. */
function solve(it:Item):number|string|null{
 const p=it.prompt,kind=it.kind?.replace('challenge:','');let m:RegExpMatchArray|null;
 switch(kind){
  case 'ratio-transfer-equal':if((m=p.match(/is (\d+) : (\d+)\. After \w+ gives \w+ \$(\d+),/))){const [a,b,g]=[n(m[1]),n(m[2]),n(m[3])];return a*g/((b-a)/2);}break;
  case 'ratio-one-unchanged':if((m=p.match(/is (\d+) : (\d+)\. After (\d+) red beads are added, the ratio becomes (\d+) : \d+\./))){const [a,b,add,c]=[n(m[1]),n(m[2]),n(m[3]),n(m[4])];return b*add/(c-a);}break;
  case 'ratio-share-difference':if((m=p.match(/share \$(\d+) in the ratio (\d+) : (\d+)\./))){const [t,a,b]=[n(m[1]),n(m[2]),n(m[3])];return t/(a+b)*(b-a);}break;
  case 'ratio-combine':if((m=p.match(/is (\d+) : (\d+)\. The ratio of \w+'s stamps to \w+'s stamps is (\d+) : (\d+)\./))){const [a,b,c,d]=[n(m[1]),n(m[2]),n(m[3]),n(m[4])];const A=a*c,C=b*d,g=gcd(A,C);return `${A/g}:${C/g}`;}break;
  case 'remainder-backwards':if((m=p.match(/spent (\d+)\/(\d+) of her money on a bag and 1\/(\d+) of the remainder on a book\. She had \$([\d.]+) left/))){const [pp,q,s,left]=[n(m[1]),n(m[2]),n(m[3]),n(m[4])];return left/((q-pp)/q*(s-1)/s);}break;
  case 'fraction-of-remainder':if((m=p.match(/had (\d+) stickers\. She gave 1\/(\d+) of them to \w+, then gave 1\/(\d+) of the remaining/))){const [t,a,b]=[n(m[1]),n(m[2]),n(m[3])];const rem=t-t/a;return rem-rem/b;}break;
  case 'equal-parts':if((m=p.match(/^(\d+)\/(\d+) of \w+'s marbles is equal to (\d+)\/(\d+) of \w+'s marbles\. \w+ has (\d+) marbles/))){const [a,b,c,d,X]=[n(m[1]),n(m[2]),n(m[3]),n(m[4]),n(m[5])];return X*a/b/c*d;}break;
  case 'percent-backwards':if((m=p.match(/spent (\d+)% of his money on a game and (\d+)% of the remainder on a book\. He had \$(\d+) left/))){const [a,b,left]=[n(m[1]),n(m[2]),n(m[3])];return left/((1-a/100)*(1-b/100));}break;
  case 'percent-original':if((m=p.match(/After a (\d+)% (increase|decrease), the price of a book is \$(\d+)\./))){const [pc,now]=[n(m[1]),n(m[3])];return now/(1+(m[2]==='increase'?1:-1)*pc/100);}break;
  case 'percent-of-rest':if((m=p.match(/^(\d+) pupils took part in a survey\. (\d+)% of them chose swimming\. (\d+)% of the rest/))){const [t,a,b]=[n(m[1]),n(m[2]),n(m[3])];return t*(1-a/100)*b/100;}break;
  case 'discount-gst':if((m=p.match(/costs \$(\d+) before a (\d+)% discount/))){const [pr,d]=[n(m[1]),n(m[2])];return Math.round(pr*(1-d/100)*1.09*100)/100;}break;
  case 'average-added':if((m=p.match(/average of (\d+) numbers is (\d+)\..*becomes (\d+)\./))){const [k,a,b]=[n(m[1]),n(m[2]),n(m[3])];return (k+1)*b-k*a;}break;
  case 'average-target':if((m=p.match(/average score in (\d+) tests is (\d+)\..*all \d+ tests is (\d+)\?/))){const [k,a,t]=[n(m[1]),n(m[2]),n(m[3])];return (k+1)*t-k*a;}break;
  case 'volume-displacement':if((m=p.match(/(\d+) cm long and (\d+) cm wide, and contains water (\d+) cm deep\..*rises to (\d+) cm/))){const [l,w,h1,h2]=[n(m[1]),n(m[2]),n(m[3]),n(m[4])];return l*w*(h2-h1);}break;
  case 'volume-small-cubes':if((m=p.match(/How many (\d+)-cm cubes fit exactly into a box measuring (\d+) cm by (\d+) cm by (\d+) cm/))){const [s,a,b,c]=[n(m[1]),n(m[2]),n(m[3]),n(m[4])];return (a/s)*(b/s)*(c/s);}break;
  case 'time-fence-post':if((m=p.match(/has (\d+) lessons of (\d+) minutes each, with a (\d+)-minute break/))){const [k,len,b]=[n(m[1]),n(m[2]),n(m[3])];return k*len+(k-1)*b;}break;
  case 'greatest-common-factor':if((m=p.match(/has (\d+) red beads and (\d+) blue beads/)))return gcd(n(m[1]),n(m[2]));break;
  case 'common-multiple':if((m=p.match(/every (\d+) minutes\. Bus B leaves every (\d+) minutes/))){const [a,b]=[n(m[1]),n(m[2])];return a*b/gcd(a,b);}break;
  case 'algebra-ages':if((m=p.match(/is (\d+) times as old as \w+\. In (\d+) years' time, the sum of their ages will be (\d+)\./))){const [k,y,s]=[n(m[1]),n(m[2]),n(m[3])];return (s-2*y)/(k+1);}break;
  case 'circle-work-back':if((m=p.match(/circumference of a circle is (\d+) cm/))){const d=n(m[1])*7/22;return 22/7*(d/2)**2;}break;
  case 'rounding-range':if((m=p.match(/nearest (\d+) is (\d+)\. What is the (greatest|smallest)/))){const [u,t]=[n(m[1]),n(m[2])];return m[3]==='greatest'?t+u/2-1:t-u/2;}break;
  case 'pattern-term':if((m=p.match(/The pattern is (\d+), (\d+), .* What is the (\d+)(?:st|nd|rd|th) number/))){const [a,b,k]=[n(m[1]),n(m[2]),n(m[3])];return a+(k-1)*(b-a);}break;
  case 'largest-even':if((m=p.match(/digits ([\d, ]+) exactly once/))){const ds=m[1].split(',').map(x=>n(x.trim()));let best=-1;const perm=(left:number[],acc:number[])=>{if(!left.length){if(acc[0]!==0&&acc.at(-1)!%2===0)best=Math.max(best,n(acc.join('')));return;}left.forEach((d,i)=>perm(left.filter((_,j)=>j!==i),[...acc,d]));};perm(ds,[]);return best;}break;
 }
 return null;
}

describe('Challenge problems',()=>{
 it('ends every lesson with one set of three challenge problems',()=>{
  expect(LESSONS).toHaveLength(272);
  for(const l of LESSONS){
   const stages=l.stages.filter(s=>s.kind==='practice'&&s.challenge);
   expect(stages,l.id).toHaveLength(1);
   expect(l.stages.at(-1),l.id).toBe(stages[0]);
   expect(challengeOf(l)!.count,l.id).toBe(3);
  }
 });
 it('keeps challenge problems out of the lesson and puts them after the learning check in challenge mode',()=>{
  for(const l of LESSONS){
   expect(stagesFor(l,'learn').some(s=>s.kind==='practice'&&s.challenge),l.id).toBe(false);
   const ch=stagesFor(l,'challenge');
   expect(ch.map(s=>s.kind==='practice'&&s.challenge?'challenge':s.kind),l.id).toEqual(['mastery','challenge']);
   expect(stagesFor(l,'review').some(s=>s.kind==='practice'&&s.challenge),l.id).toBe(false);
  }
 });
 it('writes valid, answerable problems with a strategy, clues and a worked solution',()=>{
  for(const l of LESSONS)for(const seed of SEEDS)for(const it of setOf(l,seed)){
   const where=`${l.id} ${it.kind}: ${it.prompt}`;
   expect(it.prompt.length,where).toBeGreaterThan(30);
   expect(`${it.prompt} ${it.answer} ${it.steps.join(' ')} ${it.hints.join(' ')} ${it.check}`,where).not.toMatch(/NaN|undefined|Infinity|null/);
   expect(isCorrect(it,it.answer),where).toBe(true);
   expect(it.hints[0],where).toMatch(/^Strategy: /);
   expect(it.hints.length,where).toBeGreaterThanOrEqual(3);
   expect(it.steps.length,where).toBeGreaterThanOrEqual(2);
   if(it.choices)expect(it.choices,where).toContain(it.answer);
   const v=Number(it.answer);
   if(Number.isFinite(v)){
    expect(v,where).toBeGreaterThan(0);
    expect(Math.round(v*100),where).toBeCloseTo(v*100,6);
   }
   for(const [w,why] of Object.entries(it.wrong??{})){
    expect(isCorrect(it,w),`${where} — trap ${w} must not be accepted`).toBe(false);
    expect(feedbackFor(it,w),where).toBe(why);
   }
  }
 },120000);
 it('agrees with an independent solution worked from the problem’s own wording',()=>{
  const checked=new Map<string,number>();
  for(const l of LESSONS)for(const seed of SEEDS)for(const it of setOf(l,seed)){
   const expected=solve(it);if(expected===null)continue;
   const k=it.kind!;checked.set(k,(checked.get(k)??0)+1);
   if(typeof expected==='string')expect(it.answer.replace(/\s+/g,''),`${l.id} ${it.prompt}`).toBe(expected);
   else expect(close(Number(it.answer),expected),`${l.id} ${it.prompt} → ${it.answer}, expected ${expected}`).toBe(true);
  }
  // Every re-solved kind must actually have been met in the catalogue.
  for(const kind of ['ratio-transfer-equal','remainder-backwards','percent-backwards','discount-gst','average-added','volume-displacement','time-fence-post','greatest-common-factor','algebra-ages','largest-even','pattern-term'])
   expect(checked.get(`challenge:${kind}`)??0,kind).toBeGreaterThan(0);
 },120000);
 it('draws three different kinds of problem in one set wherever a topic offers three',()=>{
  let sets=0,varied=0;
  for(const l of LESSONS)for(const seed of SEEDS.slice(0,8)){
   const items=setOf(l,seed);sets++;
   expect(new Set(items.map(questionKey)).size,l.id).toBe(items.length);
   if(new Set(items.map(i=>i.kind)).size===items.length)varied++;
  }
  expect(varied/sets).toBeGreaterThan(0.95);
 });
 it('names the classic trap answers, such as the amount after a transfer instead of before',()=>{
  const ratio=lessonById('p6s-ratio-04')??LESSONS.find(l=>/ratio/i.test(l.objectives[0])&&l.level===6)!;
  const items=SEEDS.flatMap(seed=>setOf(ratio,seed)).filter(it=>it.kind==='challenge:ratio-transfer-equal');
  expect(items.length).toBeGreaterThan(0);
  for(const it of items){
   const after=Object.entries(it.wrong??{}).find(([,why])=>/after the gift/.test(why));
   expect(after,it.prompt).toBeDefined();
  }
 });
 it('scales difficulty by year: lower primary stays within its number range',()=>{
  for(const l of LESSONS.filter(x=>x.level===1))for(const seed of SEEDS)for(const it of setOf(l,seed)){
   const biggest=Math.max(0,...(it.prompt.match(/\d+/g)??[]).map(Number));
   expect(biggest,`${l.id} ${it.prompt}`).toBeLessThanOrEqual(100);
  }
 });
});
