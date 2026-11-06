import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragCombinedWorkRates';

// The solver can access only text and controls visible before answering.
// It does not inspect the stored answer, proof, key, worked steps or RNG.
type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'unit' | 'choices'>;
type Givens =
  | {kind: 'time'; red: number; blue: number; total: number}
  | {kind: 'individual'; minutes: number; total: number; ben: number}
  | {kind: 'claims'; x: number; y: number; interval: number; seconds: number; claimed: number};

function readGivens(q: VisibleQuestion): Givens {
  const text = (q.context ?? []).join('\n');
  const number = (pattern: RegExp): number => {
    const match = text.match(pattern);
    if (!match) throw new Error(`Missing visible given: ${pattern}`);
    return Number(match[1]);
  };
  if (q.prompt === 'How many minutes do the printers need?') {
    return {
      kind: 'time',
      red: number(/The red printer makes (\d+) leaflets per minute\./),
      blue: number(/The blue printer makes (\d+) leaflets per minute\./),
      total: number(/until they have made (\d+) leaflets altogether\./),
    };
  }
  if (q.prompt === 'How many words does Asha type per minute?') {
    return {
      kind: 'individual',
      minutes: number(/They both type for (\d+) minutes,/),
      total: number(/Together they type (\d+) words\./),
      ben: number(/Ben types (\d+) words per minute\./),
    };
  }
  if (!q.prompt.includes('For each statement')) throw new Error('Unrecognised visible task');
  return {
    kind: 'claims',
    x: number(/Machine X prints (\d+) pages every second\./),
    y: number(/Machine Y prints (\d+) pages every \d+ seconds\./),
    interval: number(/Machine Y prints \d+ pages every (\d+) seconds\./),
    seconds: number(/without stopping for (\d+) seconds\./),
    claimed: number(/\(b\) They produce (\d+) pages altogether/),
  };
}

function solveVisible(q: VisibleQuestion): string {
  const g = readGivens(q);
  if (g.kind === 'time') {
    // Accumulate the two outputs separately, rather than using the
    // generator's total-divided-by-combined-rate expression.
    let redOutput = 0;
    let blueOutput = 0;
    for (let minute = 1; minute <= 10000; minute++) {
      redOutput += g.red;
      blueOutput += g.blue;
      if (redOutput + blueOutput === g.total) return String(minute);
      if (redOutput + blueOutput > g.total) throw new Error('Time is not a whole number of minutes');
    }
    throw new Error('No bounded completion time');
  }
  if (g.kind === 'individual') {
    // Subtract Ben's total words first, then search for the whole-number
    // rate whose repeated output accounts for the remaining words.
    let wordsLeft = g.total;
    for (let minute = 0; minute < g.minutes; minute++) wordsLeft -= g.ben;
    for (let rate = 1; rate <= 300; rate++) {
      if (rate * g.minutes === wordsLeft) return String(rate);
    }
    throw new Error('No positive whole-number individual rate');
  }
  if (g.seconds % g.interval !== 0) throw new Error('Incomplete printing interval');
  let outputX = 0;
  let outputY = 0;
  for (let second = 1; second <= g.seconds; second++) {
    outputX += g.x;
    if (second % g.interval === 0) outputY += g.y;
  }
  // Both machines worked for the same duration, so compare their totals.
  const a = outputY > outputX ? 'True' : 'False';
  const b = outputX + outputY === g.claimed ? 'True' : 'False';
  return `(a) ${a}; (b) ${b}`;
}

const seeds = [
  -2147483648, -73, -1, 2026, 2147483647, Number.MAX_SAFE_INTEGER,
  ...Array.from({length: 120}, (_,i) => i),
];
const indices = [0, 1, 4, 17];

function samples(): Question[] {
  return seeds.flatMap(seed => indices.map(index => makeRagQuestion(seed, index)));
}

