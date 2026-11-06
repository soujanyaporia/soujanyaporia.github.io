import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragMeasurementsLinkedByDifference';

// Solve the comparison sentences in either direction. Only the story is input;
// answer fields, hints and worked steps are not available to this solver.
function solve(lines: string[]) {
  const anchor = /^The (.+?) (?:weighs|is) (\d+) (g|cm)(?: tall| long)?\.$/.exec(lines[0] ?? '');
  if (!anchor) throw Error('Missing starting measurement');
  const unit = anchor[3];
  const values = new Map<string, number>([[anchor[1], Number(anchor[2])]]);
  const edges = lines.slice(1).map(line => {
    const m = /^The (.+?) is (\d+) (cm|g) (longer|shorter|heavier|lighter) than the (.+?)\.$/.exec(line);
    if (!m || m[3] !== unit) throw Error(`Unreadable comparison: ${line}`);
    expect(Number(m[2])).toBeGreaterThan(0);
    const delta = Number(m[2]) * (m[4] === 'lighter' || m[4] === 'shorter' ? -1 : 1);
    return { left: m[1], right: m[5], delta };
  });
  for (let pass = 0; pass < edges.length; pass++) {
    for (const {left, right, delta} of edges) {
      const a = values.get(left), b = values.get(right);
      if (a !== undefined) values.set(right, a - delta);
      else if (b !== undefined) values.set(left, b + delta);
    }
  }
  function get(name: string) {
    const n = values.get(name);
    if (n === undefined) throw Error(`No measurement for ${name}`);
    expect(Number.isInteger(n) && n > 0 && n <= 999).toBe(true);
    return n;
  }
  expect(get(anchor[1])).toBe(Number(anchor[2]));
  for (const e of edges) expect(get(e.left) - get(e.right)).toBe(e.delta);
  return { get, unit, edges, anchor: anchor[1] };
}

function checkWorking(q: Question, unit: string) {
  expect(q.workedSteps).toHaveLength(2);
  for (const step of q.workedSteps ?? []) {
    const eq = /^(\d+) (cm|g) ([+−]) (\d+) (cm|g) = (\d+) (cm|g)$/.exec(step.equation ?? '');
    if (!eq) throw Error(`Missing measurement calculation: ${step.text}`);
    expect([eq[2], eq[5], eq[7]]).toEqual([unit, unit, unit]);
    expect(eq[3] === '+' ? Number(eq[1]) + Number(eq[4]) : Number(eq[1]) - Number(eq[4])).toBe(Number(eq[6]));
  }
}

it('solves the requested measurements from the visible comparisons and checks the response controls', () => {
  const modes = new Set<string>();
  const stories = new Set<string>();
  for (const seed of [-11, 0, 13, 50, 87, 1001]) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.picture).toBeUndefined();
      const lines = q.context ?? [];
      stories.add(lines.join(' '));
      const { get, unit, edges, anchor } = solve(lines);
      checkWorking(q, unit);
      if (q.prompt.startsWith('Find the masses')) {
        modes.add('shared starting mass');
        expect(q.prompt).toContain('the yellow bag and the red bag');
        expect(edges).toHaveLength(2);
        expect(edges.every(e => e.left === anchor || e.right === anchor)).toBe(true);
        const spec = q.structuredResponse;
        if (!spec || spec.kind !== 'number-pair') throw Error('Expected two labelled entries');
        expect([spec.firstLabel, spec.secondLabel]).toEqual(['(a) Yellow bag (g)', '(b) Red bag (g)']);
        const small = get('yellow bag'), large = get('red bag');
        expect(small).toBeLessThan(get(anchor));
        expect(large).toBeGreaterThan(get(anchor));
        const entries = [String(small), String(large)];
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(entries))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([entries[1], entries[0]]))).toBe(false);
      } else {
        const target = /^(?:How (?:long|tall) is|What is the mass of) the (.+?)\?/.exec(q.prompt)?.[1];
        if (!target) throw Error('Missing target');
        const value = get(target);
        if (q.choices) {
          modes.add('shorter wording');
          expect(lines[1]).toContain('shorter than');
          expect(value).toBeGreaterThan(get(anchor));
          const expected = `${value} ${unit}`;
          expect(q.answer).toBe(expected);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(expected);
          expect(q.choices.every(c => /^[1-9]\d* cm$/.test(c))).toBe(true);
        } else {
          expect(q.unit).toBe(unit);
          expect(q.answer).toBe(String(value));
          if (edges.length === 1) {
            modes.add('longer wording');
            expect(lines[1]).toContain('longer than');
            expect(value).toBeGreaterThan(get(anchor));
          } else {
            modes.add('successive shortfalls');
            expect(edges).toHaveLength(2);
            expect(edges.some(e => [e.left, e.right].includes(target) && [e.left, e.right].includes(anchor))).toBe(false);
            expect(get(anchor)).toBeGreaterThan(get('yellow bag'));
            expect(get('yellow bag')).toBeGreaterThan(value);
            expect(q.workedSteps?.[1].equation).toMatch(new RegExp(`^${get('yellow bag')} g − .+ = ${value} g$`));
          }
        }
      }
    }
  }
  expect(modes.size).toBe(4);
  expect(stories.size).toBeGreaterThan(20);
});
