import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { Batch4EarlyDiagram } from './batch4EarlyDiagram';
import { makeRagQuestion } from './ragRecoverAMissingPart';

// Count the dots actually drawn for the pupil and read the printed key.
function readGraph(picture: Question['picture']) {
  if (picture?.type !== 'batch4-early') throw Error('Expected a picture graph');
  const html = renderToStaticMarkup(createElement(Batch4EarlyDiagram, { model: picture }));
  const key = /data-legend-scale="true">(\d+)</.exec(html);
  if (!key) throw Error('Missing key');
  expect(html).not.toContain('data-half-symbol');
  const rows = [...html.matchAll(/data-pictograph-row="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)]
    .map(([, label, body]) => ({ label, dots: (body.match(/data-whole-symbol="true"/g) ?? []).length }));
  expect(rows.length).toBeGreaterThanOrEqual(2);
  expect(new Set(rows.map(row => row.label)).size).toBe(rows.length);
  return { scale: Number(key[1]), rows };
}

function read(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) throw Error(`Missing given in ${text}`);
  return match;
}

it('recovers each answer from the visible question, including the constructed row', () => {
  const forms = new Set<string>();
  const scales = new Set<number>();
  for (let seed = -8; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { rows, scale } = readGraph(q.picture);
      scales.add(scale);
      const context = q.context?.join(' ') ?? '';
      let expected: string;

      if (q.prompt.includes('over the two months')) {
        expect(rows).toHaveLength(2);
        expect(context).toContain('All the badges were red or blue.');
        const red = Number(read(context, /made (\d+) red badges over the two months/)[1]);
        const whole = rows.reduce((total, row) => total + row.dots * scale, 0);
        expected = String(whole - red);
        forms.add('months');
      } else if (q.prompt.startsWith('How many blue badges')) {
        const name = read(q.prompt, /did the (\w+) club make/)[1];
        const row = rows.find(row => row.label === name);
        if (!row) throw Error('Cannot find the club named in the question');
        expect(context).toContain('All the badges were red or blue.');
        const clue = read(context, /The (\w+) club made (\d+) red badges/);
        expect(clue[1]).toBe(name);
        expected = String(row.dots * scale - Number(clue[2]));
        forms.add('colour');
      } else {
        const name = read(q.prompt, /How many badges did the (\w+) club make/)[1];
        const total = Number(read(context, /made (\d+) badges altogether/)[1]);
        expect(context).toContain(`The dots for the ${name} club are missing.`);
        const blanks = rows.filter(row => row.dots === 0);
        expect(blanks).toEqual([{ label: `${name} (?)`, dots: 0 }]);
        // Solve in dots first, independently of the worked subtraction in badges.
        const symbols = total / scale - rows.reduce((count, row) => count + row.dots, 0);
        expect(Number.isInteger(symbols)).toBe(true);
        expect(symbols).toBeGreaterThan(0);
        const badges = symbols * scale;
        expected = String(badges);
        if (q.prompt.includes('Complete its row')) {
          expect(q.prompt).toContain('one o for each dot');
          expected += ' ' + 'o'.repeat(symbols);
          const solution = readGraph(q.workedSteps?.at(-1)?.picture);
          expect(solution.scale).toBe(scale);
          expect(solution.rows).toEqual(rows.map(row => row.dots ? row : { label: name, dots: symbols }));
          expect(correctAnswer(q, String(badges))).toBe(false);
          expect(correctAnswer(q, expected + 'o')).toBe(false);
          expect(correctAnswer(q, `${badges + 1} ${'o'.repeat(symbols)}`)).toBe(false);
          forms.add('complete');
        } else {
          forms.add('row');
        }
      }

      const count = Number(expected.split(' ')[0]);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(100);
      expect(q.unit).toBe(expected.includes(' ') ? undefined : 'badges');
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, '0')).toBe(false);
    }
  }
  expect([...forms].sort()).toEqual(['colour', 'complete', 'months', 'row']);
  expect([...scales].sort()).toEqual([2, 3, 4, 5]);
});

it('replays a seed and index and varies the visible graphs within a session', () => {
  const seen = new Set<string>();
  expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(23, index);
    expect(q).toEqual(makeRagQuestion(23, index));
    seen.add(JSON.stringify([q.picture, q.context]));
  }
  expect(seen.size).toBeGreaterThan(1);
});
