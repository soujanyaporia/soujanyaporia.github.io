import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragFractionsFromLabelledRepresentations';

type Point = [number,number];
function twiceArea(ps:Point[]) {
  return Math.abs(ps.reduce((s,[x,y],i)=>{
    const [u,v]=ps[(i+1)%ps.length];
    return s+x*v-y*u;
  },0));
}

// Search denominators in increasing order; the first exact match is reduced.
function nameFraction(value:number):string {
  for (let d=2;d<=12;d++) {
    const n=Math.round(value*d);
    if (n>0 && n<d && Math.abs(value*d-n)<1e-9) return `${n}/${d}`;
  }
  throw Error('Not a proper fraction with denominator at most 12');
}
function valueOf(s:string) {
  if (!/^\d+\/[1-9]\d*$/.test(s)) throw Error('Expected a fraction: '+s);
  const [n,d]=s.split('/').map(Number);
  return n/d;
}

function solveCard(q:Question) {
  const fig=q.picture;
  if (fig?.type!=='batch9-early' || fig.layout!=='area-fraction') throw Error('Missing tiled card');
  const tiles=new Map<string,Point[][]>();
  let whole=0,blue=0;
  for (const p of fig.pieces) {
    const x=Math.min(...p.points.map(v=>v[0])), y=Math.min(...p.points.map(v=>v[1]));
    expect(p.points.every(([u,v])=>(u===x || u===x+1) && (v===y || v===y+1))).toBe(true);
    const size=twiceArea(p.points);
    expect(size).toBe(p.kind==='square'?2:1);
    const key=[x,y].join(',');
    tiles.set(key,[...(tiles.get(key)??[]),p.points]);
    whole+=size;
    if (p.shaded) blue+=size;
  }
  for (const shapes of tiles.values()) {
    expect(shapes.reduce((a,s)=>a+twiceArea(s),0)).toBe(2);
    if (shapes.length===2) {
      const shared=shapes[0].filter(([x,y])=>shapes[1].some(([u,v])=>u===x && v===y));
      expect(shared).toHaveLength(2);
      expect(Math.abs(shared[0][0]-shared[1][0])).toBe(1);
      expect(Math.abs(shared[0][1]-shared[1][1])).toBe(1);
    }
  }
  expect(fig.pieces.some(p=>p.kind==='triangle' && p.shaded)).toBe(true);
  expect(q.context?.join(' ')).toContain(`${tiles.size} squares`);
  expect(whole).toBe(2*tiles.size);
  const white=q.prompt.includes('white');
  expect(white || q.prompt.includes('blue')).toBe(true);
  return nameFraction((white ? whole-blue : blue)/whole);
}

function solveLine(q:Question) {
  const fig=q.picture;
  if (fig?.type!=='batch11-upper') throw Error('Missing number line');
  const ticks=fig.marks.flatMap(m=>m.kind==='line' && m.x1===m.x2 && m.y1!==m.y2 ? [m.x1] : []).sort((a,b)=>a-b);
  expect(ticks).toHaveLength(5);
  const gap=ticks[1]-ticks[0];
  expect(gap).toBeGreaterThan(0);
  ticks.forEach((x,i)=>expect(x).toBe(ticks[0]+i*gap));
  const labels=new Map<number,string>();
  for (const m of fig.marks) if (m.kind==='text') {
    const tick=ticks.reduce((a,b)=>Math.abs(a-m.x)<Math.abs(b-m.x)?a:b);
    expect(Math.abs(tick-m.x)).toBeLessThan(gap/2);
    expect(labels.has(tick)).toBe(false);
    labels.set(tick,m.text);
  }
  expect(labels.size).toBe(5);
  const known=ticks.filter(x=>labels.get(x)!.includes('/'));
  expect(known).toHaveLength(3);
  const [a,,b]=known;
  const start=valueOf(labels.get(a)!), end=valueOf(labels.get(b)!);
  expect(start).toBeLessThan(end);
  const read=(x:number)=>start+(x-a)*(end-start)/(b-a);
  expect(read(known[1])).toBeCloseTo(valueOf(labels.get(known[1])!),10);
  return ['P','Q'].flatMap(name=>{
    const tick=ticks.find(x=>labels.get(x)===name);
    if (tick===undefined) throw Error('Missing '+name);
    return nameFraction(read(tick)).split('/');
  });
}

it('solves the printed colour or both named marks from their geometry',()=>{
  const modes=new Set<string>();
  const answers=new Map<string,Set<string>>();
  for(let seed=-5;seed<45;seed++) for(let index=0;index<6;index++) {
    const q=makeRagQuestion(seed,index);
    let mode:string, expected:string;
    if(q.picture?.type==='batch11-upper') {
      mode='line';
      const fields=solveLine(q);
      expected=JSON.stringify(fields);
      expect(q.structuredResponse).toEqual({kind:'number-fields',fields:['P numerator','P denominator','Q numerator','Q denominator'].map(label=>({label}))});
      expect(correctAnswer(q,JSON.stringify([...fields.slice(2),...fields.slice(0,2)]))).toBe(false);
      expect(correctAnswer(q,JSON.stringify(fields.map((s,i)=>i<2?String(2*Number(s)):s)))).toBe(false);
    } else {
      expected=solveCard(q);
      if(q.prompt.includes('white')) {
        mode='choice';
        expect(q.choices).toHaveLength(4);
        const values=q.choices!.map(valueOf);
        expect(new Set(values).size).toBe(4);
        expect(q.choices!.filter(s=>valueOf(s)===valueOf(expected))).toEqual([expected]);
      } else {
        mode='entry';
        expect(q.choices).toBeUndefined();
        expect(q.requireSimplified).toBe(true);
        const [n,d]=expected.split('/').map(Number);
        expect(correctAnswer(q,`${2*n}/${2*d}`)).toBe(false);
      }
    }
    expect(q.answer).toBe(expected);
    expect(correctAnswer(q,expected)).toBe(true);
    modes.add(mode);
    if(!answers.has(mode)) answers.set(mode,new Set());
    answers.get(mode)!.add(expected);
  }
  expect([...modes].sort()).toEqual(['choice','entry','line']);
  for(const distinct of answers.values()) expect(distinct.size).toBeGreaterThan(1);
});

it('replays the same seed and index and varies visible figures across indices',()=>{
  const seen=new Set<string>();
  for(let index=0;index<16;index++) {
    const q=makeRagQuestion(73,index);
    expect(makeRagQuestion(73,index)).toEqual(q);
    seen.add(JSON.stringify(q.picture));
  }
  expect(seen.size).toBeGreaterThan(1);
});
