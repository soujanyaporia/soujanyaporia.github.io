import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4PlaceValueDecomposition';

it('solves each response form using only the displayed number, groups and options', () => {
  const forms = new Set<string>();
  const unitSizes: Record<string, number> = { ones: 1, tens: 10, hundreds: 100, thousands: 1000 };
  for (let seed = -12; seed < 48; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const display = q.display ?? '';
      if (/^\d+$/.test(display)) {
        forms.add('unit choice');
        const target = Number(display);
        expect(target).toBeGreaterThan(0);
        expect(target).toBeLessThanOrEqual(100000);
        const options = q.choices ?? [];
        expect(options).toHaveLength(4);
        const names = new Set<string>();
        const counts = new Set<number>();
        const matches = options.filter(option => {
          const term = /^(\d+) (ones|tens|hundreds|thousands)$/.exec(option);
          if (!term) throw new Error(`Unreadable group: ${option}`);
          const count = Number(term[1]);
          names.add(term[2]);
          counts.add(count);
          const value = count * unitSizes[term[2]];
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThanOrEqual(100000);
          return value === target;
        });
        expect(names.size).toBe(4);
        expect(counts.size).toBe(1);
        expect(matches).toHaveLength(1);
        expect(q.answer).toBe(matches[0]);
        continue;
      }

      const groups = /^(\d+) thousands, (\d+) hundreds and (\d+) ones$/.exec(display);
      if (!groups) throw new Error(`Unreadable place-value groups: ${display}`);
      const [thousands, hundreds, ones] = groups.slice(1).map(Number);
      // Read the numeral by carrying complete groups into the next column.
      const thousandsAfterCarry = thousands + Math.floor(hundreds / 10);
      const tensFromOnes = Math.floor(ones / 10);
      expect(tensFromOnes).toBeLessThan(10);
      const numeral = `${thousandsAfterCarry}${hundreds % 10}${tensFromOnes}${ones % 10}`;
      expect(Number(numeral)).toBeLessThanOrEqual(100000);
      expect(q.answer).toBe(numeral);
      expect(q.workedSteps?.at(-1)?.equation?.endsWith(` = ${numeral}`)).toBe(true);
      if (q.choices) {
        forms.add('numeral choice');
        expect(thousands).toBeLessThan(10);
        expect(hundreds).toBeLessThan(10);
        expect(tensFromOnes).toBe(0);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map(Number)).size).toBe(4);
        expect(q.choices.filter(option => Number(option) === Number(numeral))).toHaveLength(1);
        expect(q.choices).toContain(numeral);
      } else {
        forms.add('regrouped entry');
        expect(hundreds).toBeGreaterThanOrEqual(10);
        expect(ones).toBeGreaterThanOrEqual(10);
        expect(q.prompt).toContain('on paper');
      }
    }
  }
  expect(forms).toEqual(new Set(['unit choice', 'numeral choice', 'regrouped entry']));
});

it('reproduces a seed and index and varies the visible givens across a session', () => {
  expect(makeRagQuestion(52)).toEqual(makeRagQuestion(52, 0));
  const displays = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(52, index);
    expect(makeRagQuestion(52, index)).toEqual(q);
    displays.add(q.display ?? '');
  }
  expect(displays.size).toBeGreaterThan(8);
});
