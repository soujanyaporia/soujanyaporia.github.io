import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragDerivedPurchase';

// Read only the story and the question. Neither choices nor solution fields supply givens.
function solve(q: Pick<Question, 'context' | 'prompt'>) {
  const story = (q.context ?? []).join(' ');
  const amounts = [...story.matchAll(/\$(\d+)(?:\.(\d{2}))?/g)].map(m => 100 * Number(m[1]) + Number(m[2] ?? 0));
  const [a, b, c] = amounts;
  if (q.prompt === 'How much change does Meera get?') {
    expect(story).toContain('more than the small one');
    expect(story).toContain('just the large sketchpad');
    expect(amounts).toHaveLength(3);
    expect([500, 1000]).toContain(c);
    return { kind: 'change', mcq: true, intermediate: a + b, final: c - a - b };
  }
  if (q.prompt === 'How much of her share does Lina have left?') {
    const count = /^(\d+) children share .* equally/.exec(story);
    if (!count) throw Error('Missing equal-sharing information');
    expect(story).toContain('Lina is one of them');
    expect(amounts).toHaveLength(2);
    const n = Number(count[1]);
    expect(n).toBeGreaterThan(1);
    expect(n).toBeLessThan(10);
    expect(a % (100 * n)).toBe(0);
    return { kind: 'share', mcq: true, intermediate: a / n, final: (a - n * b) / n };
  }
  if (q.prompt === 'How much money did Hana have before she bought the game?') {
    expect(story).toContain('less than the price of the game');
    expect(amounts).toHaveLength(2);
    return { kind: 'start', mcq: false, intermediate: a - b, final: 2 * a - b };
  }
  if (q.prompt === 'How much money does Jia have?') {
    expect(story).toContain('less than Ravi has after he buys the kite');
    expect(amounts).toHaveLength(3);
    return { kind: 'below', mcq: false, intermediate: a - b, final: a - (b + c) };
  }
  throw Error('Unexpected question: ' + q.prompt);
}

const label = (cents: number) => '$' + (cents / 100).toFixed(2);

test('visible amounts determine both the intermediate amount and the single final response', () => {
  const stories = new Map<string, Set<string>>();
  for (let seed = -8; seed <= 31; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const s = solve(q);
      expect(s.intermediate).toBeGreaterThan(0);
      expect(s.final).toBeGreaterThan(0);
      expect(Number.isSafeInteger(s.final)).toBe(true);
      expect(q.workedSteps?.map(step => step.equation?.split(' = ')[1])).toEqual([label(s.intermediate), label(s.final)]);
      if (s.mcq) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.every(choice => /^\$\d+\.\d{2}$/.test(choice))).toBe(true);
        expect(q.choices?.filter(choice => choice === label(s.final))).toHaveLength(1);
        expect(q.answer).toBe(label(s.final));
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(label(s.final).slice(1));
      }
      const seen = stories.get(s.kind) ?? new Set<string>();
      seen.add(q.context!.join(' '));
      stories.set(s.kind, seen);
    }
  }
  expect([...stories.keys()].sort()).toEqual(['below', 'change', 'share', 'start']);
  for (const seen of stories.values()) expect(seen.size).toBeGreaterThan(8);
});

test('replaying a seed and index preserves the story and the order of choices', () => {
  for (const seed of [-17, 0, 53]) {
    const first = Array.from({ length: 4 }, (_, i) => makeRagQuestion(seed, i));
    expect(new Set(first.map(q => q.prompt)).size).toBe(4);
    expect(first).toEqual(Array.from({ length: 4 }, (_, i) => makeRagQuestion(seed, i)));
    expect(makeRagQuestion(seed)).toEqual(first[0]);
  }
});
