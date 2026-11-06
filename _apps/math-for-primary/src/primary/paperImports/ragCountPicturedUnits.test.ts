import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragCountPicturedUnits';

type Card = Extract<PaperPicture, { layout: 'cards' }>['cards'][number];

function countIcons(card: Card): number {
  const count = card.count;
  if (count === undefined || !Number.isSafeInteger(count) || count < 1 || card.removed) {
    throw new Error('Expected a visible collection of whole objects');
  }
  return count;
}

function solvePicture(q: Question): number[] {
  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing collections');

  if (q.structuredResponse?.kind === 'number-pair') {
    const labels = [q.structuredResponse.firstLabel, q.structuredResponse.secondLabel];
    expect(labels).toEqual(['Table A', 'Table B']);
    expect(picture.cards).toHaveLength(4);
    return labels.map(label => {
      const cards = picture.cards.filter(card => card.label === label);
      expect(cards.map(card => card.icon).sort()).toEqual(['box', 'pencil']);
      let pencils = 0;
      for (const card of cards) {
        const boxSize = /^Boxes of (\d+) pencils$/.exec(card.value);
        if (card.icon === 'box') {
          expect(boxSize?.[1]).toBe('10');
        } else {
          expect(card.value).toBe('Loose pencils');
        }
        const perIcon = boxSize ? Number(boxSize[1]) : 1;
        for (let i = 0; i < countIcons(card); i++) pencils += perIcon;
      }
      return pencils;
    });
  }

  const spec = q.structuredResponse;
  if (spec?.kind !== 'number-fields') throw new Error('Missing linked ticket entries');
  expect(spec.fields.map(field => field.label)).toEqual([
    'Kim’s tickets at the start', 'Dev’s tickets at the start', 'Tickets Dev gives Kim',
  ]);
  expect(q.prompt).toContain('Dev give Kim');
  expect(picture.cards).toHaveLength(2);
  const [kim, dev] = ['Kim', 'Dev'].map(name => {
    const card = picture.cards.find(c => c.label === name);
    if (!card || card.icon !== 'ticket' || card.value !== 'Tickets') throw new Error('Missing tickets');
    return countIcons(card);
  });
  const moves: number[] = [];
  for (let n = 0; n <= dev; n++) {
    if (dev - n === kim + n) moves.push(n);
  }
  expect(moves).toHaveLength(1);
  expect(moves[0]).toBeGreaterThan(0);
  return [kim, dev, moves[0]];
}

it('grades each labelled entry against the pictured units and the stated move', () => {
  const pairs = new Set<string>();
  const triples = new Set<string>();
  for (let seed = -12; seed <= 27; seed++) {
    for (const index of [0, 1, 4, 9]) {
      const q = makeRagQuestion(seed, index);
      const values = solvePicture(q);
      expect(values[0] + values[1]).toBeLessThanOrEqual(100);
      const entries = values.map(String);
      const response = JSON.stringify(entries);
      (values.length === 2 ? pairs : triples).add(response);
      expect(q.answer).toBe(response);
      const spec = q.structuredResponse!;
      expect(structuredResponseCorrect(spec, q.answer, response)).toBe(true);
      for (let i = 0; i < entries.length; i++) {
        const wrong = [...entries];
        wrong[i] = String(values[i] + 1);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
      }
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(entries.slice(1)))).toBe(false);
    }
  }
  expect(pairs.size).toBeGreaterThan(8);
  expect(triples.size).toBeGreaterThan(8);
});

it('reproduces both pictures and answers for a saved seed and index', () => {
  for (const seed of [-4, 0, 18, 301]) {
    for (const index of [0, 1]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
});
