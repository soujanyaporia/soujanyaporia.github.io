import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridPoint as Point, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'rag-p3-count-right-angles',
  level: 3,
  title: 'Count right angles in figures',
  objective: 'Find square corners inside an outline and use their count to compare shapes.',
  skillIds: ['P3.S.ANGLE.01'],
  canonicalPatternId: 'count-right-angles-in-figures',
} as const;

type Outline = Point[];
const around = (p: Outline, i: number) => p[(i + p.length) % p.length];

function squareCorners(p: Outline): number[] {
  const winding = Math.sign(p.reduce((sum, [x, y], i) => {
    const [a, b] = around(p, i + 1);
    return sum + x * b - y * a;
  }, 0));
  return p.flatMap(([x, y], i) => {
    const [a, b] = around(p, i - 1), [c, d] = around(p, i + 1);
    const dx = x - a, dy = y - b, ex = c - x, ey = d - y;
    return winding * (dx * ey - dy * ex) > 0 && dx * ex + dy * ey === 0 ? [i] : [];
  });
}

// All turns and reflections preserve angles. A half-scale diagonal turn
// keeps the coordinates exact and leaves the tilted outline inside its panel.
function place(p: Outline, r: Rng, frame: number, tilt = false): Outline {
  const mirror = r.pick([-1, 1]), turns = r.int(0, 3);
  const rotated = p.map(([x, y]): Point => {
    x *= mirror;
    if (tilt) [x, y] = [(x - y) / 2, (x + y) / 2];
    for (let k = 0; k < turns; k++) [x, y] = [-y, x];
    return [x, y];
  });
  const offset = (values: number[]) => (frame - Math.max(...values) - Math.min(...values)) / 2;
  const dx = offset(rotated.map(v => v[0])), dy = offset(rotated.map(v => v[1]));
  return rotated.map(([x, y]) => [x + dx, y + dy]);
}

function markedCount(r: Rng, key: string): Question {
  const w = r.int(6, 8), h = r.int(4, 6), a = r.int(2, w - 4), b = a + 2, depth = r.int(2, h - 2);
  const left = r.int(0, 2), right = r.int(0, 2);
  const outline: Outline = [[0, 0], [a, 0], [a, depth], [b, depth], [b, 0], [w, 0], [w, h - right]];
  if (right) outline.push([w - right, h]);
  outline.push([left, h]);
  if (left) outline.push([0, h - left]);
  const p = place(outline, r, 8, r.chance(0.5)), rightAt = squareCorners(p);
  const edges: GridSegment[] = p.map((v, i) => [v, around(p, i + 1)]);
  const marks: GridSegment[] = [];
  for (const i of rightAt) {
    const [x, y] = p[i];
    const along = ([a, b]: Point): Point => {
      const f = 0.31 / Math.hypot(a - x, b - y);
      return [x + (a - x) * f, y + (b - y) * f];
    };
    const u = along(around(p, i - 1)), v = along(around(p, i + 1));
    const elbow: Point = [u[0] + v[0] - x, u[1] + v[1] - y];
    marks.push([u, elbow], [elbow, v]);
  }
  const n = rightAt.length, other = p.length - 2 - n;
  const wrong = [...new Set([n + 2, p.length, n - 1, n + 1, p.length - 1])].filter(v => v !== n);
  const steps = [
    'Trace the dark outline once. A small square mark shows where a square corner fits inside.',
    'Skip the two corners that point into the shape. The space inside the outline at each of them is wider than a square corner.',
    other ? `There are ${p.length} corners. Leave out the 2 inward corners and the ${other} other corners without square marks: ${p.length} − 2 − ${other} = ${n} right angles.`
          : `Only the two inward corners are left out: ${p.length} − 2 = ${n} right angles.`,
  ];
  return {
    key, prompt: 'How many corners inside the dark outline are right angles?',
    picture: { type: 'grid-drawing', columns: 8, rows: 8, givenSegments: edges, segments: marks, caption: 'A closed outline with small square marks inside some corners' },
    answer: String(n), choices: r.shuffle([n, ...r.shuffle(wrong).slice(0, 3)]).map(String),
    hint: 'Start at one corner and follow the outline. Count each marked corner just once.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}

// Different outlines within a group can have the same count. Keeping them
// distinct means a matching pair cannot be found just by spotting two copies.
const families: Outline[][] = [
  [[[0, 0], [3, 0], [4, 2], [1, 2]], [[0, 3], [2, 0], [4, 3]],
   [[1, 0], [3, 0], [4, 2], [3, 4], [1, 4], [0, 2]]],
  [[[0, 0], [4, 0], [0, 3]], [[0, 0], [3, 0], [4, 1], [4, 3], [3, 4], [1, 4], [0, 3]]],
  [[[0, 0], [4, 0], [2, 3], [0, 3]], [[1, 0], [4, 0], [4, 3], [3, 4], [0, 4], [0, 1]]],
  [[[0, 0], [2, 0], [4, 2], [4, 4], [0, 4]]],
  [[[0, 0], [4, 0], [4, 2], [0, 2]], [[0, 2], [2, 0], [4, 2], [2, 4]]],
  [[[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]]],
];

function compare(r: Rng, key: string, pair: boolean): Question {
  const group = pair ? r.pick([0, 1, 2, 4]) : 0;
  const targetShapes = r.shuffle(families[group]).slice(0, pair ? 2 : 1);
  const others = r.shuffle(families.filter((_, i) => i !== group)).slice(0, 4 - targetShapes.length);
  const shapes = r.shuffle([...targetShapes, ...others.map(f => r.pick(f))]).map((p, i) => ({
    label: 'JKLM'[i], points: place(p, r, 4),
  }));
  const counts = shapes.map(s => squareCorners(s.points).length);
  const pairs = shapes.flatMap((s, i) => shapes.slice(i + 1).map((t, j) => ({
    name: `${s.label} and ${t.label}`, equal: counts[i] === counts[i + j + 1],
  })));
  const answer = pair ? pairs.find(p => p.equal)!.name : shapes[counts.indexOf(0)].label;
  const steps = [
    'Try the corner of a sheet of paper at each corner of a coloured shape. Turn the paper to line it up with the sides.',
    'Keep a tally for each shape: ' + shapes.map((s, i) => `${s.label}: ${counts[i]}`).join('; ') + '.',
    pair ? `${answer} have matching tallies.` : `${answer} has no square corners inside it.`,
  ];
  return {
    key, prompt: pair ? 'Which two shapes have the same number of right angles inside?'
                      : 'Which shape has no right angles inside? Write its letter.',
    picture: { type: 'raffles-p3', layout: 'polygons', shapes },
    answer, ...(pair ? { choices: r.shuffle([answer, ...r.shuffle(pairs.filter(p => !p.equal).map(p => p.name)).slice(0, 3)]) } : {}),
    hint: 'Follow the edge of each coloured shape. Count only the corners where a square corner fits inside.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`, r = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) % 7 + index) % 7 + 7) % 7;
  return slot < 5 ? markedCount(r, key) : compare(r, key, slot === 6);
}
