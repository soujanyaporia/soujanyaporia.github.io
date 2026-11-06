import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragNumeralFromDigitClues';

function read(line: string, pattern: RegExp): number[] {
  const match = pattern.exec(line);
  if (!match) throw new Error(`Unrecognised clue: ${line}`);
  return match.slice(1).map(Number);
}

function search(low: number, high: number, fits: (n: number, h: number, t: number, o: number) => boolean): string[] {
  const matches: string[] = [];
  for (let n = low; n <= high; n++) {
    const h = Math.floor(n / 100);
    const t = Math.floor(n / 10) % 10;
    if (fits(n, h, t, n % 10)) matches.push(String(n));
  }
  return matches;
}

// Solve from the pupil's prompt and clues, without using choices, solution steps or the answer.
function solve(prompt: string, clues: string[]) {
  if (prompt === 'Choose the two-digit number that fits both clues.') {
    expect(clues).toHaveLength(2);
    const [product] = read(clues[0], /^Multiplying the two digits gives (\d+)\.$/);
    const [gap] = read(clues[1], /^The ones digit is (\d+) more than the tens digit\.$/);
    return { form: 'product', matches: search(10, 99, (_n, _h, t, o) => t * o === product && o - t === gap) };
  }

  expect(prompt).toBe('Write the three-digit number that fits all the clues.');
  expect(clues).toHaveLength(3);
  if (clues[0].startsWith('The number is greater')) {
    const [lower, upper] = read(clues[0], /^The number is greater than (\d+) and less than (\d+)\.$/);
    const [knownTens] = read(clues[1], /^There is a (\d+) in the tens place\.$/);
    const [factor] = read(clues[2], /^Multiply the tens digit by (\d+) to get the ones digit\.$/);
    expect(lower % 100).toBe(0);
    expect(upper - lower).toBe(100);
    expect(upper).toBeLessThanOrEqual(1000);
    return { form: 'range', matches: search(100, 999, (n, _h, t, o) => lower < n && n < upper && t === knownTens && o === factor * t) };
  }

  const [gap] = read(clues[0], /^The hundreds digit is (\d+) more than the ones digit\.$/);
  const [factor] = read(clues[1], /^Multiply the hundreds digit by (\d+) to get the tens digit\.$/);
  const [sum] = read(clues[2], /^The three digits add up to (\d+)\.$/);
  const pairsOnly = search(100, 999, (_n, h, t, o) => h - o === gap && t === factor * h);
  expect(pairsOnly.length).toBeGreaterThan(1);
  return { form: 'sum', matches: search(100, 999, (_n, h, t, o) => h - o === gap && t === factor * h && h + t + o === sum) };
}

it('finds exactly one numeral from the visible clues and preserves the response format', () => {
  const seen = new Map<string, Set<string>>();
  for (let seed = -8; seed <= 56; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, matches } = solve(q.prompt, q.context ?? []);
      forms.add(form);
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
      expect(q.unit).toBeUndefined();
      expect(q.picture).toBeUndefined();
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
      if (form === 'product') {
        const choices = q.choices ?? [];
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices.every(value => /^[1-9]\d$/.test(value))).toBe(true);
        expect(choices.filter(value => matches.includes(value))).toEqual(matches);
        expect(choices).toContain(matches[0].split('').reverse().join(''));
      } else {
        expect(q.choices).toBeUndefined();
      }
      const answers = seen.get(form) ?? new Set<string>();
      answers.add(matches[0]);
      seen.set(form, answers);
    }
    expect(forms).toEqual(new Set(['range', 'product', 'sum']));
  }
  for (const answers of seen.values()) expect(answers.size).toBeGreaterThan(3);
});

it('repeats the same clues, choices and working for the same seed and index', () => {
  for (const seed of [-11, 0, 29]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 6; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
