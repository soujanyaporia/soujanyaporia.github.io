import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4GraphFactorMatch';

function checkVisibleQuestion(q: Question) {
  const p = q.picture;
  if (p?.type !== 'bars') throw new Error('Expected a graph');
  const { labels, values, scale } = p;
  const context = q.context?.join(' ') ?? '';
  expect(labels).toHaveLength(6);
  expect(new Set(labels).size).toBe(labels.length);
  expect(values).toHaveLength(labels.length);
  expect(values.every(v => v > 0 && Number.isInteger(v) && v % scale === 0)).toBe(true);
  expect(context).toContain(`${scale} ${p.line ? 'litres' : q.choices ? 'badges' : 'visitors'}`);
  const reading = (label: string) => {
    const i = labels.indexOf(label);
    if (i === -1) throw new Error('Missing graph label: ' + label);
    return values[i];
  };

  if (p.line) {
    const initial = /was full at (\d{4})/.exec(context);
    const final = /remained at (\d{4})/.exec(q.prompt);
    if (!initial || !final || !q.prompt.includes('half full')) throw new Error('Incomplete barrel question');
    expect(initial[1]).toBe(labels[0]);
    expect(final[1]).toBe(labels[5]);
    expect(labels.every((v, i) => Number(v) === Number(initial[1]) + 100 * i)).toBe(true);
    expect(values.every((v, i) => i === 0 || v < values[i - 1])).toBe(true);
    const full = reading(initial[1]), end = reading(final[1]);
    const times = labels.filter(t => reading(t) * 2 === full);
    expect(times).toHaveLength(1);
    // The first denominator that gives an integer numerator yields the simplest fraction.
    let d = 1;
    while (d <= full && (end * d) % full !== 0) d++;
    const n = end * d / full;
    const expected = [times[0], String(n), String(d)];
    expect(JSON.parse(q.answer)).toEqual(expected);
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields') throw new Error('Expected separate time and fraction fields');
    expect(spec.fields.map(f => f.label)).toEqual(['(a) Time (24-hour clock)', '(b) Numerator', '(b) Denominator']);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([times[0], String(2 * n), String(2 * d)]))).toBe(false);
    return 'half';
  }

  const total = /half the total for (\w+) and (\w+)\?/.exec(q.prompt);
  if (total) {
    const [, a, b] = total;
    expect(a).not.toBe(b);
    const sum = reading(a) + reading(b);
    const matches = labels.filter(day => reading(day) * 2 === sum);
    expect(matches).toHaveLength(1);
    expect(q.answer).toBe(matches[0]);
    expect(q.choices?.slice().sort()).toEqual(labels.filter(day => day !== a && day !== b).sort());
    expect(q.choices).toContain(matches[0]);
    return 'total';
  }

  const one = /had (\d+) times as many visitors as (\w+)\?/.exec(q.prompt);
  if (one) {
    const k = Number(one[1]), ref = reading(one[2]);
    expect(k).toBeGreaterThan(1);
    const matches = labels.filter(m => reading(m) / ref === k);
    expect(matches).toHaveLength(1);
    expect(q.answer).toBe(matches[0]);
    expect(q.choices).toBeUndefined();
    expect(q.structuredResponse).toBeUndefined();
    return 'month';
  }

  const both = /one was (\d+) times the other/.exec(q.prompt);
  if (!both) throw new Error('Unrecognised factor clue');
  const k = Number(both[1]), pairs: string[][] = [];
  expect(k).toBeGreaterThan(1);
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const big = Math.max(values[i], values[j]), small = Math.min(values[i], values[j]);
      if (big / small === k) pairs.push([labels[i], labels[j]]);
    }
  }
  expect(pairs).toHaveLength(1);
  const spec = q.structuredResponse;
  if (spec?.kind !== 'named-pair') throw new Error('Expected a two-label selection');
  expect(spec.options).toEqual(labels);
  expect(JSON.parse(q.answer).sort()).toEqual([...pairs[0]].sort());
  for (const order of [pairs[0], [...pairs[0]].reverse()]) {
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(order))).toBe(true);
  }
  return 'pair';
}

describe('matching graph readings', () => {
  it('solves each form from the graph, the printed clue and the response fields', () => {
    for (const seed of [-29, 0, 1, 37, 105, 412, 2026, 65535]) {
      const seen = new Set<string>();
      for (let index = 0; index < 11; index++) {
        seen.add(checkVisibleQuestion(makeRagQuestion(seed, index)));
      }
      expect([...seen].sort()).toEqual(['half', 'month', 'pair', 'total']);
    }
  });

  it('repeats a seed and index exactly and varies the visible data within every form', () => {
    const graphs = new Map<string, Set<string>>();
    for (let seed = 0; seed < 16; seed++) {
      for (let index = 0; index < 11; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        const form = checkVisibleQuestion(q);
        const seen = graphs.get(form) ?? new Set<string>();
        seen.add(JSON.stringify(q.picture));
        graphs.set(form, seen);
      }
    }
    expect(graphs.size).toBe(4);
    for (const seen of graphs.values()) expect(seen.size).toBeGreaterThan(4);
  });
});
