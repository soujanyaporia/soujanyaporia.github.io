import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Picture } from '../Picture';
import { makeRagQuestion } from './ragValueFromGraphedCounts';

it('solves the purchase using the named child, the graph and the printed cent price', () => {
  const forms = new Set<string>();
  const scales = new Set<number>();
  const targets = new Set<string>();
  const amounts = new Set<number>();

  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const graph = q.picture;
      if (graph?.type !== 'bars') throw new Error('Missing count graph');
      const buyer = /^How much did (\w+) pay for the beads\?/.exec(q.prompt)?.[1];
      const price = /Each bead costs (\d+) cents\./.exec(q.context?.join(' ') ?? '');
      if (!buyer || !price) throw new Error('Missing buyer or unit price');
      expect(graph.labels).toHaveLength(5);
      expect(new Set(graph.labels).size).toBe(5);
      expect(graph.values).toHaveLength(graph.labels.length);
      expect(graph.scale).toBeGreaterThan(1);
      expect(graph.values.every(v => v > 0 && Number.isInteger(v / graph.scale))).toBe(true);
      const row = graph.labels.indexOf(buyer);
      expect(row).toBeGreaterThanOrEqual(0);
      let count = graph.values[row];

      if (graph.pictures) {
        const html = renderToStaticMarkup(createElement(Picture, { model: graph }));
        const legend = /Each ● = (\d+)/.exec(html);
        const symbols = new RegExp(`<strong>${buyer}</strong><span>(.*?)</span>`).exec(html);
        if (!legend || !symbols) throw new Error('Missing picture key or named row');
        count = (symbols[1].match(/●/g) ?? []).length * Number(legend[1]);
        forms.add('dots');
      } else {
        forms.add('bars');
      }

      const cents = count * Number(price[1]);
      const dollarPart = Math.floor(cents / 100);
      const centPart = String(cents % 100).padStart(2, '0');
      expect(q.answer).toBe(`${dollarPart}.${centPart}`);
      expect(q.unit).toBe('dollars');
      expect(q.prompt).toContain('in dollars');
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${cents} cents = $${dollarPart}.${centPart}`);
      scales.add(graph.scale);
      targets.add(buyer);
      amounts.add(cents);
    }
  }
  expect(forms).toEqual(new Set(['dots', 'bars']));
  expect(scales.size).toBeGreaterThan(1);
  expect(targets.size).toBeGreaterThan(1);
  expect([...amounts].some(cents => cents < 100)).toBe(true);
  expect([...amounts].some(cents => cents > 100 && cents % 100 !== 0)).toBe(true);
});

it('replays the same purchase and varies the visible givens across indices', () => {
  const examples = Array.from({ length: 12 }, (_, index) => makeRagQuestion(23, index));
  expect(makeRagQuestion(23)).toEqual(examples[0]);
  expect(makeRagQuestion(23, 7)).toEqual(examples[7]);
  const visible = examples.map(q => JSON.stringify([q.prompt, q.context, q.picture]));
  expect(new Set(visible).size).toBeGreaterThan(1);
});
