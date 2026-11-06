import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Point} from './p3RafflesPicture';

export const RAG_PATTERN = {
  id: 'rag-p3-tally-angles-by-type',
  level: 3,
  title: 'Count angles in a shape',
  objective: 'Compare inside corners with a right angle and count the corners in each requested group.',
  skillIds: ['P3.S.ANGLE.02'],
  canonicalPatternId: 'tally-angles-by-type',
};

type Kind = 'acute' | 'right' | 'obtuse' | 'inward';

function outline(r: Rng, marked: boolean): Point[] {
  const w = r.int(16, 20);
  const h = r.int(11, 14);
  const cut = r.int(4, 5);
  const points: Point[] = [
    [cut, 0], [w, 0], [w - r.int(3, 5), r.int(5, h - 5)], [w, h],
  ];
  if (r.chance(0.5)) {
    const middle = Math.floor(w / 2);
    points.push([middle + 2, h], [middle, h - r.int(2, 4)], [middle - 2, h]);
  }
  // Keep a square corner among the marked openings.
  if (!marked && r.chance(0.5)) {
    const lowerCut = r.int(3, 4);
    points.push([lowerCut, h], [0, h - lowerCut]);
  } else {
    points.push([0, h]);
  }
  points.push([0, cut]);
  return points;
}

function cornerKinds(points: Point[]): Kind[] {
  return points.map(([x, y], i) => {
    const [px, py] = points[(i + points.length - 1) % points.length];
    const [nx, ny] = points[(i + 1) % points.length];
    const dx = x - px, dy = y - py, ex = nx - x, ey = ny - y;
    // The outline goes clockwise on screen. An opposite turn forms an inward bend.
    if (dx * ey - dy * ex < 0) return 'inward';
    const dot = dx * ex + dy * ey;
    if (dot === 0) return 'right';
    return dot > 0 ? 'obtuse' : 'acute';
  });
}

const verticesOf = (kinds: Kind[], kind: Kind) =>
  kinds.flatMap((value, i) => value === kind ? [i] : []);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 6);
  const marked = variant === 5;
  const points = outline(r, marked);
  const kinds = cornerKinds(points);
  const obtuse = verticesOf(kinds, 'obtuse');

  if (marked) {
    const acute = verticesOf(kinds, 'acute');
    const wide = r.shuffle(obtuse).slice(0, r.int(1, obtuse.length));
    // Leave at least one acute or obtuse corner unmarked.
    const limit = wide.length === obtuse.length ? acute.length - 1 : acute.length;
    const small = r.shuffle(acute).slice(0, r.int(1, limit));
    const vertices = [...wide, ...small, ...verticesOf(kinds, 'right')].sort((a, b) => a - b);
    const angles = vertices.map((vertex, i) => ({vertex, label: 'ABCDEFGH'[i]}));
    const names = (kind: Kind) => angles.filter(a => kinds[a.vertex] === kind).map(a => a.label).join(', ');
    const pair = (o: number, a: number) => `${o} obtuse, ${a} acute`;
    const o = wide.length, a = small.length;
    const answer = pair(o, a);
    const steps = [
      {text: `Only use the lettered corners. The square corner at ${names('right')} goes in neither group.`},
      {text: `Look at ${names('obtuse')}. Each opening there is wider than a square corner but smaller than a straight angle. The obtuse tally is ${o}.`},
      {text: `Look at ${names('acute')}. Each opening there is smaller than a square corner. The acute tally is ${a}.`},
    ];
    return {
      key, prompt: 'Look at the angles marked with letters. Which choice gives the number of obtuse angles first and acute angles second?',
      picture: {type: 'raffles-p3', layout: 'angle-polygon', points, angles, rotation: r.pick([0, 90, 180, 270])},
      choices: r.shuffle([answer, pair(o + 1, a), pair(o, a + 1), pair(o - 1, a + 1)]),
      answer, hint: 'Check each letter once. Keep a separate tally for each kind of angle.',
      workedSteps: steps, explanation: steps.map(step => step.text).join(' '),
    };
  }

  const countAllWide = variant < 5;
  const inward = verticesOf(kinds, 'inward');
  const numbers = (indices: number[]) => indices.map(i => i + 1).join(', ');
  const total = obtuse.length + (countAllWide ? inward.length : 0);
  const steps = [
    {text: 'Call the left end of the top edge corner 1. Go right and number each corner as you follow the edge all the way round.'},
    {text: `Find the corners numbered ${numbers(obtuse)}. Each opens wider than a right angle but less than a straight angle. These are the ${obtuse.length} obtuse angles.`},
    {text: `At ${numbers(inward)}, the shape bends inwards. Each inside opening there is wider than a straight angle.`},
    countAllWide
      ? {text: 'Both groups open wider than a right angle. Add their tallies.', equation: `${obtuse.length} + ${inward.length} = ${total}`}
      : {text: `Leave the inward bends out of the obtuse tally. The count is ${total}.`},
  ];
  return {
    key, prompt: countAllWide
      ? 'How many inside corners of this shape open wider than a right angle?'
      : 'How many corners inside this shape form an obtuse angle?',
    context: ['At each corner, look at the opening on the inside of the outline.'],
    picture: {type: 'batch10-middle', layout: 'concave-polygon', points},
    answer: String(total), unit: 'angles',
    hint: countAllWide ? 'Try the square corner of a sheet of paper at each corner. Check the inward bends too.'
      : 'An obtuse angle opens wider than a square corner but less than a straight angle.',
    workedSteps: steps, explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}
