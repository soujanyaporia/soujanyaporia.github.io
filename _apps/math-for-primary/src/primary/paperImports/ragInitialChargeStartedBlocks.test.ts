import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragInitialChargeStartedBlocks';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Givens = {
  kind: 'bicycle' | 'court' | 'fare';
  extent: number;
  included: number;
  block: number;
  initialCents: number;
  blockCents: number;
  repetitions: number;
  start?: number;
  end?: number;
  limit?: number;
};

function visible(q: Question): Visible {
  return {prompt: q.prompt, context: [...(q.context ?? [])]};
}

function capture(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match;
}

function cents(value: string): number {
  const match = capture(/^(\d+)\.(\d{2})$/, value);
  return Number(match[1]) * 100 + Number(match[2]);
}

function metres(value: string): number {
  const match = capture(/^(\d+)\.(\d{3})$/, value);
  return Number(match[1]) * 1000 + Number(match[2]);
}

function minutesAfterMidnight(value: string): number {
  const match = capture(/^(\d{1,2}):(\d{2}) (am|pm)$/, value);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) throw new Error('Invalid visible clock time');
  return (hour % 12) * 60 + minute + (match[3] === 'pm' ? 720 : 0);
}

function readGivens(q: Visible): Givens {
  const text = (q.context ?? []).join('\n');
  if (text.startsWith('Taxi fares for 1 journey:')) {
    const first = capture(/The first (\d+) km or less costs \$(\d+\.\d{2})\./, text);
    const extra = capture(/Each additional (\d+) m costs \$(\d+\.\d{2})\./, text);
    const distance = capture(/travels (\d+\.\d{3}) km/, text);
    const period = capture(/on each weekday, (Monday|Tuesday|Wednesday|Thursday|Friday) to (Monday|Tuesday|Wednesday|Thursday|Friday)\./, text);
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const days = weekdays.indexOf(period[2]) - weekdays.indexOf(period[1]) + 1;
    if (days <= 0) throw new Error('Invalid visible weekday range');
    const weeks = Number(capture(/the month has (\d+) weeks/, text)[1]);
    const perDay = Number(capture(/She makes (\d+) one-way journey/, text)[1]);
    const limit = Number(capture(/journeys of up to (\d+) km/, text)[1]) * 1000;
    return {
      kind: 'fare', extent: metres(distance[1]), included: Number(first[1]) * 1000,
      block: Number(extra[1]), initialCents: cents(first[2]), blockCents: cents(extra[2]),
      repetitions: days * weeks * perDay, limit,
    };
  }
  const first = capture(/The first (\d+) hours? or less costs \$(\d+\.\d{2})\./, text);
  const extra = capture(/Each additional (\d+) minutes costs \$(\d+\.\d{2})\./, text);
  const booking = capture(/(\d+) (bicycles|badminton courts) are (?:rented|booked) from (\d{1,2}:\d{2} (?:am|pm)) to (\d{1,2}:\d{2} (?:am|pm)) on the same day/, text);
  const start = minutesAfterMidnight(booking[3]);
  const end = minutesAfterMidnight(booking[4]);
  return {
    kind: booking[2] === 'bicycles' ? 'bicycle' : 'court',
    extent: end - start, included: Number(first[1]) * 60,
    block: Number(extra[1]), initialCents: cents(first[2]), blockCents: cents(extra[2]),
    repetitions: Number(booking[1]), start, end,
  };
}

// Independently simulate the tariff by visiting each threshold passed.
// Only visible question fields are accepted; no stored answer, steps or generator parameters are read.
function solve(q: Visible): {givens: Givens; oneCents: number; totalCents: number} {
  const givens = readGivens(q);
  if (givens.extent <= 0 || givens.block <= 0) throw new Error('Invalid visible extent or block');
  let oneCents = givens.initialCents;
  for (let threshold = givens.included; threshold < givens.extent; threshold += givens.block) {
    oneCents += givens.blockCents;
  }
  return {givens, oneCents, totalCents: oneCents * givens.repetitions};
}

