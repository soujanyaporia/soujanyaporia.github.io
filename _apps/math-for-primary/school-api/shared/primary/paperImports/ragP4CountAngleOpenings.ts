import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-count-angle-openings',
  level: 4,
  title: 'Count openings in a figure',
  objective: 'Count the marked angles, inside corners or pairs of drawn sides that meet the given right-angle rule.',
  skillIds: ['P3.S.ANGLE.01', 'P3.S.ANGLE.02', 'P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-count-angle-openings-by-type',
};

type Point = [number, number];
type Task = 'marked' | 'wide' | 'inside';
type Step = NonNullable<Question['workedSteps']>[number];
const letter = (i: number) => String.fromCharCode(65 + i);

function finish(key: string, prompt: string, context: string, label: string, marks: Batch11UpperMark[],
  count: number, hint: string, steps: Step[], choices?: string[]): Question {
  const picture: Batch11UpperPicture = { type: 'batch11-upper', label, marks };
  return {
    key, prompt, context: [context], picture, answer: String(count), choices, unit: 'angles',
    hint, workedSteps: steps, explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}

function options(r: Rng, answer: number, alternatives: number[]) {
  const pool = [...new Set([...alternatives, answer + 1, answer + 2, answer + 3])]
    .filter(n => n >= 0 && n !== answer);
  return r.shuffle([answer, ...pool.slice(0, 3)]).map(String);
}

function outline(r: Rng, task: Task): Point[] {
  const top = 29, bottom = 171, left = 24, shoulder = r.int(193, 201);
  const mouth = r.int(76, 85), width = r.int(43, 51), depth = r.int(37, 49);
  const cut = r.pick([0, 24, 28]);
  const squareNotch = task === 'marked' || r.chance(0.5);
  const p: Point[] = [[left + cut, top], [mouth, top]];
  if (squareNotch) p.push([mouth, top + depth], [mouth + width, top + depth]);
  else p.push([mouth + width / 2, top + depth]);
  p.push([mouth + width, top], [shoulder, top], [shoulder + r.int(83, 90), 100],
    [shoulder, bottom], [left, bottom]);
  if (cut) p.push([left, top + cut]);
  return r.chance(0.5) ? p.map(([x, y]): Point => [320 - x, 200 - y]) : p;
}

// The boundary runs clockwise on the screen. Follow the inside opening
// from the ray to the previous corner to the ray to the next corner.
function corner(points: Point[], i: number) {
  const [x, y] = points[i], n = points.length;
  const [px, py] = points[(i + n - 1) % n], [nx, ny] = points[(i + 1) % n];
  const ax = px - x, ay = py - y, bx = nx - x, by = ny - y;
  const inward = ax * by - ay * bx > 0, dot = ax * bx + ay * by;
  const kind = inward ? 'inward' : dot === 0 ? 'right' : dot < 0 ? 'obtuse' : 'acute';
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  const ux = ax / la, uy = ay / la, vx = bx / lb, vy = by / lb;
  const radius = 9;
  const arc = `M ${x + radius * ux} ${y + radius * uy} A 9 9 0 ${inward ? 1 : 0} 0 ${x + radius * vx} ${y + radius * vy}`;
  const offset = (inward ? 16 : -16) / Math.hypot(ux + vx, uy + vy);
  const label: Batch11UpperMark = {
    kind: 'text', x: x + offset * (ux + vx) - 5, y: y + offset * (uy + vy) + 5, text: letter(i),
  };
  return { kind, arc, label, name: letter(i) };
}

function polygonQuestion(r: Rng, key: string, task: Task): Question {
  const points = outline(r, task);
  const corners = points.map((_, i) => corner(points, i));
  const group = (kind: ReturnType<typeof corner>['kind']) => corners.filter(c => c.kind === kind);
  const right = group('right'), obtuse = group('obtuse'), inward = group('inward');
  const marks: Batch11UpperMark[] = [{
    kind: 'path', d: 'M ' + points.map(p => p.join(' ')).join(' L ') + ' Z', fill: '#e2f0ec',
  }, ...corners.map(c => c.label)];
  const names = (cs: typeof corners) => cs.map(c => c.name).join(', ');
  const label = 'A shaded outline with corners labelled in order from A.';
  const inside = 'Look at the opening on the shaded side of each corner.';

  if (task === 'marked') {
    // Mark both matching and nonmatching openings, and leave a right angle unmarked.
    const picked = r.shuffle(right).slice(0, r.int(1, right.length - 1));
    const others = [r.pick(obtuse), r.pick(inward), r.pick(group('acute'))];
    const selected = corners.filter(c => picked.includes(c) || others.includes(c));
    marks.push(...selected.map(c => ({ kind: 'path' as const, d: c.arc })));
    const count = picked.length;
    return finish(key, 'How many of the curved marks show a right angle?',
      'Each curve marks one opening inside the shape. Use only those openings.',
      label + ' Curves mark the openings at ' + names(selected) + '.', marks, count,
      'Turn the corner of a sheet of paper until one edge lines up with a side of a marked angle.', [
        { text: `Check the curves at ${names(selected)}. Skip the corners without a curve.` },
        { text: `The paper corner fits exactly at ${names(picked)}. Each of these counts once.` },
        { text: `At ${others[0].name} the opening is wider, at ${others[1].name} it goes past a half turn, and at ${others[2].name} it is narrower. The right-angle count is ${count}.` },
      ], options(r, count, [right.length, selected.length, count + 1, count - 1]));
  }

  if (task === 'wide') {
    const count = obtuse.length + inward.length;
    return finish(key, 'How many inside corners open wider than a right angle?', inside,
      label, marks, count, 'Trace the shaded shape from A. At a corner that bends in, check the space inside the shape.', [
        { text: `At ${names(obtuse)}, the opening is wider than a square corner but smaller than a half turn. Count ${obtuse.length}.` },
        { text: `At ${names(inward)}, the shaded opening goes past a half turn. Count ${inward.length} more.` },
        { text: 'Add the two tallies. An exact right angle stays out of both.', equation: `${obtuse.length} + ${inward.length} = ${count}` },
      ]);
  }

  return finish(key, 'How many inside corners make exactly a quarter turn?', inside,
    label, marks, right.length, 'Walk round the outline from A. Fit a square corner into each shaded opening.', [
      { text: `The shape bends in at ${names(inward)}. The shaded opening there is larger than a half turn.` },
      { text: `A square corner fits exactly at ${names(right)}. Counting each letter once gives ${right.length}.` },
    ]);
}

function squareQuestion(r: Rng, key: string): Question {
  const s = r.pick([64, 72, 80]), join = r.pick(['cross', 'tip', 'side'] as const);
  const dx = join === 'cross' ? 3 * s / 8 : s;
  const dy = join === 'tip' ? s : 3 * s / 4;
  const x = (320 - s - dx) / 2, y = (200 - s - dy) / 2;
  const square = (a: number, b: number): Point[] =>
    [[a, b], [a + s, b], [a + s, b + s], [a, b + s]];
  const shapes = [square(x, y), square(x + dx, y + dy)];
  const tilted = r.int(0, 2), cx = x + s / 2, cy = y + s / 2;
  for (let i = 0; i < tilted; i++) {
    const h = s / (2 + 2 * i);
    shapes.push([[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]]);
  }
  const flip = r.chance(0.5);
  const marks: Batch11UpperMark[] = shapes.flatMap(p => p.map(([a, b], i) => {
    const [c, d] = p[(i + 1) % p.length];
    return { kind: 'line' as const, x1: flip ? 320 - a : a, y1: b, x2: flip ? 320 - c : c, y2: d };
  }));

  const atCorners = join === 'cross' ? 8 : 6;
  const atJoins = join === 'cross' ? 8 : 4;
  const joinStep = {
    cross: 'At each of the two crossings of a flat side with an upright side, four openings make right angles.',
    tip: 'At the shared corner there are four arms. Count all four quarter turns there.',
    side: 'At each end of the shared piece, three arms meet. There are two quarter turns at each end.',
  }[join];
  const steps: Step[] = [
    { text: `Follow the two upright squares. Their ${atCorners} corners away from the joins each give one right angle.` },
    { text: joinStep, equation: `${atCorners} + ${atJoins} = ${atCorners + atJoins}` },
  ];
  const count = atCorners + atJoins + tilted * 4;
  if (tilted) steps.push({ text: 'Each tilted square adds four right angles. Where a sloping side meets a flat or upright side, there is no extra quarter turn.',
    equation: `${atCorners + atJoins} + ${tilted} × 4 = ${count}` });
  return finish(key, 'How many right angles can you find where the square sides meet?',
    `The picture uses ${shapes.length} squares. Count each pair of arms that makes a quarter turn once, even if another line lies inside that turn.`,
    'Square outlines with all their sides drawn.', marks, count,
    'At each meeting point, put a finger on one arm and look for every arm a quarter turn from it.', steps,
    options(r, count, [shapes.length * 4, count - 2, count + 2, count - 4]));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`, r = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + (index >>> 0)) % 4;
  if (slot === 3) return squareQuestion(r, key);
  return polygonQuestion(r, key, (['marked', 'wide', 'inside'] as const)[slot]);
}
