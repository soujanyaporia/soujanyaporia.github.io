import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragAreaCoveredByEqualSquares';

function readCells(picture: Batch11UpperPicture) {
  const cells = picture.marks.flatMap(mark => {
    if (mark.kind !== 'path') return [];
    const match = /^M (\d+) (\d+) h (\d+) v (\d+) h -(\d+) Z$/.exec(mark.d);
    if (!match) throw new Error('Expected a closed square tile');
    const [x, y, width, height, back] = match.slice(1).map(Number);
    expect(width).toBeGreaterThan(0);
    expect(height).toBe(width);
    expect(back).toBe(width);
    expect(x + width).toBeLessThan(320);
    expect(y + height).toBeLessThan(200);
    return [{ x, y, width, shaded: mark.fill !== 'white' }];
  });
  expect(cells.length).toBeGreaterThan(1);
  const size = cells[0].width;
  const origin = cells[0];
  const positions = new Set<string>();
  for (const cell of cells) {
    expect(cell.width).toBe(size);
    expect((cell.x - origin.x) % size === 0).toBe(true);
    expect((cell.y - origin.y) % size === 0).toBe(true);
    positions.add(`${cell.x},${cell.y}`);
  }
  expect(positions.size).toBe(cells.length);
  return cells;
}

function readSize(context: string, unit: string) {
  const match = /sides (\d+) (cm|m) long/.exec(context);
  if (!match) throw new Error('Missing visible side length');
  expect(match[2]).toBe(unit);
  return Number(match[1]);
}

function solve(q: Question) {
  const context = (q.context ?? []).join(' ');
  if (!q.picture) {
    const count = /(\d+) equal square slabs/.exec(context);
    if (!count) throw new Error('Missing number of slabs');
    const side = readSize(context, 'm');
    expect(q.unit).toBe('m²');
    expect(q.structuredResponse).toBeUndefined();
    return { form: 'given', expected: String(Number(count[1]) * side ** 2) };
  }
  if (q.picture.type !== 'batch11-upper') throw new Error('Expected a tile diagram');
  const cells = readCells(q.picture);
  const label = q.picture.marks.find(mark => mark.kind === 'text');
  if (!label || label.kind !== 'text') {
    const shaded = cells.filter(cell => cell.shaded);
    expect(shaded.length).toBeGreaterThan(1);
    expect(shaded.length).toBeLessThan(cells.length);
    expect(q.prompt).toContain('shaded');
    expect(q.unit).toBe('cm²');
    expect(q.structuredResponse).toBeUndefined();
    return { form: 'grid', expected: String(shaded.length * readSize(context, 'cm') ** 2) };
  }

  const measure = /^(\d+) cm$/.exec(label.text);
  const bracket = q.picture.marks.find(mark => mark.kind === 'line' && mark.y1 === mark.y2);
  if (!measure || !bracket || bracket.kind !== 'line') throw new Error('Missing labelled span');
  const row = cells.slice().sort((a, b) => a.x - b.x);
  const size = row[0].width;
  row.forEach((cell, i) => {
    expect(cell.x).toBe(row[0].x + i * size);
    expect(cell.y).toBe(row[0].y);
  });
  expect(bracket.x1).toBe(row[0].x);
  const across = (bracket.x2 - bracket.x1) / size;
  expect(Number.isInteger(across)).toBe(true);
  expect(across).toBeGreaterThanOrEqual(1);
  expect(across).toBeLessThan(row.length);
  const side = Number(measure[1]) / across;
  expect(Number.isInteger(side) && side > 1).toBe(true);
  const length = row.length * side;
  // Sum individual tile areas to check the rectangle calculation independently.
  const area = row.reduce(sum => sum + side * side, 0);
  expect(q.structuredResponse).toEqual({
    kind: 'number-pair', firstLabel: '(a) Length (cm)', secondLabel: '(b) Area (cm²)',
  });
  const expected = JSON.stringify([String(length), String(area)]);
  return { form: across === 1 ? 'single span' : 'longer span', expected };
}

it('solves the printed measurements and drawn squares for varied seeds and indices', () => {
  const forms = new Set<string>();
  for (let seed = -8; seed < 60; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const { form, expected } = solve(q);
      expect(q.answer).toBe(expected);
      if (q.structuredResponse) {
        const reversed = JSON.stringify(JSON.parse(expected).reverse());
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, reversed)).toBe(false);
      }
      forms.add(form);
    }
  }
  expect([...forms].sort()).toEqual(['given', 'grid', 'longer span', 'single span']);
});

it('repeats a seed and supplies varied practice within each form', () => {
  const answers = new Map<string, Set<string>>();
  for (let index = 0; index < 80; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    const { form, expected } = solve(q);
    const values = answers.get(form) ?? new Set<string>();
    values.add(expected);
    answers.set(form, values);
  }
  expect(answers.size).toBe(4);
  for (const values of answers.values()) expect(values.size).toBeGreaterThan(1);
});
