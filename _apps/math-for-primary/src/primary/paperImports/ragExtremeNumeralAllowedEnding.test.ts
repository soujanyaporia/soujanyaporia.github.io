import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragExtremeNumeralAllowedEnding';

// Search whole numbers directly, independently of how the generator arranges the cards.
function solveVisibleQuestion(q: ReturnType<typeof makeRagQuestion>) {
  const aim = q.prompt.match(/\b(greatest|smallest)\b/)?.[1];
  const rule = q.prompt.match(/\b(odd number|even number|multiple of 5)\b/)?.[1];
  if (!aim || !rule || !q.display) throw new Error('The goal, ending rule and digits must be visible.');
  expect(q.prompt).toContain('four-digit');
  expect(q.display).toMatch(/^\d(?:, \d){3,4}$/);
  const cards = q.display.split(', ');
  const available = new Set(cards);
  expect(available.size).toBe(cards.length);
  expect(q.context?.join(' ')).toMatch(cards.length === 5 ? /four of the five.*once/i : /all four.*once/i);

  const divisor = rule === 'multiple of 5' ? 5 : 2;
  const remainder = rule === 'odd number' ? 1 : 0;
  const bestByEnding = new Map<number, number>();
  for (let n = 1000; n <= 9999; n++) {
    if (n % divisor !== remainder) continue;
    const digits = [...String(n)];
    if (new Set(digits).size !== 4 || !digits.every(digit => available.has(digit))) continue;
    const last = n % 10;
    if (aim === 'greatest' || !bestByEnding.has(last)) bestByEnding.set(last, n);
  }
  const ranked = [...bestByEnding.values()].sort((a, b) => a - b);
  expect(ranked.length).toBeGreaterThan(1);
  return {
    expected: aim === 'smallest' ? ranked[0] : ranked[ranked.length - 1],
    comparison: ranked.join(' < '),
    kind: `${aim}/${rule}/${cards.length}`,
    rule,
  };
}

it('finds the required extreme from the visible cards and checks the worked comparison', () => {
  const kinds = new Set<string>();
  const winningFiveEndings = new Set<number>();
  for (let seed = -24; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisibleQuestion(q);
      expect(q.answer).toBe(String(solved.expected));
      expect(q.workedSteps?.at(-1)?.equation).toBe(solved.comparison);
      expect(q.order).toBeUndefined();
      expect(q.choices).toBeUndefined();
      expect(q.unit).toBeUndefined();
      kinds.add(solved.kind);
      if (solved.rule === 'multiple of 5') winningFiveEndings.add(solved.expected % 10);
    }
  }
  expect(kinds).toEqual(new Set(['greatest/odd number/4', 'smallest/even number/4', 'smallest/multiple of 5/4', 'greatest/even number/5']));
  expect(winningFiveEndings).toEqual(new Set([0, 5]));
});

it('replays a seed and index exactly while varying the visible cards across a session', () => {
  const displays = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    displays.add(q.display!);
  }
  expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
  expect(displays.size).toBeGreaterThan(4);
});
