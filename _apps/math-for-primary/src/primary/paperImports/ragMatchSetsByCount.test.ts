import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {PaperDiagram} from '../PaperDiagram';
import {correctAnswer} from '../generate';
import {makeRagQuestion} from './ragMatchSetsByCount';

it('selects exactly the box whose rendered books match the number word', () => {
  const words = 'zero one two three four five six seven eight nine ten'.split(' ');
  const winningBoxes = new Set<string>();
  const targets = new Set<number>();
  for (let seed = 0; seed < 32; seed++) {
    for (const index of [0, 3]) {
      const q = makeRagQuestion(seed, index);
      const word = /\b(\w+) books\?/.exec(q.prompt)?.[1];
      const target = words.indexOf(word ?? '');
      expect(target).toBeGreaterThan(0);
      const p = q.picture;
      if (p?.type !== 'paper' || p.layout !== 'cards') throw new Error('The pictured boxes are missing');
      const html = renderToStaticMarkup(createElement(PaperDiagram, {model: p}));
      const groups = html.split(/aria-label="(Box [1-4]): count the books"/).slice(1);
      const labels: string[] = [];
      const counts: number[] = [];
      for (let i = 0; i < groups.length; i += 2) {
        labels.push(groups[i]);
        expect(groups[i + 1]).toContain(`>${groups[i]}<`);
        const books = (groups[i + 1].match(/aria-label="Count this book"/g) ?? []).length;
        expect(books).toBeGreaterThanOrEqual(1);
        expect(books).toBeLessThanOrEqual(10);
        counts.push(books);
      }
      expect(labels).toEqual(['Box 1', 'Box 2', 'Box 3', 'Box 4']);
      expect(q.choices).toEqual(labels);
      expect(new Set(counts).size).toBe(4);
      const matches = labels.filter((_, i) => counts[i] === target);
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
      expect(labels.filter(label => correctAnswer(q, label))).toEqual(matches);
      winningBoxes.add(matches[0]);
      targets.add(target);
    }
  }
  expect(winningBoxes.size).toBe(4);
  expect(targets.size).toBeGreaterThan(1);
});

it('replays a question and varies the visible task as the index changes', () => {
  const seen = new Set<string>();
  for (let index = 0; index < 8; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    seen.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(seen.size).toBeGreaterThan(1);
});
