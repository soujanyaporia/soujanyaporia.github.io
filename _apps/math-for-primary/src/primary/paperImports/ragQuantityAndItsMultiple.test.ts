import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragQuantityAndItsMultiple';

function readNumber(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing clue for ${pattern} in ${text}`);
  return Number(match[1]);
}

function solveShown(q: Question): string {
  const story = (q.context ?? []).join(' ');
  const factor = readNumber(story, /(\d+) times as many/);
  expect(factor).toBeGreaterThan(1);
  expect(factor).toBeLessThanOrEqual(9);

  switch (q.prompt) {
    case 'How many star and moon stickers are there in all?': {
      expect(story).toContain(`${factor} times as many moon stickers as star stickers`);
      expect(q.unit).toBe('stickers');
      const stars = readNumber(story, /(\d+) star stickers/);
      expect(stars).toBeGreaterThan(0);
      expect(stars).toBeLessThanOrEqual(999);
      return String((factor + 1) * stars);
    }
    case 'How many paper birds did the club make?': {
      expect(story).toContain(`${factor} times as many paper fish as paper birds`);
      expect(q.unit).toBe('paper birds');
      const fish = readNumber(story, /(\d+) paper fish/);
      expect(fish).toBeGreaterThan(0);
      expect(fish).toBeLessThanOrEqual(999);
      expect(fish % factor).toBe(0);
      return String(fish / factor);
    }
    case 'How many cards did Tess fold?': {
      expect(story).toContain(`Together they folded ${factor} times as many cards as Tess`);
      expect(q.unit).toBe('cards');
      const chart = q.picture;
      if (chart?.type !== 'bars') throw new Error('The two card counts need a bar chart.');
      expect(chart.labels).toEqual(['Lin', 'Raj']);
      expect(chart.values).toHaveLength(2);
      expect(chart.scale).toBeGreaterThan(0);
      expect(story.match(/\d+/g)).toEqual([String(factor)]);
      const counts = chart.values.map(height => {
        const steps = height / chart.scale;
        expect(Number.isInteger(steps) && steps > 0).toBe(true);
        return steps * chart.scale;
      });
      const together = counts[0] + counts[1];
      expect(together).toBeLessThanOrEqual(999);
      expect(together % factor).toBe(0);
      return String(together / factor);
    }
    case 'How many stamps does Imran have?': {
      expect(story).toMatch(/Jo has \d+ times as many stamps as Imran/);
      expect(story.match(/\d+/g)).toEqual([String(factor)]);
      // Two distinct positive base counts are enough to show the ambiguity.
      const bases: number[] = [];
      for (let jo = 1; jo <= 2 * factor; jo++) {
        if (jo % factor === 0) bases.push(jo / factor);
      }
      expect(new Set(bases).size).toBeGreaterThan(1);
      return 'There is too little information to tell.';
    }
    case 'How many more notebooks should the shop put on display?': {
      expect(story).toContain(`${factor} times as many notebooks as it has on display now`);
      expect(q.unit).toBe('notebooks');
      const start = readNumber(story, /(\d+) notebooks on display/);
      expect(start).toBeGreaterThan(0);
      expect(start).toBeLessThanOrEqual(999);
      return String(start * factor - start);
    }
    default: throw new Error(`Unrecognised question: ${q.prompt}`);
  }
}

test('each response follows from the displayed story and any visible bars', () => {
  const prompts = new Set<string>();
  const totalForms = new Set<string>();
  for (let seed = -4; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solveShown(q);
      expect(q.answer).toBe(expected);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
      }
      if (q.unit === 'stickers') totalForms.add(q.choices ? 'choice' : 'entry');
      if (q.unit !== 'cards') expect(q.picture).toBeUndefined();
      prompts.add(q.prompt);
    }
  }
  expect(prompts.size).toBe(5);
  expect(totalForms).toEqual(new Set(['choice', 'entry']));
});

test('seed and index reproduce the same question and vary the visible givens', () => {
  const signature = (q: Question) => JSON.stringify([q.context, q.prompt, q.picture]);
  const bySeed = new Set<string>();
  const byIndex = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = makeRagQuestion(16, i);
    expect(makeRagQuestion(16, i)).toEqual(q);
    byIndex.add(signature(q));
    bySeed.add(signature(makeRagQuestion(i)));
  }
  expect(bySeed.size).toBeGreaterThan(8);
  expect(byIndex.size).toBeGreaterThan(8);
});
