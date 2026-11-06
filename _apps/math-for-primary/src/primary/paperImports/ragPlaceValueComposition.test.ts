import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPlaceValueComposition';

const seeds = Array.from({ length: 40 }, (_, i) => i - 12);
const examples = seeds.flatMap(seed => [0, 1, 2, 3].map(index => makeRagQuestion(seed, index)));

function readExamples(format: RegExp) {
  const rows = examples.flatMap(q => {
    const match = format.exec(q.display ?? '');
    return match ? [{ q, fields: match.slice(1).map(Number) }] : [];
  });
  expect(rows).toHaveLength(seeds.length);
  expect(new Set(rows.map(row => row.q.display)).size).toBeGreaterThan(4);
  return rows;
}

function fourChoices(q: Question): string[] {
  const choices = q.choices ?? [];
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);
  return choices;
}

it('writes the missing hundreds digit as zero when building a numeral', () => {
  for (const { q, fields: [thousands, tens, ones] } of readExamples(/^([1-9]) thousands, ([1-9]) tens and ([1-9]) ones$/)) {
    expect(q.choices).toBeUndefined();
    expect(q.answer).toBe(`${thousands}0${tens}${ones}`);
  }
});

it('finds exactly one choice by regrouping the visible ones', () => {
  for (const { q, fields: [thousands, looseOnes] } of readExamples(/^([1-9]) thousands and ([1-9]\d) ones$/)) {
    const tens = Math.floor(looseOnes / 10);
    const units = looseOnes % 10;
    const expected = `${thousands}0${tens}${units}`;
    const choices = fourChoices(q);
    expect(choices.every(value => /^[1-9]\d{3}$/.test(value))).toBe(true);
    expect(choices.filter(value => value === expected)).toEqual([expected]);
    expect(q.answer).toBe(expected);
  }
});

it('evaluates every proposed sum and checks the correct expansion digit by digit', () => {
  for (const { q, fields: [whole] } of readExamples(/^([1-9]\d{3})$/)) {
    const digits = String(whole).split('').map(Number);
    const terms = digits.map((digit, i) => digit * 10 ** (3 - i)).filter(value => value > 0);
    const expected = terms.join(' + ');
    const matches = fourChoices(q).filter(choice => {
      expect(choice).toMatch(/^[1-9]000 \+ [1-9]0{1,2} \+ [1-9]$/);
      return choice.split(' + ').reduce((sum, term) => sum + Number(term), 0) === whole;
    });
    expect(matches).toEqual([expected]);
    expect(q.answer).toBe(expected);
  }
});

it('subtracts the printed parts and returns the whole missing value', () => {
  for (const { q, fields: [whole, thousandsValue, ones] } of readExamples(/^([1-9]\d{3}) = ([1-9]000) \+ □ \+ ([1-9])$/)) {
    const missing = whole - thousandsValue - ones;
    expect(missing).toBeGreaterThanOrEqual(100);
    expect(missing).toBeLessThanOrEqual(900);
    expect(missing % 100).toBe(0);
    expect(q.choices).toBeUndefined();
    expect(q.answer).toBe(String(missing));
  }
});

it('reproduces the same question and option order for a given seed and index', () => {
  for (const seed of [-7, 0, 53]) {
    for (const index of [0, 1, 2, 3, 17]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
  }
});
