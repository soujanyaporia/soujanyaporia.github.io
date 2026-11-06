import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragRepeatedEqualVolumeUnits';

const ceilDiv = (a: number, b: number) => Math.floor((a + b - 1) / b);

/** Solve from the visible wording only; never read q.answer. */
function solve(q: {context?: string[]; prompt: string}): {kind: string; value: number; exactNeedsRounding?: boolean} {
 const text = [...(q.context ?? []), q.prompt].join(' ');
 const dims = /(\d+) cm by (\d+) cm by (\d+) cm/.exec(text);
 if (/loose cubes/.test(text)) {
 const total = Number(/(\d+) loose cubes/.exec(text)![1]);
 const need = Number(dims![1]) * Number(dims![2]) * Number(dims![3]);
 return {kind: 'cubes', value: Math.floor(total / need)};
 }
 if (/poured into bottles/.test(text)) {
 const V = Number(dims![1]) * Number(dims![2]) * Number(dims![3]);
 const f = /(\d+)\/(\d+) of the water/.exec(text)!;
 const c = Number(/holds (\d+) ml/.exec(text)![1]);
 expect((V * Number(f[1])) % Number(f[2])).toBe(0);
 return {kind: 'transfer', value: Math.floor((V * Number(f[1]) / Number(f[2])) / c)};
 }
 if (/litres of soup/.test(text)) {
 const T = Number(/(\d+) litres of soup/.exec(text)![1]);
 const f = /(\d+)\/(\d+) litre/.exec(text)!;
 const p = Number(f[1]), qd = Number(f[2]);
 return {kind: 'litres', value: ceilDiv(T * qd, p), exactNeedsRounding: (T * qd) % p !== 0};
 }
 const V = Number(dims![1]) * Number(dims![2]) * Number(dims![3]);
 const part = /It is (\d+)\/(\d+) full/.exec(text);
 const c = Number(/scoop holds (\d+) ml/.exec(text)![1]);
 let remaining = V;
 if (part) {
 expect((V * (Number(part[2]) - Number(part[1]))) % Number(part[2])).toBe(0);
 remaining = V * (Number(part[2]) - Number(part[1])) / Number(part[2]);
 } else expect(text).toContain('It is empty.');
 return {kind: 'tank', value: ceilDiv(remaining, c)};
}

describe('repeated equal-volume units', () => {
 it('declares valid metadata', () => {
 expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 expect(RAG_PATTERN.level).toBe(6);
 expect(RAG_PATTERN.canonicalPatternId).toBe('p6-repeated-equal-volume-units');
 expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches an independent solution of the visible givens across seeds and indexes', () => {
 const kinds = new Set<string>();
 for (let seed = 1; seed <= 60; seed++) for (let index = 0; index < 8; index++) {
 const q = makeRagQuestion(seed, index);
 const s = solve(q);
 kinds.add(s.kind);
 expect(Number(q.answer)).toBe(s.value);
 expect(Number.isInteger(s.value)).toBe(true);
 expect(s.value).toBeGreaterThanOrEqual(1);
 if (s.kind === 'litres') expect(s.exactNeedsRounding).toBe(true);
 if (s.kind === 'transfer' || s.kind === 'tank') expect(s.value).toBeGreaterThanOrEqual(2);
 }
 expect([...kinds].sort()).toEqual(['cubes', 'litres', 'tank', 'transfer']);
 });

 it('is deterministic and supplies hints, worked steps and no picture', () => {
 for (let seed = 1; seed <= 20; seed++) for (let index = 0; index < 4; index++) {
 const a = makeRagQuestion(seed, index), b = makeRagQuestion(seed, index);
 expect(a).toEqual(b);
 expect(a.hint.length).toBeGreaterThan(10);
 expect(a.workedSteps!.length).toBeGreaterThanOrEqual(3 - (/It is empty|full of water/.test(a.context!.join(' ')) ? 1 : 0));
 expect(a.explanation.length).toBeGreaterThan(10);
 expect(a.picture).toBeUndefined();
 expect(a.unit).toBeTruthy();
 }
 });

 it('varies the questions between seeds', () => {
 const prompts = new Set<string>();
 for (let seed = 1; seed <= 30; seed++) {const q = makeRagQuestion(seed, 0); prompts.add(JSON.stringify([q.context, q.prompt]));}
 expect(prompts.size).toBeGreaterThan(20);
 });
});
