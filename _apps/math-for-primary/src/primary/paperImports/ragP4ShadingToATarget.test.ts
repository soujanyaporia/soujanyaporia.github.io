import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4ShadingToATarget';

type Counts = {total:number; filled:number};
type Parts = {current:Counts; refs:Counts[]; triangle:boolean};
function readPicture(q: Question): Parts {
  const p = q.picture;
  if (p?.type==='nanyang-p4' && p.layout==='fraction-sets') {
    expect(p.sets).toHaveLength(1);
    const {total,shadedIndices} = p.sets[0];
    const marked = new Set(shadedIndices);
    expect(marked.size).toBe(shadedIndices.length);
    for (const i of marked) expect(Number.isInteger(i) && i>=0 && i<total).toBe(true);
    return {current:{total,filled:marked.size}, refs:[], triangle:false};
  }
  if (p?.type!=='batch9-early' || p.layout!=='area-fraction') throw Error('Missing tile diagram');
  // Read the polygons from left to right. A gap starts a new mat.
  const polygons = p.pieces.map(piece => {
    const xs = piece.points.map(([x])=>x), ys = piece.points.map(([,y])=>y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(8.5);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(3);
    const area = Math.abs(piece.points.reduce((sum,[x,y],i,pts) => {
      const [u,v] = pts[(i+1)%pts.length]; return sum+x*v-y*u;
    },0))/2;
    return {left:Math.min(...xs), right:Math.max(...xs), area, shaded:piece.shaded};
  }).sort((a,b)=>a.left-b.left);
  const groups: (Counts & {right:number; area:number})[] = [];
  for (const tile of polygons) {
    let g = groups.at(-1);
    if (!g || tile.left > g.right+1e-8) {
      g = {right:tile.right, area:tile.area, total:0, filled:0};
      groups.push(g);
    }
    expect(tile.area).toBeGreaterThan(0);
    expect(tile.area).toBeCloseTo(g.area,8);
    g.right = Math.max(g.right,tile.right);
    g.total++; if (tile.shaded) g.filled++;
  }
  const current = groups.pop();
  if (!current) throw Error('Empty picture');
  return {current, refs:groups, triangle:p.pieces.every(v=>v.points.length===3)};
}

test('the visible target can be reached by exactly one additional count', () => {
  const forms = new Set<string>();
  for (let seed=-5; seed<19; seed++) for (let index=0; index<15; index++) {
    const q = makeRagQuestion(seed,index);
    const {current:{total,filled}, refs, triangle} = readPicture(q);
    const text = [q.prompt,...(q.context??[])].join(' ');
    const blankGoal = text.includes('to be unshaded');
    const sum = text.includes('sum of the shaded fractions');
    let n: number, d: number;
    if (sum) {
      expect(refs).toHaveLength(2);
      const [left,mid] = refs;
      expect(left.total).not.toBe(mid.total);
      n = left.filled*mid.total + mid.filled*left.total;
      d = left.total*mid.total;
      forms.add('sum');
    } else {
      expect(refs).toHaveLength(0);
      const fraction = /(\d+)\/(\d+)/.exec(q.prompt);
      if (!fraction) throw Error('Missing target fraction');
      n = Number(fraction[1]); d = Number(fraction[2]);
      if (triangle) {
        expect(text).toContain(`${total} equal triangles`);
        expect(q.unit).toBe('triangles');
      }
      forms.add(blankGoal?'blank target':q.choices?'set':triangle?'triangle patch':'square patch');
    }
    expect(filled).toBeGreaterThan(0);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(d);
    // Try shading k blank pieces; compare the resulting fraction exactly.
    const solutions: number[] = [];
    for (let k=0; k<=total-filled; k++) {
      const shaded = filled+k;
      if ((blankGoal?total-shaded:shaded)*d === total*n) solutions.push(k);
    }
    expect(solutions).toHaveLength(1);
    const [extra] = solutions;
    expect(extra).toBeGreaterThan(0);
    expect(q.answer).toBe(String(extra));
    if (q.choices) {
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toHaveLength(4);
      expect(q.choices.filter(c=>Number(c)===extra)).toHaveLength(1);
    }
    expect(q.fractionBuilder).toBeUndefined();
    expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
  }
  expect([...forms].sort()).toEqual(['blank target','set','square patch','sum','triangle patch']);
});

test('the same seed and index reproduce the picture, options and solution', () => {
  for (const seed of [0,91,-37]) for (let i=0; i<15; i++)
    expect(makeRagQuestion(seed,i)).toEqual(makeRagQuestion(seed,i));
});
