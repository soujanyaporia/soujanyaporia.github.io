import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragDecodeRepeatedSum';

function readSum(text: string) {
  const written = text.replace(/ = □$/, '');
  expect(written).toMatch(/^\d+(?: \+ \d+)+$/);
  const terms = written.split(' + ').map(Number);
  const size = terms[0];
  const total = terms.reduce((sum, n) => sum + n, 0);
  expect(terms.every(n => n === size && n > 0)).toBe(true);
  expect(total).toBeLessThanOrEqual(40);
  expect(terms.length).not.toBe(size);
  return { count: terms.length, size, total };
}

function solve(q: Question) {
  if (q.context?.length) {
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-pair') throw new Error('Expected two labelled matches');
    expect(q.context).toHaveLength(4);
    const cards = q.context.map(line => {
      const match = /^Sum (\d+): (.+)$/.exec(line);
      if (!match) throw new Error(`Unreadable sum card: ${line}`);
      return { label: match[1], ...readSum(match[2]) };
    });
    expect(cards.map(card => card.label).sort()).toEqual(['1', '2', '3', '4']);
    const answers = [spec.firstLabel, spec.secondLabel].map(label => {
      const factors = /^Sum for (\d+) × (\d+)$/.exec(label);
      if (!factors) throw new Error(`Missing multiplication: ${label}`);
      const byCount = cards.filter(card => card.count === Number(factors[1]));
      const bySize = cards.filter(card => card.size === Number(factors[2]));
      expect(byCount).toHaveLength(2);
      expect(bySize).toHaveLength(2);
      const matches = byCount.filter(card => bySize.includes(card));
      expect(matches).toHaveLength(1);
      return matches[0].label;
    });
    expect(answers[0]).not.toBe(answers[1]);
    return { form: 'matching', expected: JSON.stringify(answers) };
  }

  const { count, size, total } = readSum(q.display ?? '');
  const words: Record<number, string> = { 2: 'twos', 3: 'threes', 4: 'fours', 5: 'fives', 9: 'nines' };
  if (q.choices) {
    expect(q.prompt).toContain(`How many ${words[size]}`);
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toEqual(expect.arrayContaining([String(count), String(size), String(total)]));
    return { form: 'count', expected: String(count) };
  }

  const spec = q.structuredResponse;
  if (spec?.kind !== 'number-pair') throw new Error('Expected two labelled boxes');
  if (spec.firstLabel === 'Total') {
    expect(q.display).toMatch(/ = □$/);
    expect(spec.secondLabel).toBe(`Number of ${words[size]}`);
    return { form: 'total and count', expected: JSON.stringify([String(total), String(count)]) };
  }
  expect([spec.firstLabel, spec.secondLabel]).toEqual(['Number of groups', 'Number in each group']);
  return { form: 'count and size', expected: JSON.stringify([String(count), String(size)]) };
}

it('solves all four forms from the displayed sums and labels across seeds', () => {
  for (let seed = -8; seed <= 24; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const { form, expected } = solve(question);
      forms.add(form);
      expect(question.answer).toBe(expected);
      if (question.structuredResponse) {
        const swapped = JSON.stringify((JSON.parse(expected) as string[]).reverse());
        expect(structuredResponseCorrect(question.structuredResponse, question.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(question.structuredResponse, question.answer, swapped)).toBe(false);
      }
    }
    expect(forms.size).toBe(4);
  }
});

it('replays a seed and index and varies the visible sums', () => {
  const sums = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(question);
      if (question.display) sums.add(question.display.replace(/ = □$/, ''));
    }
  }
  expect(sums.size).toBeGreaterThan(4);
});
