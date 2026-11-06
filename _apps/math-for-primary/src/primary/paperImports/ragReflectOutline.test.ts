import {describe,expect,it} from 'vitest';
import {correctAnswer} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {RAG_PATTERN,makeRagQuestion} from './ragReflectOutline';

type P=[number,number];
type S=[P,P];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const unitEdges=(segments:S[]):Set<string>=>{
 const out=new Set<string>();
 for(const [[x,y],[a,b]] of segments){
  const n=gcd(Math.abs(a-x),Math.abs(b-y));
  for(let i=0;i<n;i++){
   const u=`${x+(a-x)*i/n},${y+(b-y)*i/n}`,v=`${x+(a-x)*(i+1)/n},${y+(b-y)*(i+1)/n}`;
   out.add([u,v].sort().join('|'));
  }
 }
 return out;
};
const parse=(value:string):S[]=>value.split(';').map(part=>{const [a,b]=part.split(':').map(p=>p.split(',').map(Number) as P);return [a,b] as S;});
const edgePoints=(edge:string):P[]=>edge.split('|').map(p=>p.split(',').map(Number) as P);

// Independent solver: reads only the visible givens (grid spec, axis and drawn segments).
function solveFromVisibleGivens(q:ReturnType<typeof makeRagQuestion>){
 const spec=q.gridDrawing;
 if(!spec||spec.kind!=='complete-reflection')throw new Error('expected a reflection question');
 const {axis,givenSegments,columns,rows}=spec;
 const reflect=([x,y]:P):P=>axis.orientation==='vertical'?[2*axis.coordinate-x,y]:[x,2*axis.coordinate-y];
 const given=givenSegments as S[];
 const reflected=given.map(([a,b])=>[reflect(a),reflect(b)] as S);
 const givenEdges=unitEdges(given);
 const expected=new Set([...unitEdges(reflected)].filter(e=>!givenEdges.has(e)));
 return {axis,given,reflected,expected,givenEdges,columns,rows,reflect};
}

describe('ragReflectOutline',()=>{
 it('has valid metadata and real curriculum skills',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-reflecting-geometric-outlines');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('stored answer equals an independent reflection of the visible outline across varied seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),solved=solveFromVisibleGivens(q);
   const answerEdges=unitEdges(parse(q.answer));
   expect([...answerEdges].sort()).toEqual([...solved.expected].sort());
   expect(correctAnswer(q,q.answer)).toBe(true);
   // The picture shows the same givens as the response spec.
   const pic=q.picture as {type:string;givenSegments?:S[];axis?:unknown;columns:number;rows:number};
   expect(pic.type).toBe('grid-drawing');
   expect(pic.givenSegments).toEqual(solved.given);
   expect(pic.axis).toEqual(solved.axis);
   expect(pic.columns).toBe(solved.columns);
   expect(pic.rows).toBe(solved.rows);
  }
 });

 it('the completed figure is symmetric and stays on the grid',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),s=solveFromVisibleGivens(q);
   const all=new Set([...s.givenEdges,...s.expected]);
   for(const edge of all){
    const [a,b]=edgePoints(edge);
    const image=[s.reflect(a),s.reflect(b)].map(p=>p.join(',')).sort().join('|');
    expect(all.has(image)).toBe(true);
    for(const [x,y] of [a,b]){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThanOrEqual(s.columns);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThanOrEqual(s.rows);}
   }
   expect(s.expected.size).toBeGreaterThan(0);
  }
 });

 it('uses both mirror directions and both touching and non-touching outlines',()=>{
  const seen=new Set<string>();
  for(let index=0;index<4;index++){
   const s=solveFromVisibleGivens(makeRagQuestion(7,index));
   const coordinate=s.axis.coordinate;
   const onAxis=s.given.flat().filter(([x,y])=>(s.axis.orientation==='vertical'?x:y)===coordinate).length;
   seen.add(`${s.axis.orientation}:${onAxis>0}`);
   // Segments never lie on or cross the mirror line.
   for(const [a,b] of s.given){
    const da=(s.axis.orientation==='vertical'?a[0]:a[1])-coordinate,db=(s.axis.orientation==='vertical'?b[0]:b[1])-coordinate;
    expect(da*db).toBeGreaterThanOrEqual(0);
    expect(da===0&&db===0).toBe(false);
   }
   expect(onAxis===0||onAxis===2).toBe(true);
  }
  expect(seen).toEqual(new Set(['vertical:false','horizontal:false','vertical:true','horizontal:true']));
 });

 it('rejects an unreflected copy, a partial drawing and a wrong-side drawing',()=>{
  for(let seed=1;seed<=20;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),s=solveFromVisibleGivens(q);
   const toValue=(segments:S[])=>segments.map(([a,b])=>`${a.join(',')}:${b.join(',')}`).join(';');
   expect(correctAnswer(q,toValue(s.given))).toBe(false);
   const answer=parse(q.answer);
   expect(answer.length).toBeGreaterThan(1);
   expect(correctAnswer(q,toValue(answer.slice(1)))).toBe(false);
   // Same shape slid one square along the axis is not a reflection.
   const shifted=answer.map(([a,b])=>(s.axis.orientation==='vertical'?[[a[0],a[1]+1],[b[0],b[1]+1]]:[[a[0]+1,a[1]],[b[0]+1,b[1]]]) as S);
   const inside=shifted.every(seg=>seg.every(([x,y])=>x<=s.columns&&y<=s.rows));
   if(inside)expect(correctAnswer(q,toValue(shifted))).toBe(false);
  }
 });

 it('accepts reversed endpoints and reordered segments',()=>{
  const q=makeRagQuestion(3,2),answer=parse(q.answer);
  const value=answer.slice().reverse().map(([a,b])=>`${b.join(',')}:${a.join(',')}`).join(';');
  expect(correctAnswer(q,value)).toBe(true);
 });

 it('is deterministic and has hint, worked steps and no copied source wording',()=>{
  const a=makeRagQuestion(11,5),b=makeRagQuestion(11,5);
  expect(a).toEqual(b);
  expect(a.hint.length).toBeGreaterThan(10);
  expect((a.workedSteps??[]).length).toBeGreaterThanOrEqual(3);
  expect(JSON.stringify(a)).not.toMatch(/Complete the symmetric figure|Draw three more straight lines|sgexam/i);
 });
});
