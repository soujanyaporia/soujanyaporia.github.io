import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch2Upper,type Batch2UpperQuestion} from './batch2Upper';
import {BATCH2_UPPER_PATTERNS,type Batch2UpperId} from './batch2UpperMeta';
import {nestedIsoscelesGeometry,type UpperPoint} from './batch2UpperPicture';
import {Batch2UpperDiagram} from './batch2UpperDiagram';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const nums=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const distance=(a:UpperPoint,b:UpperPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a:UpperPoint,v:UpperPoint,b:UpperPoint)=>Math.acos(((a.x-v.x)*(b.x-v.x)+(a.y-v.y)*(b.y-v.y))/(distance(a,v)*distance(b,v)))*180/Math.PI;
const gradeable=(q:Batch2UpperQuestion):Question=>({...q,picture:undefined,workedSteps:undefined});
/** An independent solver reading only the visible geometry configuration and cards. */
export function solveBatch2Upper(q:Batch2UpperQuestion,id:Batch2UpperId):number{
 const pic=q.picture;
 if(pic.type==='batch2-upper'){
  if(pic.layout==='nested-isosceles'){const {N,L,M}=nestedIsoscelesGeometry(pic.innerBaseAngle,pic.outerApexAngle);return Math.round(angle(N,L,M));}
  const roots=(area:number)=>Array.from({length:area},(_,i)=>i+1).filter(n=>n*n===area),big=roots(pic.largeArea),small=roots(pic.smallArea);if(big.length!==1||small.length!==1)throw Error('Non-square areas');const next=big[0]-small[0];return pic.largeArea+pic.smallArea+next*next;
 }
 if(pic.type!=='paper'||pic.layout!=='cards')throw Error('Missing visible cards');const c=pic.cards;
 if(id==='linked-scores'){
  const total=nums(c[0].value)[0],difference=nums(c[1].value)[0],multiple=nums(c[2].value)[0],solutions=[];
  for(let first=1;first<total;first++){const second=first-difference;if(second>0&&first+second+multiple*(first+second)===total)solutions.push(first);}
  if(solutions.length!==1)throw Error('Score solution is ambiguous');return solutions[0];
 }
 const total=Math.round(nums(c[0].value)[0]*100),[brushes,erasers]=nums(c[1].value),spent=Math.round(nums(c[2].value)[0]*100),ratio=nums(c[3].value)[0],solutions=[];
 for(let eraser=1;eraser<spent;eraser++){const brush=ratio*eraser;if(brushes*brush+erasers*eraser===spent&&(total-spent)%brush===0)solutions.push(brushes+(total-spent)/brush);}
 if(solutions.length!==1)throw Error('Purchase solution is ambiguous');return solutions[0];
}
describe('Batch 2 reviewed upper-primary structures',()=>{
 it('uses real skills and one mathematical structure per reusable configuration',()=>{
  expect(BATCH2_UPPER_PATTERNS).toHaveLength(4);expect(new Set(BATCH2_UPPER_PATTERNS.map(p=>p.canonicalPatternId)).size).toBe(4);
  for(const p of BATCH2_UPPER_PATTERNS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('independently solves 4000 variants from visible givens',()=>{
  for(const p of BATCH2_UPPER_PATTERNS)for(let seed=0;seed<500;seed++)for(const index of [0,1]){
   const q=makeBatch2Upper(p.id,seed,index),solved=solveBatch2Upper(q,p.id);expect(Number(q.answer),`${p.id}:${seed}:${index}`).toBeCloseTo(solved,8);expect(correctAnswer(gradeable(q),String(solved))).toBe(true);expect(correctAnswer(gradeable(q),'999999')).toBe(false);
   if(q.choices){expect(new Set(q.choices).size).toBe(4);expect(q.choices.filter(c=>correctAnswer(gradeable(q),c))).toEqual([q.answer]);}
   expect(q.workedSteps.length).toBeGreaterThanOrEqual(3);expect(q).toEqual(makeBatch2Upper(p.id,seed,index));expect(JSON.stringify(q)).not.toMatch(/NaN|Infinity|undefined/);
  }
 });
 it('constructs true nested isosceles triangles for every permitted angle pair',()=>{
  for(let seed=0;seed<300;seed++){
   const p=makeBatch2Upper('nested-isosceles',seed).picture;if(p.type!=='batch2-upper'||p.layout!=='nested-isosceles')throw Error('Missing geometry');const {K,L,N,M}=nestedIsoscelesGeometry(p.innerBaseAngle,p.outerApexAngle);
   expect(distance(K,N)).toBeCloseTo(distance(L,N),8);expect(distance(K,M)).toBeCloseTo(distance(L,M),8);expect(angle(L,K,N)).toBeCloseTo(p.innerBaseAngle,8);expect(angle(K,M,L)).toBeCloseTo(p.outerApexAngle,8);expect(N.y).toBeLessThan(M.y);
  }
 });
 it('renders geometric givens, required labels and accessible descriptions',()=>{
  for(let seed=0;seed<60;seed++)for(const id of ['three-square-area','nested-isosceles'] as const){const m=makeBatch2Upper(id,seed).picture;if(m.type!=='batch2-upper')throw Error('Missing diagram');const html=renderToStaticMarkup(createElement(Batch2UpperDiagram,{model:m}));expect(html).toContain('<desc');expect(html).toContain('role="img"');expect(html).not.toMatch(/NaN|undefined/);if(m.layout==='three-squares'){expect((html.match(/<rect /g)??[]).length).toBe(3);expect(html).toContain(`${m.largeArea} cm²`);expect(html).toContain(`${m.smallArea} cm²`);}else for(const s of ['K','L','N','M'])expect(html).toContain(`>${s}</text>`);}
 });
 it('varies original answers and source quantities',()=>{
  for(const p of BATCH2_UPPER_PATTERNS){const answers=new Set(Array.from({length:100},(_,seed)=>makeBatch2Upper(p.id,seed).answer));expect(answers.size,p.id).toBeGreaterThanOrEqual(6);}
 });
 it('preserves the source multiple-choice and constructed response forms',()=>{
  for(const p of BATCH2_UPPER_PATTERNS)for(let seed=0;seed<50;seed++){const q=makeBatch2Upper(p.id,seed);expect(Boolean(q.choices)).toBe(p.id==='mixed-purchase-more'||p.id==='nested-isosceles');}
 });
 it('independently checks source structure calculations',()=>{
  expect(81+(9-2)**2+4).toBe(134);expect((561/3+93)/2).toBe(140);expect(6+3/(3*(6/(6*3+12)))).toBe(11);expect((180-56)/2-25).toBe(37);
 });
});
