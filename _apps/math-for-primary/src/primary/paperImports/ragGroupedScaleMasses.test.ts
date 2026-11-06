import {expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Question} from '../generate';
import {Batch9EarlyDiagram} from './Batch9EarlyDiagram';
import type {Batch9EarlyPicture} from './batch9EarlyPicture';
import {makeRagQuestion} from './ragGroupedScaleMasses';

function numberIn(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing quantity in ${text}`);
  return Number(match[1]);
}

function readDial(model: Extract<Batch9EarlyPicture, {layout: 'mass-dial'}>): number {
  const svg = renderToStaticMarkup(createElement(Batch9EarlyDiagram, {model}));
  const step = numberIn(svg, /Small marks are (\d+) grams apart/);
  const tick = numberIn(svg, /Pointer at small mark (\d+) clockwise/);
  const limit = numberIn(svg, /from zero to (\d+)\./);
  expect(step * tick).toBeGreaterThan(0);
  expect(step * tick).toBeLessThan(limit);
  return step * tick;
}

type Givens = Pick<Question, 'prompt' | 'context' | 'picture'>;

function solve({prompt, context, picture}: Givens) {
  if (picture?.type === 'paper' && picture.layout === 'bars') {
    const [bags, crate, mixed, weight] = picture.rows;
    expect(picture.rows.map(row => row.label)).toEqual(['Balance 1, left', 'Balance 1, right', 'Balance 2, left', 'Balance 2, right']);
    expect(crate.parts.map(p => p.label)).toEqual(['Crate']);
    expect(bags.parts.every(p => p.label === 'Bag')).toBe(true);
    expect(mixed.parts.filter(p => p.label === 'Crate')).toHaveLength(1);
    expect(mixed.parts.every(p => p.label === 'Bag' || p.label === 'Crate')).toBe(true);
    expect(weight.parts).toHaveLength(1);
    const total = numberIn(weight.parts[0].label, /^(\d+) kg$/);
    const extra = mixed.parts.filter(p => p.label === 'Bag').length;
    expect(prompt).toContain('one bag');
    expect(context?.join(' ')).toContain('level balances');
    const solutions: number[] = [];
    for (let bag = 1; bag <= total; bag++) {
      const crateKg = bags.parts.length * bag;
      if (crateKg + extra * bag === total) solutions.push(bag);
    }
    expect(solutions).toHaveLength(1);
    return {form: 'replace', value: solutions[0], unit: 'kg'};
  }

  if (picture?.type === 'paper' && picture.layout === 'cards') {
    const [bags, weights] = picture.cards;
    expect(prompt).toContain('one sandbag');
    expect(context?.join(' ')).toContain('pans balance');
    expect(bags.value).toBe('Sandbags');
    if (!bags.count || !weights.count) throw new Error('Both pans need countable objects');
    const label = numberIn(weights.value, /^Each weight is (\d+) g$/);
    const sum = Array.from({length: weights.count}, () => label).reduce((a, b) => a + b, 0);
    expect(sum % bags.count).toBe(0);
    return {form: 'weights', value: sum / bags.count, unit: 'g'};
  }

  if (picture?.type !== 'batch10-middle' || picture.layout !== 'mass-pair') throw new Error('Expected two weighing dials');
  expect(picture.dials).toHaveLength(2);
  const [group, mixed] = picture.dials;
  const balls = numberIn(group.label, /^(\d+) balls$/);
  expect(mixed.label).toBe('1 ball and 1 toy boat');
  expect(context?.join(' ')).toContain('balls have the same mass');
  const groupMass = readDial(group.model);
  const mixedMass = readDial(mixed.model);
  expect(groupMass % balls).toBe(0);
  const oneBoat = mixedMass - groupMass / balls;
  expect(oneBoat).toBeGreaterThan(0);
  if (prompt === 'How many grams does the toy boat weigh?') return {form: 'single boat', value: oneBoat, unit: 'g'};
  const count = numberIn(prompt, /of (\d+) boats/);
  expect(count).toBeGreaterThan(1);
  return {form: 'group of boats', value: count * oneBoat, unit: 'g'};
}

it('solves every response from the pan loads or the dial marks and load labels', () => {
  const values = new Map<string, Set<number>>();
  for (let seed = -8; seed <= 16; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const {form, value, unit} = solve(q);
      expect(q.answer).toBe(String(value));
      expect(q.unit).toBe(unit);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      if (form === 'weights') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(value));
      } else {
        expect(q.choices).toBeUndefined();
      }
      const seen = values.get(form) ?? new Set<number>();
      seen.add(value);
      values.set(form, seen);
    }
  }
  expect([...values.keys()].sort()).toEqual(['group of boats', 'replace', 'single boat', 'weights']);
  for (const seen of values.values()) expect(seen.size).toBeGreaterThan(1);
});

it('replays the same question for the same seed and index', () => {
  for (let index = 0; index < 6; index++) {
    expect(makeRagQuestion(57, index)).toEqual(makeRagQuestion(57, index));
  }
});
