import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import type {Picture, Question} from '../generate';
import {Batch9EarlyDiagram} from './Batch9EarlyDiagram';
import {makeRagQuestion} from './ragComponentContentsMass';

type Dial = Extract<Picture, {layout: 'mass-dial'}>;
type Givens = Pick<Question, 'picture' | 'context' | 'prompt'>;

function readDial(model: Dial): number {
  const svg = renderToStaticMarkup(createElement(Batch9EarlyDiagram, {model}));
  const face = svg.match(/>0\/(\d+)<\/text>/);
  const needle = svg.match(/data-mass-pointer="true" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/);
  if (!face || !needle) throw Error('Missing dial label or pointer');
  const [x, y, tipX, tipY] = needle.slice(1).map(Number);
  const turn = 2 * Math.PI;
  const clockwise = (Math.atan2(tipX - x, y - tipY) + turn) % turn;
  const intervals = (svg.match(/<line\b/g) ?? []).length - 1;
  const mark = clockwise * intervals / turn;
  expect(mark).toBeCloseTo(Math.round(mark), 8);
  const grams = Math.round(mark) * Number(face[1]) / intervals;
  expect(Number.isInteger(grams) && grams > 0 && grams < Number(face[1])).toBe(true);
  return grams;
}

function visibleNumber(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) throw Error(`Missing given for ${pattern}`);
  return Number(match[1]);
}

function solve({picture, context, prompt}: Givens) {
  const text = (context ?? []).join(' ');
  if (!picture) {
    expect(prompt).toMatch(/kilograms of potatoes.*altogether/);
    const boxes = visibleNumber(text, /receives (\d+) boxes/);
    const full = visibleNumber(text, /Each full box weighs (\d+) kg/);
    const empty = visibleNumber(text, /Each empty box weighs (\d+) kg/);
    expect([2, 3, 4, 5, 10]).toContain(boxes);
    expect(full - empty).toBeGreaterThan(0);
    expect(full - empty).toBeLessThanOrEqual(10);
    return {form: 'boxes', unit: 'kg', choice: true, mass: full * boxes - empty * boxes};
  }
  if (picture.type === 'batch10-middle' && picture.layout === 'mass-pair') {
    expect(text).toContain('same tub');
    expect(prompt).toMatch(/grams of flour/);
    const readings = new Map(picture.dials.map(d => [d.label, readDial(d.model)] as const));
    const full = readings.get('Tub with flour');
    const empty = readings.get('Empty tub');
    if (readings.size !== 2 || full === undefined || empty === undefined) throw Error('Need both labelled weighings');
    return {form: 'tub', unit: 'g', choice: false, mass: full - empty};
  }
  if (picture.type !== 'batch9-early' || picture.layout !== 'mass-dial') throw Error('Expected one weighing dial');
  const total = readDial(picture);
  if (prompt.includes('pouches')) {
    expect(text).toMatch(/red pouch, a blue pouch, a cup and a spoon/);
    expect(prompt).toMatch(/pouches weigh together/);
    const cup = visibleNumber(text, /cup weighs (\d+) g/);
    const spoon = visibleNumber(text, /spoon weighs (\d+) g/);
    return {form: 'pouches', unit: 'g', choice: false, mass: total - cup - spoon};
  }
  if (prompt.includes('buttons')) {
    expect(text).toContain('bag of buttons');
    return {form: 'bag', unit: 'g', choice: true, mass: total - visibleNumber(text, /empty bag weighs (\d+) g/)};
  }
  expect(prompt).toMatch(/working.*grams does the pear weigh/);
  expect(text).toContain('A pear and an orange');
  return {form: 'fruit', unit: 'g', choice: false, mass: total - visibleNumber(text, /orange weighs (\d+) g/)};
}

it('solves each load from the printed masses and the rendered pointers', () => {
  for (let seed = -4; seed < 20; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 7; index++) {
      const q = makeRagQuestion(seed, index);
      const {form, unit, choice, mass} = solve({picture: q.picture, context: q.context, prompt: q.prompt});
      forms.add(form);
      expect(mass).toBeGreaterThan(0);
      expect(mass).toBeLessThan(1000);
      expect(q.unit).toBe(unit);
      expect(q.answer).toBe(String(mass));
      expect(q.workedSteps?.at(-1)?.equation?.endsWith(`= ${mass} ${unit}`)).toBe(true);
      if (choice) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(value => Number(value) === mass)).toEqual([String(mass)]);
      } else {
        expect(q.choices).toBeUndefined();
      }
    }
    expect([...forms].sort()).toEqual(['bag', 'boxes', 'fruit', 'pouches', 'tub']);
  }
});

it('replays the same question and varies the visible givens for each prompt', () => {
  const givens = new Map<string, Set<string>>();
  const firstDialLabels = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 7; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const seen = givens.get(q.prompt) ?? new Set<string>();
      seen.add(JSON.stringify([q.context, q.picture]));
      givens.set(q.prompt, seen);
      if (q.picture?.type === 'batch10-middle' && q.picture.layout === 'mass-pair') {
        firstDialLabels.add(q.picture.dials[0].label);
      }
    }
  }
  expect(givens.size).toBe(5);
  for (const seen of givens.values()) expect(seen.size).toBeGreaterThan(3);
  expect(firstDialLabels.size).toBe(2);
});
