import { expect, it } from 'vitest';
import type { GridSegment } from '../gridDrawingModel';
import { gridEdges } from '../gridDrawingModel';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4AdjoiningRectangleAndSquares';

type Box = [x: number, y: number, width: number, height: number];

function outline([x, y, w, h]: Box): GridSegment[] {
  return [
    [[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]],
    [[x + w, y + h], [x, y + h]], [[x, y + h], [x, y]],
  ];
}

function readLength(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing length for ${pattern} in ${text}`);
  const length = Number(match[1]);
  expect(length).toBeGreaterThan(0);
  return length;
}

it('solves the pupil-facing measurements and checks which edges are actually drawn', () => {
  const seen = { choice: new Set<string>(), pair: new Set<string>(), entry: new Set<string>() };

  for (let seed = -5; seed <= 34; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      const picture = q.picture;
      if (picture?.type !== 'grid-drawing') throw new Error('Missing panel sketch');
      const { columns, rows } = picture;
      const checkPieces = (boxes: Box[]) => {
        expect(gridEdges(picture.segments)).toEqual(gridEdges(boxes.flatMap(outline)));
      };

      if (q.choices) {
        forms.add('choice');
        seen.choice.add(text);
        const side = readLength(text, /edge of the right square is (\d+) cm/);
        const middle = readLength(text, /middle tile measures (\d+) cm from left to right/);
        checkPieces([[0, 0, rows, rows], [rows, 0, columns - 2 * rows, rows], [columns - rows, 0, rows, rows]]);
        expect((columns - 2 * rows) * side).toBe(middle * rows);
        const expected = String((side + middle + side) * side);
        expect(q.unit).toBe('cm²');
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(choice => choice === expected)).toHaveLength(1);
        expect(q.answer).toBe(expected);
      } else if (q.structuredResponse) {
        forms.add('pair');
        seen.pair.add(text);
        const side = readLength(text, /mat is (\d+) cm tall/);
        const rest = readLength(text, /join to the right end of the mat is (\d+) cm/);
        checkPieces([[0, 0, rows, rows], [rows, 0, columns - rows, rows]]);
        expect((columns - rows) * side).toBe(rest * rows);
        const perimeter = 4 * side + 2 * rest;
        const area = side * side + rest * side;
        const answer = JSON.stringify([String(perimeter), String(area)]);
        expect(q.structuredResponse).toEqual({
          kind: 'number-pair', firstLabel: '(a) Perimeter (cm)', secondLabel: '(b) Area (cm²)',
        });
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, answer)).toBe(true);
        const swapped = JSON.stringify([String(area), String(perimeter)]);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, swapped)).toBe(false);
      } else {
        forms.add('entry');
        seen.entry.add(text);
        const rise = readLength(text, /rectangular tile is (\d+) cm tall/);
        const squares: Box[] = [];
        for (let x = 0; x < columns; x++) squares.push([x, rows - 1, 1, 1]);
        for (let y = 0; y < rows - 1; y++) squares.push([0, y, 1, 1]);
        expect(rows - 1).toBe(2);
        expect(squares).toHaveLength(6);
        checkPieces([...squares, [1, 0, columns - 1, rows - 1]]);
        const side = rise / (rows - 1);
        expect(Number.isInteger(side)).toBe(true);
        const rectArea = rise * ((columns - 1) * side);
        expect(q.unit).toBe('cm²');
        expect(q.answer).toBe(String(rectArea + squares.length * side * side));
      }
    }
    expect(forms.size).toBe(3);
  }
  for (const contexts of Object.values(seen)) expect(contexts.size).toBeGreaterThan(4);
});

it('repeats a question, including its choice order, for the same seed and index', () => {
  for (const seed of [0, 42, 902]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (const index of [1, 2, 3]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
