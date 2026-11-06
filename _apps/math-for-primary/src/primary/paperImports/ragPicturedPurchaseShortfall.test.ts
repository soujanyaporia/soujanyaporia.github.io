import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPicturedPurchaseShortfall';

function readPurchase(q: Question) {
  const tag = /costs (\$1|\d+¢)\./.exec((q.context ?? []).join(' '))?.[1];
  if (!tag) throw new Error('Missing price on the item');
  const price = tag === '$1' ? 100 : Number(tag.slice(0, -1));
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw new Error('Missing coin picture');
  const outlines = picture.marks.flatMap(m => m.kind === 'circle' ? [m] : []);
  const labels = picture.marks.flatMap(m => m.kind === 'text' ? [m] : []);
  expect(labels).toHaveLength(outlines.length);
  const faces = outlines.map(coin => {
    const inside = labels.filter(label => Math.hypot(label.x - coin.cx, label.y - coin.cy) < coin.r);
    expect(inside).toHaveLength(1);
    const face = inside[0].text;
    expect(face).toMatch(/^(5|10|20|50)¢$/);
    return Number(face.slice(0, -1));
  });
  expect(new Set(faces).size).toBeGreaterThan(1);
  expect(picture.label).toBe(`Coins: ${faces.map(value => `${value}¢`).join(', ')}.`);
  return { tag, price, faces };
}

it('solves the shortfall from the price tag and the values inside the pictured coins', () => {
  const balancesAndPrices = new Set<string>();
  const tagUnits = new Set<string>();
  for (let seed = -8; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { tag, price, faces } = readPurchase(q);
      const balance = faces.reduce((sum, face) => sum + face, 0);
      expect(price).toBeLessThanOrEqual(100);
      expect(balance).toBeGreaterThan(0);
      expect(balance).toBeLessThan(price);
      let needed = 0;
      while (balance + needed < price) needed += 5;
      expect(balance + needed).toBe(price);
      expect(q.answer).toBe(String(needed));
      expect(q.unit).toBe('cents');
      expect(q.prompt).toContain('more cents');
      expect(q.choices).toBeUndefined();
      const equations = q.workedSteps?.map(step => step.equation) ?? [];
      expect(equations[0]).toBe(`${faces.map(value => `${value}¢`).join(' + ')} = ${balance}¢`);
      if (tag === '$1') expect(equations).toContain('$1 = 100¢');
      expect(equations.at(-1)).toBe(`${price}¢ − ${balance}¢ = ${needed}¢`);
      balancesAndPrices.add(`${balance}/${price}`);
      tagUnits.add(tag === '$1' ? 'dollars' : 'cents');
    }
  }
  expect(tagUnits.size).toBe(2);
  expect(balancesAndPrices.size).toBeGreaterThan(20);
});

it('reproduces a seed and index and varies the visible purchases across indices', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  const purchases = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    purchases.add(JSON.stringify([q.context, q.picture]));
  }
  expect(purchases.size).toBeGreaterThan(1);
});
