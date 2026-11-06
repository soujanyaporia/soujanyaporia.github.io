import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragUnresolvedVisualRelationships';
import {correctAnswer} from '../generate';

const solveSubtraction=(display:string):string[]=>{
 const m=/^A000 − (\d{3})B = (\d{4})$/.exec(display);
 if(!m)throw new Error('Unexpected subtraction display');
 const solutions:string[][]=[];
 for(let a=1;a<=9;a++)for(let b=0;b<=9;b++){if(a*1000-(Number(m[1])*10+b)===Number(m[2]))solutions.push([String(a),String(b)]);}
 expect(solutions.length).toBe(1);
 return solutions[0];
};

const solveTarget=(q:ReturnType<typeof makeRagQuestion>):number=>{
 if(q.picture?.type!=='paper'||q.picture.layout!=='cards')throw new Error('Expected target cards');
 const centre=Number(q.picture.cards.find(c=>c.label==='Centre')!.value);
 const quarters=q.picture.cards.filter(c=>c.label!=='Centre').map(c=>{const m=/^outer (\S+) · middle (\S+)$/.exec(c.value)!;return {outer:m[1],middle:m[2]};});
 const complete=quarters.filter(c=>c.outer!=='A'&&c.middle!=='A');
 expect(complete.length).toBe(3);
 for(const c of complete)expect(Number(c.outer)/Number(c.middle)).toBe(centre);
 const hidden=quarters.find(c=>c.outer==='A'||c.middle==='A')!;
 return hidden.outer==='A'?Number(hidden.middle)*centre:Number(hidden.outer)/centre;
};

describe('p3 unresolved visual relationships',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toBe('p3-unresolved-visual-relationships');
  expect(RAG_PATTERN.canonicalPatternId).toBe(RAG_PATTERN.id);
  expect(RAG_PATTERN.level).toBe(3);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('solves every variant from visible givens across seeds',()=>{
  const seen=new Set<string>();
  for(let seed=0;seed<60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   if(q.display){
    seen.add('digits');
    const [a,b]=solveSubtraction(q.display);
    expect(JSON.parse(q.answer)).toEqual([a,b]);
    expect(correctAnswer(q,JSON.stringify([a,b]))).toBe(true);
    expect(correctAnswer(q,JSON.stringify([b,a==='9'?'8':String(Number(a)+1)]))).toBe(false);
   }else{
    seen.add(String(q.picture&&q.picture.type==='paper'&&q.picture.layout==='cards'&&q.picture.cards.some(c=>c.value.includes('outer A'))?'outer':'middle'));
    const solved=solveTarget(q);
    expect(Number(q.answer)).toBe(solved);
    expect(correctAnswer(q,String(solved))).toBe(true);
    expect(correctAnswer(q,String(solved+1))).toBe(false);
   }
   expect(q.workedSteps!.length).toBeGreaterThan(1);
   expect(q.hint.length).toBeGreaterThan(0);
  }
  expect([...seen].sort()).toEqual(['digits','middle','outer']);
 });
 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  expect(new Set(Array.from({length:30},(_,i)=>makeRagQuestion(1,i).key)).size).toBe(30);
  expect(new Set(Array.from({length:30},(_,i)=>JSON.stringify([makeRagQuestion(1,i).display,makeRagQuestion(1,i).picture]))).size).toBeGreaterThan(20);
 });
});
