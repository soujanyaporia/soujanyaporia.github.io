import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragLengthsRelativeToAReference';

type Givens = Pick<Question, 'prompt' | 'picture' | 'context'>;
type Item = { label: string; extent: number };

function readItems({ picture, context }: Givens): Item[] {
  if (picture?.type === 'paper' && picture.layout === 'bars') {
    return picture.rows.map(row => {
      expect(row.parts).toHaveLength(1);
      return { label: row.label, extent: row.parts[0].size };
    });
  }
  if (picture?.type !== 'grid-drawing') throw new Error('Missing stick diagram');
  const labels = /From left to right, the sticks (?:are|belong to) (\w+), (\w+) and (\w+)\./.exec(context?.[0] ?? '');
  if (!labels) throw new Error('Missing left-to-right labels');
  const posts = picture.segments.map(([[x, y], [endX, endY]]) => {
    expect(endX).toBe(x);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(picture.columns);
    const top = Math.min(y, endY);
    const bottom = Math.max(y, endY);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(picture.rows);
    return { x, bottom, extent: bottom - top };
  }).sort((a, b) => a.x - b.x);
  expect(new Set(posts.map(p => p.x)).size).toBe(3);
  expect(new Set(posts.map(p => p.bottom)).size).toBe(1);
  return posts.map((post, i) => ({ label: labels[i + 1], extent: post.extent }));
}

function solve(givens: Givens) {
  const items = readItems(givens);
  expect(items).toHaveLength(3);
  expect(new Set(items.map(i => i.label)).size).toBe(3);
  expect(new Set(items.map(i => i.extent)).size).toBe(3);
  expect(items.every(i => i.extent > 0)).toBe(true);
  const { prompt } = givens;
  const refName = /(?:than (?:strip|stick) |with stick )(\w+)/.exec(prompt)?.[1]
    ?? /shorter than (\w+)'s stick/.exec(prompt)?.[1];
  const ref = items.find(item => item.label === refName);
  if (!ref) throw new Error('The named reference must appear in the picture');
  const lower = items.filter(i => i.extent < ref.extent);
  const higher = items.filter(i => i.extent > ref.extent);
  expect(lower).toHaveLength(1);
  expect(higher).toHaveLength(1);
  if (prompt.startsWith('Whose stick is tallest?')) {
    const tallest = items.reduce((a, b) => a.extent > b.extent ? a : b);
    return { form: 'owners', labels: [tallest.label, lower[0].label], ref };
  }
  if (prompt.includes("shorter stick's letter first") && prompt.includes("taller stick's letter second")) {
    return { form: 'both', labels: [lower[0].label, higher[0].label], ref };
  }
  if (prompt.includes('strip is shorter than')) return { form: 'strip', labels: [lower[0].label], ref };
  if (prompt.includes('stick is taller than')) return { form: 'taller', labels: [higher[0].label], ref };
  throw new Error('Unknown comparison');
}

it('solves each prompt from the labelled endpoints and grades the requested order', () => {
  const forms = new Set<string>();
  const refPositions = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { labels, ref, form } = solve(q);
      const expected = labels.join(' ');
      forms.add(form);
      refPositions.add(readItems(q).findIndex(i => i.label === ref.label));
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected.toLowerCase())).toBe(true);
      expect(correctAnswer(q, ref.label)).toBe(false);
      if (labels.length === 2) {
        expect(correctAnswer(q, labels[0])).toBe(false);
        expect(correctAnswer(q, labels.slice().reverse().join(' '))).toBe(false);
      }
    }
  }
  expect([...forms].sort()).toEqual(['both', 'owners', 'strip', 'taller']);
  expect(refPositions.size).toBe(3);
});

it('repeats a seed and index and varies the visible diagrams across a session', () => {
  const pictures = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    pictures.add(JSON.stringify([q.picture, q.context]));
  }
  expect(pictures.size).toBeGreaterThanOrEqual(8);
});
