import {hashString, Rng} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-count-circle-parts',
  level: 2,
  title: 'Count semicircles and quarters',
  objective: 'Spot semicircles in a joined design and count the quarter-circle pieces that fill several shapes.',
  skillIds: ['P1.S.SHAPE.01', 'P1.S.SHAPE.02'],
  canonicalPatternId: 'p2-count-half-disc-or-quarter-disc-regions',
};

type Task = Pick<Question, 'prompt' | 'context' | 'hint'> & {
  picture: Batch11UpperPicture;
  count: number;
  distractors: number[];
  steps: NonNullable<Question['workedSteps']>;
};

const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
const pieceNames = ['', 'quarter circle', 'semicircle', 'circle with one quarter missing', 'whole circle'];
function point(cx: number, cy: number, radius: number, turn: number) {
  const [dx, dy] = directions[turn % 4];
  return [cx + dx * radius, cy + dy * radius] as const;
}

// A half closes along its diameter. A quarter or three-quarter piece closes along two radii.
function sector(cx: number, cy: number, radius: number, start: number, size: number): Batch11UpperMark {
  const from = point(cx, cy, radius, start).join(' ');
  const to = point(cx, cy, radius, start + size).join(' ');
  const corner = size === 2 ? '' : ` L ${cx} ${cy}`;
  return {kind: 'path', d: `M ${from} A ${radius} ${radius} 0 ${size === 3 ? 1 : 0} 1 ${to}${corner} Z`};
}

function joinedDesign(r: Rng): Task {
  const slots = r.int(3, 5);
  const spacing = 52;
  const left = 160 - slots * spacing / 2;
  const right = 320 - left;
  const marks: Batch11UpperMark[] = [
    {kind: 'path', d: `M ${left} 78 H ${right} V 122 H ${left} Z`},
    {kind: 'circle', cx: left + (r.int(0, slots - 1) + 0.5) * spacing, cy: 100, r: 13},
  ];
  const rows = [78, 122].map((y, row) => {
    const halves = r.int(1, slots - 1);
    const sizes = r.shuffle(Array.from({length: slots}, (_, i) => i < halves ? 2 : 1));
    sizes.forEach((size, i) => {
      const cx = left + (i + 0.5) * spacing;
      const start = (row === 0 ? 2 : 0) + (size === 1 ? r.int(0, 1) : 0);
      marks.push(sector(cx, y, r.int(17, 22), start, size));
    });
    return {halves, description: sizes.map(size => pieceNames[size]).join(', ')};
  });
  const [top, bottom] = rows;
  const count = top.halves + bottom.halves;
  return {
    prompt: 'How many semicircles are in this design?',
    context: ['Follow the edges already drawn. Count each semicircle once.'],
    hint: 'Look for half a circle with one straight edge joining the ends of its curve. Check both sides of the strip.',
    picture: {type: 'batch11-upper', marks, label: `A strip has a whole circle inside. Along the top from left to right: ${top.description}. Along the bottom: ${bottom.description}.`},
    count,
    distractors: [top.halves, count + 1, slots * 2],
    steps: [
      {text: `Trace the top edge of the strip. You can find ${top.halves} half-circle ${top.halves === 1 ? 'piece' : 'pieces'} there.`},
      {text: `Trace the bottom edge in the same way. You can find ${bottom.halves} more. Skip the quarter circles and the whole circle inside the strip.`},
      {text: 'Add the two counts.', equation: `${top.halves} + ${bottom.halves} = ${count}`},
    ],
  };
}

function quarterPieces(r: Rng): Task {
  const sizes = r.shuffle([4, 3, r.int(1, 2), ...Array.from({length: r.int(0, 2)}, () => r.int(1, 3))]);
  const radius = 24;
  const marks: Batch11UpperMark[] = [];
  sizes.forEach((size, i) => {
    const cx = 160 + (i - (sizes.length - 1) / 2) * 59;
    const cy = 100;
    const start = r.int(0, 3);
    if (size === 4) {
      marks.push({kind: 'circle', cx, cy, r: radius});
      const [x1, y1] = point(cx, cy, radius, start);
      const [x2, y2] = point(cx, cy, radius, start + 2);
      marks.push({kind: 'line', x1, y1, x2, y2});
    } else {
      marks.push(sector(cx, cy, radius, start, size));
      if (size === 2) {
        const [x2, y2] = point(cx, cy, radius, start + 1);
        marks.push({kind: 'line', x1: cx, y1: cy, x2, y2});
      }
    }
  });
  const count = sizes.reduce((sum, size) => sum + size, 0);
  return {
    prompt: 'If you cut all these shapes into quarter circles, how many pieces would you have altogether?',
    context: ['The shapes come from circles of the same size. Imagine any cuts you need.'],
    hint: 'Four quarters fit in a whole circle. Work from left to right and count how many quarters fit in each shape.',
    picture: {type: 'batch11-upper', marks, label: `From left to right: ${sizes.map(size => pieceNames[size]).join(', ')}. The whole circle has a line across the middle. Each semicircle shown is split into equal parts.`},
    count,
    distractors: [sizes.length, count - 3, count + sizes.filter(size => size === 3).length],
    steps: [
      {text: 'A whole circle gives four quarters. Half of a circle gives two. If one quarter of a circle is missing, the rest gives three.'},
      {text: `From the left, the shapes give these numbers of pieces: ${sizes.join(', ')}.`},
      {text: 'Add the pieces from all the shapes.', equation: `${sizes.join(' + ')} = ${count}`},
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const task = r.chance(0.5) ? joinedDesign(r) : quarterPieces(r);
  return {
    key, prompt: task.prompt, context: task.context, picture: task.picture,
    answer: String(task.count), choices: r.shuffle([task.count, ...task.distractors]).map(String),
    hint: task.hint, workedSteps: task.steps,
    explanation: task.steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
