import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragConstantRateConversion';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;
type Solution = {kind: 'output' | 'pay' | 'leakage'; answer: string};

// This solver can access only text and chart data shown to the pupil.
function solveVisible(q: Visible): Solution {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  if (q.picture?.type === 'bars' && q.picture.line) {
    const {labels, values} = q.picture;
    if (labels.length !== 4 || values.length !== labels.length || !labels.every(label => /^\d+$/.test(label))) {
      throw new Error('Expected four numerical time labels and four volumes');
    }
    const times = labels.map(Number);
    if (times[0] !== 0 || !values.every(value => Number.isInteger(value) && value > 0)) {
      throw new Error('Invalid starting time or volume');
    }
    const intervalRates = values.slice(1).map((value, i) => {
      const duration = times[i + 1] - times[i];
      if (duration <= 0) throw new Error('Time must increase');
      return (values[i] - value) / duration;
    });
    const rate = intervalRates[0];
    if (!Number.isInteger(rate) || rate <= 0 || !intervalRates.every(value => value === rate)) {
      throw new Error('The plotted data must show a positive constant leakage rate');
    }
    const lastTime = times[times.length - 1];
    const endMention = /after the (\d+)-minute reading/.exec(q.prompt);
    if (!endMention || Number(endMention[1]) !== lastTime) throw new Error('Wrong reference reading');
    // Count additional one-minute losses; do not count the elapsed graph interval.
    let left = values[values.length - 1];
    let additionalMinutes = 0;
    while (left > 0 && additionalMinutes <= 1000) {
      left -= rate;
      additionalMinutes++;
    }
    if (left !== 0 || additionalMinutes > 1000) throw new Error('Expected an exact whole-minute emptying time');
    return {kind: 'leakage', answer: JSON.stringify([String(rate), String(additionalMinutes)])};
  }

  const cycle = /one keyring every (\d+) minutes/.exec(text);
  if (cycle) {
    const duration = /finish in (\d+) hours/.exec(q.prompt);
    if (!duration) throw new Error('Missing working duration');
    const period = Number(cycle[1]);
    const available = Number(duration[1]) * 60;
    if (period <= 0 || available % period !== 0) throw new Error('A partial item would be ambiguous');
    let finished = 0;
    for (let completion = period; completion <= available; completion += period) finished++;
    return {kind: 'output', answer: String(finished)};
  }

  const hourly = /earns \$(\d+)\.00 for each hour/.exec(text);
  const mixed = /for (\d+) (\d+)\/(\d+) hours of work/.exec(q.prompt);
  if (!hourly || !mixed) throw new Error('Missing hourly pay or mixed-number duration');
  const [whole, numerator, denominator] = mixed.slice(1).map(Number);
  if (whole <= 0 || numerator <= 0 || numerator >= denominator || ![2, 4].includes(denominator)) {
    throw new Error('Expected a positive mixed number in halves or quarters');
  }
  // Convert the visible mixed number to an improper fraction, using integer cents.
  const cents = Number(hourly[1]) * 100 * (whole * denominator + numerator) / denominator;
  if (!Number.isSafeInteger(cents)) throw new Error('Payment must be exact to the cent');
  return {kind: 'pay', answer: (cents / 100).toFixed(2)};
}

function visibleOnly(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture};
}

function examples(): Question[] {
  return [0, 1, 2].map(index => makeRagQuestion(73, index));
}

