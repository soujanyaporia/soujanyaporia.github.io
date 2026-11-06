import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragGreatestAndSmallestValues';

// Decode only what the child can see. The expected choice keeps its original label.
function readValue(label: string): number {
  if (/^\d+$/.test(label)) return Number(label);
  const words = 'zero one two three four five six seven eight nine'.split(' ');
  if (words.includes(label)) return words.indexOf(label);
  const ones = /^(\d+) ones?$/.exec(label);
  if (ones) return Number(ones[1]);
  const pair = /^(\d+) tens? and (\d+) ones?$/.exec(label);
  if (pair) return 10 * Number(pair[1]) + Number(pair[2]);
  throw new Error(`Unreadable choice: ${label}`);
}

it('has exactly one correct response to each visible prompt', () => {
  const variants = new Set<string>();
  const winningPositions = new Set<number>();
  const winningForms = new Set<string>();
  const numeralTies = new Set<string>();
  for (let seed = -32; seed < 96; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const labels = q.choices ?? q.display?.split(', ');
      if (!labels) throw new Error('Missing comparison list');
      expect(labels).toHaveLength(4);
      const values = labels.map(readValue);
      expect(new Set(values).size).toBe(4);
      expect(values.every(n => Number.isInteger(n) && n >= 1 && n <= 100)).toBe(true);
      const direction = q.prompt.match(/\b(smallest|greatest)\b/g);
      expect(direction).toHaveLength(1);
      const small = direction![0] === 'smallest';
      const winners = labels.filter((_, i) => values.every(v => small ? values[i] <= v : values[i] >= v));
      expect(winners).toHaveLength(1);
      expect(q.answer).toBe(winners[0]);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      if (!q.choices) {
        expect(labels.every(s => /^\d{2}$/.test(s))).toBe(true);
        const winningTen = Math.floor(readValue(winners[0]) / 10);
        const peerCount = values.filter(n => Math.floor(n / 10) === winningTen).length;
        numeralTies.add(`${direction![0]}:${peerCount > 1 ? 'shared' : 'alone'}`);
        variants.add(`numerals:${direction![0]}`);
      } else {
        winningPositions.add(labels.indexOf(winners[0]));
        if (labels.every(s => /^[a-z]+$/.test(s))) {
          variants.add(`words:${direction![0]}`);
        } else {
          const form = (s: string) => /^\d+$/.test(s) ? 'numeral' : !s.includes('ten') ? 'ones' : Number(s.split(' and ')[1].split(' ')[0]) >= 10 ? 'regroup' : 'tens and ones';
          expect(new Set(labels.map(form))).toEqual(new Set(['numeral', 'ones', 'regroup', 'tens and ones']));
          winningForms.add(form(winners[0]));
          variants.add(`mixed:${direction![0]}`);
        }
      }
    }
  }
  expect(variants).toEqual(new Set(['numerals:smallest', 'numerals:greatest', 'mixed:greatest', 'words:smallest']));
  expect(numeralTies.size).toBe(4);
  expect(winningPositions.size).toBe(4);
  expect(winningForms.size).toBe(4);
});

it('replays the same exercise and varies the visible givens for each response form', () => {
  const setsByForm = new Map<string, Set<string>>();
  for (let seed = 0; seed < 24; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const labels = q.choices ?? q.display!.split(', ');
      const form = q.prompt + (labels.some(s => s.includes('ones')) ? ':mixed' : '');
      const seen = setsByForm.get(form) ?? new Set<string>();
      seen.add(labels.map(readValue).sort((a, b) => a - b).join(','));
      setsByForm.set(form, seen);
    }
  }
  expect(setsByForm.size).toBe(4);
  for (const sets of setsByForm.values()) expect(sets.size).toBeGreaterThan(4);
});
