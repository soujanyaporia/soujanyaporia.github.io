import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p1-boundary-figures',
  level: 1,
  title: 'Follow the outline',
  objective: 'Choose every figure whose outline fits the clues about straight sides, corners and equal lengths.',
  skillIds: ['P1.S.SHAPE.01'],
  canonicalPatternId: 'p1-select-figures-by-boundary-properties',
} as const;

type Point = [number, number];
const polygons = {
  square: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  rectangle: [[-1, -0.55], [1, -0.55], [1, 0.55], [-1, 0.55]],
  equalTriangle: [[0, -1], [Math.sqrt(3) / 2, 0.5], [-Math.sqrt(3) / 2, 0.5]],
  rightTriangle: [[-1, 0.7], [0.65, 0.7], [0.65, -0.7]],
  dart: [[-1, -0.8], [1, 0], [-1, 0.8], [-0.5, 0]],
  shield: [[-0.9, -0.8], [0.9, -0.8], [0.9, 0.1], [0, 1], [-0.9, 0.1]],
} satisfies Record<string, Point[]>;
type Polygon = keyof typeof polygons;
type Shape = Polygon | 'cap' | 'scoop' | 'petal' | 'circle';

const descriptions: Record<Shape, string> = {
  square: 'a square', rectangle: 'a rectangle with two longer sides',
  equalTriangle: 'a triangle with three equal sides', rightTriangle: 'a triangle with three different side lengths',
  dart: 'a pointed shape with four straight sides and an inward corner',
  shield: 'a five-sided shape with a pointed end', cap: 'a curved arch joined to one straight side',
  scoop: 'an outline with three straight sides and one side that curves inwards',
  petal: 'an outline with two straight sides joined by a curve', circle: 'a circle',
};

function outline(shape: Shape, cx: number, cy: number, size: number, turn: number): Batch11UpperMark {
  if (shape === 'circle') return { kind: 'circle', cx, cy, r: size };
  // Use the same scale on both axes so a turn never changes the side lengths.
  const point = (x: number, y: number) => {
    const [a, b] = [[x, y], [-y, x], [-x, -y], [y, -x]][turn];
    return `${cx + size * a} ${cy + size * b}`;
  };
  let d: string;
  if (shape === 'cap') {
    d = `M ${point(-1, 0.65)} L ${point(1, 0.65)} Q ${point(0, -1.5)} ${point(-1, 0.65)} Z`;
  } else if (shape === 'scoop') {
    d = `M ${point(-1, -0.7)} Q ${point(0, 0.8)} ${point(1, -0.7)} L ${point(1, 0.8)} L ${point(-1, 0.8)} Z`;
  } else if (shape === 'petal') {
    d = `M ${point(-1, 0.7)} L ${point(1, 0.7)} L ${point(0.4, -0.9)} Q ${point(-1, -0.8)} ${point(-1, 0.7)} Z`;
  } else {
    const [first, ...others] = polygons[shape];
    d = `M ${point(...first)} ${others.map(p => 'L ' + point(...p)).join(' ')} Z`;
  }
  return { kind: 'path', d };
}

function board(r: Rng, kinds: Shape[]) {
  const tiles = r.shuffle(kinds).map((shape, i) => ({ shape, label: 'ABCDE'[i] }));
  const topCount = Math.ceil(tiles.length / 2);
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: tiles.map(t => `${t.label} is ${descriptions[t.shape]}.`).join(' '),
    marks: tiles.flatMap((t, i): Batch11UpperMark[] => {
      const top = i < topCount;
      const col = top ? i : i - topCount;
      const width = 320 / (top ? topCount : tiles.length - topCount);
      const cx = (col + 0.5) * width;
      const cy = top ? 42 : 140;
      return [outline(t.shape, cx, cy, r.int(19, 27), r.int(0, 3)),
        { kind: 'text', text: t.label, x: cx - 5, y: cy + 42 }];
    }),
  };
  return { picture, labels: tiles.map(t => t.label),
    find: (...wanted: Shape[]) => tiles.filter(t => wanted.includes(t.shape)).map(t => t.label) };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = (hashString(String(seed)) + (index >>> 0)) % 4;
  const finish = (b: ReturnType<typeof board>, prompt: string, matches: string[], hint: string, steps: string[]): Question => ({
    key, prompt, picture: b.picture, hint, explanation: steps.join(' '),
    workedSteps: steps.map(text => ({ text })),
    ...(matches.length === 2
      ? { structuredResponse: { kind: 'named-pair' as const, options: b.labels }, answer: JSON.stringify(matches) }
      : { choices: b.labels, answer: matches[0] }),
  });

  if (mode === 0) {
    const straight = r.pick<Shape>(['dart', 'shield']);
    const b = board(r, [straight, 'cap', 'scoop', 'petal']);
    const match = b.find(straight);
    return finish(b, 'Which shape can you trace from start to finish using just straight lines?', match,
      'Follow the whole outline with your finger. Look for a bend along a side.',
      [`Look at ${b.find('cap', 'scoop', 'petal').join(', ')}. On each one, your finger follows a curve for part of the way.`,
       `Trace ${match[0]}. Each side goes straight from one corner to the next, all the way round.`]);
  }

  if (mode === 1) {
    const first = r.pick<Shape>(['square', 'rectangle']);
    const second = r.pick<Shape>(['equalTriangle', 'rightTriangle']);
    const curved = r.pick<Shape>(['cap', 'scoop', 'petal']);
    const b = board(r, [first, second, 'circle', 'circle', curved]);
    const matches = b.find(first, second);
    return finish(b, 'Pick every shape that has corners and straight sides all the way round.', matches,
      'Look for corners first. Then trace each side to check that it stays straight.',
      [`The outlines of ${b.find('circle').join(' and ')} go round without a corner.`,
       `Shape ${b.find(curved)[0]} has corners, but part of its outline curves.`,
       `In ${matches.join(' and ')}, straight sides meet at every corner. Choose both shapes.`]);
  }

  const count = r.pick([3, 4]);
  const b = board(r, ['square', 'rectangle', 'equalTriangle', 'rightTriangle']);
  const winner = b.find(count === 3 ? 'equalTriangle' : 'square')[0];
  const other = b.find(count === 3 ? 'rightTriangle' : 'rectangle')[0];
  const clues = mode === 2 ? `${count} sides and ${count} corners` : `${count} sides`;
  return finish(b, `Which shape has ${clues}, with every side the same length?`, [winner],
    'Start at one corner and count the sides as you go round. Then compare their lengths.',
    [`${winner} and ${other} each have ${clues}.`,
     `Look at ${other}. One side is longer than another.`,
     `On ${winner}, all ${count} sides are the same length. It fits every clue.`]);
}
