import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragReadTensAndOnes';

function checkPair(q: Question, tens: number, ones: number) {
  const spec = q.structuredResponse;
  if (spec?.kind !== 'number-pair') throw new Error('Expected two number fields');
  expect([spec.firstLabel, spec.secondLabel]).toEqual(['Tens', 'Ones']);
  const input = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
  expect(q.answer).toBe(input(tens, ones));
  expect(structuredResponseCorrect(spec, q.answer, input(tens, ones))).toBe(true);
  expect(structuredResponseCorrect(spec, q.answer, input(tens, (ones + 1) % 10))).toBe(false);
  if (tens !== ones) expect(structuredResponseCorrect(spec, q.answer, input(ones, tens))).toBe(false);
}

function solve(q: Question) {
  if (q.picture) {
    const pic = q.picture;
    if (pic.type !== 'paper' || pic.layout !== 'cards') throw new Error('Expected countable objects');
    expect(pic.cards).toHaveLength(2);
    expect(q.context?.join(' ')).toContain('Each full box holds 10 pencils');
    const boxes = pic.cards.find(c => c.icon === 'box')?.count;
    const singles = pic.cards.find(c => c.icon === 'pencil')?.count;
    if (boxes === undefined || singles === undefined) throw new Error('Missing pictured count');
    expect(Number.isInteger(boxes) && boxes >= 1 && boxes <= 9).toBe(true);
    expect(Number.isInteger(singles) && singles >= 0 && singles <= 9).toBe(true);
    expect(q.display).toBeUndefined();
    checkPair(q, boxes, singles);
    return 'picture';
  }

  const shown = q.display ?? '';
  expect(shown).toMatch(/^[1-9][0-9]$/);
  const [tens, ones] = shown.split('').map(Number);
  if (q.structuredResponse) {
    checkPair(q, tens, ones);
    return 'layout';
  }

  const options = q.choices ?? [];
  expect(options).toHaveLength(4);
  expect(new Set(options).size).toBe(4);
  if (options.every(v => /^\d+$/.test(v))) {
    const given = /^Ones: (\d)$/.exec(q.context?.[0] ?? '');
    if (!given) throw new Error('Missing ones count');
    const solutions = options.filter(v => 10 * Number(v) + Number(given[1]) === Number(shown));
    expect(solutions).toEqual([String(tens)]);
    expect(q.answer).toBe(solutions[0]);
    return 'tens';
  }

  const solutions = options.filter(v => {
    const parts = /^([1-9]) tens? and ([0-9]) ones?$/.exec(v);
    if (!parts) throw new Error('Unreadable tens-and-ones choice');
    return 10 * Number(parts[1]) + Number(parts[2]) === Number(shown);
  });
  expect(solutions).toHaveLength(1);
  expect(q.answer).toBe(solutions[0]);
  return 'match';
}

it('solves each form from the numeral, stated units or pictured objects', () => {
  for (let seed = -16; seed < 64; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      forms.add(solve(q));
    }
    expect([...forms].sort()).toEqual(['layout', 'match', 'picture', 'tens']);
  }
});

it('replays each item and varies the numerals, including numbers with zero ones', () => {
  const layouts = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      if (q.structuredResponse && q.display) layouts.add(q.display);
    }
  }
  expect(layouts.size).toBeGreaterThan(12);
  expect([...layouts].some(n => n.endsWith('0'))).toBe(true);
});
