import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragTwoTypeCountAndValueTotals';

function readNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given for ${pattern} in ${text}`);
  return match.slice(1).map(Number);
}

// Try every split, including the two endpoints, independently of the worked method.
function solve(count: number, value: number, low: number, high: number): [number, number] {
  expect(count).toBeGreaterThan(1);
  expect(count).toBeLessThanOrEqual(30);
  expect(low).toBeGreaterThan(0);
  expect(high - low).toBeGreaterThan(0);
  expect(high - low).toBeLessThan(10);
  const matches: [number, number][] = [];
  for (let cheap = 0; cheap <= count; cheap++) {
    const dear = count - cheap;
    if (cheap * low + dear * high === value) matches.push([cheap, dear]);
  }
  expect(matches).toHaveLength(1);
  const [cheap, dear] = matches[0];
  expect(Math.min(cheap, dear)).toBeGreaterThan(0);
  return [cheap, dear];
}

function checkQuestion(q: Question): string {
  const text = (q.context ?? []).join(' ');
  if (text.includes('cash box')) {
    const [count, value] = readNumbers(text, /holds (\d+) notes worth \$(\d+) altogether/);
    const [low, high] = readNumbers(text, /either a \$(\d+) note or a \$(\d+) note/);
    const [target] = readNumbers(q.prompt, /^How many \$(\d+) notes/);
    const [cheap, dear] = solve(count, value, low, high);
    expect([2, 5, 10]).toContain(low);
    expect([2, 5, 10]).toContain(high);
    expect([low, high]).toContain(target);
    expect(q.answer).toBe(String(target === high ? dear : cheap));
    expect(q.unit).toBe('notes');
    expect(q.structuredResponse).toBeUndefined();
    return target === high ? 'higher notes' : 'lower notes';
  }
  if (text.includes('badge')) {
    const [low, high] = readNumbers(text, /One badge costs \$(\d+)\. One cap costs \$(\d+)\./);
    const [caps] = readNumbers(text, /Mira buys (\d+) caps/);
    const [count, value] = readNumbers(text, /Zac buys (\d+) items for \$(\d+)/);
    expect(text).toContain('He buys only badges and caps.');
    expect(q.prompt).toMatch(/\(a\).*Mira.*caps\?[\s\S]*\(b\).*badges.*caps.*Zac/);
    const [cheap, dear] = solve(count, value, low, high);
    const expected = [String(caps * high), String(cheap), String(dear)];
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-fields') throw new Error('Expected three labelled answer fields');
    expect(spec.fields.map(field => field.label)).toEqual(['(a) Cost of Mira’s caps (dollars)', '(b) Badges', '(b) Caps']);
    expect(JSON.parse(q.answer)).toEqual(expected);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([(caps * high).toFixed(2), ...expected.slice(1)]))).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected.slice(1)))).toBe(false);
    if (cheap !== dear) {
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0], expected[2], expected[1]]))).toBe(false);
    }
    return 'both item counts';
  }
  const [value, count] = readNumbers(text, /pays \$(\d+) for (\d+) lunch sets/);
  const [high, gap] = readNumbers(text, /A noodle set costs \$(\d+), which is \$(\d+) more than a rice set/);
  const [rice] = solve(count, value, high - gap, high);
  expect(q.prompt).toMatch(/^How many rice sets/);
  expect(q.answer).toBe(String(rice));
  expect(q.unit).toBe('rice sets');
  expect(q.structuredResponse).toBeUndefined();
  return 'stated gap';
}

it('recovers the required counts and shop subtotal using only the visible givens', () => {
  const forms = new Set<string>();
  for (let seed = -5; seed < 45; seed++) {
    for (let index = 0; index < 8; index++) {
      forms.add(checkQuestion(makeRagQuestion(seed, index)));
    }
  }
  expect([...forms].sort()).toEqual(['both item counts', 'higher notes', 'lower notes', 'stated gap']);
});

it('repeats the same question for the same inputs and varies the givens across an activity', () => {
  const seen = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const q = makeRagQuestion(71, index);
    expect(makeRagQuestion(71, index)).toEqual(q);
    seen.add(JSON.stringify(q.context));
  }
  expect(makeRagQuestion(71)).toEqual(makeRagQuestion(71, 0));
  expect(seen.size).toBeGreaterThan(5);
});
