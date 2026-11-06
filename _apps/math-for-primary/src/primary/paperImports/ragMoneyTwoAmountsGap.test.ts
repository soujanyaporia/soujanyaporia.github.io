import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragMoneyTwoAmountsGap';

function readCents(line: string | undefined, pattern: RegExp): number {
  const match = pattern.exec(line ?? '');
  if (!match) throw new Error(`Missing price or comparison in: ${line}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

function dollars(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

test('solves the purchase from the two printed givens and checks both worked additions', () => {
  const carries = new Set<boolean>();
  const totals = new Set<number>();
  for (let seed = -8; seed < 40; seed++) {
    for (const index of [0, 1, 5]) {
      const q = makeRagQuestion(seed, index);
      const helmet = readCents(q.context?.[0], /^A helmet costs \$(\d+)\.(\d{2})\.$/);
      const extra = readCents(q.context?.[1], /^A scooter costs \$(\d+)\.(\d{2}) more than the helmet\.$/);
      expect(helmet).toBeGreaterThan(0);
      expect(extra).toBeGreaterThan(0);
      expect(q.prompt).toContain('one helmet and one scooter cost together');
      expect(q.unit).toBe('dollars');
      expect(q.structuredResponse).toBeUndefined();
      expect(q.choices).toBeUndefined();

      // The purchase contains two helmet-price amounts and one extra amount.
      const total = 2 * helmet + extra;
      const scooter = total - helmet;
      expect(q.answer).toBe(dollars(total));
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `$${dollars(helmet)} + $${dollars(extra)} = $${dollars(scooter)}`,
        `$${dollars(helmet)} + $${dollars(scooter)} = $${dollars(total)}`,
      ]);
      carries.add((helmet % 100) + (extra % 100) >= 100);
      totals.add(total);
    }
  }
  expect(carries.size).toBe(2);
  expect(totals.size).toBeGreaterThan(12);
});

test('replays the same question and varies the visible givens by seed and index', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  expect(makeRagQuestion(31, 4)).toEqual(makeRagQuestion(31, 4));
  const bySeed = new Set<string>();
  const byIndex = new Set<string>();
  for (let n = 0; n < 12; n++) {
    bySeed.add(JSON.stringify(makeRagQuestion(n, 0).context));
    byIndex.add(JSON.stringify(makeRagQuestion(31, n).context));
  }
  expect(bySeed.size).toBeGreaterThan(1);
  expect(byIndex.size).toBeGreaterThan(1);
});
