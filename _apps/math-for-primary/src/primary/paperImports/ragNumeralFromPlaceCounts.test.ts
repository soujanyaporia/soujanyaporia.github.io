import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragNumeralFromPlaceCounts';

function readCount(prompt: string, place: string): number {
  const match = new RegExp(`\\b(\\d+) ${place}s?\\b`).exec(prompt);
  return match ? Number(match[1]) : 0;
}

it('has exactly one choice equal to the sum of the visible place values', () => {
  const forms = new Set<string>();
  for (let seed = -20; seed < 80; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const h = readCount(q.prompt, 'hundred');
      const t = readCount(q.prompt, 'ten');
      const o = readCount(q.prompt, 'one');
      const expected = h * 100 + t * 10 + o;
      expect([h, t, o].filter(n => n > 0).length).toBeGreaterThanOrEqual(2);
      expect(expected).toBeGreaterThan(0);
      expect(expected).toBeLessThan(1000);
      expect(q.answer).toBe(String(expected));
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices.every(choice => /^[1-9]\d{0,2}$/.test(choice))).toBe(true);
      expect(choices.filter(choice => Number(choice) === expected)).toEqual([String(expected)]);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);

      if (h === 0) {
        expect(o).toBeGreaterThanOrEqual(10);
        forms.add('tens with extra ones');
      } else if (o === 0) {
        forms.add(t >= 10 ? 'hundreds with extra tens' : 'hundreds and tens');
      } else if (t === 0) {
        expect(o).toBeLessThan(10);
        forms.add('hundreds and ones');
      } else {
        forms.add(o >= 10 ? 'all places with extra ones' : 'all places');
      }
    }
  }
  expect(forms).toEqual(new Set([
    'hundreds and tens', 'hundreds with extra tens', 'hundreds and ones',
    'all places', 'tens with extra ones', 'all places with extra ones',
  ]));
});

it('reproduces the same choices and gives varied prompts within a session', () => {
  const prompts = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    prompts.add(q.prompt);
  }
  expect(prompts.size).toBeGreaterThanOrEqual(8);
});
