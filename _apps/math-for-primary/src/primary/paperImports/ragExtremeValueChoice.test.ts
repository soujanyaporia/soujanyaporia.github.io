import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragExtremeValueChoice';

function readValue(label: string): number {
  if (/^\d+$/.test(label)) return Number(label);
  const sum = /^(\d+) \+ (\d+)$/.exec(label);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const parts = /^(\d+) (hundreds|tens) and (\d+) ones$/.exec(label);
  if (!parts) throw new Error(`Cannot read choice: ${label}`);
  return Number(parts[1]) * (parts[2] === 'hundreds' ? 100 : 10) + Number(parts[3]);
}

it('selects the unique extreme from the visible prompt and choices in every form', () => {
  const sumWinnerKinds = new Set<string>();
  for (let seed = -8; seed < 40; seed++) {
    const formsSeen = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const direction = /\b(greatest|smallest)\b/.exec(q.prompt)?.[1];
      expect(direction).toBeDefined();
      if (!q.choices) throw new Error('A selection question needs visible choices');
      const labels = q.choices;
      const values = labels.map(readValue);
      expect(new Set(values).size).toBe(values.length);
      expect(values.every(v => Number.isInteger(v) && v >= 0 && v <= 1000)).toBe(true);
      const extreme = direction === 'greatest' ? Math.max(...values) : Math.min(...values);
      const selected = labels[values.indexOf(extreme)];
      expect(q.answer).toBe(selected);

      if (labels.some(label => label.includes('+'))) {
        formsSeen.add(`${direction}-sum`);
        expect(labels).toHaveLength(3);
        expect(labels.filter(label => /^\d{2} \+ \d{2}$/.test(label))).toHaveLength(1);
        expect(labels.filter(label => /^\d+$/.test(label))).toHaveLength(2);
        sumWinnerKinds.add(selected.includes('+') ? 'sum' : 'numeral');
      } else if (labels.some(label => label.includes('ones'))) {
        formsSeen.add(`${direction}-description`);
        expect(labels).toHaveLength(4);
        expect(labels.filter(label => label.includes('hundreds'))).toHaveLength(2);
        expect(labels.filter(label => label.includes('tens'))).toHaveLength(2);
        expect(labels.some(label => /and \d{2} ones$/.test(label))).toBe(true);
      } else {
        formsSeen.add(`${direction}-numeral`);
        expect(labels).toHaveLength(4);
        expect(labels.every(label => /^\d{2}$/.test(label))).toBe(true);
      }
    }
    expect([...formsSeen].sort()).toEqual(['greatest-numeral', 'greatest-sum', 'smallest-description', 'smallest-numeral']);
  }
  expect([...sumWinnerKinds].sort()).toEqual(['numeral', 'sum']);
});

it('reproduces the complete question from the same seed and index', () => {
  for (const seed of [0, 19, -37]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (const index of [1, 4, 11]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
