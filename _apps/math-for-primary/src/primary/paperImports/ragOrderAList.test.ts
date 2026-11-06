import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragOrderAList';

function readNumerals(labels: string[]): number[] {
  expect(labels).toHaveLength(4);
  expect(new Set(labels).size).toBe(4);
  for (const label of labels) {
    expect(label).toMatch(/^(0|[1-9]\d*)$/);
    expect(Number(label)).toBeLessThanOrEqual(100);
  }
  return labels.map(Number);
}

it('solves both response forms using only the displayed cards or rows', () => {
  const forms = new Set<string>();
  const descSets = new Set<string>();
  const rowSets = new Set<string>();
  const failingPositions = new Set<number>();
  let sawMixedWidths = false;
  for (let seed = -4; seed < 36; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.order) {
        forms.add('arrange');
        expect(q.prompt).toMatch(/greatest number first/i);
        expect(q.choices).toBeUndefined();
        const cards = readNumerals(q.order);
        const solution = [...cards].sort((x, y) => y - x);
        const input = solution.join(',');
        expect(cards).not.toEqual(solution);
        expect(q.answer).toBe(input);
        expect(correctAnswer(q, input)).toBe(true);
        expect(correctAnswer(q, [...solution].reverse().join(','))).toBe(false);
        descSets.add(input);
        sawMixedWidths ||= cards.some(n => n < 10) && cards.some(n => n >= 10);
      } else {
        forms.add('recognise');
        expect(q.prompt).toMatch(/row.*smallest to greatest/i);
        const choices = q.choices ?? [];
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        const rows = choices.map(s => readNumerals(s.split(',').map(t => t.trim())));
        const signature = (row: number[]) => [...row].sort((x, y) => x - y).join(',');
        expect(new Set(rows.map(signature)).size).toBe(1);
        rowSets.add(signature(rows[0]));
        const solutions = choices.filter((_, k) => {
          const row = rows[k];
          const drops = [0, 1, 2].filter(i => row[i] >= row[i + 1]);
          if (drops.length === 1) failingPositions.add(drops[0]);
          return drops.length === 0;
        });
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(solutions[0]);
        for (const choice of choices) expect(correctAnswer(q, choice)).toBe(choice === solutions[0]);
      }
    }
  }
  expect(forms.size).toBe(2);
  expect(descSets.size).toBeGreaterThan(10);
  expect(rowSets.size).toBeGreaterThan(10);
  expect(sawMixedWidths).toBe(true);
  expect([...failingPositions].sort()).toEqual([0, 1, 2]);
});

it('replays the same question for the same seed and index', () => {
  for (const index of [0, 1, 2, 3]) {
    expect(makeRagQuestion(24, index)).toEqual(makeRagQuestion(24, index));
  }
});
