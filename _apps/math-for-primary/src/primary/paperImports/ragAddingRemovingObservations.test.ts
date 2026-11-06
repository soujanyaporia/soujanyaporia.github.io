import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragAddingRemovingObservations';

// Only pupil-visible text is accepted by the reader. Answers, keys, hints,
// worked steps and generation parameters are unavailable to the solver.
type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Givens =
  | {kind: 'added-score'; count: number; before: number; after: number; maximum: number}
  | {kind: 'new-mass-average'; count: number; before: number; added: number}
  | {kind: 'removed-group'; removed: number; before: number; removedMean: number; after: number; maximum: number}
  | {kind: 'next-time'; count: number; comparisonCount: number; times: number[]; decrease: number};

function match(text: string, pattern: RegExp): RegExpMatchArray {
  const result = text.match(pattern);
  if (!result) throw new Error(`Missing visible given matching ${pattern}`);
  return result;
}

function readVisible(q: VisibleQuestion): Givens {
  const text = (q.context ?? []).join(' ');
  if (text.includes('word game')) {
    if (!q.prompt.includes('extra round')) throw new Error('Missing added-score task');
    return {
      kind: 'added-score',
      count: Number(match(text, /plays (\d+) rounds/)[1]),
      before: Number(match(text, /for these rounds is (\d+(?:\.\d+)?) points/)[1]),
      after: Number(match(text, /for all the rounds is (\d+(?:\.\d+)?) points/)[1]),
      maximum: Number(match(text, /maximum score of (\d+) points/)[1]),
    };
  }
  if (text.includes('parcels')) {
    if (!q.prompt.includes('average mass')) throw new Error('Missing new-average task');
    const original = match(text, /has (\d+) parcels with an average mass of (\d+(?:\.\d+)?) kg/);
    return {
      kind: 'new-mass-average',
      count: Number(original[1]),
      before: Number(original[2]),
      added: Number(match(text, /One more parcel, with a mass of (\d+(?:\.\d+)?) kg/)[1]),
    };
  }
  if (text.includes('quiz')) {
    if (!q.prompt.includes('(a)') || !q.prompt.includes('(b)')) throw new Error('Linked tasks are incomplete');
    return {
      kind: 'removed-group',
      removed: Number(match(text, /results of (\d+) pupils/)[1]),
      before: Number(match(text, /class average is (\d+(?:\.\d+)?) marks/)[1]),
      removedMean: Number(match(text, /whose average is (\d+(?:\.\d+)?) marks/)[1]),
      after: Number(match(text, /remaining pupils is then (\d+(?:\.\d+)?) marks/)[1]),
      maximum: Number(match(text, /marked out of (\d+)/)[1]),
    };
  }
  if (text.includes('Her times, in seconds')) {
    if (!q.prompt.includes('next run')) throw new Error('Missing next-time task');
    return {
      kind: 'next-time',
      count: Number(match(text, /route (\d+) times/)[1]),
      comparisonCount: Number(match(text, /average for these (\d+) runs/)[1]),
      times: match(text, /Her times, in seconds, are ([0-9, ]+)\./)[1].split(',').map(value => Number(value.trim())),
      decrease: Number(match(text, /exactly (\d+(?:\.\d+)?) seconds less/)[1]),
    };
  }
  throw new Error('Unrecognised visible question');
}

