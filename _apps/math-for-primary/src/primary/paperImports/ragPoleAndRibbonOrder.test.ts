import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPoleAndRibbonOrder';

// Read only the child's position key, prompt and grid. Rows run down the page.
function measure(q: Question) {
  const p = q.picture;
  if (!p || p.type !== 'grid-drawing') throw Error('Missing comparison grid');
  const key = q.context?.find(s => s.startsWith('From '));
  const match = /^From (left to right|top to bottom): ([A-Z](?:, [A-Z])+)\.$/.exec(key ?? '');
  if (!match) throw Error('Missing position key');
  const vertical = match[1] === 'left to right', tags = match[2].split(', ');
  const axis = vertical ? 1 : 0, across = vertical ? 0 : 1;
  const lines = [...p.segments].sort((a, b) => a[0][across] - b[0][across]);
  expect(q.context).toContain('Each gap between dots along a line stands for 1 unit.');
  expect(lines).toHaveLength(tags.length);
  expect(new Set(tags).size).toBe(tags.length);
  expect(new Set(lines.map(s => s[0][across])).size).toBe(lines.length);
  const spans = lines.map(([a, b], i) => {
    expect(a[across]).toBe(b[across]);
    for (const [x, y] of [a, b]) {
      expect(Number.isInteger(x) && x >= 0 && x <= p.columns).toBe(true);
      expect(Number.isInteger(y) && y >= 0 && y <= p.rows).toBe(true);
    }
    return {tag: tags[i], start: Math.min(a[axis], b[axis]), end: Math.max(a[axis], b[axis]),
      units: Math.abs(a[axis] - b[axis])};
  });
  expect(new Set(spans.map(s => s.units)).size).toBe(tags.length);
  expect(spans.every(s => s.units >= 2 && s.units <= 8)).toBe(true);
  if (vertical) {
    expect(new Set(spans.map(s => s.start)).size).toBe(1);
    for (const [a, b] of lines) {
      const foot = Math.max(a[1], b[1]), x = a[0];
      expect(p.givenSegments?.some(([u, v]) => u[1] === foot && v[1] === foot &&
        Math.min(u[0], v[0]) <= x && x <= Math.max(u[0], v[0]))).toBe(true);
    }
  } else {
    const longest = Math.max(...spans.map(s => s.units));
    expect(spans.find(s => s.units === longest)!.end).toBeLessThan(Math.max(...spans.map(s => s.end)));
  }
  return {spans, tags, vertical};
}

function solve(q: Question) {
  const {spans, tags, vertical} = measure(q);
  const find = (tag: string) => {
    const obj = spans.find(s => s.tag === tag);
    if (!obj) throw Error('Unknown letter in prompt: ' + tag);
    return obj.units;
  };
  if (q.prompt.startsWith('Which pole')) {
    expect(vertical).toBe(true);
    const m = /taller than ([A-Z])(?: but shorter than ([A-Z]))?\?$/.exec(q.prompt);
    if (!m) throw Error('Missing comparison bounds');
    const hits = tags.filter(t => find(t) > find(m[1]) && (!m[2] || find(t) < find(m[2])));
    expect(hits).toHaveLength(1);
    expect([...(q.choices ?? [])].sort()).toEqual([...tags].sort());
    return {kind: m[2] ? 'between' : 'taller', answer: hits[0]};
  }
  const start = /^Start with ribbon ([A-Z])\./.exec(q.prompt);
  if (start) {
    expect(vertical).toBe(false);
    expect(q.prompt).toContain('shorter to longer');
    const pairs = tags.flatMap(a => tags.filter(b => find(start[1]) < find(a) && find(a) < find(b)).map(b => [a, b]));
    expect(pairs).toHaveLength(1);
    expect([...(q.order ?? [])].sort()).toEqual(tags.filter(t => t !== start[1]).sort());
    return {kind: 'chain', answer: pairs[0].join(',')};
  }
  expect(q.prompt).toContain(vertical ? 'shortest pole first' : 'longest ribbon first');
  expect([...(q.order ?? [])].sort()).toEqual([...tags].sort());
  const rank = tags.map(t => ({tag: t, before: tags.filter(u => vertical ? find(u) < find(t) : find(u) > find(t)).length}));
  return {kind: vertical ? 'poles-' + tags.length : 'ribbons', answer: rank.sort((a, b) => a.before - b.before).map(s => s.tag).join(',')};
}

describe('pole and ribbon comparisons', () => {
  it('recovers every response from the displayed intervals and the requested direction or bounds', () => {
    const seen = new Set<string>();
    for (const seed of [-23, 0, 5, 81, 432, 9107]) {
      for (let index = 0; index < 18; index++) {
        const q = makeRagQuestion(seed, index), solution = solve(q);
        seen.add(solution.kind);
        expect(q.answer).toBe(solution.answer);
        expect(q).toEqual(makeRagQuestion(seed, index));
      }
    }
    expect([...seen].sort()).toEqual(['between', 'chain', 'poles-3', 'poles-4', 'ribbons', 'taller']);
  });

  it('keeps the same poles and position key for the linked taller-than question', () => {
    for (let seed = 1; seed <= 16; seed++) {
      const qs = Array.from({length: 6}, (_, i) => makeRagQuestion(seed, i));
      const i = qs.findIndex(q => /^Which pole is taller than [A-Z]\?$/.test(q.prompt));
      expect(i).toBeGreaterThan(0);
      const first = qs[i - 1], next = qs[i];
      expect(first.picture).toEqual(next.picture);
      expect(first.context).toEqual(next.context);
      const rank = solve(first);
      expect(rank.kind).toBe('poles-3');
      const [, middle, tallest] = rank.answer.split(',');
      expect(next.prompt).toContain('taller than ' + middle + '?');
      expect(solve(next).answer).toBe(tallest);
    }
  });
});
