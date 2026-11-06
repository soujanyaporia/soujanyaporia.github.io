import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragP4RoundCalculatedCounts';

const numbers = (text: string) => (text.match(/\d+(?:,\d{3})*/g) ?? []).map(token => Number(token.replace(/,/g, '')));
const questions = Array.from({ length: 360 }, (_, i) => makeRagQuestion(Math.floor(i / 6) - 10, i % 6));

// Compare distances to the two neighbours, giving the upper neighbour the tie.
function nearest(value: number, place: number): number {
  const down = value % place;
  const up = place - down;
  return down < up ? value - down : value + up;
}

test('exactly one visible choice is in the target rounding interval', () => {
  const places = new Set<number>();
  const endpoints = new Set<string>();
  for (const q of questions.filter(item => item.prompt.startsWith('Round each choice'))) {
    const givens = numbers(q.prompt);
    expect(givens).toHaveLength(2);
    const [place, target] = givens;
    places.add(place);
    expect(target % place).toBe(0);
    const choices = (q.choices ?? []).map(Number);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices.every(n => Number.isInteger(n) && n > 0 && n <= 100000)).toBe(true);
    const low = target - place / 2;
    const high = target + place / 2;
    const matches = choices.filter(n => low <= n && n < high);
    expect(matches).toHaveLength(1);
    expect(q.answer).toBe(String(matches[0]));
    if (matches[0] === low) endpoints.add('lower halfway');
    if (matches[0] === high - 1) endpoints.add('last integer');
  }
  expect(places).toEqual(new Set([10, 100, 1000]));
  expect(endpoints.size).toBe(2);
});

test('solves each calculation from its expression or story before rounding', () => {
  const forms = new Set<string>();
  const positions = new Set<string>();
  const earlyRoundingErrors = new Set<string>();
  for (const q of questions.filter(item => !item.prompt.startsWith('Round each choice'))) {
    const precision = numbers(q.prompt);
    expect(precision).toHaveLength(1);
    const [place] = precision;
    const story = (q.context ?? []).join(' ');
    let exact: number;
    let roundedFirst: number;
    let operation: string;
    if (story.includes('twice as many')) {
      expect(q.prompt).toContain('on Tuesday');
      const givens = numbers(story);
      expect(givens).toHaveLength(1);
      const [monday] = givens;
      expect(monday).toBeGreaterThanOrEqual(1000);
      expect(monday).toBeLessThan(10000);
      exact = monday + monday;
      roundedFirst = 2 * nearest(monday, place);
      operation = 'double';
      forms.add('double');
      expect(place).toBe(1000);
      expect(q.unit).toBe('leaflets');
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(String(nearest(exact, place)));
    } else {
      if (q.display) {
        expect(q.display).toMatch(/^[\d,]+ \+ [\d,]+$/);
        expect(place).toBe(10);
        expect(q.unit).toBeUndefined();
        forms.add('written sum');
      } else {
        expect(story).toContain('more beads');
        expect(q.unit).toBe('beads');
        expect(place).toBe(1000);
        forms.add('delivery');
      }
      const givens = numbers(q.display ?? story);
      expect(givens).toHaveLength(2);
      const [first, second] = givens;
      exact = first + second;
      roundedFirst = nearest(first, place) + nearest(second, place);
      operation = 'sum';
      expect(q.choices).toBeUndefined();
    }
    expect(exact).toBeGreaterThan(0);
    expect(exact).toBeLessThanOrEqual(100000);
    const expected = nearest(exact, place);
    expect(q.answer).toBe(String(expected));
    expect(exact).not.toBe(expected);
    const remainder = exact % place;
    positions.add(remainder * 2 === place ? 'halfway' : expected < exact ? 'down' : 'up');
    if (roundedFirst !== expected) earlyRoundingErrors.add(operation);
  }
  expect(forms).toEqual(new Set(['double', 'written sum', 'delivery']));
  expect(positions).toEqual(new Set(['down', 'halfway', 'up']));
  expect(earlyRoundingErrors).toEqual(new Set(['sum', 'double']));
});

test('replays a seed and produces varied visible questions over indices', () => {
  const session = Array.from({ length: 12 }, (_, i) => makeRagQuestion(83, i));
  expect(session).toEqual(Array.from({ length: 12 }, (_, i) => makeRagQuestion(83, i)));
  const visible = session.map(q => JSON.stringify([q.prompt, q.context, q.display, q.choices]));
  expect(new Set(visible).size).toBeGreaterThan(1);
});
