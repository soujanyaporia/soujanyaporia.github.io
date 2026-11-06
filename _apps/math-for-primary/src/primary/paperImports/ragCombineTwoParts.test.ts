import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragCombineTwoParts';

const questions = Array.from({ length: 60 }, (_, seed) =>
  [0, 1, 2].map(index => makeRagQuestion(seed, index)),
).flat();

test('add the stated tub count to the collection shown on the mat', () => {
  const pairs = new Set<string>();
  for (const q of questions.filter(item => item.picture)) {
    const match = /There are (\d+) counters in a tub\./.exec(q.context?.join(' ') ?? '');
    if (!match || q.picture?.type !== 'counters') throw new Error('Missing tub count or mat picture');
    const inTub = Number(match[1]);
    const onMat = q.picture.count;
    const expected = inTub + onMat;
    expect(onMat).toBeGreaterThan(0);
    expect(Number.isInteger(onMat)).toBe(true);
    expect(expected).toBeLessThanOrEqual(20);
    expect(q.context?.join(' ').match(/\d+/g)).toEqual([match[1]]);
    expect(q.answer).toBe(String(expected));
    expect(q.unit).toBe('counters');
    expect(q.choices).toBeUndefined();
    expect(q.numberSentence).toBeUndefined();
    expect(q.workedSteps?.at(-1)?.equation).toBe(`${inTub} + ${onMat} = ${expected}`);
    pairs.add(`${inTub},${onMat}`);
  }
  expect(pairs.size).toBeGreaterThan(3);
});

test('use the two colours named in the prompt even when another count lies between them', () => {
  const skippedPositions = new Set<number>();
  for (const q of questions.filter(item => !item.picture && !item.choices)) {
    const requested = /^How many (\w+) and (\w+) buttons/.exec(q.prompt);
    if (!requested) throw new Error('Missing requested colours');
    const colours = requested.slice(1);
    expect(new Set(colours).size).toBe(2);
    const rows = (q.context ?? []).map(line => {
      const row = /^There are (\d+) (\w+) buttons\.$/.exec(line);
      if (!row) throw new Error('Unreadable button count');
      return { colour: row[2], count: Number(row[1]) };
    });
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map(row => row.colour)).size).toBe(3);
    const selected = rows.filter(row => colours.includes(row.colour));
    expect(selected).toHaveLength(2);
    const expected = selected.reduce((sum, row) => sum + row.count, 0);
    expect(expected).toBeLessThanOrEqual(20);
    expect(q.answer).toBe(String(expected));
    expect(q.unit).toBe('buttons');
    expect(q.numberSentence).toBeUndefined();
    skippedPositions.add(rows.findIndex(row => !colours.includes(row.colour)));
  }
  expect([...skippedPositions].sort()).toEqual([0, 1, 2]);
});

function readChoice(label: string): number {
  const values: Record<string, number> = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  };
  const parts = label.split('-');
  const tens = values[parts[0]];
  if (parts.length > 2 || !(tens >= 20)) throw new Error(`Invalid tens in ${label}`);
  if (parts.length === 1) return tens;
  const ones = values[parts[1]];
  if (!(ones >= 1 && ones <= 9)) throw new Error(`Invalid ones in ${label}`);
  return tens + ones;
}

test('exactly one of the four number names equals the displayed sum', () => {
  const totals = new Set<number>();
  for (const q of questions.filter(item => item.choices)) {
    const operands = /^(\d+) \+ (\d+)$/.exec(q.display ?? '');
    if (!operands || !q.choices) throw new Error('Missing sum or choices');
    const [a, b] = operands.slice(1).map(Number);
    const expected = a + b;
    expect(a % 10).toBe(0);
    expect(b % 10).toBeGreaterThan(0);
    expect(expected).toBeLessThan(100);
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices.map(readChoice)).size).toBe(4);
    const matching = q.choices.filter(label => readChoice(label) === expected);
    expect(matching).toHaveLength(1);
    expect(q.answer).toBe(matching[0]);
    expect(q.picture).toBeUndefined();
    totals.add(expected);
  }
  expect(totals.size).toBeGreaterThan(3);
});

test('each seed gives all three tasks in a repeatable order', () => {
  for (const seed of [0, 1, 17, 104]) {
    const modes = [0, 1, 2].map(index => {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      return q.choices ? 'word' : q.picture ? 'count' : 'select';
    });
    expect(modes.sort()).toEqual(['count', 'select', 'word']);
  }
});
