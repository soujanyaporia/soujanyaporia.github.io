import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPurchaseShortfall';

function read(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given for ${pattern}: ${text}`);
  return match.slice(1);
}

function cents(label: string): number {
  const [whole, fraction = '00'] = read(label, /^\$(\d+)(?:\.(\d{2}))?$/);
  return Number(whole) * 100 + Number(fraction);
}

function solve(q: Question) {
  const text = (q.context ?? []).join(' ');
  if (text.includes('tent')) {
    const [price, saved, gift] = read(text, /costs (\$\d+)\. Mira has saved (\$\d+)\. Her aunt gives her (\$\d+) /).map(cents);
    return { form: q.prompt.startsWith('Choose') ? 'choice' : 'gift', gap: price - saved - gift };
  }
  if (text.includes('notes')) {
    const [tag] = read(text, /bag costs (\$\d+)\./);
    const [notes, dollars, coinsA, valueA, coinsB, valueB] = read(text, /(\d+) \$(\d+) notes, (\d+) (\d+)-cent coins and (\d+) (\d+)-cent coins/).map(Number);
    expect([5, 10, 20, 50]).toContain(valueA);
    expect([5, 10, 20, 50]).toContain(valueB);
    expect(valueA).not.toBe(valueB);
    const unpaid = cents(tag) - notes * dollars * 100 - coinsA * valueA - coinsB * valueB;
    expect(unpaid % 100).not.toBe(0);
    return { form: 'cash', gap: unpaid };
  }
  const [markers, markerPrice, pads, padPrice] = read(text, /(\d+) markers at (\$\d+(?:\.\d{2})?) each and (\d+) sketch pads at (\$\d+(?:\.\d{2})?) each/);
  const [budget] = read(text, /He has (\$\d+) for these supplies/);
  expect(Number(markers)).toBeGreaterThan(1);
  expect(Number(pads)).toBeGreaterThan(1);
  let unpaid = -cents(budget);
  for (let i = 0; i < Number(markers); i++) unpaid += cents(markerPrice);
  for (let i = 0; i < Number(pads); i++) unpaid += cents(padPrice);
  return { form: 'list', gap: unpaid };
}

it('recovers each answer from the prices, quantities and funds shown to the pupil', () => {
  const forms = new Set<string>();
  const stories = new Set<string>();
  for (let seed = -8; seed < 72; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, gap } = solve(q);
      forms.add(form);
      stories.add(JSON.stringify(q.context));
      expect(gap).toBeGreaterThan(0);
      expect(q.picture).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      if (form === 'choice') {
        const options = (q.choices ?? []).map(cents);
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options.filter(value => value === gap)).toHaveLength(1);
        expect(q.choices).toContain(q.answer);
        expect(cents(q.answer)).toBe(gap);
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('dollars');
        const decimal = `${Math.floor(gap / 100)}.${String(gap % 100).padStart(2, '0')}`;
        expect(q.answer).toBe(decimal);
      }
      const steps = q.workedSteps ?? [];
      expect(steps.length).toBeGreaterThanOrEqual(2);
      const [cost, funds, result] = read(steps[steps.length - 1].equation ?? '', /^(\$[\d.]+) − (\$[\d.]+) = (\$[\d.]+)$/).map(cents);
      expect(result).toBe(gap);
      expect(funds + gap).toBe(cost);
    }
  }
  expect(forms).toEqual(new Set(['gift', 'choice', 'cash', 'list']));
  expect(stories.size).toBeGreaterThan(50);
});

it('reproduces a question including its choice order for the same seed and index', () => {
  for (let index = 0; index < 20; index++) {
    expect(makeRagQuestion(41, index)).toEqual(makeRagQuestion(41, index));
  }
  expect(makeRagQuestion(41)).toEqual(makeRagQuestion(41, 0));
});
