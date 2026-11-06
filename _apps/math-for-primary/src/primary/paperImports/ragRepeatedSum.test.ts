import { expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragRepeatedSum';

const questions = Array.from({ length: 48 }, (_, seed) =>
  Array.from({ length: 8 }, (_, index) => makeRagQuestion(seed, index)),
).flat();

function readTrays(q: Question): number[] {
  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Expected separate trays');
  const counts = picture.cards.map((card, i) => {
    expect(card.label).toBe(`Tray ${i + 1}`);
    expect(card.icon).toBe('pencil');
    if (typeof card.count !== 'number') throw new Error('Missing pencil count');
    expect(Number.isInteger(card.count)).toBe(true);
    expect(card.count).toBeGreaterThan(0);
    return card.count;
  });
  expect(new Set(counts).size).toBe(1);
  return counts;
}

function readTrayStory(q: Question): number[] {
  const match = /^There are (\d+) trays\. Each tray holds (\d+) pencils\.$/.exec(q.context?.[0] ?? '');
  if (!match) throw new Error('Missing tray count or pencils per tray');
  return Array.from({ length: Number(match[1]) }, () => Number(match[2]));
}

function add(terms: number[]): number {
  expect(terms.length).toBeGreaterThanOrEqual(3);
  const total = terms.reduce((sum, term) => sum + term, 0);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(40);
  return total;
}

function checkFields(q: Question, values: number[]) {
  const response = JSON.stringify(values.map(String));
  expect(q.answer).toBe(response);
  expect(correctAnswer(q, response)).toBe(true);
}

test('matches each phrase by both the number and the value of its addends', () => {
  const words: Record<string, number> = { threes: 3, fours: 4, fives: 5, sixes: 6 };
  const seen = new Set<string>();
  for (const q of questions) {
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields' || q.display) continue;
    expect(spec.fields).toHaveLength(4);
    const sums = (q.context ?? []).map((line, i) => {
      const match = /^Sum (\d+): (\d+(?: \+ \d+)+)$/.exec(line);
      if (!match) throw new Error('Missing numbered sum');
      expect(Number(match[1])).toBe(i + 1);
      return match[2].split(' + ').map(Number);
    });
    expect(sums).toHaveLength(4);
    const totals = sums.map(add);
    const matches = spec.fields.map(field => {
      const phrase = /^(\d+) (\w+)$/.exec(field.label);
      if (!phrase) throw new Error('Missing group phrase');
      const hits = sums.flatMap((terms, i) => terms.length === Number(phrase[1]) && terms.every(n => n === words[phrase[2]]) ? [i + 1] : []);
      expect(hits).toHaveLength(1);
      return hits[0];
    });
    expect(new Set(matches).size).toBe(4);
    checkFields(q, matches);
    const first = totals.findIndex((value, i) => totals.indexOf(value) < i);
    expect(first).toBeGreaterThan(-1);
    const second = totals.indexOf(totals[first]);
    const swapped = matches.map(n => n === first + 1 ? second + 1 : n === second + 1 ? first + 1 : n);
    expect(correctAnswer(q, JSON.stringify(swapped.map(String)))).toBe(false);
    seen.add(JSON.stringify(q.context));
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('requires one addend per tray and the total, from either a picture or a story', () => {
  const pictures = new Set<string>();
  const stories = new Set<string>();
  for (const q of questions) {
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields' || !q.display) continue;
    const terms = q.picture ? readTrays(q) : readTrayStory(q);
    const total = add(terms);
    expect(q.display).toBe(`${terms.map(() => '□').join(' + ')} = □`);
    expect(spec.fields.map(f => f.label)).toEqual([...terms.map((_, i) => `Tray ${i + 1}`), 'Total pencils']);
    expect(spec.fields.length).toBeLessThanOrEqual(6);
    checkFields(q, [...terms, total]);
    expect(correctAnswer(q, String(total))).toBe(false);
    expect(correctAnswer(q, JSON.stringify([String(terms[0] + 1), ...terms.slice(1).map(String), String(total)]))).toBe(false);
    (q.picture ? pictures : stories).add(terms.join(','));
  }
  expect(pictures.size).toBeGreaterThan(1);
  expect(stories.size).toBeGreaterThan(1);
});

test('evaluates the expression printed in the question', () => {
  const seen = new Set<string>();
  for (const q of questions) {
    if (q.structuredResponse) continue;
    const match = /^(\d+(?: \+ \d+)+) = □$/.exec(q.display ?? '');
    if (!match) throw new Error('Missing visible addition');
    const terms = match[1].split(' + ').map(Number);
    expect(new Set(terms).size).toBe(1);
    const total = add(terms);
    expect(q.answer).toBe(String(total));
    expect(correctAnswer(q, String(total - terms[0]))).toBe(false);
    seen.add(match[1]);
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('counts the pencils in one pictured tray and then in every tray together', () => {
  const seen = new Set<string>();
  for (const q of questions) {
    if (q.structuredResponse?.kind !== 'number-pair') continue;
    const counts = readTrays(q);
    expect(q.context).toEqual([`There are ${counts.length} trays of pencils.`]);
    const total = add(counts);
    checkFields(q, [counts[0], total]);
    expect(correctAnswer(q, JSON.stringify([String(total), String(counts[0])]))).toBe(false);
    expect(correctAnswer(q, JSON.stringify([String(counts[0] + 1), String(total)]))).toBe(false);
    seen.add(counts.join(','));
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('replays the same question for the same seed and index', () => {
  for (let index = 0; index < 8; index++) {
    expect(makeRagQuestion(9, index)).toEqual(makeRagQuestion(9, index));
  }
  expect(makeRagQuestion(9)).toEqual(makeRagQuestion(9, 0));
});
