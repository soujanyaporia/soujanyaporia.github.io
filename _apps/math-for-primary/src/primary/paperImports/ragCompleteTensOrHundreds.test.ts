import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragCompleteTensOrHundreds';

it('solves each form using the displayed numbers and the unit asked for', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 120; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expression = /^(\d+)(?: ([+÷]) (\d+))?$/.exec(q.display ?? '');
      const requested = /\bcomplete (tens|hundreds)\b/.exec(q.prompt);
      if (!expression || !requested) throw new Error(`Unclear givens in ${q.key}`);
      const first = Number(expression[1]);
      const operation = expression[2];
      const unit = requested[1];
      let total = first;
      if (operation === '+') {
        forms.add('sum');
        const second = Number(expression[3]);
        expect([first, second].every(n => n >= 1000 && n <= 9999)).toBe(true);
        expect(first % 100 + second % 100).toBe(100);
        total = first + second;
        expect(total).toBeLessThanOrEqual(10000);
        expect(unit).toBe('hundreds');
      } else if (operation === '÷') {
        forms.add('quotient');
        const divisor = Number(expression[3]);
        expect(first).toBeGreaterThanOrEqual(100);
        expect(first).toBeLessThanOrEqual(999);
        expect(divisor).toBeGreaterThanOrEqual(2);
        expect(divisor).toBeLessThanOrEqual(9);
        expect(first % divisor).toBe(0);
        total = first / divisor;
        expect(total % 10).toBe(0);
        expect(unit).toBe('tens');
      } else {
        forms.add('number');
        expect(first).toBeGreaterThanOrEqual(100);
        expect(first).toBeLessThanOrEqual(999);
        expect(first % 10).toBeGreaterThan(0);
        expect(unit).toBe('tens');
      }

      const size = unit === 'tens' ? 10 : 100;
      let groups = 0;
      for (let remaining = total; remaining >= size; remaining -= size) groups++;
      const expected = String(groups);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBe(unit);
      if (operation) {
        expect(q.choices).toBeUndefined();
        expect(q.workedSteps?.[0].equation).toBe(`${q.display} = ${total}`);
      } else {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        expect(q.choices).toContain(String(groups % 10));
      }
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${groups * size} ÷ ${size} = ${groups}`);
    }
  }
  expect(forms).toEqual(new Set(['number', 'quotient', 'sum']));
});

it('reproduces a question and varies the visible givens across indices', () => {
  const displays = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(47, index);
    expect(makeRagQuestion(47, index)).toEqual(q);
    displays.add(q.display!);
  }
  expect(displays.size).toBeGreaterThan(8);
});
