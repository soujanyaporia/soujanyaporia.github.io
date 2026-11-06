import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragMoneyPartsAndTotal';

function dollarEntry(cents: number): string {
  const whole = Math.floor(cents / 100);
  return `${whole}.${String(cents % 100).padStart(2, '0')}`;
}

it('solves each visible question across seeds and checks both requested units', () => {
  const jarCases = new Set<string>();
  const dailyCases = new Set<string>();
  for (let seed = -24; seed <= 24; seed++) {
    for (const index of [0, 1, 2, 3]) {
      const q = makeRagQuestion(seed, index);
      const story = q.context?.join(' ') ?? '';
      const jar = /^Mei wants to save \$(\d+) in her jar\. She has put (\d+)¢ in the jar so far\.$/.exec(story);
      if (jar) {
        const goal = Number(jar[1]) * 100;
        const saved = Number(jar[2]);
        expect(goal).toBe(100);
        expect(saved).toBeGreaterThan(0);
        expect(saved).toBeLessThan(goal);
        expect(q.prompt).toMatch(/how much more.*dollars/i);
        expect(q.unit).toBe('dollars');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(dollarEntry(goal - saved));
        jarCases.add(story);
        continue;
      }

      const days = /^Dana saves (\d+)¢ on Friday\. On Saturday she saves (\d+)¢ more than on Friday\.$/.exec(story);
      if (!days) throw Error(`Cannot solve the displayed givens: ${story}`);
      const friday = Number(days[1]);
      const increase = Number(days[2]);
      const saturday = friday + increase;
      const bothDays = friday + saturday;
      expect(increase).toBeGreaterThan(0);
      expect(saturday).toBeLessThan(100);
      expect(bothDays).toBeGreaterThan(100);
      expect(bothDays).toBeLessThan(200);
      expect(q.prompt).toMatch(/number sentence for each part/i);
      const spec = q.structuredResponse;
      if (spec?.kind !== 'number-fields') throw Error('Both parts need answer boxes');
      expect(spec.fields).toEqual([{ label: '(a) Saturday (cents)' }, { label: '(b) Both days (dollars)', decimal: true }]);
      const expected = JSON.stringify([String(saturday), dollarEntry(bothDays)]);
      expect(q.answer).toBe(expected);
      expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(increase), dollarEntry(bothDays)]))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(saturday), String(bothDays)]))).toBe(false);
      dailyCases.add(story);
    }
  }
  expect(jarCases.size).toBeGreaterThan(5);
  expect(dailyCases.size).toBeGreaterThan(5);
});

it('reproduces the same question and offers both tasks in adjacent slots', () => {
  for (const seed of [-5, 0, 1, 82]) {
    const first = makeRagQuestion(seed);
    const second = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    expect(makeRagQuestion(seed, 1)).toEqual(second);
    expect(first.key).not.toBe(second.key);
    expect([first, second].filter(q => q.structuredResponse)).toHaveLength(1);
  }
});