function independentlySolve(g: Givens): number[] {
  switch (g.kind) {
    case 'added-score':
      // Balance deviations about the new average, rather than using the
      // implementation's subtraction of two generated totals.
      return [g.after + g.count * (g.after - g.before)];
    case 'new-mass-average':
      // Spread the added parcel's deviation from the old mean over all parcels.
      return [g.before + (g.added - g.before) / (g.count + 1)];
    case 'removed-group': {
      // Search possible counts against the original and remaining totals.
      // No multiplier or hidden class size is used.
      const possible: number[] = [];
      for (let pupils = g.removed + 1; pupils <= 200; pupils += 1) {
        const originalTotal = pupils * g.before;
        const remainingTotal = (pupils - g.removed) * g.after;
        if (originalTotal - g.removed * g.removedMean === remainingTotal) possible.push(pupils);
      }
      if (possible.length !== 1) throw new Error('Original count is not uniquely determined');
      return [g.removed * g.removedMean, possible[0]];
    }
    case 'next-time': {
      if (g.times.length !== g.count || g.comparisonCount !== g.count) throw new Error('Incomplete time list');
      const total = g.times.reduce((sum, value) => sum + value, 0);
      const originalMean = total / g.times.length;
      const desiredMean = originalMean - g.decrease;
      const possible: number[] = [];
      // Search half-second readings and recompute the enlarged mean directly.
      for (let halfSeconds = 1; halfSeconds <= 200; halfSeconds += 1) {
        const candidate = halfSeconds / 2;
        if (Math.abs((total + candidate) / (g.times.length + 1) - desiredMean) < 1e-10) {
          possible.push(candidate);
        }
      }
      if (possible.length !== 1) throw new Error('Next time is not uniquely determined');
      return possible;
    }
  }
}

const seeds = [-2147483648, -41, -1, 0, ...Array.from({length: 80}, (_, i) => i + 1), 2147483647];

function visible(q: Question): VisibleQuestion {
  return {prompt: q.prompt, context: q.context};
}

function removalQuestion(seed: number): Question {
  for (let index = 0; index < 4; index += 1) {
    const q = makeRagQuestion(seed, index);
    if (readVisible(visible(q)).kind === 'removed-group') return q;
  }
  throw new Error('Missing removal variant');
}