const inputs = Array.from({length: 192}, (_, i) => i - 96)
  .flatMap(seed => [0, 1, 2, 5, 8, 13].map(index => ({seed, index})));
const samples = inputs.map(({seed, index}) => makeRagQuestion(seed, index));

describe('repeated initial charges and started blocks', () => {
  it('has the required identity and reproduces a question for the same seed and index', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-initial-charge-and-started-blocks');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const allowed = new Set(['P5.S.RATE.02', 'P5.S.DEC.02', 'P4.S.DEC.06']);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
    for (const seed of [-99, 0, 1, 12345, 2147483647]) {
      expect(makeRagQuestion(seed, 7)).toEqual(makeRagQuestion(seed, 7));
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 7).key).not.toBe(makeRagQuestion(seed, 8).key);
    }
  });

  it('independently solves visible prices, clock times, distances and repetition counts across varied seeds', () => {
    for (const q of samples) {
      const expected = solve(visible(q));
      const g = expected.givens;
      expect(q.answer).toBe((expected.totalCents / 100).toFixed(2));
      expect(q.answer).toMatch(/^\d+\.\d{2}$/);
      expect(q.unit).toBe('dollars');
      expect(g.repetitions).toBeGreaterThan(1);
      expect(g.initialCents).toBeGreaterThan(0);
      expect(g.blockCents).toBeGreaterThan(0);
      expect(Number.isSafeInteger(expected.totalCents)).toBe(true);
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.picture).toBeUndefined();
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
      expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
      expect(q.workedSteps!.at(-1)!.equation).toBe(
        `${g.repetitions} × $${(expected.oneCents / 100).toFixed(2)} = $${(expected.totalCents / 100).toFixed(2)}`,
      );
      if (g.kind === 'fare') {
        expect(g.extent).toBeLessThanOrEqual(g.limit!);
        expect(g.repetitions).toBe(20);
        expect(q.context!.join(' ')).toContain('no return journey included');
        expect(q.context!.join(' ')).toContain('There are no other charges.');
      } else {
        expect(g.end!).toBeGreaterThan(g.start!);
        expect(g.end!).toBeLessThan(24 * 60);
        expect(g.repetitions).toBeLessThanOrEqual(5);
        expect(q.context!.join(' ')).toContain('is charged separately');
      }
    }
  });

  it('exercises allowance and block boundaries in both booking settings and fares, including bookings across noon', () => {
    const coverage = new Map<string, Set<string>>();
    let crossesNoon = false;
    for (const q of samples) {
      const g = readGivens(visible(q));
      const cases = coverage.get(g.kind) ?? new Set<string>();
      coverage.set(g.kind, cases);
      const extra = g.extent - g.included;
      if (extra < 0) cases.add('below allowance');
      else if (extra === 0) cases.add('at allowance');
      else if (extra === 1) cases.add('first extra unit');
      else if (extra % g.block === 0) cases.add('exact block');
      else if (extra % g.block === g.block - 1) cases.add('before block end');
      else if (extra % g.block === 1) cases.add('after block end');
      else cases.add('other partial block');
      if (g.start !== undefined && g.end !== undefined && g.start < 720 && g.end >= 720) {
        crossesNoon = true;
      }
    }
    expect([...coverage.keys()].sort()).toEqual(['bicycle', 'court', 'fare']);
    const required = ['below allowance', 'at allowance', 'first extra unit', 'exact block', 'before block end', 'after block end', 'other partial block'];
    for (const cases of coverage.values()) {
      expect([...cases].sort()).toEqual([...required].sort());
    }
    expect(crossesNoon).toBe(true);
    expect(new Set(samples.map(q => JSON.stringify(visible(q)))).size).toBeGreaterThan(100);
  });
});