describe('constant-rate conversion candidate', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const seen = new Map<string, Set<string>>();
    for (let sample = 0; sample < 90; sample++) {
      const seed = sample * 7919 - 100003;
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(q));
        expect(q.answer).toBe(solved.answer);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect((q.workedSteps ?? []).length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps?.every(step => Boolean(step.text && step.equation))).toBe(true);
        const signatures = seen.get(solved.kind) ?? new Set<string>();
        signatures.add(JSON.stringify(visibleOnly(q)));
        seen.set(solved.kind, signatures);
        if (solved.kind === 'output') {
          expect(q.unit).toBe('keyrings');
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(choice => choice === solved.answer)).toHaveLength(1);
          expect(q.choices?.every(choice => /^[1-9]\d*$/.test(choice))).toBe(true);
          expect(q.picture).toBeUndefined();
        } else if (solved.kind === 'pay') {
          expect(q.unit).toBe('dollars');
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          expect(q.choices).toBeUndefined();
          expect(q.picture).toBeUndefined();
        } else {
          const [rate, moreTime] = (JSON.parse(solved.answer) as string[]).map(Number);
          expect(rate).toBeGreaterThan(0);
          expect(moreTime).toBeGreaterThan(0);
          expect(q.structuredResponse?.kind).toBe('number-pair');
        }
      }
    }
    expect([...seen.keys()].sort()).toEqual(['leakage', 'output', 'pay']);
    for (const signatures of seen.values()) expect(signatures.size).toBeGreaterThan(8);
  });

  it('is deterministic and includes all variants in each three-question cycle', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-constant-rate-conversion');
    for (const seed of [-2147483648, -1, 0, 1, 2147483647, 4294967295]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set([0, 1, 2].map(index => solveVisible(visibleOnly(makeRagQuestion(seed, index))).kind));
      expect(kinds.size).toBe(3);
      for (const index of [-4, 0, 2, 101]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        expect(makeRagQuestion(seed, index).answer).toBe(solveVisible(visibleOnly(makeRagQuestion(seed, index))).answer);
      }
    }
  });

  it('responds to changed visible givens without consulting stored answers', () => {
    for (const q of examples()) {
      const original = solveVisible(visibleOnly(q));
      const poisoned: Question = {...q, answer: 'unused', hint: '', explanation: '', workedSteps: [], proof: -999};
      expect(solveVisible(poisoned)).toEqual(original);
      if (original.kind === 'output') {
        const changed = {...poisoned, prompt: q.prompt.replace(/in (\d+) hours/, (_, hours: string) => `in ${Number(hours) * 2} hours`)};
        expect(Number(solveVisible(changed).answer)).toBe(Number(original.answer) * 2);
      } else if (original.kind === 'pay') {
        const changed = {...poisoned, context: q.context?.map(line => line.replace(/\$(\d+)\.00/, (_, dollars: string) => `$${Number(dollars) * 2}.00`))};
        expect(Number(solveVisible(changed).answer)).toBe(Number(original.answer) * 2);
      } else {
        if (q.picture?.type !== 'bars') throw new Error('Missing line graph');
        const changed: Visible = {...visibleOnly(poisoned), picture: {...q.picture, values: q.picture.values.map(value => value * 2), scale: q.picture.scale * 2}};
        const before = (JSON.parse(original.answer) as string[]).map(Number);
        const after = (JSON.parse(solveVisible(changed).answer) as string[]).map(Number);
        expect(after).toEqual([before[0] * 2, before[1]]);
      }
    }
  });

  it('requires both linked graph answers and rejects total elapsed time', () => {
    const q = examples().find(question => question.picture?.type === 'bars');
    if (!q?.structuredResponse || q.picture?.type !== 'bars') throw new Error('Missing linked graph task');
    const expected = solveVisible(visibleOnly(q)).answer;
    const [rate, moreTime] = JSON.parse(expected) as string[];
    const elapsed = Number(q.picture.labels[q.picture.labels.length - 1]);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, expected)).toBe(true);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([rate]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([String(Number(rate) + 1), moreTime]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([rate, String(Number(moreTime) + elapsed)]))).toBe(false);
  });

  it('keeps graph values on numbered grid lines with explicit units', () => {
    for (let seed = 0; seed < 60; seed++) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        if (q.picture?.type !== 'bars') continue;
        const graph = q.picture;
        expect(graph.line).toBe(true);
        expect(graph.labels).toHaveLength(4);
        expect(graph.scale).toBeGreaterThan(0);
        // The existing renderer numbers every tick when max / scale <= 7.
        expect(Math.max(...graph.values) / graph.scale).toBeLessThanOrEqual(7);
        expect(graph.values.every(value => value > 0 && value % graph.scale === 0)).toBe(true);
        const times = graph.labels.map(Number);
        expect(times.slice(1).every((time, i) => time - times[i] === times[1] - times[0])).toBe(true);
        expect(q.context?.join(' ')).toContain('Horizontal axis: time in minutes. Vertical axis: water remaining in litres.');
        expect(q.context?.join(' ')).toContain('same rate until the tank is empty');
      }
    }
  });
});
