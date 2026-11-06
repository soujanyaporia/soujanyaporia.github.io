import { Rng, hashString } from '../../engine/random';
import type { Picture, Question } from '../generate';
import type { GridPoint, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p3-equal-edge-perimeter',
  level: 3,
  title: 'Count the edges around a shape',
  objective: 'Count equal lengths around a shape and use the length of one to find its perimeter.',
  skillIds: ['P3.S.AREA.02'],
  canonicalPatternId: 'perimeter-by-counting-equal-edges',
};

// The columns share a base, so there are no holes. A low column between
// taller ends makes tracing the outline different from tracing a rectangle.
function makePicture(heights: number[], outline: boolean): Picture {
  const width = heights.length;
  const top = Math.max(...heights);
  if (!outline) {
    const cells: GridPoint[] = heights.flatMap((h, x) =>
      Array.from({ length: h }, (_, i): GridPoint => [x, top - 1 - i]));
    return { type: 'batch9-middle', layout: 'unit-squares', cells };
  }

  const base = top + 1;
  const points: GridPoint[] = [[1, base], [1, base - heights[0]]];
  for (let i = 0; i < width; i++) {
    points.push([i + 2, base - heights[i]]);
    if (i + 1 < width && heights[i] !== heights[i + 1]) {
      points.push([i + 2, base - heights[i + 1]]);
    }
  }
  points.push([width + 1, base], points[0]);
  const segments: GridSegment[] = points.slice(1).map((p, i) => [points[i], p]);
  return { type: 'grid-drawing', columns: width + 2, rows: top + 2, segments,
    caption: 'A closed outline on evenly spaced dots' };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const outline = r.int(0, 2) !== 0;
  const width = r.int(3, 6);
  const heights = Array.from({ length: width }, () => r.int(1, 4));
  heights[0] = r.int(2, 4);
  heights[width - 1] = r.int(2, 4);
  heights[r.int(1, width - 2)] = 1;
  const scale = r.int(1, 3);
  const unit = outline && r.chance(0.5) ? 'units' : 'cm';
  const one = `${scale} ${unit === 'units' && scale === 1 ? 'unit' : unit}`;
  const picture = makePicture(heights, outline);

  const horizontal = 2 * width;
  const runs = [heights[0], ...heights.slice(1).map((h, i) => Math.abs(h - heights[i])), heights[width - 1]].filter(n => n > 0);
  const vertical = runs.reduce((sum, n) => sum + n, 0);
  const edgeCount = horizontal + vertical;
  const length = edgeCount * scale;
  const workedSteps = [
    { text: 'Count along the bottom first. The horizontal pieces along the top cover the same distance.', equation: `${width} + ${width} = ${horizontal}` },
    { text: 'Count the vertical edges from left to right. Include the sides of each dip.', equation: `${runs.join(' + ')} = ${vertical}` },
    { text: 'Add the two counts to get the number of equal steps around the shape.', equation: `${horizontal} + ${vertical} = ${edgeCount}` },
    { text: `Each step is ${one} long.`, equation: `${edgeCount} × ${scale} = ${length} ${unit}` },
  ];

  const q: Question = {
    key, picture, workedSteps,
    context: [outline ? `One gap between neighbouring dots in a row or column represents ${one}.`
      : `These square tiles form one mat. Each tile has sides ${one} long.`],
    prompt: outline ? 'What is the perimeter of the shape on the dot grid?' : 'What is the perimeter of the whole mat?',
    hint: outline ? 'Start at a corner and trace the line back to that corner. Count the gaps between dots as you go.'
      : 'Follow the outside edge, including any dips. Leave out the sides where two tiles touch.',
    answer: String(length), unit,
    explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '),
  };
  if (outline || r.chance(0.5)) {
    const boxCount = 2 * (width + Math.max(...heights));
    const counts = [...new Set([edgeCount, boxCount, heights.reduce((s, h) => s + h, 0), edgeCount - 2, edgeCount + 2, edgeCount + 4])].slice(0, 4);
    const label = (n: number) => `${n * scale} ${unit}`;
    q.choices = r.shuffle(counts.map(label));
    q.answer = label(edgeCount);
    delete q.unit;
  }
  return q;
}
