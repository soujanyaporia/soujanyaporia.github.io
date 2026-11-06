import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridPoint as Point, GridSegment as Stroke } from '../gridDrawingModel';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-rag-combined-line-tests',
  level: 3,
  title: 'Find both line relationships',
  objective: 'Find parallel and perpendicular pairs in one figure, or identify one line that fits two given relationships.',
  skillIds: ['P3.S.LINES.01'],
  canonicalPatternId: 'p3-combined-parallel-and-perpendicular-conditions',
};

type Task = Omit<Question, 'key' | 'workedSteps' | 'explanation'> & { steps: string[] };

function shapeTask(r: Rng): Task {
  const w = r.int(3, 4), h = r.int(3, 4);
  const target: Point[] = r.chance(0.5)
    ? [[0, 0], [w, 0], [w - 1, h], [0, h]]
    : [[0, 0], [w, 0], [w, 1], [w - 1, 1], [w - 1, h], [0, h]];
  const outlines: Point[][] = [
    target,
    [[0, h], [1, 0], [w, 0], [w - 1, h]],
    [[0, 0], [w, 0], [0, h]],
    [[0, h], [1, 0], [w, h]],
  ];
  const order = r.shuffle([0, 1, 2, 3]);
  const turns = outlines.map(() => r.int(0, 3));
  const options = order.map((kind, slot) => {
    const points = outlines[kind].map(([x, y]): Point => {
      for (let t = 0; t < turns[kind]; t++) [x, y] = [4 - y, x];
      return [x + 0.5, y + 0.5];
    });
    const segments = points.map((p, i): Stroke => [p, points[(i + 1) % points.length]]);
    return { label: 'ABCD'[slot], segments };
  });
  const answer = options[order.indexOf(0)].label;
  const parallelOnly = options[order.indexOf(1)].label;
  const direction = turns[0] % 2 === 0 ? 'horizontal' : 'vertical';
  return {
    prompt: 'Which shape has parallel sides and also has two sides that meet at a right angle?',
    picture: { type: 'batch10-middle', layout: 'line-options', options },
    choices: options.map(o => o.label), answer,
    hint: 'Look at the outline of each shape. Find two sides that stay the same distance apart, then look for a square corner.',
    steps: [
      `Shapes ${answer} and ${parallelOnly} both have parallel sides. In ${answer}, look for a pair of ${direction} sides.`,
      `One side of ${answer} joins those two sides and makes a square corner with each. None of the corners of ${parallelOnly} is a right angle.`,
      `Shape ${answer} fits both clues.`,
    ],
  };
}

