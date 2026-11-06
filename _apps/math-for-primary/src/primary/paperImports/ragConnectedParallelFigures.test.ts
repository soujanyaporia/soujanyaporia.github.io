import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragConnectedParallelFigures';

const CURRICULUM_IDS = ['P6.S.SHAPE.01','P5.S.SHAPE.02','P5.S.ANGLE.01','P5.S.SHAPE.01','P5.S.SHAPE.03'];
const rad = (d: number) => d * Math.PI / 180;
type V = [number, number];
const ang = (u: V, v: V) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))))) * 180 / Math.PI;
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];

function given(text: string, re: RegExp): number {
 const m = re.exec(text);
 if (!m) throw new Error(`Missing given: ${re}`);
 return Number(m[1]);
}

// Independent solver: builds coordinates from the visible givens, checks they reproduce
// the stated angles, then measures the angle that the question asks for.
function solve(q: {prompt: string; context?: string[]}): {kind: string; value: number} {
 const text = [...(q.context ?? []), q.prompt].join(' ');
 if (text.includes('Find angle YXT')) {
 const a = given(text, /Angle WXZ is (\d+)°/), b = given(text, /Angle ZYX is (\d+)°/);
 const t = Math.sin(rad(b)) / Math.sin(rad(a + b));
 const Z: V = [0, 0], Y: V = [1, 0], X: V = [t * Math.cos(rad(a)), t * Math.sin(rad(a))];
 const W: V = [X[0] + Z[0] - Y[0], X[1] + Z[1] - Y[1]], T: V = [2 * X[0], 2 * X[1]];
 expect(ang(sub(W, X), sub(Z, X))).toBeCloseTo(a, 6);
 expect(ang(sub(Z, Y), sub(X, Y))).toBeCloseTo(b, 6);
 return {kind: 'A', value: ang(sub(Y, X), sub(T, X))};
 }
 if (text.includes('Find the sum of angle KNM and angle NMP')) {
 const x = given(text, /Angle LKN is (\d+)°/);
 const L: V = [0, 0], M: V = [4, 0], K: V = [-2 * Math.cos(rad(x)), 2 * Math.sin(rad(x))];
 const N: V = [K[0] + 4, K[1]], P: V = [8, 0];
 expect(ang(sub(L, K), sub(N, K))).toBeCloseTo(x, 6);
 return {kind: 'B', value: ang(sub(K, N), sub(M, N)) + ang(sub(N, M), sub(P, M))};
 }
 if (text.includes('Find angle EHR')) {
 const a = given(text, /Angle HEF is (\d+)°/), c = given(text, /Angle RHG is (\d+)°/);
 const phi = 180 - a;
 const H: V = [0, 0], G: V = [5, 0], E: V = [3 * Math.cos(rad(phi)), 3 * Math.sin(rad(phi))];
 const F: V = [E[0] + 4, E[1]], R: V = [2 * Math.cos(rad(c)), 2 * Math.sin(rad(c))];
 expect(ang(sub(H, E), sub(F, E))).toBeCloseTo(a, 6);
 expect(ang(sub(R, H), sub(G, H))).toBeCloseTo(c, 6);
 return {kind: 'C', value: ang(sub(E, H), sub(R, H))};
 }
 throw new Error('Unrecognised question');
}

describe('p6-connected-parallel-figures', () => {
 it('declares metadata that matches the packet', () => {
 expect(RAG_PATTERN.level).toBe(6);
 expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
 expect(RAG_PATTERN.canonicalPatternId).toBe('p6-connected-parallel-sided-figures');
 for (const id of RAG_PATTERN.skillIds) expect(CURRICULUM_IDS).toContain(id);
 });

 it('answers match an independent coordinate solution from the visible givens', () => {
 for (let seed = 1; seed <= 40; seed++) {
 for (let index = 0; index < 9; index++) {
 const q = makeRagQuestion(seed, index);
 const solved = solve(q);
 expect(Number.isInteger(Number(q.answer))).toBe(true);
 expect(Math.abs(solved.value - Number(q.answer))).toBeLessThan(1e-6);
 }
 }
 });

 it('uses all three variants and keeps givens and answers in valid ranges', () => {
 const kinds = new Set<string>();
 for (let seed = 1; seed <= 30; seed++) {
 for (let index = 0; index < 9; index++) {
 const q = makeRagQuestion(seed, index);
 const {kind} = solve(q);
 kinds.add(kind);
 const text = [...(q.context ?? []), q.prompt].join(' ');
 const answer = Number(q.answer);
 expect(answer).toBeGreaterThan(0);
 expect(answer).toBeLessThan(180 + (kind === 'B' ? 1 : 0));
 if (kind === 'A') {
 const a = given(text, /Angle WXZ is (\d+)°/), b = given(text, /Angle ZYX is (\d+)°/);
 expect(a + b).toBeLessThan(180);
 expect(answer).toBe(a + b);
 }
 if (kind === 'B') {
 const x = given(text, /Angle LKN is (\d+)°/);
 expect(x).toBeGreaterThan(90);
 expect(x).toBeLessThan(180);
 }
 if (kind === 'C') {
 const a = given(text, /Angle HEF is (\d+)°/), c = given(text, /Angle RHG is (\d+)°/);
 expect(c).toBeGreaterThan(0);
 expect(c).toBeLessThan(180 - a);
 expect(answer).toBeGreaterThan(0);
 }
 }
 }
 expect([...kinds].sort()).toEqual(['A', 'B', 'C']);
 });

 it('is deterministic and provides unit, hint, explanation and worked steps', () => {
 const first = makeRagQuestion(7, 3), again = makeRagQuestion(7, 3);
 expect(first).toEqual(again);
 const keys = new Set<string>();
 for (let index = 0; index < 12; index++) {
 const q = makeRagQuestion(11, index);
 keys.add(q.key);
 expect(q.unit).toBe('°');
 expect(q.hint.length).toBeGreaterThan(10);
 expect(q.explanation).toContain(q.answer);
 expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
 expect(q.workedSteps?.[q.workedSteps.length - 1].equation).toContain(q.answer);
 expect(JSON.stringify(q)).not.toMatch(/sgexam|Nanyang|Methodist|Anglo/i);
 }
 expect(keys.size).toBe(12);
 });
});
