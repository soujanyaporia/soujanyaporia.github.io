import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p3-perpendicular-line-identification',
  level: 3,
  title: 'Find perpendicular lines',
  objective: 'Use a square corner to find perpendicular lines in a labelled figure.',
  skillIds: ['P3.S.LINES.01'],
  canonicalPatternId: 'perpendicular-line-identification',
};

// Coordinates in equal steps, followed by the offset for the letter in the drawing.
type Vertex = [x: number, y: number, labelDx: number, labelDy: number];
type Edge = [start: number, end: number];

function diagram(r: Rng, vertices: Vertex[], edges: Edge[], dotted = false) {
  const letters = r.shuffle([...'ABCDEFGHJKLMNPQRSTUVWXYZ']).slice(0, vertices.length);
  const names = edges.map(([a, b]) => letters[a] + letters[b]);
  const across = r.pick([-1, 1]), down = r.pick([-1, 1]), cell = r.int(17, 19);
  const points = vertices.map(([x, y, dx, dy]) => {
    const px = 160 + across * x * cell, py = 100 + down * y * cell;
    return { x: px, y: py, labelX: px + across * dx, labelY: py + down * dy };
  });
  const marks: Batch11UpperMark[] = [];
  if (dotted) {
    for (let x = -7; x <= 7; x++) {
      for (let y = -4; y <= 4; y++) {
        const cx = 160 + cell * x, cy = 100 + cell * y;
        const underLetter = points.some(p => Math.abs(p.labelX - cx) < 11 && Math.abs(p.labelY - cy) < 12);
        if (!underLetter) marks.push({ kind: 'circle', cx, cy, r: 0.5 });
      }
    }
  }
  for (const [a, b] of edges) {
    marks.push({ kind: 'line', x1: points[a].x, y1: points[a].y, x2: points[b].x, y2: points[b].y });
  }
  points.forEach(({ x, y, labelX, labelY }, i) => {
    marks.push({ kind: 'circle', cx: x, cy: y, r: 2, fill: '#235b4c' });
    marks.push({ kind: 'text', x: labelX - 6, y: labelY + 6, text: letters[i] });
  });
  const positions = vertices.map(([x, y], i) => `${letters[i]} (${7 + across * x}, ${4 + down * y})`);
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `Lines shown: ${names.join(', ')}. Point positions in equal steps right and down from the top left: ${positions.join(', ')}.`,
    marks,
  };
  return { picture, names, letters };
}

function singleLine(r: Rng, key: string): Question {
  const tilted = r.chance(0.5), column = r.int(-3, -1);
  const points: Vertex[] = tilted ? [
    [-5, -2, -14, -5], [5, 3, 14, 3], [-3, 4, -11, 10], [0, -2, 10, -10],
    [-5, 1, -14, -3], [1, 4, 10, 10], [2, -3, 2, -14], [2, 2, 0, 14],
    [-5, 3, -14, 3], [5, -2, 14, -3],
  ] : [
    [-6, 0, -14, -3], [6, 0, 14, -3], [column, -3, 0, -13], [column, 3, 0, 14],
    [-6, 2, -14, 3], [0, 2, 10, 6], [0, -3, 0, -13], [3, 3, 0, 14],
    [2, -2, 3, -13], [6, 2, 14, 3],
  ];
  const edges: Edge[] = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
  const { picture, names } = diagram(r, points, edges, tilted);
  const [reference, answer] = names;
  const steps = [
    tilted
      ? `Follow ${reference} on the dots. It goes two spaces sideways for each space up or down. Turn a paper corner so one edge follows that line.`
      : `Lay one edge of a paper corner along the horizontal line ${reference}.`,
    `Slide the corner to the crossing with ${answer}. Its other edge follows ${answer}, so the lines meet at a right angle.`,
  ];
  return {
    key, prompt: `Which line is perpendicular to ${reference}?`, picture, answer,
    choices: r.shuffle(names.slice(1)), hint: 'Try the corner of a sheet of paper at each crossing.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}

function linePair(r: Rng, key: string): Question {
  const foot = r.int(-2, 2), height = r.int(4, 5);
  const points: Vertex[] = [
    [-6, 2, -14, 5], [6, 2, 14, 5], [foot, 2, 0, 15], [foot, 2 - height, 0, -14],
  ];
  const { picture, names, letters } = diagram(r, points, [[0, 1], [3, 2], [0, 3], [3, 1]]);
  const [base, upright, left, right] = names;
  const answer = `${base} and ${upright}`;
  const steps = [
    `Trace ${base} from ${letters[0]} to ${letters[1]}. It passes through ${letters[2]}.`,
    `At ${letters[2]}, ${upright} meets ${base} and makes a square corner. That makes them perpendicular.`,
  ];
  return {
    key, prompt: 'Which pair of lines is perpendicular?', picture, answer,
    choices: r.shuffle([answer, `${base} and ${left}`, `${left} and ${right}`, `${upright} and ${right}`]),
    hint: 'Trace both lines in each pair. Check the corner where they meet.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}

function rectangleSides(r: Rng, key: string): Question {
  const w = r.int(4, 6), h = r.int(2, 3);
  const points: Vertex[] = [
    [-w, -h, -12, -8], [w, -h, 12, -8], [w, h, 12, 8], [-w, h, -12, 8],
  ];
  const { picture, names, letters } = diagram(r, points, [[0, 1], [1, 2], [2, 3], [3, 0]]);
  const i = r.int(0, 3), reference = names[i];
  const first = names[(i + 3) % 4], second = names[(i + 1) % 4];
  const steps = [
    `Find ${reference} on the rectangle. At ${letters[i]}, side ${first} makes a square corner with it.`,
    `Follow ${reference} to ${letters[(i + 1) % 4]}. Side ${second} makes a square corner there. Both sides are perpendicular to ${reference}.`,
  ];
  return {
    key, prompt: `Which two sides of the rectangle are perpendicular to ${reference}?`,
    picture, answer: JSON.stringify([first, second]),
    structuredResponse: { kind: 'named-pair', options: r.shuffle(names) },
    hint: 'Look at each end of the named side. Choose one side at each end.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = r.int(0, 6);
  if (slot < 4) return singleLine(r, key);
  if (slot < 6) return linePair(r, key);
  return rectangleSides(r, key);
}
