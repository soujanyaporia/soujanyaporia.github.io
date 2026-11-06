import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragP2HeightFromDiagramOffsets';

type Line = Extract<Batch11UpperMark, { kind: 'line' }>;
type TextMark = Extract<Batch11UpperMark, { kind: 'text' }>;

function readDiagram(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing height diagram');
  const marks = q.picture.marks;
  const tags = marks.filter((m): m is TextMark => m.kind === 'text');
  const horizontals = marks.filter((m): m is Line => m.kind === 'line' && m.y1 === m.y2);
  const guides = horizontals.filter(m => m.dashed).map(m => m.y1).sort((a, b) => a - b);
  expect(guides).toHaveLength(2);
  const [topGuide, floorGuide] = guides;
  const edgesAt = (name: string) => {
    const tag = tags.find(t => t.text === name);
    if (!tag) throw new Error(`Missing diagram label ${name}`);
    const edges = horizontals.filter(m => !m.dashed && m.x1 <= tag.x && tag.x <= m.x2)
      .map(m => m.y1).sort((a, b) => b - a);
    expect(edges[0]).toBeCloseTo(floorGuide);
    return edges;
  };
  // Read the solid posts independently of the block-edge lines.
  const posts = marks.flatMap(m => {
    if (m.kind !== 'path') return [];
    const match = /^M ([\d.]+) ([\d.]+) V ([\d.]+) H ([\d.]+) V ([\d.]+) Z$/.exec(m.d);
    if (!match) throw new Error('Expected an upright rectangular post');
    const [x, bottom, top, right, end] = match.slice(1).map(Number);
    expect(right).toBeGreaterThan(x);
    expect(bottom).toBe(end);
    expect(top).toBeCloseTo(topGuide);
    expect(bottom).toBeGreaterThan(top);
    return [{ x, bottom, top }];
  }).sort((a, b) => a.x - b.x);
  return { tags, edgesAt, posts, topGuide, floorGuide };
}

function readValue(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing measurement in ${text}`);
  return Number(match[1]);
}

function solve(q: Question) {
  const { tags, edgesAt, posts, topGuide, floorGuide } = readDiagram(q);
  const text = q.context?.join(' ') ?? '';
  const unitHeight = readValue(text, /Each (?:small )?block is (\d+) cm high/);
  if (tags.some(t => t.text === 'B')) {
    expect(q.prompt).toMatch(/post B/);
    const a = edgesAt('A');
    const b = edgesAt('B');
    expect(posts).toHaveLength(2);
    expect(posts[0].bottom).toBeCloseTo(a[a.length - 1]);
    expect(posts[1].bottom).toBeCloseTo(b[b.length - 1]);
    expect(b.length).toBeGreaterThan(a.length);
    const reference = readValue(text, /Post A is (\d+) cm tall/);
    const floorToTop = reference + (a.length - 1) * unitHeight;
    return { form: 'supports', height: floorToTop - (b.length - 1) * unitHeight };
  }

  expect(posts).toHaveLength(1);
  expect(posts[0].bottom).toBeCloseTo(floorGuide);
  expect(q.prompt).toMatch(/height of the post/);
  const edges = edgesAt('Stack');
  const aligned = edges.findIndex(y => Math.abs(y - topGuide) < 0.00001);
  expect(aligned).toBeGreaterThan(0);
  expect(aligned).toBeLessThan(edges.length - 1);
  const baseTag = tags.find(t => /^\d+ m$/.test(t.text));
  let height = 0;
  for (let i = 0; i < aligned; i++) {
    const containsMetreLabel = baseTag && edges[i + 1] < baseTag.y && baseTag.y < edges[i];
    height += containsMetreLabel ? parseInt(baseTag.text, 10) * 100 : unitHeight;
  }
  if (baseTag) {
    expect(baseTag.y).toBeGreaterThan(edges[1]);
    expect(baseTag.y).toBeLessThan(edges[0]);
    expect(text).toContain('One metre is 100 centimetres.');
  }
  return { form: baseTag ? 'mixed' : 'blocks', height };
}

it('finds the height from the printed measurements, block edges and guide lines', () => {
  const forms = new Set<string>();
  const heights = new Set<number>();
  for (let seed = 0; seed < 60; seed++) {
    for (const index of [0, 1, 5]) {
      const q = makeRagQuestion(seed, index);
      const { form, height } = solve(q);
      forms.add(form);
      heights.add(height);
      expect(Number.isInteger(height) && height > 0 && height < 1000).toBe(true);
      expect(q.answer).toBe(String(height));
      expect(q.unit).toBe('cm');
      expect(q.choices).toBeUndefined();
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
    }
  }
  expect([...forms].sort()).toEqual(['blocks', 'mixed', 'supports']);
  expect(heights.size).toBeGreaterThan(15);
});

it('reproduces the same diagram and question for the same seed and index', () => {
  expect(makeRagQuestion(31, 4)).toEqual(makeRagQuestion(31, 4));
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
});
