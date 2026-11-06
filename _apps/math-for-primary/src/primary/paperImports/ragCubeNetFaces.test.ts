import {describe,expect,it} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragCubeNetFaces';

/** Independent solver: reads only the visible text, builds the net on a grid and rolls a cube over it. */
function parseNet(context:string[]):Map<string,string>{
 const rowLine=context.find(l=>l.includes('From left to right'))!;
 const row=/marked (.+)\.$/.exec(rowLine)![1].split(', ');
 const above=/^The square marked (.+) is joined above the square marked (.+)\.$/.exec(context.find(l=>l.includes('joined above'))!)!;
 const below=/^The square marked (.+) is joined below the square marked (.+)\.$/.exec(context.find(l=>l.includes('joined below'))!)!;
 const cells=new Map<string,string>();
 row.forEach((label,c)=>cells.set(`1,${c}`,label));
 cells.set(`0,${row.indexOf(above[2])}`,above[1]);
 cells.set(`2,${row.indexOf(below[2])}`,below[1]);
 return cells;
}
type Cube={bottom:number;top:number;north:number;south:number;east:number;west:number};
function cubeIds(cells:Map<string,string>):Map<string,number>{
 const result=new Map<string,number>(),seen=new Set<string>();
 const rolls:[number,number,(s:Cube)=>Cube][]=[
  [0,1,s=>({...s,bottom:s.east,east:s.top,top:s.west,west:s.bottom})],
  [0,-1,s=>({...s,bottom:s.west,west:s.top,top:s.east,east:s.bottom})],
  [-1,0,s=>({...s,bottom:s.north,north:s.top,top:s.south,south:s.bottom})],
  [1,0,s=>({...s,bottom:s.south,south:s.top,top:s.north,north:s.bottom})],
 ];
 const visit=(r:number,c:number,s:Cube)=>{
  seen.add(`${r},${c}`);result.set(cells.get(`${r},${c}`)!,s.bottom);
  for(const [dr,dc,roll] of rolls){const k=`${r+dr},${c+dc}`;if(cells.has(k)&&!seen.has(k))visit(r+dr,c+dc,roll(s));}
 };
 visit(1,0,{bottom:0,top:1,north:2,south:3,east:4,west:5});
 return result;
}
function opposites(context:string[]){
 const ids=cubeIds(parseNet(context));
 expect(ids.size).toBe(6);
 expect(new Set(ids.values()).size).toBe(6);
 const byId=new Map([...ids].map(([label,id])=>[id,label]));
 return (label:string)=>byId.get(ids.get(label)!^1)!;
}

describe('cube net opposite faces generator',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-cube-net-opposite-faces');
  for(const id of RAG_PATTERN.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===id)).toBe(true);
 });

 it('is deterministic',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
 });

 it('answers match an independent cube-rolling solution across seeds and variants',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=120;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),opp=opposites(q.context!);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(correctAnswer(q,q.answer)).toBe(true);
   const single=/opposite face (\S+)\?$/.exec(q.prompt),design=/opposite the face marked "(.+?)" on the cube/.exec(q.prompt);
   if(single){
    seen.add('face');
    expect(q.answer).toBe(opp(single[1]));
    expect(correctAnswer(q,single[1])).toBe(false);
   }else if(q.prompt.includes('which two faces are opposite')){
    seen.add('pair');
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    const good=q.choices!.filter(c=>{const [a,b]=c.split(' and ');return opp(a)===b;});
    expect(good).toEqual([q.answer]);
    for(const c of q.choices!.filter(c=>c!==q.answer))expect(correctAnswer(q,c)).toBe(false);
   }else if(q.prompt.startsWith('Find the values of p, q and r')){
    seen.add('sum');
    const sum=Number(/add up to (\d+)/.exec(q.context!.join(' '))![1]);
    const expected=['p','q','r'].map(letter=>{const other=opp(letter);expect(other).toMatch(/^\d+$/);return String(sum-Number(other));});
    expect(JSON.parse(q.answer)).toEqual(expected);
    const numbers=[...parseNet(q.context!).values()].filter(v=>/^\d+$/.test(v)).map(Number);
    expect(numbers).toHaveLength(3);
    expect(new Set([...numbers,...expected.map(Number)]).size).toBe(6);
    expect(expected.every(v=>Number(v)>0)).toBe(true);
    expect(q.structuredResponse?.kind).toBe('number-fields');
    expect(correctAnswer(q,JSON.stringify([expected[0],expected[1],String(Number(expected[2])+1)]))).toBe(false);
   }else if(design){
    seen.add('design');
    expect(design[1]).toBe('?');
    expect(q.answer).toBe(opp('?'));
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain(q.answer);
    expect(q.choices).not.toContain('?');
    for(const c of q.choices!.filter(c=>c!==q.answer))expect(correctAnswer(q,c)).toBe(false);
   }else throw new Error(`Unrecognised prompt ${q.prompt}`);
  }
  expect([...seen].sort()).toEqual(['design','face','pair','sum']);
 });

 it('varies the net layout across seeds',()=>{
  const layouts=new Set<string>();
  for(let seed=1;seed<=60;seed++){
   const cells=parseNet(makeRagQuestion(seed,0).context!);
   layouts.add([...cells.keys()].filter(k=>!k.startsWith('1,')).sort().join('|'));
  }
  expect(layouts.size).toBeGreaterThan(5);
 });
});
