import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragExactMoney';

// Search by taking individual pieces, using the same piece again only if the pupil may do so.
function payments(pool: number[], repeat: boolean, price: number, size?: number) {
  const values = [...pool].sort((a, b) => a - b), result: number[][] = [];
  function take(start: number, left: number, used: number[]) {
    if (!left) {
      if (size === undefined || used.length === size) result.push(used);
      return;
    }
    if (used.length === size) return;
    for (let i = start; i < values.length && values[i] <= left; i++) {
      if (i > start && values[i] === values[i - 1]) continue;
      take(repeat ? i : i + 1, left - values[i], [...used, values[i]]);
    }
  }
  take(0, price, []);
  return result;
}

const cents = (s: string) => Array.from(s.matchAll(/(\d+)¢/g), m => Number(m[1]));
const counts = (xs: number[], values: number[]) => values.map(v => xs.filter(x => x === v).length);
const key = (row: number[]) => row.join(',');
function tokens(q: Question, centsOnly: boolean) {
  if (q.picture?.type !== 'pattern') throw new Error('Missing tray');
  return q.picture.items.map(s => {
    const m = (centsOnly ? /^(\d+)¢$/ : /^\$(\d+)$/).exec(s);
    if (!m || +m[1] <= 0) throw new Error(`Invalid piece in tray: ${s}`);
    return Number(m[1]);
  });
}

function solve(q: Question) {
  const ctx = q.context ?? [], spec = q.structuredResponse;
  if (spec?.kind !== 'number-fields') throw new Error('Missing count or coin fields');
  const labels = spec.fields.map(f => f.label);
  if (q.prompt.includes('$')) {
    const target = Number(q.prompt.match(/\$(\d+)/)![1]);
    const pool = tokens(q, false), ds = labels.map(s => Number(s.match(/\$(\d+)/)![1]));
    expect(ds.slice().sort((a, b) => a - b)).toEqual([...new Set(pool)].sort((a, b) => a - b));
    expect(ctx.join(' ')).toContain('at most once');
    expect(target).toBeLessThanOrEqual(100);
    expect(target).not.toBe(41);
    const ways = payments(pool, false, target), fewest = q.prompt.includes('fewest');
    const min = Math.min(...ways.map(w => w.length));
    const winners = fewest ? ways.filter(w => w.length === min) : ways;
    expect(winners).toHaveLength(1);
    if (fewest) {
      const other = ways.find(w => w.length > min);
      expect(other).toBeDefined();
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(counts(other!, ds).map(String)))).toBe(false);
      expect(payments(ds, true, target).some(p => p.length < min)).toBe(true);
    }
    return { kind: fewest ? 'fewest' : 'notes', row: counts(winners[0], ds) };
  }
  if (q.prompt.includes('each item')) {
    const size = Number(q.prompt.match(/(\d+) coins/)![1]), limited = !!q.picture;
    expect(size).toBe(3);
    expect(ctx.join(' ')).toContain('smallest to largest');
    expect(ctx.join(' ')).toContain(limited ? 'Put them all back' : 'more than once');
    const pool = limited ? tokens(q, true) : cents(ctx.find(line => line.includes('more than once'))!);
    expect([...new Set(pool)].sort((a, b) => a - b)).toEqual([5, 10, 20, 50]);
    const tags = ctx.flatMap(s => {
      const m = /^(\w+): (\d+)¢$/.exec(s);
      return m ? [{name: m[1], price: Number(m[2])}] : [];
    });
    expect(tags).toHaveLength(2);
    expect(tags[0].price).not.toBe(tags[1].price);
    const rows = tags.map(({name, price}, i) => {
      expect([45, 80]).not.toContain(price);
      expect(price).toBeLessThanOrEqual(100);
      expect(labels.slice(i * size, (i + 1) * size)).toEqual(
        Array.from({length: size}, (_, j) => `${name}, coin ${j + 1} (¢)`));
      const ways = payments(pool, !limited, price, size);
      expect(ways).toHaveLength(1);
      return ways[0];
    });
    expect(rows.some(xs => new Set(xs).size < size)).toBe(true);
    return {kind: limited ? 'tray coins' : 'repeatable coins', row: rows.flat()};
  }

  const [target] = cents(q.prompt);
  const ds = cents(ctx.find(s => s.startsWith('Coin counts in each row:'))!);
  expect(ds).toEqual([10, 20, 50]);
  expect(ctx.join(' ')).toContain('any number');
  expect(target).not.toBe(70);
  expect(target).toBeLessThanOrEqual(100);
  const all = payments(ds, true, target).map(p => counts(p, ds));
  const shown = ctx.filter(s => s.startsWith('Shown:')).map(s => s.slice(6).split('|').map(Number));
  expect(shown.length).toBeGreaterThan(0);
  expect(new Set(shown.map(key)).size).toBe(shown.length);
  for (const row of shown) expect(all).toContainEqual(row);
  const missing = all.filter(row => !shown.some(g => key(g) === key(row))).sort((a, b) => a[0] - b[0]);
  expect(missing).toHaveLength(2);
  expect(missing[0][0]).toBeLessThan(missing[1][0]);
  expect(ctx.join(' ')).toContain('fewer 10¢ coins first');
  expect(labels).toEqual([1, 2].flatMap(n => ds.map(v => `Missing row ${n}: ${v}¢ coins`)));
  expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...shown[0], ...missing[1]].map(String)))).toBe(false);
  return {kind: 'missing rows', row: missing.flat()};
}

test('visible trays, price tags and given rows determine the complete response', () => {
  const seen = new Map<string, Set<string>>();
  for (let seed = 0; seed < 48; seed++) for (let i = 0; i < 4; i++) {
    const q = makeRagQuestion(seed, i), {kind, row} = solve(q);
    const value = JSON.stringify(row.map(String));
    expect(q.answer).toBe(value);
    expect(structuredResponseCorrect(q.structuredResponse!, q.answer, value)).toBe(true);
    expect(structuredResponseCorrect(q.structuredResponse!, q.answer,
      JSON.stringify(row.map((v, j) => String(j ? v : v + 1))))).toBe(false);
    if (!seen.has(kind)) seen.set(kind, new Set());
    seen.get(kind)!.add(value);
  }
  expect([...seen.keys()].sort()).toEqual(['fewest', 'missing rows', 'notes', 'repeatable coins', 'tray coins']);
  for (const answers of seen.values()) expect(answers.size).toBeGreaterThan(2);
});

test('a seed and index reproduce the same task, including the displayed inventory', () => {
  for (let i = 0; i < 8; i++) expect(makeRagQuestion(-17, i)).toEqual(makeRagQuestion(-17, i));
});
