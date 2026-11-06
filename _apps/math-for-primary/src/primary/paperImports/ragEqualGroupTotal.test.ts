import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragEqualGroupTotal';

function readNumber(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing count in: ${text}`);
  return Number(match[1]);
}

function iconCount(count: number | undefined): number {
  if (count === undefined || !Number.isInteger(count) || count < 1) throw new Error('Expected countable pictures');
  return count;
}

// Recover one pencil count per box using only the pupil's story and diagram.
function readBoxes(q: Question) {
  const story = (q.context ?? []).join(' ');
  const picture = q.picture;
  if (!picture) {
    const boxes = readNumber(story, /packs (\d+) boxes/);
    const each = readNumber(story, /holds (\d+) pencils/);
    return { scene: 'story', counts: Array.from({ length: boxes }, () => each) };
  }
  if (picture.type !== 'paper' || picture.layout !== 'cards') throw new Error('Expected a box diagram');
  if (picture.cards[0]?.icon === 'box') {
    expect(picture.cards).toHaveLength(1);
    const boxes = iconCount(picture.cards[0].count);
    const each = readNumber(story, /holds (\d+) pencils/);
    return { scene: 'shelf', counts: Array.from({ length: boxes }, () => each) };
  }
  expect(story).not.toMatch(/\d/);
  const counts = picture.cards.map(card => {
    expect(card.icon).toBe('pencil');
    return iconCount(card.count);
  });
  return { scene: 'open', counts };
}

it('solves all four forms from visible groups and grades each requested count in order', () => {
  const forms = new Set<string>();
  const totals = new Set<number>();
  for (let seed = -16; seed <= 47; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { scene, counts } = readBoxes(q);
      const boxes = counts.length;
      expect(boxes).toBeGreaterThan(1);
      expect(new Set(counts).size).toBe(1);
      const each = counts[0];
      const total = counts.reduce((sum, pencils) => sum + pencils, 0);
      expect(total).toBeLessThanOrEqual(40);
      totals.add(total);
      const steps = q.workedSteps?.map(step => step.equation);
      expect(steps).toContain(`${counts.join(' + ')} = ${total}`);
      expect(steps).toContain(`${boxes} × ${each} = ${total}`);
      const askBoxes = q.prompt.includes('How many boxes are there?');
      const askSize = q.prompt.includes('How many pencils are in each box?');
      expect(q.prompt).toContain('How many pencils are there in all?');
      if (!askBoxes) {
        expect(askSize).toBe(false);
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('pencils');
        expect(correctAnswer(q, String(total))).toBe(true);
        expect(correctAnswer(q, String(boxes))).toBe(false);
        forms.add(`${scene}:total`);
        continue;
      }
      const labels = askSize ? ['Boxes', 'Pencils in each box', 'Pencils in all'] : ['Boxes', 'Pencils in all'];
      expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: labels.map(label => ({ label })) });
      const values = (askSize ? [boxes, each, total] : [boxes, total]).map(String);
      expect(correctAnswer(q, JSON.stringify(values))).toBe(true);
      expect(correctAnswer(q, JSON.stringify([String(total)]))).toBe(false);
      for (let field = 0; field < values.length; field++) {
        const wrong = [...values];
        wrong[field] = String(Number(wrong[field]) + 1);
        expect(correctAnswer(q, JSON.stringify(wrong))).toBe(false);
      }
      if (askSize && boxes !== each) {
        expect(correctAnswer(q, JSON.stringify([each, boxes, total].map(String)))).toBe(false);
      }
      forms.add(`${scene}:${values.length}`);
    }
  }
  expect([...forms].sort()).toEqual(['open:3', 'shelf:2', 'shelf:total', 'story:3']);
  expect(totals.size).toBeGreaterThan(4);
});

it('reproduces the same question for the same seed and index', () => {
  expect(makeRagQuestion(29)).toEqual(makeRagQuestion(29, 0));
  expect(makeRagQuestion(-5, 7)).toEqual(makeRagQuestion(-5, 7));
});
