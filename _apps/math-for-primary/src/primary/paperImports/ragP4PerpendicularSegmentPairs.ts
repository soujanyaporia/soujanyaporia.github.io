import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridPoint as Point, GridSegment as Segment } from '../gridDrawingModel';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-perpendicular-segment-pairs',
  level: 4,
  title: 'Find perpendicular pairs',
  objective: 'Use a square corner to find two segments that meet at a right angle and count each such pair once.',
  skillIds: ['P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-identify-and-count-meeting-perpendicular-segment-pairs',
};

type Task = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & { steps: string[] };

function place(segments: Segment[], map: (p: Point) => Point): Segment[] {
  return segments.map(([a, b]) => [map(a), map(b)]);
}

function chooseFigure(r: Rng): Task {
  const diagonal = r.chance(0.5);
  const halfway = r.chance(0.5);
  const match: Segment[] = diagonal
    ? [[[0.5, 0.5], [4.5, 4.5]], [halfway ? [2.5, 2.5] : [0.5, 4.5], [4.5, 0.5]]]
    : [[[0.5, 2.5], [4.5, 2.5]], [[2.5, halfway ? 2.5 : 0.5], [2.5, 4.5]]];
  const drawings: Segment[][] = [
    match,
    [[[0.5, 2.5], [4.5, 2.5]], [[1, 0.5], [4, 4.5]]],
    [[[0.5, 1], [4.5, 3]], [[0.5, 2.5], [4.5, 4.5]]],
    [[[0.5, 1], [2.5, 1]], [[3.5, 2], [3.5, 4.5]]],
  ];
  const order = r.shuffle([0, 1, 2, 3]);
  const options = order.map((kind, i) => {
    const turns = r.int(0, 3);
    const segments = place(drawings[kind], ([x, y]) => {
      for (let n = 0; n < turns; n++) [x, y] = [5 - y, x];
      return [x, y];
    });
    return { label: 'ABCD'[i], segments };
  });
  const label = (kind: number) => options[order.indexOf(kind)].label;
  return {
    prompt: 'In which drawing do the two dark segments meet at a right angle?',
    picture: { type: 'batch10-middle', layout: 'line-options', options },
    choices: options.map(o => o.label), answer: label(0),
    hint: 'Line up the corner of a sheet of paper with the dark segments. Turn the paper if you need to.',
    steps: [
      `In ${label(2)} the segments are parallel. In ${label(3)} they stop short of each other.`,
      `The segments cross in ${label(1)}, but a paper corner will not fit there.`,
      `In ${label(0)}, both edges of the paper corner line up at the meeting point. Choose ${label(0)}.`,
    ],
  };
}

