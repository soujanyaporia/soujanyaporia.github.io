import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4FixedFractionChanges';

// One whole split into enough equal parts to read any allowed denominator exactly.
const whole = 27720;
function readNumber(text: string): number {
  if (/^\d+$/.test(text)) return Number(text) * whole;
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(text);
  if (!m) throw new Error(`Cannot read amount ${text}`);
  const d = Number(m[3]);
  expect(d).toBeGreaterThan(0);
  expect(d).toBeLessThanOrEqual(12);
  expect(whole % d).toBe(0);
  return Number(m[1] ?? 0) * whole + Number(m[2]) * (whole / d);
}

function answerText(value: number): string {
  const units = Math.floor(value / whole);
  const rest = value % whole;
  if (!rest) return String(units);
  for (let d = 2; d <= 12; d++) {
    if ((rest * d) % whole === 0) {
      const part = `${rest * d / whole}/${d}`;
      return units ? `${units} ${part}` : part;
    }
  }
  throw new Error('Answer requires a denominator outside the intended range');
}

function solveVisibleStory(q: Question) {
  let start: number | undefined;
  let end: number | undefined;
  const changes: number[] = [];
  const denominators = new Set<string>();
  for (const line of q.context ?? []) {
    const m = /\b(\d+(?:\/\d+)?) (kg|L|m)\b/.exec(line);
    if (!m) continue;
    expect(q.unit).toBe(m[2]);
    const amount = readNumber(m[1]);
    expect(amount).toBeGreaterThan(0);
    if (m[1].includes('/')) denominators.add(m[1].split('/')[1]);
    if (line.includes('started with')) start = amount;
    else if (/left in the can|left on the roll|then had exactly/.test(line)) end = amount;
    else if (/into the can|added/.test(line)) changes.push(amount);
    else if (/took|out to water|used|cut off/.test(line)) changes.push(-amount);
    else throw new Error(`Unrecognised measured event: ${line}`);
  }
  expect(denominators.size).toBe(2);
  expect([start, end].filter(n => n !== undefined)).toHaveLength(1);
  const netChange = changes.reduce((sum, change) => sum + change, 0);
  const initial = start ?? (end! - netChange);
  let stock = initial;
  expect(stock).toBeGreaterThan(0);
  for (const change of changes) {
    stock += change;
    expect(stock).toBeGreaterThan(0);
  }
  if (end !== undefined) expect(stock).toBe(end);
  expect(q.prompt).toMatch(start === undefined ? /before/ : /left/);
  const signs = changes.map(delta => delta > 0 ? '+' : '-').join('');
  return { shape: `${start === undefined ? 'end' : 'start'}:${signs}`, value: start === undefined ? initial : stock };
}

function equationValue(side: string): number {
  const [left, sign, right] = side.split(/ ([+−]) /);
  if (!sign) return readNumber(left);
  return sign === '+' ? readNumber(left) + readNumber(right) : readNumber(left) - readNumber(right);
}

test('each visible story has one recoverable amount and correct worked equations', () => {
  const answers = new Map<string, Set<string>>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { shape, value } = solveVisibleStory(q);
      const expected = answerText(value);
      expect(q.answer).toBe(expected);
      expect(q.choices).toBeUndefined();
      expect(q.picture).toBeUndefined();
      const mixedRequired = shape === 'end:--+';
      expect(Boolean(q.requireMixed)).toBe(mixedRequired);
      expect(Boolean(q.requireSimplified)).toBe(mixedRequired);
      if (mixedRequired) {
        expect(expected).toMatch(/^1 \d+\/\d+$/);
        expect(q.prompt).toMatch(/mixed number in simplest form/);
      }
      const steps = q.workedSteps ?? [];
      expect(steps.length).toBe(mixedRequired ? 3 : 2);
      for (const step of steps) {
        const values = step.equation!.split(' = ').map(equationValue);
        expect(values.length).toBeGreaterThan(1);
        expect(new Set(values).size).toBe(1);
      }
      expect(equationValue(steps[steps.length - 1].equation!.split(' = ').pop()!)).toBe(value);
      if (!answers.has(shape)) answers.set(shape, new Set());
      answers.get(shape)!.add(expected);
    }
  }
  expect([...answers.keys()].sort()).toEqual(['end:+-', 'end:--', 'end:--+', 'start:--']);
  for (const distinct of answers.values()) expect(distinct.size).toBeGreaterThan(3);
});

test('a seed and index reproduce the item and consecutive indices cover the four balances', () => {
  for (const seed of [-17, 0, 451]) {
    const shapes = new Set<string>();
    for (let index = 8; index < 12; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      shapes.add(solveVisibleStory(q).shape);
    }
    expect(shapes.size).toBe(4);
  }
});
