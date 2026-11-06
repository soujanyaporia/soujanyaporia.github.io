import {expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Question} from '../generate';
import {Batch10MiddleDiagram} from './Batch10MiddleDiagram';
import type {Batch11UpperPicture} from './batch11UpperPicture';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragGraduatedScaleReadings';

function sumDials(picture: Extract<NonNullable<Question['picture']>, {layout: 'mass-pair'}>) {
  const html = renderToStaticMarkup(createElement(Batch10MiddleDiagram, {model: picture}));
  const dials = [...html.matchAll(/from zero to (\d+)\. Small marks are (\d+) grams apart\. Pointer at small mark (\d+) clockwise/g)];
  expect(dials).toHaveLength(2);
  const readings = dials.map(([, capacity, space, position]) => {
    const grams = Number(space) * Number(position);
    expect(grams).toBeGreaterThan(0);
    expect(grams).toBeLessThan(Number(capacity));
    return grams;
  });
  expect(readings[0]).not.toBe(readings[1]);
  return readings[0] + readings[1];
}

function kgDialInGrams({marks}: Batch11UpperPicture) {
  const rim = marks.find(m => m.kind === 'circle');
  if (rim?.kind !== 'circle') throw new Error('Missing dial rim');
  const labels = marks.filter(m => m.kind === 'text');
  expect(labels.map(m => m.text)).toContain('kg');
  const rightLabel = labels.find(m => m.x > rim.cx + 10 && /^\d+$/.test(m.text));
  if (!rightLabel) throw new Error('Missing numbered mark on the right');
  const angle = (x: number, y: number) => {
    const a = Math.atan2(x - rim.cx, rim.cy - y);
    return a < 0 ? a + 2 * Math.PI : a;
  };
  const lines = marks.filter(m => m.kind === 'line');
  const pointer = lines.find(m => m.x1 === rim.cx && m.y1 === rim.cy);
  if (!pointer) throw new Error('Missing pointer');
  const angles = lines.filter(m => m !== pointer).map(m => angle(m.x2, m.y2)).sort((a, b) => a - b);
  angles.forEach((a, i) => expect(a).toBeCloseTo(2 * Math.PI * i / angles.length));
  const quarter = angles.findIndex(a => Math.abs(a - Math.PI / 2) < 1e-6);
  const at = angles.findIndex(a => Math.abs(a - angle(pointer.x2, pointer.y2)) < 1e-6);
  expect(quarter).toBeGreaterThan(1);
  expect(at).toBeGreaterThan(0);
  expect(at % quarter).not.toBe(0);
  return at * Number(rightLabel.text) * 1000 / quarter;
}

function readWater({marks}: Batch11UpperPicture) {
  const water = marks.filter(m => m.kind === 'path' && m.fill);
  expect(water).toHaveLength(2);
  return water.map(m => {
    if (m.kind !== 'path') throw new Error('Expected a water outline');
    const outline = /^M ([\d.]+) ([\d.]+) H ([\d.]+) V ([\d.]+) H ([\d.]+) Z$/.exec(m.d);
    if (!outline) throw new Error('Missing horizontal water surface');
    const [, left, surface, wall, base, returnX] = outline.map(Number);
    expect(returnX).toBe(left);
    const graduations = marks.filter(mark => mark.kind === 'line').filter(line => line.x1 === wall)
      .map(line => line.y1).sort((a, b) => b - a);
    expect(graduations[0]).toBe(base);
    const pitch = graduations[0] - graduations[1];
    expect(pitch).toBeGreaterThan(0);
    graduations.forEach((y, i) => expect(y).toBeCloseTo(base - pitch * i));
    const labels = marks.filter(mark => mark.kind === 'text')
      .filter(label => label.x > wall && label.x < wall + 60 && /^\d+ ml$/.test(label.text));
    expect(labels.length).toBeGreaterThanOrEqual(2);
    const values = labels.map(label => parseInt(label.text, 10));
    const step = Math.max(...values) / (graduations.length - 1);
    labels.forEach((label, i) => {
      const nearest = Math.round((base - label.y) / pitch);
      expect(nearest * step).toBeCloseTo(values[i]);
    });
    const level = graduations.indexOf(surface);
    expect(level).toBeGreaterThan(0);
    expect(level).toBeLessThan(graduations.length - 1);
    return level * step;
  });
}

it('solves the three presentations from dial markings, water levels and the stated target', () => {
  const seen = {sum: new Set<string>(), conversion: new Set<string>(), water: new Set<string>()};
  for (let seed = -5; seed <= 12; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const picture = q.picture;
      if (picture?.type === 'batch11-upper' && picture.marks.some(m => m.kind === 'path')) {
        const [a, b] = readWater(picture);
        const target = /(\d+) litres/.exec(q.context?.join(' ') ?? '');
        if (!target) throw new Error('Missing target');
        const total = a + b;
        const deficit = Number(target[1]) * 1000 - total;
        const ml = deficit % 1000;
        const litres = (deficit - ml) / 1000;
        expect(litres).toBeGreaterThan(0);
        expect(ml).toBeGreaterThan(0);
        const expected = JSON.stringify([total, litres, ml].map(String));
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-fields') throw new Error('Expected both parts');
        expect(spec.fields.map(f => f.label)).toEqual(['(a) Water in both jugs (ml)', '(b) Extra water (litres)', '(b) Remaining millilitres']);
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([total, litres - 1, ml + 1000].map(String)))).toBe(false);
        seen.water.add(expected);
        continue;
      }
      const isPair = picture?.type === 'batch10-middle' && picture.layout === 'mass-pair';
      if (!isPair && picture?.type !== 'batch11-upper') throw new Error('Expected weighing scales');
      const grams = picture.type === 'batch11-upper' ? kgDialInGrams(picture) : sumDials(picture);
      const expected = `${grams} g`;
      expect(q.answer).toBe(expected);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices?.filter(option => option === expected)).toHaveLength(1);
      (isPair ? seen.sum : seen.conversion).add(expected);
    }
  }
  for (const answers of Object.values(seen)) expect(answers.size).toBeGreaterThan(4);
});

it('replays a seed and visits all three response tasks in three successive indices', () => {
  for (const seed of [0, 17, 2026]) {
    const prompts = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.workedSteps?.every(step => step.text && step.equation)).toBe(true);
      prompts.add(q.prompt);
    }
    expect(prompts.size).toBe(3);
  }
});