// Each stroke is a single straight segment, even where another stroke meets its middle.
const letters: Record<string, Stroke[]> = {
  E: [[[0, 0], [0, 6]], [[0, 0], [4, 0]], [[0, 3], [3, 3]], [[0, 6], [4, 6]]],
  F: [[[0, 0], [0, 6]], [[0, 0], [4, 0]], [[0, 3], [3, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  N: [[[0, 6], [0, 0]], [[0, 0], [4, 6]], [[4, 6], [4, 0]]],
  Z: [[[0, 0], [4, 0]], [[4, 0], [0, 6]], [[0, 6], [4, 6]]],
  L: [[[0, 0], [0, 6]], [[0, 6], [4, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  A: [[[0, 6], [2, 0]], [[2, 0], [4, 6]], [[1, 3], [3, 3]]],
  V: [[[0, 0], [2, 6]], [[2, 6], [4, 0]]],
};

function letterTask(r: Rng): Task {
  const winners = r.shuffle(['E', 'F', 'H']).slice(0, 2);
  const distractors = [r.pick(['N', 'Z']), r.pick(['L', 'T']), r.pick(['A', 'V'])];
  const fourth = r.pick(['N', 'Z', 'L', 'T', 'A', 'V'].filter(c => !distractors.includes(c)));
  const options = r.shuffle([...winners, ...distractors, fourth]);
  const scale = r.int(7, 9);
  const marks = options.flatMap((c, i) => letters[c].map(([[x, y], [u, v]]): Batch11UpperMark => ({
    kind: 'line', x1: 14 + 51 * i + scale * x, y1: 100 + scale * (y - 3),
    x2: 14 + 51 * i + scale * u, y2: 100 + scale * (v - 3),
  })));
  return {
    prompt: 'Pick the two letters that each have a pair of parallel strokes and a pair of perpendicular strokes.',
    picture: { type: 'batch11-upper', marks, label: `Stick letters from left to right: ${options.join(', ')}.` },
    structuredResponse: { kind: 'named-pair', options }, answer: JSON.stringify(winners),
    hint: 'Trace one letter at a time. Can you find two strokes that run side by side? Can you also find a square corner in that letter?',
    steps: winners.map(c => c === 'H'
      ? 'In H, the two upright strokes are parallel. The middle stroke meets both at right angles.'
      : `In ${c}, two of the strokes run across in the same direction. They each meet the upright stroke at a right angle.`),
  };
}

function gridTask(r: Rng): Task {
  const firstX = r.int(1, 2), otherX = r.int(5, 6), row = r.int(3, 5);
  const grid: Stroke[] = [
    [[firstX, 0], [firstX, 8]], [[0, row], [8, row]], [[otherX, 0], [otherX, 8]],
    [[4, 0], [8, 6]], [[0, 1], [4, 8]], [[0, 7], [8, 2]],
  ];
  const swap = r.chance(0.5);
  const names = r.shuffle([...'ABCDEFGHJKLMNPQRSTUVWXYZ']);
  const marks: Batch11UpperMark[] = [];
  const screen = (x: number, y: number): Point => [88 + 18 * x, 28 + 18 * y];
  for (let y = 0; y <= 8; y++) {
    for (let x = 0; x <= 8; x++) {
      const [cx, cy] = screen(x, y);
      marks.push({ kind: 'circle', cx, cy, r: 0.5 });
    }
  }
  const descriptions: string[] = [];
  const labels = grid.map((ends, i) => {
    const label = names[i * 2] + names[i * 2 + 1];
    const points = ends.map(([a, b], j) => {
      const [x, y] = swap ? [b, a] : [a, b];
      const [px, py] = screen(x, y);
      const dx = x === 0 ? -13 : x === 8 ? 13 : 0;
      const dy = y === 0 ? -13 : y === 8 ? 13 : 0;
      marks.push({ kind: 'text', text: label[j], x: px + dx - 5, y: py + dy + 5 });
      descriptions.push(`${label[j]} is ${x} spaces right and ${y} down`);
      return [px, py];
    });
    const [[x1, y1], [x2, y2]] = points;
    marks.push({ kind: 'line', x1, y1, x2, y2 });
    return label;
  });
  const [first, second, answer] = labels;
  return {
    prompt: `Which line is parallel to ${first} and crosses ${second} at a right angle?`,
    picture: { type: 'batch11-upper', marks,
      label: `Lines ${labels.join(', ')} on a square dot grid. From the top left, ${descriptions.join('; ')}.` },
    choices: r.shuffle(labels.slice(2)), answer,
    hint: 'Trace the first line and look for another line going in the same direction. Follow it to the second line and check the corner.',
    steps: [
      `${first} and ${answer} both run ${swap ? 'across the grid' : 'straight up and down'}. They stay ${otherX - firstX} grid spaces apart, so they are parallel.`,
      `Where ${answer} crosses ${second}, one line is horizontal and the other is vertical. They meet at a right angle, so choose ${answer}.`,
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = (hashString(String(seed)) % 4 + (index >>> 0) % 4) % 4;
  const { steps, ...task } = slot === 3 ? gridTask(r) : slot === 1 ? letterTask(r) : shapeTask(r);
  return { ...task, key, explanation: steps.join(' '), workedSteps: steps.map(text => ({ text })) };
}
