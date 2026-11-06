import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragNamedPlaceValueChanges';

const valueOf: Record<string, number> = {
  ten: 10, tens: 10, hundred: 100, hundreds: 100, thousand: 1000, thousands: 1000,
};

type Solution = { form: string; value: number; unit?: string };

function solve(prompt: string): Solution {
  const forward = /^Begin at (\d+) and count on (\d+) (tens|hundreds|thousands)\. Where do you finish\?$/.exec(prompt);
  if (forward) {
    let position = Number(forward[1]);
    for (let jump = 0; jump < Number(forward[2]); jump++) position += valueOf[forward[3]];
    return { form: 'increase', value: position };
  }

  const backward = /^Which number is one (ten|hundred|thousand) less than (\d+)\?$/.exec(prompt);
  if (backward) return { form: 'one-less', value: Number(backward[2]) - valueOf[backward[1]] };

  const gap = /^How many (tens|hundreds|thousands) must you add to (\d+) to reach (\d+)\?$/.exec(prompt);
  if (gap) {
    const difference = Number(gap[3]) - Number(gap[2]);
    const step = valueOf[gap[1]];
    expect(difference).toBeGreaterThan(0);
    expect(difference % step).toBe(0);
    return { form: 'count', value: difference / step, unit: gap[1] };
  }

  const sum = /^Start at (\d+)\. Add (\d+) thousands and (\d+) tens\. Which number do you reach\?$/.exec(prompt);
  if (sum) {
    const tensToAdd = Number(sum[2]) * 100 + Number(sum[3]);
    expect(Number(sum[3])).toBeGreaterThan(9);
    return { form: 'mixed-sum', value: Number(sum[1]) + 10 * tensToAdd };
  }
  throw new Error(`Cannot solve prompt: ${prompt}`);
}

it('solves all four forms from the visible givens and checks their response requirements', () => {
  for (let seed = -8; seed <= 40; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solve(q.prompt);
      forms.add(solved.form);
      expect(q.answer).toBe(String(solved.value));
      expect(q.unit).toBe(solved.unit);
      for (const given of q.prompt.match(/\d+/g) ?? []) {
        expect(Number(given)).toBeGreaterThan(0);
        expect(Number(given)).toBeLessThan(10000);
      }
      if (solved.form !== 'count') {
        expect(solved.value).toBeGreaterThanOrEqual(1000);
        expect(solved.value).toBeLessThan(10000);
      }
      if (solved.form === 'mixed-sum') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(choice => Number(choice) === solved.value)).toHaveLength(1);
      } else {
        expect(q.choices).toBeUndefined();
      }
    }
    expect([...forms].sort()).toEqual(['count', 'increase', 'mixed-sum', 'one-less']);
  }
});

it('replays the same question and varies the visible givens within each form', () => {
  const prompts = new Map<string, Set<string>>();
  for (let seed = 0; seed < 32; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const { form } = solve(q.prompt);
      const seen = prompts.get(form) ?? new Set<string>();
      seen.add(q.prompt);
      prompts.set(form, seen);
    }
  }
  expect(prompts.size).toBe(4);
  for (const seen of prompts.values()) expect(seen.size).toBeGreaterThan(8);
});
