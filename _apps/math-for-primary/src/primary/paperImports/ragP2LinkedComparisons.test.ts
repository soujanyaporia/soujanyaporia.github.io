import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect, structuredResponseReady } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP2LinkedComparisons';

function readBalances(q: Question): string[] {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing balance diagram');
  const beams = q.picture.marks.filter(mark => mark.kind === 'line');
  const labels = q.picture.marks.filter(mark => mark.kind === 'text');
  expect(beams).toHaveLength(3);
  expect(labels).toHaveLength(6);
  function above(x: number, y: number): string {
    const matches = labels.filter(label => Math.abs(label.x - x) < 20 && label.y < y && label.y >= y - 30);
    expect(matches).toHaveLength(1);
    expect(matches[0].text).toMatch(/^\d+$/);
    return matches[0].text;
  }
  const lowerEnds: string[] = [];
  const pairings = new Set<string>();
  const slopes = new Set<number>();
  for (const beam of beams) {
    const left = above(beam.x1, beam.y1);
    const right = above(beam.x2, beam.y2);
    expect(left).not.toBe(right);
    expect(beam.y1).not.toBe(beam.y2);
    pairings.add([left, right].sort().join('/'));
    slopes.add(Math.sign(beam.y1 - beam.y2));
    lowerEnds.push(beam.y1 > beam.y2 ? left : right);
  }
  expect(pairings.size).toBe(3);
  expect(slopes.size).toBe(2);
  const numbers = [...new Set(labels.map(label => label.text))];
  expect(numbers).toHaveLength(3);
  const byWins = [0, 1, 2].map(wins => numbers.filter(n => lowerEnds.filter(lower => lower === n).length === wins));
  expect(byWins.map(group => group.length)).toEqual([1, 1, 1]);
  return [byWins[0][0], byWins[2][0]];
}

function solveRibbonClues(q: Question): string {
  expect(q.prompt).toMatch(/longest/);
  const names = q.choices ?? [];
  expect(names).toHaveLength(4);
  expect(new Set(names).size).toBe(4);
  const rules = (q.context ?? []).map(line => {
    const match = /^(\w+)'s ribbon is (shorter than|longer than|the same length as) (\w+)'s ribbon\.$/.exec(line);
    if (!match) throw new Error(`Unreadable clue: ${line}`);
    const left = names.indexOf(match[1]), right = names.indexOf(match[3]);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
    return { left, right, relation: match[2] };
  });
  expect(rules.map(rule => rule.relation).sort()).toEqual(['longer than', 'shorter than', 'the same length as']);
  // Four ranks suffice for every possible ordering of four ribbons, including ties.
  const winners = new Set<string>();
  for (let code = 0; code < 4 ** 4; code++) {
    const ranks = names.map((_, i) => Math.floor(code / 4 ** i) % 4);
    const fits = rules.every(({ left, right, relation }) => {
      if (relation === 'shorter than') return ranks[left] < ranks[right];
      if (relation === 'longer than') return ranks[left] > ranks[right];
      return ranks[left] === ranks[right];
    });
    if (!fits) continue;
    expect(new Set(ranks).size).toBe(3);
    const top = names.filter((_, i) => ranks[i] === Math.max(...ranks));
    expect(top).toHaveLength(1);
    winners.add(top[0]);
  }
  expect(winners.size).toBe(1);
  return [...winners][0];
}

it('reads the beams and grades the two parcel identities in order', () => {
  const results = new Set<string>();
  for (let seed = -12; seed <= 35; seed++) {
    const questions = [makeRagQuestion(seed, 0), makeRagQuestion(seed, 1)];
    const q = questions.find(question => question.picture);
    if (!q || q.structuredResponse?.kind !== 'number-pair') throw new Error('Missing parcel response');
    const spec = q.structuredResponse;
    expect([spec.firstLabel, spec.secondLabel]).toEqual(['Lightest parcel', 'Heaviest parcel']);
    const [light, heavy] = readBalances(q);
    const expected = JSON.stringify([light, heavy]);
    expect(q.answer).toBe(expected);
    expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([heavy, light]))).toBe(false);
    expect(structuredResponseReady(spec, JSON.stringify([light, '']))).toBe(false);
    results.add(expected);
  }
  expect(results.size).toBeGreaterThan(4);
});

it('finds a single longest ribbon under every ordering allowed by the visible clues', () => {
  const winners = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    const questions = [2, 3].map(index => makeRagQuestion(seed, index));
    const q = questions.find(question => question.choices);
    if (!q) throw new Error('Missing ribbon choices');
    const expected = solveRibbonClues(q);
    expect(q.answer).toBe(expected);
    winners.add(expected);
    expect([2, 3].map(index => makeRagQuestion(seed, index))).toEqual(questions);
  }
  expect(winners.size).toBeGreaterThan(2);
});
