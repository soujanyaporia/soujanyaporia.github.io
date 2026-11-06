import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragPartToWholePercentages';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Variant = 'given-whole' | 'component-counts' | 'several-counts-remaining';

function extract(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens: ${text}`);
  return match.slice(1).map(Number);
}

// This oracle receives only the pupil-visible prompt and context.
// It recovers the counts and solves by testing how many parts out of 100 fit.
function solveVisible(q: VisibleQuestion) {
  const text = (q.context ?? []).join(' ');
  let variant: Variant;
  let whole: number;
  let part: number;
  let counts: number[];

  if (q.prompt === 'What percentage of the tokens are silver?') {
    variant = 'given-whole';
    [whole] = extract(text, /The pouch holds (\d+) tokens in all\./);
    [part] = extract(text, /Among them, (\d+) tokens are silver\./);
    counts = [part, whole - part];
  } else if (q.prompt === 'What percentage of the cards are star cards?') {
    variant = 'component-counts';
    counts = extract(text, /It holds (\d+) circle cards, (\d+) star cards and (\d+) square cards\./);
    whole = counts.reduce((sum, count) => sum + count, 0);
    part = counts[1];
  } else if (q.prompt === 'What percentage of the badges are green?') {
    variant = 'several-counts-remaining';
    [whole] = extract(text, /A carton holds (\d+) badges altogether\./);
    const others = extract(text, /There are (\d+) orange badges and (\d+) purple badges\./);
    part = whole - others[0] - others[1];
    counts = [...others, part];
  } else {
    throw new Error(`Unknown visible task: ${q.prompt}`);
  }

  const solutions = Array.from({length: 99}, (_, i) => i + 1)
    .filter(percent => percent * whole === 100 * part);
  if (solutions.length !== 1) throw new Error('Expected one exact whole-number percentage');
  return {variant, whole, part, counts, expected: solutions[0]};
}

const visibleOnly = (q: Question): VisibleQuestion => ({prompt: q.prompt, context: q.context});

const fixtures: Array<{visible: VisibleQuestion; expected: number}> = [
  {
    visible: {
      prompt: 'What percentage of the tokens are silver?',
      context: ['The pouch holds 60 tokens in all.', 'Among them, 18 tokens are silver.'],
    },
    expected: 30,
  },
  {
    visible: {
      prompt: 'What percentage of the cards are star cards?',
      context: [
        'A tray contains only circle cards, star cards and square cards. Each card has exactly one shape.',
        'It holds 24 circle cards, 36 star cards and 60 square cards.',
      ],
    },
    expected: 30,
  },
  {
    visible: {
      prompt: 'What percentage of the badges are green?',
      context: [
        'A carton holds 140 badges altogether.',
        'Each badge has exactly one colour: orange, purple or green.',
        'There are 49 orange badges and 35 purple badges. All the other badges are green.',
      ],
    },
    expected: 40,
  },
];

describe('part-to-whole percentages', () => {
  test('the visible-givens solver handles three independently specified examples', () => {
    for (const fixture of fixtures) {
      expect(solveVisible(fixture.visible).expected).toBe(fixture.expected);
    }
  });

  test('varied seeds give valid counts, independently correct answers and supported responses', () => {
    const seen = new Map<Variant, Set<string>>();
    const seeds = [...Array.from({length: 101}, (_, i) => i - 50), -2147483648, 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        const visible = visibleOnly(q);
        const solved = solveVisible(visible);
        const signatures = seen.get(solved.variant) ?? new Set<string>();
        signatures.add(JSON.stringify(visible));
        seen.set(solved.variant, signatures);

        expect(q.answer).toBe(String(solved.expected));
        expect(q.unit).toBe('%');
        expect(solved.whole).toBeGreaterThanOrEqual(60);
        expect(solved.whole).toBeLessThanOrEqual(360);
        expect(solved.counts.every(n => Number.isSafeInteger(n) && n > 0)).toBe(true);
        expect(solved.counts.reduce((sum, n) => sum + n, 0)).toBe(solved.whole);
        expect(solved.part).toBeLessThan(solved.whole);
        expect(solved.expected % 5).toBe(0);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps!.at(-1)!.equation).toBe(
          `${solved.part} ÷ ${solved.whole} × 100% = ${solved.expected}%`,
        );
        expect(q.explanation).toContain(`${solved.expected}%`);

        if (solved.variant === 'component-counts') {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.every(value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) < 100)).toBe(true);
          const correctChoices = q.choices!.filter(value => Number(value) * solved.whole === 100 * solved.part);
          expect(correctChoices).toEqual([String(solved.expected)]);
        } else {
          expect(q.choices).toBeUndefined();
        }
      }
    }
    expect([...seen.keys()].sort()).toEqual(['component-counts', 'given-whole', 'several-counts-remaining']);
    for (const signatures of seen.values()) expect(signatures.size).toBeGreaterThan(10);
  });

  test('generation is reproducible and sequential indices exercise all three variants', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('part-to-whole-percentages');
    for (const seed of [-23, 0, 19, 2026]) {
      const variants = new Set<Variant>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        variants.add(solveVisible(visibleOnly(q)).variant);
        keys.add(q.key);
      }
      expect(variants.size).toBe(3);
      expect(keys.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
