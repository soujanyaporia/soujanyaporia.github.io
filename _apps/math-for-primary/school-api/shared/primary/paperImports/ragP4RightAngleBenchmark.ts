import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Point } from './p3RafflesPicture';
import { anglePoint } from './batch8AnglesPicture';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-right-angle-benchmark',
  level: 4,
  title: 'Find angles using a square corner',
  objective: 'Compare labelled openings with a right angle and name every angle that fits the question.',
  skillIds: ['P3.S.ANGLE.02', 'P3.S.ANGLE.01', 'P4.S.ANGLE.01'],
  canonicalPatternId: 'p4-identify-angles-against-a-right-angle-benchmark',
};

type Size = 'smaller' | 'equal' | 'larger';
type Opening = { name: string; size: Size };
type Figure = { picture: NonNullable<Question['picture']>; openings: Opening[]; context: string };

function angleName(first: string, vertex: string, last: string) {
  return '∠' + (first < last ? first + vertex + last : last + vertex + first);
}

function polygon(r: Rng, pentagon: boolean, letterOnly: boolean): Figure {
  let points: Point[];
  if (pentagon) {
    // Two pointed base corners and three wide corners along the roof.
    const half = r.int(11, 13), height = r.int(14, 17);
    const inset = r.int(4, 5), drop = r.int(3, 4);
    points = [[0, height], [inset, drop], [half, 0], [2 * half - inset, drop], [2 * half, height]];
  } else {
    // A square corner at the origin and one wide opening where the top side ends.
    const width = r.int(12, 15), height = r.int(12, 15);
    points = [[0, 0], [width, 0], [width + r.int(8, 10), r.int(5, 7)], [0, height]];
  }
  const labels = r.shuffle([...(letterOnly ? 'fghjkmnp' : 'BCDFGHJKLMNP')]).slice(0, points.length);
  const angles = labels.map((label, vertex) => ({ label, vertex }));
  const openings = points.map(([x, y], i): Opening => {
    const before = (i + points.length - 1) % points.length, after = (i + 1) % points.length;
    const [ax, ay] = points[before], [bx, by] = points[after];
    const dot = (ax - x) * (bx - x) + (ay - y) * (by - y);
    return {
      name: letterOnly ? '∠' + labels[i] : angleName(labels[before], labels[i], labels[after]),
      size: dot > 0 ? 'smaller' : dot < 0 ? 'larger' : 'equal',
    };
  });
  return {
    picture: { type: 'raffles-p3', layout: 'angle-polygon', points, angles, rotation: r.int(0, 11) * 30 },
    context: letterOnly ? 'Each letter labels the angle inside that corner.' : 'Each capital letter names the vertex beside it. Look at the angles inside the shape.',
    openings,
  };
}

function meetingRays(r: Rng): Figure {
  const centre: Point = [160, 100];
  const tilt = r.int(0, 35) * 10, narrow = r.int(35, 46), split = r.int(24, 30);
  // Two lines cross. One extra arm splits one of the two wide openings.
  const turns = [0, narrow, 180, 180 + narrow, 360 - split];
  const labels = r.shuffle([...'BCDFGHJKLMNP']).slice(0, turns.length);
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper', label: 'Five labelled arms meet at O. An arc lies between each pair of neighbouring arms.', marks: [],
  };
  const point = (turn: number, radius: number) => anglePoint(centre[0], centre[1], radius, tilt + turn);
  const openings = turns.map((start, i): Opening => {
    const next = (i + 1) % turns.length, end = turns[i + 1] ?? 360;
    const [x2, y2] = point(start, 71), [lx, ly] = point(start, 87);
    const a = point(start, 24), b = point(end, 24);
    picture.marks.push(
      { kind: 'line', x1: centre[0], y1: centre[1], x2, y2 },
      { kind: 'path', d: `M ${a.join(' ')} A 24 24 0 0 0 ${b.join(' ')}` },
      { kind: 'text', x: lx - 5, y: ly + 6, text: labels[i] },
    );
    return { name: angleName(labels[i], 'O', labels[next]), size: end - start > 90 ? 'larger' : 'smaller' };
  });
  picture.marks.push({ kind: 'circle', cx: centre[0], cy: centre[1], r: 2.5, fill: '#235b4c' });
  return { picture, openings, context: 'The centre dot is O. Look only at the five openings between neighbouring arms.' };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`, r = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 4;
  const figure = variant === 1 ? meetingRays(r) : polygon(r, variant === 2, variant === 0);
  const prompts = [
    'Which labelled angle opens wider than a right angle?',
    'Choose both angles that open wider than a right angle.',
    'Choose both angles that are smaller than a right angle.',
    'Which opening is exactly a right angle?',
  ];
  const target: Size = variant === 2 ? 'smaller' : variant === 3 ? 'equal' : 'larger';
  const names = (size: Size) => figure.openings.filter(a => a.size === size).map(a => a.name);
  const answers = names(target);
  const options = r.shuffle(figure.openings.map(a => a.name));
  const steps = ['Put a paper corner at each marked opening. Turn it until one edge lies along an arm.'];
  const checks: [Size, string][] = [
    ['smaller', 'The second arm falls inside the paper corner at'],
    ['equal', 'Both arms line up with the paper edges at'],
    ['larger', 'The second arm reaches past the other edge of the paper corner at'],
  ];
  for (const [size, text] of checks) {
    const group = names(size);
    if (group.length) steps.push(text + ' ' + group.join(' and ') + '.');
  }
  if (variant !== 0) steps.push('Read each angle name with the letter of its vertex in the middle.');
  steps.push('Choose ' + answers.join(' and ') + '.');
  const base = {
    key, prompt: prompts[variant], context: [figure.context], picture: figure.picture,
    hint: 'A square corner makes a 90° angle. Compare the opening between the arms with that corner.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
  if (variant === 1 || variant === 2) return {
    ...base, structuredResponse: { kind: 'named-pair', options }, answer: JSON.stringify(answers),
  };
  return { ...base, choices: options, answer: answers[0] };
}
