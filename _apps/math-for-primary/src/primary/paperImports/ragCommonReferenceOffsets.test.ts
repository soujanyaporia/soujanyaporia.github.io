import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragCommonReferenceOffsets';

const seeds = Array.from({ length: 36 }, (_, i) => i - 12);
const batch = (seed: number) => [0, 1, 2].map(index => makeRagQuestion(seed, index));
const questions = seeds.flatMap(batch);

function read(line: string, pattern: RegExp): string[] {
  const match = pattern.exec(line);
  if (!match) throw new Error(`Could not read the comparison in '${line}'`);
  return match.slice(1);
}

it('uses all three response forms in a repeatable cycle and varies the visible givens', () => {
  for (const seed of seeds) {
    const items = batch(seed);
    expect(items).toEqual(batch(seed));
    expect(new Set(items.map(q => q.prompt)).size).toBe(3);
    for (const q of items) expect(q.picture).toBeUndefined();
  }
  for (const prompt of new Set(questions.map(q => q.prompt))) {
    const contexts = questions.filter(q => q.prompt === prompt).map(q => q.context?.join(' '));
    expect(new Set(contexts).size).toBeGreaterThan(8);
  }
});

it('finds the unique winner from the three visible comparisons', () => {
  const rankings = questions.filter(q => q.prompt === 'Who has the most beads?');
  expect(rankings).toHaveLength(seeds.length);
  const winningRoles = new Set<string>();
  for (const q of rankings) {
    const lines = q.context ?? [];
    expect(lines).toHaveLength(3);
    const [middle, first, base] = read(lines[0], /^(\w+) has (\d+) more beads than (\w+)\.$/);
    const [lower, difference, direct] = read(lines[1], /^(\w+) has (\d+) fewer beads than (\w+)\.$/);
    const [linked, extra, parent] = read(lines[2], /^(\w+) has (\d+) more beads than (\w+)\.$/);
    expect(lower).toBe(base);
    expect(parent).toBe(middle);
    // Give the reference child an arbitrary collection. Changing its size moves all four counts equally.
    const counts = [
      { name: base, count: 100 },
      { name: middle, count: 100 + Number(first) },
      { name: direct, count: 100 + Number(difference) },
      { name: linked, count: 100 + Number(first) + Number(extra) },
    ].sort((a, b) => b.count - a.count);
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(new Set(q.choices)).toEqual(new Set(counts.map(child => child.name)));
    expect(counts[0].count).toBeGreaterThan(counts[1].count);
    expect(q.answer).toBe(counts[0].name);
    winningRoles.add(counts[0].name === direct ? 'direct' : 'linked');
  }
  expect(winningRoles).toEqual(new Set(['direct', 'linked']));
});

it('recovers the common score and grades both point entries in the requested order', () => {
  const pairs = questions.filter(q => q.prompt.startsWith('(a)'));
  expect(pairs).toHaveLength(seeds.length);
  for (const q of pairs) {
    const lines = q.context ?? [];
    const [knownTeam, points] = read(lines[0], /^(Team \w+) has (\d+) points\.$/);
    const comparison = /^(Team \w+) has (\d+) more points than (Team \w+)\.$/;
    const [firstTeam, firstLead, reference] = read(lines[1], comparison);
    const [target, secondLead, otherReference] = read(lines[2], comparison);
    expect(firstTeam).toBe(knownTeam);
    expect(otherReference).toBe(reference);
    expect(q.prompt).toBe(`(a) How many points does ${reference} have? (b) How many points does ${target} have?`);
    const a = Number(points) - Number(firstLead);
    const b = a + Number(secondLead);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeLessThan(10000);
    const spec = q.structuredResponse;
    if (spec?.kind !== 'number-pair') throw new Error('Expected two score fields');
    expect(spec.firstLabel).toBe(`(a) ${reference} (points)`);
    expect(spec.secondLabel).toBe(`(b) ${target} (points)`);
    const response = JSON.stringify([String(a), String(b)]);
    expect(q.answer).toBe(response);
    expect(structuredResponseCorrect(spec, q.answer, response)).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(b), String(a)]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(a), '']))).toBe(false);
  }
});

it('solves the library total from two copies of the reference adjusted by the printed differences', () => {
  const totals = questions.filter(q => q.prompt.includes('books'));
  expect(totals).toHaveLength(seeds.length);
  for (const q of totals) {
    const lines = q.context ?? [];
    const [reference, books] = read(lines[0], /^(\w+ Library) has (\d+) books\.$/);
    const [first, above, smaller] = read(lines[1], /^(\w+ Library) has (\d+) more books than (\w+ Library)\.$/);
    const [second, below, larger] = read(lines[2], /^(\w+ Library) has (\d+) fewer books than (\w+ Library)\.$/);
    expect(first).toBe(reference);
    expect(second).toBe(reference);
    expect(q.prompt).toBe(`How many books do ${smaller} and ${larger} have in all?`);
    const expected = 2 * Number(books) + Number(below) - Number(above);
    expect(Number(books) - Number(above)).toBeGreaterThan(0);
    expect(expected).toBeLessThan(10000);
    expect(q.unit).toBe('books');
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain(String(expected));
    expect(q.answer).toBe(String(expected));
  }
});
