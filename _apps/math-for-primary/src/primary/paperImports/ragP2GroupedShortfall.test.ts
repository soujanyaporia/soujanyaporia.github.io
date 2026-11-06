import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP2GroupedShortfall';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Solves from the visible context only, not from the stored answer.
function solve(context: string[]): number {
 const text = context.join(' ');
 const target = Number(/wants to give (\d+) /.exec(text)![1]);
 const m = /makes (\d+) .* every day from (\w+) to (\w+)\./.exec(text)!;
 const each = Number(m[1]);
 const days = DAYS.indexOf(m[3]) - DAYS.indexOf(m[2]) + 1;
 return target - each * days;
}

describe('p2 grouped shortfall generator',()=>{
 it('has valid metadata',()=>{
 expect(RAG_PATTERN.level).toBe(2);
 expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
 expect(RAG_PATTERN.canonicalPatternId).toBe('p2-grouped-stock-shortfall-against-target');
 expect(RAG_PATTERN.skillIds).toContain('P2.S.MD.01');
 });
 it('answer matches the independent solution across seeds',()=>{
 for (let seed = 1; seed <= 60; seed++) for (let index = 0; index < 4; index++) {
 const q = makeRagQuestion(seed, index);
 const expected = solve(q.context!);
 expect(Number(q.answer)).toBe(expected);
 expect(expected).toBeGreaterThan(0);
 expect(q.workedSteps!.length).toBe(3);
 expect(q.workedSteps![2].equation).toContain(`= ${expected}`);
 }
 });
 it('keeps givens within P2 bounds and varies',()=>{
 const prompts = new Set<string>();
 for (let seed = 1; seed <= 60; seed++) {
 const q = makeRagQuestion(seed);
 const target = Number(/give (\d+)/.exec(q.context![0])![1]);
 expect(target).toBeLessThanOrEqual(50);
 prompts.add(q.context!.join('|'));
 }
 expect(prompts.size).toBeGreaterThan(30);
 });
 it('is deterministic',()=>{
 expect(makeRagQuestion(7, 2)).toEqual(makeRagQuestion(7, 2));
 });
});
