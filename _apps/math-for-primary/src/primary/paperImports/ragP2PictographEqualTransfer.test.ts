import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { Batch4EarlyDiagram } from './batch4EarlyDiagram';
import { makeRagQuestion } from './ragP2PictographEqualTransfer';

function readGraph(prompt: string, picture: Question['picture']) {
  if (picture?.type !== 'batch4-early') throw new Error('Expected a picture graph');
  const html = renderToStaticMarkup(createElement(Batch4EarlyDiagram, { model: picture }));
  const legend = html.match(/data-legend-scale="true">(\d+)</);
  const names = prompt.match(/should (\w+) pass to (\w+) so/);
  if (!legend || !names) throw new Error('Missing key or transfer direction');

  const scale = Number(legend[1]);
  const counts = new Map<string, number>();
  expect(html).not.toContain('data-half-symbol');
  for (const row of html.matchAll(/<div data-pictograph-row="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)) {
    const symbols = (row[2].match(/data-whole-symbol="true"/g) ?? []).length;
    expect(symbols).toBeGreaterThan(0);
    expect(symbols).toBeLessThanOrEqual(8);
    expect(counts.has(row[1])).toBe(false);
    counts.set(row[1], symbols * scale);
  }
  const giver = counts.get(names[1]);
  const receiver = counts.get(names[2]);
  if (giver === undefined || receiver === undefined) throw new Error('Named row missing');
  return { giver, receiver, scale, rowCount: counts.size };
}

it('finds the unique bead transfer from the drawn dots, their key and the named rows', () => {
  const scales = new Set<number>();
  const rowCounts = new Set<number>();
  const answers = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { giver, receiver, scale, rowCount } = readGraph(q.prompt, q.picture);
      scales.add(scale);
      rowCounts.add(rowCount);
      expect(giver).toBeGreaterThan(receiver);
      const solutions: number[] = [];
      for (let moved = 0; moved <= giver; moved++) {
        if (giver - moved === receiver + moved) solutions.push(moved);
      }
      expect(solutions).toHaveLength(1);
      const solved = solutions[0];
      expect(q.answer).toBe(String(solved));
      expect(q.unit).toBe('beads');
      expect(q.choices).toBeUndefined();
      expect(correctAnswer(q, String(solved))).toBe(true);
      expect(correctAnswer(q, String(giver - receiver))).toBe(false);
      answers.add(solved);
    }
  }
  expect(scales).toEqual(new Set([2, 3, 5]));
  expect(rowCounts).toEqual(new Set([3, 4]));
  expect(answers.size).toBeGreaterThan(3);
});

it('reproduces a given seed and index and varies the graph across a session', () => {
  const graphs = new Set<string>();
  for (let index = 0; index < 8; index++) {
    const question = makeRagQuestion(19, index);
    expect(makeRagQuestion(19, index)).toEqual(question);
    graphs.add(JSON.stringify(question.picture));
  }
  expect(graphs.size).toBeGreaterThan(1);
});
