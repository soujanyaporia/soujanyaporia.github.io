import { expect, it } from 'vitest';
import { gridEdges, type GridDrawingPicture, type GridPoint } from '../gridDrawingModel';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4RearrangedTileOutline';

const directions: GridPoint[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Find the regions enclosed by the visible lines, independent of segment order.
function tileFaces(picture: GridDrawingPicture): GridPoint[][] {
  const walls = new Set(gridEdges(picture.segments));
  const seen = new Set<string>();
  const faces: GridPoint[][] = [];
  for (let y = -1; y <= picture.rows; y++) {
    for (let x = -1; x <= picture.columns; x++) {
      if (seen.has([x, y].join(','))) continue;
      const cells: GridPoint[] = [[x, y]];
      seen.add([x, y].join(','));
      let outside = false;
      for (let i = 0; i < cells.length; i++) {
        const [a, b] = cells[i];
        if (a === -1 || b === -1 || a === picture.columns || b === picture.rows) outside = true;
        for (const [dx, dy] of directions) {
          const nx = a + dx, ny = b + dy;
          if (nx < -1 || ny < -1 || nx > picture.columns || ny > picture.rows) continue;
          const id = [nx, ny].join(',');
          if (seen.has(id)) continue;
          const u = Math.max(a, nx), v = Math.max(b, ny);
          const wall = [[u, v].join(','), [u + Math.abs(dy), v + Math.abs(dx)].join(',')].sort().join(':');
          if (walls.has(wall)) continue;
          cells.push([nx, ny]);
          seen.add(id);
        }
      }
      if (!outside) faces.push(cells);
    }
  }
  return faces;
}

function bounds(cells: GridPoint[]) {
  const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
  return {
    top: Math.min(...ys), bottom: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
}

it('solves both parts from the stated lengths and the drawn tiles', () => {
  const answers = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const labels = /Each rectangle is (\d+) cm long\. Each side of the small square is (\d+) cm\./.exec((q.context ?? []).join(' '));
      if (!labels || q.picture?.type !== 'grid-drawing') throw Error('Missing tile measurements or drawing');
      const length = Number(labels[1]), side = Number(labels[2]);
      const width = length - side;
      const faces = tileFaces(q.picture).sort((a, b) => bounds(a).top - bounds(b).top);
      expect(faces).toHaveLength(10);
      const top = faces.slice(0, 5), bottom = faces.slice(5);
      expect(bounds(top.flat()).bottom).toBeLessThan(bounds(bottom.flat()).top);
      const firstOutline = bounds(top.flat());
      expect(firstOutline.width).toBe(firstOutline.height);
      expect(top.flat()).toHaveLength(firstOutline.width ** 2);

      const squares = top.map(bounds).filter(r => r.width === r.height);
      expect(squares).toHaveLength(1);
      const cmPerGap = side / squares[0].width;
      for (const design of [top, bottom]) {
        const smallTile = design.find(cells => bounds(cells).width === bounds(cells).height);
        if (!smallTile) throw Error('Missing square tile');
        const smallCells = new Set(smallTile.map(p => p.join(',')));
        const neighbours = design.filter(face => face !== smallTile && face.some(([x, y]) =>
          directions.some(([dx, dy]) => smallCells.has([x + dx, y + dy].join(',')))
        ));
        expect(neighbours).toHaveLength(design === top ? 4 : 1);
        let squareCount = 0;
        for (const cells of design) {
          const box = bounds(cells);
          expect(cells).toHaveLength(box.width * box.height);
          const short = Math.min(box.width, box.height) * cmPerGap;
          const long = Math.max(box.width, box.height) * cmPerGap;
          if (short === long) {
            expect(short).toBe(side);
            squareCount++;
          } else {
            expect([short, long]).toEqual([width, length]);
          }
        }
        expect(squareCount).toBe(1);
      }

      const cells = bottom.flat();
      const occupied = new Set(cells.map(p => p.join(',')));
      let outsideEdges = 0;
      for (const [x, y] of cells) {
        for (const [dx, dy] of directions) {
          if (!occupied.has([x + dx, y + dy].join(','))) outsideEdges++;
        }
      }
      const perimeter = outsideEdges * cmPerGap;
      const expected = JSON.stringify([String(width), String(perimeter)]);
      expect(q.answer).toBe(expected);
      if (q.structuredResponse?.kind !== 'number-pair') throw Error('Two measurement fields are required');
      expect(q.structuredResponse.firstLabel).toMatch(/width \(cm\)/i);
      expect(q.structuredResponse.secondLabel).toMatch(/perimeter \(cm\)/i);
      expect(structuredResponseCorrect(q.structuredResponse, q.answer, expected)).toBe(true);
      const swapped = JSON.stringify([String(perimeter), String(width)]);
      expect(structuredResponseCorrect(q.structuredResponse, q.answer, swapped)).toBe(false);
      answers.add(expected);
    }
  }
  expect(answers.size).toBeGreaterThan(8);
});

it('repeats the full question for the same seed and index', () => {
  expect(makeRagQuestion(-32, 4)).toEqual(makeRagQuestion(-32, 4));
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
});
