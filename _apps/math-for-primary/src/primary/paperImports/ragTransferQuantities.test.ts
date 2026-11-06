import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragTransferQuantities';

function readCount(sentence: string, pattern: RegExp): number {
  const match = pattern.exec(sentence);
  if (!match) throw new Error(`Missing or ambiguous count in: ${sentence}`);
  return Number(match[1]);
}

// Try possible starting piles and play the gift forward using only the pupil's text.
function solveVisible(context: string[], prompt: string) {
  expect(context).toHaveLength(3);
  const [first = '', transfer = '', last = ''] = context;
  const gift = readCount(transfer, /^Rani gave (\d+) stickers to Ben\.$/);
  expect(gift).toBeGreaterThan(0);
  const equalStart = first === 'Rani and Ben started with equal numbers of stickers.';
  const known = equalStart
    ? readCount(last, /^Ben counted (\d+) stickers after that\.$/)
    : readCount(first, /^Rani started with (\d+) stickers\.$/);
  const equalEnd = last === 'They each had the same number of stickers after that.';
  const excess = equalStart || equalEnd ? 0 : readCount(last, /^After that, Rani had (\d+) more stickers than Ben\.$/);
  if (!equalStart && !equalEnd) expect(excess).toBeGreaterThan(0);
  const asksTotal = prompt === 'How many stickers did the two children have altogether at the start?';
  if (equalStart && !asksTotal) expect(prompt).toBe('How many stickers did Rani have left?');
  if (!equalStart) expect(prompt).toBe('How many stickers did Ben have before Rani gave him any?');

  const solutions: number[] = [];
  // Ben's start cannot exceed his known final count, or the giver's start when the giver finishes level or ahead.
  for (let benStart = 0; benStart <= known; benStart++) {
    const raniStart = equalStart ? benStart : known;
    const raniEnd = raniStart - gift;
    const benEnd = benStart + gift;
    if (raniEnd < 0) continue;
    if (equalStart ? benEnd !== known : raniEnd - benEnd !== excess) continue;
    for (const count of [raniStart, benStart, raniEnd, benEnd, raniStart + benStart]) {
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10000);
    }
    solutions.push(asksTotal ? raniStart + benStart : equalStart ? raniEnd : benStart);
  }
  expect(solutions).toHaveLength(1);
  const form = equalStart ? (asksTotal ? 'combined start' : 'giver left') : (equalEnd ? 'equal finish' : 'giver ahead');
  return { answer: String(solutions[0]), form };
}

test('the visible clues determine one count in each of the four transfer stories', () => {
  const stories = new Set<string>();
  for (let seed = -8; seed < 40; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const context = q.context ?? [];
      const solution = solveVisible(context, q.prompt);
      expect(q.answer).toBe(solution.answer);
      expect(q.unit).toBe('stickers');
      expect(q.picture).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      forms.add(solution.form);
      stories.add([...context, q.prompt].join(' '));
    }
    expect(forms.size).toBe(4);
  }
  expect(stories.size).toBeGreaterThan(48);
});

test('a seed and index reproduce the same question', () => {
  expect(makeRagQuestion(63)).toEqual(makeRagQuestion(63, 0));
  expect(makeRagQuestion(-19, 7)).toEqual(makeRagQuestion(-19, 7));
});