describe('combined work rates candidate', () => {
  test('independently solves visible givens across seeds and indices', () => {
    const counts = {time: 0, individual: 0, claims: 0};
    for (const q of samples()) {
      const visible: VisibleQuestion = {
        prompt: q.prompt,
        context: q.context,
        unit: q.unit,
        choices: q.choices,
      };
      const expected = solveVisible(visible);
      counts[readGivens(visible).kind]++;
      expect(q.answer).toBe(expected);
    }
    expect(counts.time).toBeGreaterThan(20);
    expect(counts.individual).toBeGreaterThan(20);
    expect(counts.claims).toBeGreaterThan(20);
  });

  test('keeps positive integral quantities, stated shared periods and suitable units', () => {
    for (const q of samples()) {
      const g = readGivens(q);
      const text = (q.context ?? []).join(' ');
      expect(text).toContain('steady rates');
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
      expect(q.workedSteps?.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(40);
      expect(q.picture).toBeUndefined();
      for (const value of Object.values(g)) {
        if (typeof value === 'number') {
          expect(Number.isSafeInteger(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
        }
      }
      if (g.kind === 'time') {
        expect(text).toContain('start together');
        expect(q.unit).toBe('minutes');
        expect(q.choices).toBeUndefined();
        expect((g.red + g.blue) % 10).toBe(0);
        expect(g.total).toBeLessThanOrEqual(10000);
        expect(g.total % (g.red + g.blue)).toBe(0);
        expect(g.total).not.toBe(4000);
      } else if (g.kind === 'individual') {
        expect(text).toContain('starting together');
        expect(text).toContain('without a break');
        expect(q.unit).toBe('words/min');
        expect(q.choices).toBeUndefined();
        expect(g.minutes % 10).toBe(0);
        expect(g.total % g.minutes).toBe(0);
        expect(g.total).toBeGreaterThan(g.ben * g.minutes);
        expect(g.total).toBeLessThanOrEqual(10000);
        expect(g.total).not.toBe(2380);
      } else {
        expect(text).toContain('start together');
        expect(text).toContain('without stopping');
        expect(q.unit).toBeUndefined();
        expect(g.seconds % g.interval).toBe(0);
        expect(g.seconds).toBeLessThanOrEqual(120);
      }
    }
  });

  test('retains both linked judgements and all three response categories', () => {
    const expectedOptions: string[] = [];
    for (const first of ['True', 'False', 'Not possible to tell']) {
      for (const second of ['True', 'False', 'Not possible to tell']) {
        expectedOptions.push(`(a) ${first}; (b) ${second}`);
      }
    }
    const observedAnswers = new Set<string>();
    let hasTie = false;
    let hasNonIntegralUnitRate = false;
    let hasLowFalseClaim = false;
    let hasHighFalseClaim = false;
    for (const q of samples()) {
      const g = readGivens(q);
      if (g.kind !== 'claims') continue;
      expect(q.choices?.slice().sort()).toEqual(expectedOptions.slice().sort());
      expect(new Set(q.choices).size).toBe(9);
      const expected = solveVisible(q);
      expect(q.choices).toContain(expected);
      expect(expected).not.toContain('Not possible to tell');
      observedAnswers.add(expected);
      if (g.y === g.x * g.interval) {
        hasTie = true;
        expect(expected.startsWith('(a) False;')).toBe(true);
      }
      if (g.y % g.interval !== 0) hasNonIntegralUnitRate = true;
      const actual = g.x * g.seconds + g.y * (g.seconds / g.interval);
      if (g.claimed < actual) hasLowFalseClaim = true;
      if (g.claimed > actual) hasHighFalseClaim = true;
    }
    expect([...observedAnswers].sort()).toEqual([
      '(a) False; (b) False',
      '(a) False; (b) True',
      '(a) True; (b) False',
      '(a) True; (b) True',
    ]);
    expect(hasTie).toBe(true);
    expect(hasNonIntegralUnitRate).toBe(true);
    expect(hasLowFalseClaim).toBe(true);
    expect(hasHighFalseClaim).toBe(true);
  });

  test('exports the family metadata and generates reproducible varied questions', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-combined-work-rates');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.01', 'P5.S.RATE.02']);
    expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
    for (const seed of [-73, 0, 37, 2026]) {
      for (const index of indices) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      const visibleQuestions = new Set(Array.from({length: 30}, (_, index) => {
        const q = makeRagQuestion(seed, index);
        return JSON.stringify([q.prompt, q.context]);
      }));
      expect(visibleQuestions.size).toBeGreaterThan(20);
    }
  });
});
