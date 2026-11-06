import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-component-plane-shape-inventory',
  level: 2,
  title: 'Count the pieces in a paper train',
  objective: 'Sort the pieces of one picture by shape, record their counts and compare two counts.',
  skillIds: ['P1.S.SHAPE.01', 'P1.S.SHAPE.02', 'P2.S.AS.01'],
  canonicalPatternId: 'component-plane-shape-inventory',
};

type Point = [number, number];

function train(r: Rng, compare: boolean) {
  const divided = compare ? 1 : r.int(1, 2);
  const roofs = compare ? r.pick([1, 3]) : r.int(1, 2);
  const triangles = 2 * divided + roofs;
  const plain = compare ? triangles + r.int(1, 3) : r.pick([4, 5, 6].filter(n => n !== triangles));
  const circles = r.pick([2, 3, 4, 5].filter(n => n !== triangles && n !== plain));
  const columns = Array.from({ length: plain + divided }, (_, i) => i);
  const places = (count: number) => new Set(r.shuffle(columns).slice(0, count));
  const cuts = places(divided);
  const tops = places(roofs);
  const wheels = places(circles);
  const width = 2 * Math.floor(140 / columns.length);
  const height = compare ? width / 2 : width;
  const left = 160 - columns.length * width / 2;
  const top = 80;
  const bottom = top + height;
  const panelNumbers = (set: Set<number>) => columns.filter(i => set.has(i)).map(i => i + 1).join(', ');
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: [
      'Paper train with a row of touching panels. Count panels from the left.',
      compare ? 'Each panel is twice as wide as it is tall.' : 'The width and height of each panel are equal.',
      'Panel edges meet at square corners.',
      'Panels in order: ' + columns.map(i => cuts.has(i) ? 'divided by a diagonal' : 'whole').join(', ') + '.',
      'Three-sided caps sit on these panels: ' + panelNumbers(tops) + '.',
      'Round wheels touch these panels from below: ' + panelNumbers(wheels) + '.',
    ].join(' '),
    marks: [],
  };
  function polygon(points: Point[]) {
    const d = points.map(([x, y], i) => (i === 0 ? 'M' : 'L') + x + ' ' + y).join(' ') + ' Z';
    picture.marks.push({ kind: 'path', d, fill: 'white' });
  }
  for (const i of columns) {
    const x = left + i * width;
    const a: Point = [x, top], b: Point = [x + width, top];
    const c: Point = [x + width, bottom], d: Point = [x, bottom];
    if (!cuts.has(i)) {
      polygon([a, b, c, d]);
    } else if (r.chance(0.5)) {
      polygon([a, b, c]);
      polygon([a, c, d]);
    } else {
      polygon([a, b, d]);
      polygon([b, c, d]);
    }
    if (tops.has(i)) polygon([a, [x + width / 2, top - width / 2], b]);
    if (wheels.has(i)) {
      const radius = width / 3;
      picture.marks.push({ kind: 'circle', cx: x + width / 2, cy: bottom + radius, r: radius, fill: 'white' });
    }
  }
  return { picture, plain, triangles, circles, divided, roofs };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.pick(['count', 'count', 'count', 'match', 'compare'] as const);
  const { picture, plain, triangles, circles, divided, roofs } = train(r, mode === 'compare');
  const panelName = mode === 'compare' ? 'rectangles' : 'squares';
  const steps: NonNullable<Question['workedSteps']> = [
    { text: `Count the panels with no cut across them. There are ${plain} ${panelName}.` },
    { text: 'Each panel with a diagonal has two triangles. Add the triangles on top.',
      equation: [...Array<number>(divided).fill(2), roofs].join(' + ') + ' = ' + triangles },
  ];
  const base = {
    key, picture,
    context: ['Look at the pieces of the paper train. Count each piece on its own.'],
  };
  const finish = (response: Pick<Question, 'prompt' | 'answer' | 'hint' | 'structuredResponse' | 'choices'>): Question => ({
    ...base, ...response, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (mode === 'compare') {
    const extra = plain - triangles;
    steps.push({ text: 'Pair each triangle with a rectangle. Subtract to find how many rectangles are left.',
      equation: `${plain} − ${triangles} = ${extra}` });
    return finish({
      prompt: 'How many extra rectangles does the train have compared with triangles?',
      answer: String(extra),
      hint: 'Count the rectangles first. Then count the triangles in the middle and on top.',
    });
  }
  if (mode === 'match') {
    const counts = { squares: plain, triangles, circles };
    const names = r.shuffle(['squares', 'triangles', 'circles'] as const);
    const [first, second, other] = names;
    const pair = (a: string, b: string) => a + ', then ' + b;
    const answer = pair(first, second);
    steps.push({ text: `Each wheel is a circle. There are ${circles} circles.` },
      { text: `The count of ${counts[first]} matches ${first}. The count of ${counts[second]} matches ${second}.` });
    return finish({
      prompt: `Which shape has ${counts[first]} pieces? Which shape has ${counts[second]} pieces? Choose the names in that order.`,
      answer, choices: r.shuffle([answer, pair(second, first), pair(first, other), pair(other, second)]),
      hint: 'Count each kind of piece. Match the first number to a shape, then do the same for the second number.',
    });
  }
  return finish({
    prompt: 'How many square pieces and how many triangular pieces can you find?',
    structuredResponse: { kind: 'number-pair', firstLabel: 'Squares', secondLabel: 'Triangles' },
    answer: JSON.stringify([String(plain), String(triangles)]),
    hint: 'Look along the middle row for whole squares. Look both inside the row and above it for triangles.',
  });
}
