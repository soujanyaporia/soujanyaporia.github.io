import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4CountMissingMirrorSquares';
import type { Question } from '../generate';

type XY = [number, number];
const keyOf = ([x,y]: XY) => x + ',' + y;

// Fold the centres of the drawn tiles over the drawn dashed line.
// This solver uses neither row-index reflection rules nor the generator's counts.
function readGrid(q: Question) {
  const pic = q.picture;
  if (!pic || pic.type !== 'batch11-upper') throw Error('Missing grid');
  const lines = pic.marks.filter(m=>m.kind==='line');
  const folds = lines.filter(m=>m.dashed);
  expect(folds).toHaveLength(1);
  const axis = folds[0];
  const vertical = lines.filter(m=>!m.dashed && m.x1===m.x2).sort((a,b)=>a.x1-b.x1);
  const left = vertical[0].x1, top = vertical[0].y1, bottom = vertical[0].y2;
  const side = vertical[1].x1-left, cols = vertical.length-1, rows = (bottom-top)/side;
  expect(Number.isInteger(rows) && side>0).toBe(true);
  const cells = new Map<string,XY>();
  for (let c=0;c<cols;c++) {
    expect(vertical[c+1].x1-vertical[c].x1).toBe(side);
    for (let r=0;r<rows;r++) {
      const centre: XY = [left+(c+0.5)*side,top+(r+0.5)*side];
      cells.set(keyOf(centre),centre);
    }
  }
  const ink = new Set<string>();
  for (const tile of pic.marks) {
    if (tile.kind !== 'path') continue;
    const m = /^M (\d+) (\d+) h (\d+) v (\d+) h -(\d+) Z$/.exec(tile.d);
    if (!m || !tile.fill || tile.fill==='white' || tile.fill==='none') throw Error('Unreadable shaded tile');
    const [x,y,w,h,back] = m.slice(1).map(Number);
    expect(w).toBe(h); expect(back).toBe(w);
    expect(w).toBeGreaterThan(0); expect(w).toBeLessThanOrEqual(side);
    const k = keyOf([x+w/2,y+h/2]);
    expect(cells.has(k) && !ink.has(k)).toBe(true);
    ink.add(k);
  }
  const dx=axis.x2-axis.x1, dy=axis.y2-axis.y1, norm=dx*dx+dy*dy;
  expect(norm).toBeGreaterThan(0);
  function reflected(k: string) {
    const [x,y] = cells.get(k)!;
    const t = ((x-axis.x1)*dx+(y-axis.y1)*dy)/norm;
    const image: XY = [2*(axis.x1+t*dx)-x,2*(axis.y1+t*dy)-y];
    const hit = [...cells.values()].find(([a,b])=>Math.abs(a-image[0])<1e-7 && Math.abs(b-image[1])<1e-7);
    if (!hit) throw Error('Fold misses the grid');
    return keyOf(hit);
  }
  const missing = new Set([...ink].map(reflected).filter(k=>!ink.has(k)));
  const symmetric = (s: Set<string>) => [...s].every(k=>s.has(reflected(k)));
  const positions = [...missing].map(k=>{
    const [x,y]=cells.get(k)!;
    return `row ${Math.floor((y-top)/side)+1}, column ${Math.floor((x-left)/side)+1}`;
  });
  return {ink, missing, symmetric, positions, horizontal:dy===0};
}

it('finds the minimum from the board and checks the choices and worked steps',()=>{
  const folds=new Set<boolean>(), counts=new Set<number>();
  for (let seed=-4;seed<=36;seed++) for (let index=0;index<4;index++) {
    const q=makeRagQuestion(seed,index);
    const {ink,missing,symmetric,positions,horizontal}=readGrid(q);
    const n=missing.size;
    expect(n).toBeGreaterThan(0);
    expect(symmetric(ink)).toBe(false);
    const completed=new Set([...ink,...missing]);
    expect(symmetric(completed)).toBe(true);
    for (const k of missing) {
      const short=new Set(completed); short.delete(k);
      expect(symmetric(short)).toBe(false);
    }
    expect(q.answer).toBe(String(n));
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices?.filter(s=>Number(s)===n)).toEqual([String(n)]);
    for (const p of positions) expect(q.workedSteps?.map(s=>s.text).join(' ')).toContain(p);
    folds.add(horizontal); counts.add(n);
  }
  expect(folds.size).toBe(2); expect(counts.size).toBeGreaterThan(2);
});

it('replays a question for the same seed and varies its visible board with the index',()=>{
  const boards=new Set<string>();
  for (let i=0;i<10;i++) {
    const q=makeRagQuestion(73,i);
    expect(makeRagQuestion(73,i)).toEqual(q);
    boards.add(JSON.stringify(q.picture));
  }
  expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73,0));
  expect(boards.size).toBeGreaterThan(6);
});
