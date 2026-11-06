import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPlaceValueDifferences';

// Keep the named digit where it is and replace every other digit with zero.
function readDigit(n: string, d: string): number {
  expect(n).toMatch(/^[1-9]\d{3}$/);
  expect([...n].filter(ch => ch === d)).toHaveLength(1);
  return Number([...n].map(ch => ch === d ? ch : '0').join(''));
}

function readPrompt(prompt: string) {
  const units = /^Compare (\d+) (tens|hundreds) with (\d+) (tens|hundreds)\. What is the difference between these amounts\?$/.exec(prompt);
  if (units) {
    const [, a, u, b, v] = units;
    expect(u).not.toBe(v);
    expect(Number(u === 'hundreds' ? a : b)).toBeGreaterThan(9);
    const expand = (n: string, unit: string) => Number(n + (unit === 'hundreds' ? '00' : '0'));
    return { form: 'units', left: expand(a, u), right: expand(b, v) };
  }
  const two = /^Look at the (\d) in (\d+) and the (\d) in (\d+)\. How much do their values differ\?$/.exec(prompt);
  if (two) {
    const [, d, n, other, m] = two;
    expect(other).toBe(d);
    expect(n.indexOf(d)).not.toBe(m.indexOf(d));
    return { form: 'two numerals', left: readDigit(n, d), right: readDigit(m, d) };
  }
  const one = /^In (\d+), look at the digits (\d) and (\d)\. What is the difference between their values\?$/.exec(prompt);
  if (!one) throw new Error(`Cannot identify both givens: ${prompt}`);
  const [, n, a, b] = one;
  expect(a).not.toBe(b);
  return { form: 'one numeral', left: readDigit(n, a), right: readDigit(n, b) };
}

it('solves each displayed question before checking its answer, working and response form', () => {
  const directions = new Set<string>();
  for (let seed = -10; seed < 32; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, left, right } = readPrompt(q.prompt);
      forms.add(form);
      directions.add(`${form}:${left > right}`);
      const expected = Math.abs(left - right);
      expect(expected).toBeGreaterThan(0);
      expect(Math.max(left, right)).toBeLessThan(10000);
      expect(q.answer).toBe(String(expected));
      expect(q.workedSteps?.map(s => s.equation?.split(' = ').pop())).toEqual([left, right, expected].map(String));
      expect(q.workedSteps?.[2].equation).toBe(`${Math.max(left, right)} − ${Math.min(left, right)} = ${expected}`);
      if (form === 'two numerals') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices?.map(Number)).size).toBe(4);
        expect(q.choices?.filter(c => Number(c) === expected)).toHaveLength(1);
      } else {
        expect(q.choices).toBeUndefined();
      }
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
    }
    expect(forms.size).toBe(3);
  }
  expect(directions.size).toBe(6);
});

it('replays the same question and varies the visible givens within every form', () => {
  const prompts = new Map<string, Set<string>>();
  for (let seed = 0; seed < 24; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const { form } = readPrompt(q.prompt);
      const seen = prompts.get(form) ?? new Set<string>();
      seen.add(q.prompt);
      prompts.set(form, seen);
    }
  }
  expect(prompts.size).toBe(3);
  for (const seen of prompts.values()) expect(seen.size).toBeGreaterThan(8);
});
