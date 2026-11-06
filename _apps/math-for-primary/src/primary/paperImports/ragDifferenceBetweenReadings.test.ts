import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Batch9EarlyDiagram } from './Batch9EarlyDiagram';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragDifferenceBetweenReadings';

const sets = Array.from({ length: 40 }, (_, i) =>
  Array.from({ length: 4 }, (_, index) => makeRagQuestion(i - 5, index)),
);
const questions = sets.flat();

function metres(label: string | undefined): number {
  const match = label?.match(/\b(\d+) m$/);
  if (!match) throw new Error(`Missing metre label: ${label}`);
  return Number(match[1]);
}

it('keeps both distances tied to the same route and grades the two entries in order', () => {
  const routes = questions.filter(q => q.structuredResponse?.kind === 'number-pair');
  expect(routes).toHaveLength(sets.length * 2);
  const givens = new Set<string>();
  for (const q of routes) {
    const bar = q.picture;
    const pair = q.structuredResponse;
    if (bar?.type !== 'paper' || bar.layout !== 'bars' || pair?.kind !== 'number-pair') throw new Error('Missing route or fields');
    const parts = bar.rows[0].parts;
    expect(parts.map(p => p.label)).toEqual([expect.stringMatching(/^\d+ m$/), '?']);
    expect(q.context?.join(' ')).toContain('pond past the shelter to the gate');
    expect(pair.firstLabel).toContain('Shelter to gate (m)');
    expect(pair.secondLabel).toContain('Difference (m)');
    const whole = metres(bar.totalLabel);
    const pond = metres(parts[0].label);
    const gate = whole - pond;
    expect(whole).toBeLessThan(1000);
    expect(pond).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(pond);
    const values = [String(gate), String(gate - pond)];
    expect(q.answer).toBe(JSON.stringify(values));
    expect(structuredResponseCorrect(pair, q.answer, JSON.stringify([values[1], values[0]]))).toBe(false);
    givens.add(`${whole}/${pond}`);
  }
  expect(givens.size).toBeGreaterThan(10);
});

it('reads the rendered dial and removes two small-parcel masses to find the difference', () => {
  const masses = questions.filter(q => q.picture?.type === 'batch9-early');
  expect(masses).toHaveLength(sets.length);
  const totals = new Set<number>();
  for (const q of masses) {
    const dial = q.picture;
    if (dial?.type !== 'batch9-early' || dial.layout !== 'mass-dial') throw new Error('Missing scale');
    const svg = renderToStaticMarkup(createElement(Batch9EarlyDiagram, { model: dial }));
    const marks = /Small marks are (\d+) grams apart\. Pointer at small mark (\d+) clockwise from zero/.exec(svg);
    const given = /small parcel has a mass of (\d+) g/.exec(q.context?.join(' ') ?? '');
    if (!marks || !given) throw new Error('Missing pointer or stated mass');
    expect(q.context?.join(' ')).toContain('two parcels together');
    const total = Number(marks[1]) * Number(marks[2]);
    const small = Number(given[1]);
    expect(total).toBeLessThan(1000);
    expect(total).toBeGreaterThan(2 * small);
    const expected = `${total - 2 * small} g`;
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain(expected);
    expect(q.answer).toBe(expected);
    totals.add(total);
  }
  expect(totals.size).toBeGreaterThan(4);
});

it('checks every height statement using only the labelled whole and extensions', () => {
  const heights = questions.filter(q => q.picture?.type === 'paper' && !q.structuredResponse);
  expect(heights).toHaveLength(sets.length);
  const winningPositions = new Set<number>();
  for (const q of heights) {
    const bar = q.picture;
    if (bar?.type !== 'paper' || bar.layout !== 'bars' || !q.choices) throw new Error('Missing tree bars or choices');
    const gap = (name: string) => metres(bar.rows.find(row => row.label === name)?.parts.at(-1)?.label);
    expect(bar.totalLabel).toMatch(/^Oak height:/);
    const oak = metres(bar.totalLabel);
    const pine = oak - gap('Oak');
    const elm = pine - gap('Pine');
    expect(oak).toBeGreaterThan(pine);
    expect(pine).toBeGreaterThan(elm);
    expect(elm).toBeGreaterThan(0);
    const height: Record<string, number> = { oak, pine, elm };
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    const trueClaims = q.choices.filter(claim => {
      const match = /^The (oak|pine|elm) is (\d+) m (tall|taller|shorter)(?: than the (oak|pine|elm))?\.$/.exec(claim);
      if (!match) throw new Error(`Unreadable claim: ${claim}`);
      const [, tree, amount, relation, other] = match;
      if (relation === 'tall') return !other && height[tree] === Number(amount);
      if (!other) throw new Error('Missing comparison tree');
      const difference = height[tree] - height[other];
      return (relation === 'taller' ? difference : -difference) === Number(amount);
    });
    expect(trueClaims).toHaveLength(1);
    expect(q.answer).toBe(trueClaims[0]);
    winningPositions.add(q.choices.indexOf(trueClaims[0]));
  }
  expect(winningPositions.size).toBe(4);
});

it('reproduces a question from the seed and index and presents each task in a four-question cycle', () => {
  sets.forEach((set, i) => {
    expect(set.filter(q => q.structuredResponse)).toHaveLength(2);
    expect(set.filter(q => q.picture?.type === 'batch9-early')).toHaveLength(1);
    expect(set.filter(q => q.picture?.type === 'paper' && q.choices)).toHaveLength(1);
    set.forEach((q, index) => expect(makeRagQuestion(i - 5, index)).toEqual(q));
  });
});
