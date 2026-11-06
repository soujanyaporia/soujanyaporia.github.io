import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { makeRagQuestion } from './ragMissingPartOrShortfall';

type Visible = Pick<Question, 'context' | 'picture' | 'prompt'>;
function numbers(s: string, re: RegExp) {
  const match = re.exec(s);
  if (!match) throw new Error(`Cannot find the given in: ${s}`);
  return match.slice(1).map(Number);
}
function readScales(pic: Batch11UpperPicture) {
  const surfaces = pic.marks.flatMap(m => m.kind === 'path' && m.fill ? [m.d] : []);
  expect(surfaces).toHaveLength(2);
  return surfaces.map(path => {
    // Read the water rectangle and the printed ticks, without using the alternative text.
    const xy = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    expect(xy).toHaveLength(8);
    const right = Math.max(...xy.filter((_, i) => i % 2 === 0));
    const surface = Math.min(...xy.filter((_, i) => i % 2 === 1));
    const ticks = pic.marks.flatMap(m => m.kind === 'line' && m.x2 === right && m.y1 === m.y2 ? [m.y1] : []).sort((a, b) => b - a);
    expect(ticks).toHaveLength(11);
    expect(ticks.every((y, i) => y === ticks[0] + i * (ticks[1] - ticks[0]))).toBe(true);
    const labels = pic.marks.flatMap(m => m.kind === 'text' && /^\d+ mL$/.test(m.text) && m.x > right ? [m] : []);
    const nearest = Math.min(...labels.map(m => m.x));
    const column = labels.filter(m => m.x === nearest).sort((a, b) => b.y - a.y);
    expect(column).toHaveLength(3);
    const [zero, middle, maximum] = column.map(m => parseInt(m.text, 10));
    expect(zero).toBe(0);
    expect(middle * 2).toBe(maximum);
    expect(column[0].y - column[1].y).toBe(ticks[0] - ticks[5]);
    expect(column[0].y - column[2].y).toBe(ticks[0] - ticks[10]);
    const mark = ticks.indexOf(surface);
    expect(mark).toBeGreaterThan(0);
    expect(mark).toBeLessThan(10);
    expect(mark).not.toBe(5);
    return mark * maximum / (ticks.length - 1);
  });
}
function split(ml: number) {
  const litres = Math.floor(ml / 1000), rest = ml - 1000 * litres;
  expect(litres).toBeGreaterThan(0);
  expect(rest).toBeGreaterThan(0);
  expect(rest).toBeLessThan(1000);
  return [String(litres), String(rest)];
}
function solve(q: Visible) {
  const text = (q.context ?? []).join(' ');
  if (q.picture?.type === 'batch11-upper') {
    expect(q.prompt).toMatch(/\(a\).*millilitres.*\(b\).*litres and millilitres/);
    const [target] = numbers(text, /needs (\d+) L of water/);
    const amounts = readScales(q.picture), have = amounts[0] + amounts[1];
    return { family: 'beakers', answer: JSON.stringify([String(have), ...split(1000 * target - have)]) };
  }
  if (q.picture?.type === 'paper' && q.picture.layout === 'cards') {
    expect(q.prompt).toMatch(/beans.*grams/);
    const cards = new Map(q.picture.cards.map(c => [c.label, c.value] as const));
    const [kg, g] = numbers(cards.get('Scale reading') ?? '', /^(\d+) kg (\d+) g$/);
    const [rice] = numbers(cards.get('Rice bag') ?? '', /^(\d+) g$/);
    const [oats] = numbers(cards.get('Oats bag') ?? '', /^(\d+) g$/);
    const whole = kg * 1000 + g, remaining = whole - rice - oats;
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1000);
    expect(remaining).toBeGreaterThan(0);
    expect(whole).toBeLessThan(10000);
    return { family: 'bags', answer: String(remaining) };
  }
  expect(q.prompt).toMatch(/more apple juice than pear juice.*litres and millilitres/);
  const [totalL] = numbers(text, /make (\d+) L of fruit punch/);
  const [appleL, appleMl] = numbers(text, /uses (\d+) L (\d+) mL of apple juice/);
  const known = 1000 * appleL + appleMl, whole = totalL * 1000;
  expect(whole - known).toBeGreaterThan(0);
  expect(known).toBeGreaterThan(whole - known);
  // The whole plus the difference is twice the apple juice.
  return { family: 'mixture', answer: JSON.stringify(split(2 * known - whole)) };
}

it('solves every response from what the pupil can read, across seeds and positions', () => {
  const cases = new Map<string, Set<string>>();
  for (let seed = -8; seed <= 31; seed++) {
    const families = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { family, answer } = solve(q);
      expect(q.answer).toBe(answer);
      if (family === 'beakers') expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [{ label: '(a) Total (mL)' }, { label: '(b) Litres (L)' }, { label: '(b) Millilitres (mL)' }] });
      if (family === 'mixture') expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Litres (L)', secondLabel: 'Millilitres (mL)' });
      if (family === 'bags') expect(q.unit).toBe('g');
      families.add(family);
      if (!cases.has(family)) cases.set(family, new Set());
      cases.get(family)!.add(JSON.stringify([q.context, q.picture]));
    }
    expect(families.size).toBe(3);
  }
  for (const examples of cases.values()) expect(examples.size).toBeGreaterThan(8);
});

it('reproduces the same question for a seed and index', () => {
  for (const i of [0, 1, 2, 17]) expect(makeRagQuestion(41, i)).toEqual(makeRagQuestion(41, i));
});
