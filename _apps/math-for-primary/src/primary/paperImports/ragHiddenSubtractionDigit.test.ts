import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragHiddenSubtractionDigit';

function readTable(q: ReturnType<typeof makeRagQuestion>) {
  const picture = q.picture;
  if (picture?.type !== 'nanyang-p4' || picture.layout !== 'table') {
    throw new Error('Expected a subtraction table');
  }
  expect(picture.columns).toEqual(['Hundreds', 'Tens', 'Ones']);
  expect(picture.rows.map(row => row.label)).toEqual(['Start', '− Take away', '= Difference']);
  for (const row of picture.rows) {
    expect(row.values).toHaveLength(3);
    for (const value of row.values) {
      if (value !== null) expect(Number.isInteger(value) && value >= 0 && value <= 9).toBe(true);
    }
  }
  return picture.rows.map(row => row.values);
}

function rowNumber(row: (number | null)[], trial: number) {
  return row.reduce<number>((total, cell) => 10 * total + (cell ?? trial), 0);
}

it('finds exactly one digit by trying every digit in the displayed subtraction', () => {
  const examples = [new Set<string>(), new Set<string>()];
  const digitsSeen = new Set<number>();
  for (let seed = -12; seed < 36; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const rows = readTable(q);
      const [top, lower, result] = rows;
      const shared = lower[0] === null;
      expect(rows.map(row => row.map(cell => cell === null))).toEqual([
        [false, false, true], [shared, false, false], [false, false, false],
      ]);

      const solutions: number[] = [];
      for (let trial = 0; trial <= 9; trial++) {
        const [a, b, c] = rows.map(row => rowNumber(row, trial));
        if (a >= 100 && b >= 100 && c >= 100 && a - b === c) solutions.push(trial);
      }
      expect(solutions).toHaveLength(1);
      const digit = solutions[0];
      expect(q.answer).toBe(String(digit));
      expect(digit).toBeLessThan(Number(lower[2]));
      expect(Number(top[1]) - 1).toBeLessThan(Number(lower[1]));
      const check = `${rowNumber(top, digit)} − ${rowNumber(lower, digit)} = ${rowNumber(result, digit)}`;
      expect(q.workedSteps?.map(step => step.equation)).toContain(check);

      if (shared) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(digit));
        expect(q.choices?.every(option => /^[1-9]$/.test(option))).toBe(true);
      } else {
        expect(q.choices).toBeUndefined();
      }
      examples[Number(shared)].add(JSON.stringify(rows));
      digitsSeen.add(digit);
    }
  }
  for (const examplesOfForm of examples) expect(examplesOfForm.size).toBeGreaterThan(12);
  expect(digitsSeen.size).toBeGreaterThan(5);
});

it('repeats a seed and index exactly and offers both response formats across adjacent indices', () => {
  for (const seed of [0, 8, 27, 96]) {
    const first = makeRagQuestion(seed);
    expect(first).toEqual(makeRagQuestion(seed, 0));
    expect(Boolean(first.choices)).toBe(!makeRagQuestion(seed, 1).choices);
  }
});
