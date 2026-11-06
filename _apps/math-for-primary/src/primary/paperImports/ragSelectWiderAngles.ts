import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Point} from './p3RafflesPicture';
import {anglePoint} from './batch8AnglesPicture';
import type {Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p3-select-wider-angles',
  level: 3,
  title: 'Find the wider openings',
  objective: 'Compare pictured angles with a square corner and identify every opening that is wider.',
  skillIds: ['P3.S.ANGLE.02'],
  canonicalPatternId: 'p3-classify-or-select-angles',
} as const;

type Corner = {label: string; size: 'small' | 'right' | 'wide'};
type Diagram = {picture: NonNullable<Question['picture']>; corners: Corner[]};

function sizeFromExcess(excess: number): Corner['size'] {
  if (excess === 0) return 'right';
  return excess > 0 ? 'wide' : 'small';
}

function polygon(r: Rng): Diagram {
  const half = r.int(7, 9);
  const shoulder = r.int(12, 15);
  const base = shoulder + r.int(7, 9);
  const cut = r.int(4, 5);
  const points: Point[] = [
    [half, 0], [2 * half, shoulder], [half + cut, base],
    [r.pick([0, half - cut]), base], [0, shoulder],
  ];
  const angles = r.shuffle([...'ABCDE']).map((label, vertex) => ({vertex, label}));
  const corners = angles.map(({vertex, label}) => {
    const [x, y] = points[vertex];
    const [ax, ay] = points[(vertex + points.length - 1) % points.length];
    const [bx, by] = points[(vertex + 1) % points.length];
    // A negative dot product means this convex inside corner is wider than a right angle.
    const dot = (ax - x) * (bx - x) + (ay - y) * (by - y);
    return {label, size: sizeFromExcess(-dot)};
  });
  return {
    picture: {type: 'raffles-p3', layout: 'angle-polygon', points, angles, rotation: r.pick([0, 90, 180, 270])},
    corners,
  };
}

function separateAngles(r: Rng, pair: boolean): Diagram {
  const positions: Point[] = pair
    ? [[54, 43], [160, 43], [266, 43], [106, 143], [214, 143]]
    : [[80, 43], [240, 43], [80, 143], [240, 143]];
  const openings = [r.int(30, 48), r.int(52, 72), 90, r.int(110, 132)];
  if (pair) openings.push(r.int(136, 153));
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper', label: 'Lettered angles with a mark between the two sides of each angle.', marks: [],
  };
  const corners = r.shuffle(openings).map((opening, i) => {
    const label = 'ABCDE'[i];
    const [x, y] = positions[i];
    const start = r.int(0, 11) * 30;
    for (const direction of [start, start + opening]) {
      const [x2, y2] = anglePoint(x, y, r.int(26, 34), direction);
      picture.marks.push({kind: 'line', x1: x, y1: y, x2, y2});
    }
    const radius = opening === 90 ? 7 : 11;
    const [ax, ay] = anglePoint(x, y, radius, start);
    const [bx, by] = anglePoint(x, y, radius, start + opening);
    const marker = opening === 90
      ? `M ${ax} ${ay} L ${ax + bx - x} ${ay + by - y} L ${bx} ${by}`
      : `M ${ax} ${ay} A ${radius} ${radius} 0 0 0 ${bx} ${by}`;
    picture.marks.push({kind: 'path', d: marker}, {kind: 'text', x: x - 5, y: y + 47, text: label});
    return {label, size: sizeFromExcess(opening - 90)};
  });
  return {picture, corners};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 3;
  const {picture, corners} = variant === 0 ? polygon(r) : separateAngles(r, variant === 1);
  const labels = (size: Corner['size']) => corners.filter(c => c.size === size).map(c => c.label).sort();
  const small = labels('small'), right = labels('right'), wide = labels('wide');
  const workedSteps = [
    {text: 'Put the corner of a sheet of paper at each lettered angle. Line up one edge with one side of the angle.'},
    {text: `At ${small.join(' and ')}, the second side falls inside the paper corner.`},
    ...(right.length ? [{text: `At ${right.join(' and ')}, both sides line up with the paper corner.`}] : []),
    {text: `The openings at ${wide.join(', ')} extend past the other edge of the paper corner. Choose ${wide.join(', ')}.`},
  ];
  const base = {
    key, picture, workedSteps, hint: 'Turn the paper corner to line up with the angle. Look at the opening between the sides.',
    explanation: workedSteps.map(step => step.text).join(' '),
  };
  if (variant === 0) return {
    ...base, prompt: 'Which corners inside the shape open wider than a right angle?',
    context: ['Write all their letters in ABC order with no spaces.'], answer: wide.join(''),
  };
  const options = corners.map(c => c.label);
  if (variant === 1) return {
    ...base, prompt: 'Pick the two letters where the marked opening is wider than a right angle.',
    structuredResponse: {kind: 'named-pair', options}, answer: JSON.stringify(wide),
  };
  return {
    ...base, prompt: 'Which letter shows an opening wider than a right angle?',
    choices: options, answer: wide[0],
  };
}