describe('adding and removing observations candidate', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const seen = new Set<Givens['kind']>();
    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const q = makeRagQuestion(seed, index);
        const g = readVisible(visible(q));
        const answers = independentlySolve(g);
        seen.add(g.kind);
        expect(answers.every(Number.isFinite)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect((q.workedSteps ?? []).length).toBeGreaterThanOrEqual(4);
        expect(q.workedSteps?.every(step => step.text.length > 0 && Boolean(step.equation))).toBe(true);
        expect(q.picture).toBeUndefined();

        if (g.kind === 'removed-group') {
          expect(JSON.parse(q.answer)).toEqual(answers.map(String));
          expect(q.structuredResponse?.kind).toBe('number-fields');
          expect(q.choices).toBeUndefined();
          expect(g.removedMean).toBeGreaterThanOrEqual(0);
          expect(g.removedMean).toBeLessThan(g.before);
          expect(g.before).toBeLessThan(g.after);
          expect(g.after).toBeLessThanOrEqual(g.maximum);
          expect(Number.isInteger(answers[1])).toBe(true);
          expect(answers[1]).toBeGreaterThan(g.removed);
          expect(answers[1]).toBeGreaterThanOrEqual(20);
          expect(answers[1]).toBeLessThanOrEqual(45);
          // Equal integer scores within each subgroup provide a concrete
          // feasible set of pupil marks satisfying all visible averages.
          expect(Number.isInteger(g.removedMean)).toBe(true);
          expect(Number.isInteger(g.after)).toBe(true);
          expect((answers[0] + (answers[1] - g.removed) * g.after) / answers[1]).toBe(g.before);
          continue;
        }

        expect(q.structuredResponse).toBeUndefined();
        expect(Number(q.answer)).toBeCloseTo(answers[0], 10);
        expect(answers[0]).toBeGreaterThan(0);
        expect(Number.isInteger(g.count)).toBe(true);
        expect(g.count).toBeGreaterThan(1);

        if (g.kind === 'added-score') {
          expect(q.unit).toBe('points');
          expect(q.choices).toBeUndefined();
          expect(g.before).toBeGreaterThanOrEqual(0);
          expect(g.before).toBeLessThanOrEqual(g.maximum);
          expect(g.after).toBeGreaterThanOrEqual(0);
          expect(g.after).toBeLessThanOrEqual(g.maximum);
          expect(answers[0]).toBeLessThanOrEqual(g.maximum);
          expect(Number.isInteger(answers[0])).toBe(true);
          expect((g.count * g.before + answers[0]) / (g.count + 1)).toBe(g.after);
        } else if (g.kind === 'new-mass-average') {
          expect(q.unit).toBe('kg');
          expect(g.added).toBeGreaterThan(0);
          expect(g.added).toBeLessThan(g.before);
          expect(answers[0]).toBeGreaterThan(g.added);
          expect(answers[0]).toBeLessThan(g.before);
          expect(q.choices).toHaveLength(4);
          const choices = (q.choices ?? []).map(Number);
          expect(choices.every(value => Number.isFinite(value) && value > 0)).toBe(true);
          expect(new Set(choices).size).toBe(4);
          expect(choices.filter(value => Math.abs(value - answers[0]) < 1e-10)).toHaveLength(1);
        } else {
          expect(q.unit).toBe('seconds');
          expect(q.choices).toBeUndefined();
          expect(g.times).toHaveLength(g.count);
          expect(g.comparisonCount).toBe(g.count);
          expect(g.times.every(value => Number.isInteger(value) && value > 0)).toBe(true);
          expect(g.decrease).toBeGreaterThan(0);
          const total = g.times.reduce((sum, value) => sum + value, 0);
          const mean = total / g.count;
          expect(answers[0]).toBeLessThan(mean);
          expect(mean - (total + answers[0]) / (g.count + 1)).toBeCloseTo(g.decrease, 10);
        }
      }
    }
    expect([...seen].sort()).toEqual(['added-score', 'new-mass-average', 'next-time', 'removed-group']);
  });

  it('preserves and grades both linked removal responses independently', () => {
    for (const seed of [-7, 0, 91]) {
      const q = removalQuestion(seed);
      const answers = independentlySolve(readVisible(visible(q))).map(String);
      const spec = q.structuredResponse;
      if (!spec || spec.kind !== 'number-fields') throw new Error('Missing supported linked response');
      expect(spec.fields).toHaveLength(2);
      expect(spec.fields[0].label).toContain('marks');
      expect(spec.fields[1].label).toContain('pupils');
      const correct = JSON.stringify(answers);
      expect(structuredResponseReady(spec, correct)).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, correct)).toBe(true);
      for (let field = 0; field < 2; field += 1) {
        const wrong = [...answers];
        wrong[field] = String(Number(wrong[field]) + 1);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
      }
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...answers].reverse()))).toBe(false);
      expect(structuredResponseReady(spec, JSON.stringify([answers[0]]))).toBe(false);
    }
  });

  it('is deterministic and reaches all four variants in four consecutive indices', () => {
    for (const seed of [-17, 0, 1, 1024]) {
      const kinds = new Set<Givens['kind']>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index += 1) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(readVisible(visible(q)).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(4);
      expect(keys.size).toBe(4);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  it('varies mathematical givens and includes increases and decreases in the added-score variant', () => {
    const signatures = new Map<Givens['kind'], Set<string>>();
    const directions = new Set<number>();
    const timeDecreases = new Set<number>();
    let fractionalMassAverage = false;
    for (const seed of seeds) {
      for (let index = 0; index < 4; index += 1) {
        const g = readVisible(visible(makeRagQuestion(seed, index)));
        const values = signatures.get(g.kind) ?? new Set<string>();
        values.add(JSON.stringify(g));
        signatures.set(g.kind, values);
        if (g.kind === 'added-score') directions.add(Math.sign(g.after - g.before));
        if (g.kind === 'next-time') timeDecreases.add(g.decrease);
        if (g.kind === 'new-mass-average' && !Number.isInteger(independentlySolve(g)[0])) fractionalMassAverage = true;
      }
    }
    expect(signatures.size).toBe(4);
    for (const values of signatures.values()) expect(values.size).toBeGreaterThan(20);
    expect([...directions].sort()).toEqual([-1, 1]);
    expect(timeDecreases.size).toBeGreaterThan(1);
    expect(fractionalMassAverage).toBe(true);
  });

  it('declares the requested level, family and supported curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-average-adding-removing-observations');
    const supported = new Set(['P6.S.AVG.01', 'P6.S.AVG.02']);
    expect(RAG_PATTERN.skillIds.every(id => supported.has(id))).toBe(true);
  });
});