function labelledLines(r: Rng, askForBoth: boolean): Task {
  const tilted = r.chance(0.5);
  const row = r.int(3, 4), col = r.int(2, 3);
  // The first two lines meet at a right angle. Every other direction is distinct.
  const base: Segment[] = tilted ? [
    [[0, 0], [6, 6]], [[0, 6], [6, 0]], [[0, 1], [6, 4]],
    [[0, 5], [6, 3]], [[2, 0], [5, 6]],
  ] : [
    [[0, row], [6, row]], [[col, 0], [col, 6]], [[0, 0], [6, 2]],
    [[0, 5], [6, 1]], [[1, 0], [4, 6]],
  ];
  const turns = r.int(0, 3);
  const lines = place(base, ([x, y]) => {
    for (let n = 0; n < turns; n++) [x, y] = [6 - y, x];
    return [x, y];
  });
  const letters = r.shuffle([...'ABCDEFGHJKLMNPQRSTUVWXYZ']);
  const names = lines.map((_, i) => letters[2 * i] + letters[2 * i + 1]);
  const step = r.int(20, 22);
  const screen = ([x, y]: Point): Point => [160 + (x - 3) * step, 100 + (y - 3) * step];
  const marks: Batch11UpperMark[] = [];
  for (let y = 0; y <= 6; y++) {
    for (let x = 0; x <= 6; x++) {
      const [cx, cy] = screen([x, y]);
      marks.push({ kind: 'circle', cx, cy, r: 0.5 });
    }
  }
  lines.forEach(([a, b], i) => {
    const [x1, y1] = screen(a), [x2, y2] = screen(b);
    marks.push({ kind: 'line', x1, y1, x2, y2 });
    [a, b].forEach(([x, y], j) => {
      const [px, py] = screen([x, y]);
      const offset = (k: number) => k === 0 ? -13 : k === 6 ? 13 : 0;
      marks.push({ kind: 'text', x: px - 5 + offset(x), y: py + 6 + offset(y), text: names[i][j] });
    });
  });
  const descriptions = lines.map(([a, b], i) => `${names[i]} runs from (${a}) to (${b})`);
  const picture: Question['picture'] = {
    type: 'batch11-upper', marks,
    label: 'Square dot grid. Positions count spaces right and down from the top left. ' + descriptions.join('. '),
  };
  const first = r.int(0, 1), reference = names[first], partner = names[1 - first];
  const steps = [
    tilted ? `Follow ${reference} from one corner of the dot grid to the opposite corner.`
      : `Trace ${reference} along a straight row or column of dots.`,
    `Slide a paper corner along ${reference} to its crossing with ${partner}. The other edge follows ${partner}, so these two lines are perpendicular.`,
  ];
  const hint = 'Use the end letters to trace each line. Try a square corner where two lines meet.';
  if (askForBoth) {
    return {
      prompt: 'Choose the two lines that meet at a right angle.', picture, hint, steps,
      structuredResponse: { kind: 'named-pair', options: r.shuffle(names) },
      answer: JSON.stringify([reference, partner]),
    };
  }
  return {
    prompt: `Which line is perpendicular to ${reference}?`, picture, hint, steps,
    choices: r.shuffle(names.filter(name => name !== reference)), answer: partner,
  };
}

function countPairs(r: Rng): Task {
  const run = r.int(1, 3), tip = 7 + run, middle = r.chance(0.5);
  const spineCount = middle ? 4 : 3;
  const figure: Segment[] = [
    [[4, 1], [4, 9]], [[1, 9], [4, 9]], [[1, 9], [4, 1]],
    [[4, 3], [7, 3]], [[4, 7], [7, 7]],
    [[7, 3], [tip, 5]], [[7, 7], [tip, 5]],
  ];
  if (middle) figure.push([[1, 5], [tip, 5]]);
  // Blue elbows are angle symbols. Only the dark segments belong to the figure.
  const marks: Segment[] = [];
  for (const [y, dx, dy] of [[9, -0.35, -0.35], [3, 0.35, 0.35], [7, 0.35, -0.35]]) {
    const elbow: Point = [4 + dx, y + dy];
    marks.push([[4 + dx, y], elbow], [elbow, [4, y + dy]]);
  }
  const mirror = r.chance(0.5), flip = r.chance(0.5);
  const map = ([x, y]: Point): Point => [mirror ? 10 - x : x, flip ? 10 - y : y];
  const end = mirror ? 'left' : 'right';
  const total = spineCount + Number(run === 2);
  return {
    prompt: 'How many pairs of dark segments meet at a right angle?',
    context: ['Count a pair once, even at a crossing. The small blue marks show square corners.'],
    picture: { type: 'grid-drawing', columns: 10, rows: 10, givenSegments: place(figure, map),
      segments: place(marks, map), caption: 'Dark segments on a square dot grid with three blue corner marks' },
    answer: String(total), unit: 'pairs',
    hint: 'Start at one end of the long upright line. Check each line it meets. Then check the sloping lines at the pointed end.',
    steps: [
      `The upright line meets ${spineCount} horizontal lines. Each meeting gives one pair.`,
      `Fit a paper corner between the two sloping lines at the ${end} tip. ${run === 2 ? 'It fits exactly, so add one pair.' : run === 1 ? 'The opening is wider than the corner.' : 'The opening is narrower than the corner.'}`,
      `The remaining sloping line makes no square corner. There are ${spineCount} + ${Number(run === 2)} = ${total} pairs.`,
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) + Math.trunc(index)) % 4 + 4) % 4;
  const task = slot === 0 ? chooseFigure(r) : slot === 1 ? countPairs(r) : labelledLines(r, slot === 2);
  const { steps, ...fields } = task;
  return { key, ...fields, explanation: steps.join(' '), workedSteps: steps.map(text => ({ text })) };
}
