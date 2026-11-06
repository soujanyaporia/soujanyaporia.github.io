import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-grid-line-choice',
  level: 5,
  title: 'Choose a parallel line on a grid',
  objective: 'Compare movements across and down a square grid to identify an undrawn parallel line.',
  skillIds: ['P3.S.LINES.01'],
  canonicalPatternId: 'p5-identify-parallel-and-perpendicular-relationships',
};

type Point = [number, number];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const run = r.pick([3, 4, 6]);
  const rise = r.int(1, 2);
  const reflectX = r.chance(0.5);
  const reflectY = r.chance(0.5);
  const names = r.shuffle([...'ABCDEFGHJKLMNPQRSTUVWXYZ']).slice(0, 7);
  // The alternatives reverse the vertical movement or change the horizontal movement.
  const initial: Point[] = [
    [1, 1], [1 + run, 1 + rise], [1, 4],
    [1 + run, 4 + rise], [1 + run, 4 - rise],
    [run, 4 + rise], [2 + run, 4 + rise],
  ];
  const points = initial.map(([x, y]): Point => [
    reflectX ? 10 - x : x,
    reflectY ? 6 - y : y,
  ]);
  const screen = ([x, y]: Point): Point => [40 + 24 * x, 22 + 24 * y];
  const positions = points.map(screen);
  const marks: Batch11UpperMark[] = [];
  for (let y = 0; y <= 6; y++) {
    for (let x = 0; x <= 10; x++) {
      const [cx, cy] = screen([x, y]);
      marks.push({ kind: 'circle', cx, cy, r: 0.35, fill: '#235b4c' });
    }
  }
  marks.push({
    kind: 'line',
    x1: positions[0][0], y1: positions[0][1],
    x2: positions[1][0], y2: positions[1][1],
  });
  positions.forEach(([cx, cy], i) => {
    marks.push({ kind: 'circle', cx, cy, r: 2.4, fill: '#235b4c' });
    marks.push({ kind: 'text', x: cx - 5, y: cy + 17, text: names[i] });
  });
  const reference = names[0] + names[1];
  const answer = names[2] + names[3];
  const choices = r.shuffle(names.slice(3).map(name => names[2] + name));
  const movement = (a: Point, b: Point) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return `${Math.abs(dx)} spaces ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} space${Math.abs(dy) === 1 ? '' : 's'} ${dy > 0 ? 'down' : 'up'}`;
  };
  const workedSteps = [
    { text: `From ${names[0]} to ${names[1]}, move ${movement(points[0], points[1])}.` },
    { text: `Starting at ${names[2]}, the same movement reaches ${names[3]}.` },
    { text: `${answer} and ${reference} run in the same direction and stay apart. They would never meet if extended, so they are parallel.` },
  ];
  const locations = names.map((name, i) => `${name}: ${points[i][0]} spaces right, ${points[i][1]} spaces down`).join('; ');
  return {
    key,
    prompt: `Which line would be parallel to ${reference} if you joined its named points?`,
    context: [
      'The dots form a square grid. Neighbouring dots are equally far apart across and down.',
      `Only ${reference} is drawn. Each choice joins ${names[2]} to another labelled point.`,
    ],
    picture: {
      type: 'batch11-upper',
      label: `Square dot grid with 10 spaces across and 6 spaces down. Counting from the top left: ${locations}. The only drawn line is ${reference}.`,
      marks,
    },
    choices,
    answer,
    hint: 'Count the spaces across and up or down along the drawn line. Look for the same movement from the starting point of the choices.',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
