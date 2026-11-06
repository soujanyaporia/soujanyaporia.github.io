import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import type {Question} from '../generate';
import type {BalanceItem, Batch9MiddlePicture} from './batch9MiddlePicture';
import {Batch9EarlyDiagram} from './Batch9EarlyDiagram';
import {makeRagQuestion} from './ragMassEquivalences';

type Givens = Pick<Question, 'prompt' | 'context' | 'picture'>;
type Row = Extract<Batch9MiddlePicture, {layout: 'balances'}>['rows'][number];

function panMass(items: BalanceItem[], ball: number, car: number): number {
  return items.reduce((sum, item) => {
    if (item.kind === 'ball') return sum + item.count * ball;
    if (item.kind === 'car') return sum + item.count * car;
    if (item.kind === 'weight' && item.count === 1 && item.grams !== undefined) return sum + item.grams;
    throw Error('Expected a ball, car or labelled gram weight');
  }, 0);
}

function solvePans(rows: Row[]): number {
  const clue = rows.find(row => row.left.some(item => item.kind === 'car'));
  if (!clue) throw Error('Missing car');
  expect(clue.left.filter(item => item.kind === 'car').map(item => item.count)).toEqual([1]);
  expect(clue.right.some(item => item.kind === 'car')).toBe(false);
  const possible = new Set<number>();
  for (let ball = 1; ball <= 999; ball++) {
    const car = panMass(clue.right, ball, 0) - panMass(clue.left, ball, 0);
    if (car > 0 && car <= 999 && rows.every(row => panMass(row.left, ball, car) === panMass(row.right, ball, car))) {
      possible.add(car);
    }
  }
  expect(possible.size).toBe(1);
  return [...possible][0];
}

function solve({picture, prompt, context}: Givens): number {
  if (picture?.type === 'batch9-middle' && picture.layout === 'balances') {
    expect(prompt).toMatch(/toy car/);
    const labelled = picture.rows.flatMap(row => [...row.left, ...row.right])
      .filter(item => item.kind === 'weight').map(item => item.grams);
    const spoken = [...(context ?? []).join(' ').matchAll(/(\d+) g\b/g)].map(match => Number(match[1]));
    expect(spoken).toEqual(labelled);
    return solvePans(picture.rows);
  }
  if (picture?.type !== 'batch9-early' || picture.layout !== 'mass-dial') throw Error('Missing weighing figure');
  expect(prompt).toMatch(/toy boat/);
  const svg = renderToStaticMarkup(createElement(Batch9EarlyDiagram, {model: picture}));
  const pointer = svg.match(/data-mass-pointer="true" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/);
  const maximum = svg.match(/>0\/(\d+)<\/text>/);
  const weights = context?.join(' ').match(/tin weighs (\d+) g\. The pouch weighs (\d+) g\./);
  if (!pointer || !maximum || !weights) throw Error('Missing pointer, scale label or item masses');
  const [x, y, endX, endY] = pointer.slice(1).map(Number);
  const turn = 2 * Math.PI;
  const angle = (Math.atan2(endX - x, y - endY) + turn) % turn;
  const ticks = (svg.match(/<line\b/g) ?? []).length - 1;
  const tickValue = Number(maximum[1]) / ticks;
  const tick = angle * ticks / turn;
  expect(tickValue).toBe(10);
  expect(tick).toBeCloseTo(Math.round(tick), 8);
  const total = Math.round(tick) * tickValue;
  expect(total % 100).not.toBe(0);
  return total - Number(weights[1]) - Number(weights[2]);
}

it('finds the unique gram answer from the visible loads or the drawn pointer', () => {
  for (let seed = -5; seed < 25; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const grams = solve({picture: q.picture, context: q.context, prompt: q.prompt});
      expect(Number.isInteger(grams) && grams > 0 && grams <= 999).toBe(true);
      expect(q.answer).toBe(String(grams));
      expect(q.unit).toBe('g');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  }
});

it('replays each weighing and varies the visible masses in all four arrangements', () => {
  const masses = new Map<string, Set<string>>();
  for (let seed = 0; seed < 20; seed++) {
    const arrangements = new Set<string>();
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q).toEqual(makeRagQuestion(seed, index));
      const picture = q.picture;
      let kind: string;
      if (picture?.type === 'batch9-early' && picture.layout === 'mass-dial') {
        kind = 'combined load';
      } else if (picture?.type === 'batch9-middle' && picture.layout === 'balances') {
        if (picture.rows.length === 1) {
          expect(picture.rows[0].right.map(item => item.kind)).toEqual(['weight', 'weight']);
          kind = 'add weights';
        } else {
          expect(picture.rows).toHaveLength(2);
          kind = picture.rows[0].right.some(item => item.kind === 'ball') ? 'equal balls' : 'shared ball';
        }
      } else {
        throw Error('Unexpected picture');
      }
      arrangements.add(kind);
      const seen = masses.get(kind) ?? new Set<string>();
      seen.add(JSON.stringify([picture, q.context]));
      masses.set(kind, seen);
    }
    expect(arrangements.size).toBe(4);
  }
  for (const seen of masses.values()) expect(seen.size).toBeGreaterThan(4);
});
