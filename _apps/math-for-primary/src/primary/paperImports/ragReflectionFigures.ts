import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-reflection-figures',
  level: 5,
  title: 'Check lines of symmetry',
  objective: 'Compare reflected halves to select or count figures with a required number of lines of symmetry.',
  skillIds: ['P4.S.SYM.01'],
  canonicalPatternId: 'find-and-count-reflection-axes',
} as const;

type Point = [number, number];
type Segment = [Point, Point];
type AxisCount = 0 | 1 | 2 | 4;
type Template = {
  description: string;
  segments: Segment[];
  axes: AxisCount;
  reason: string;
};
type Mark =
  | {kind: 'line'; x1: number; y1: number; x2: number; y2: number}
  | {kind: 'text'; x: number; y: number; text: string};

function outline(points: Point[]): Segment[] {
  return points.map((point, i) => [point, points[(i + 1) % points.length]]);
}

const rectangle = outline([[-3, -1.5], [3, -1.5], [3, 1.5], [-3, 1.5]]);
const templates: Template[] = [
  {
    description: 'a triangle with three unequal sides',
    segments: outline([[-3, 1.5], [3, 1.5], [-2, -1.5]]),
    axes: 0,
    reason: 'Its three sides have different lengths, so no fold makes both halves match.',
  },
  {
    description: 'a trapezium with two right angles',
    segments: outline([[-3, -1.5], [1, -1.5], [3, 1.5], [-3, 1.5]]),
    axes: 0,
    reason: 'Its parallel sides have different lengths, and its other two sides do not match. No fold matches the whole outline.',
  },
  {
    description: 'a sloping parallelogram',
    segments: outline([[-3, -1.5], [1, -1.5], [3, 1.5], [-1, 1.5]]),
    axes: 0,
    reason: 'A half-turn matches its opposite sides, but a half-turn is not a reflection. No fold matches both halves.',
  },
  {
    description: 'a rectangle with two off-centre crossing lines inside it',
    segments: [...rectangle, [[-1, -1.5], [-1, 1.5]], [[-3, -0.5], [3, -0.5]]],
    axes: 0,
    reason: 'The outline has two possible fold lines. The off-centre lines inside prevent both folds from matching the whole drawing.',
  },
  {
    description: 'an arrow outline',
    segments: outline([[-3, -0.6], [0, -0.6], [0, -1.5], [3, 0], [0, 1.5], [0, 0.6], [-3, 0.6]]),
    axes: 1,
    reason: 'Only the fold running along the middle of the arrow matches both halves. Its pointed end does not match its flat end.',
  },
  {
    description: 'a triangle with two equal sides',
    segments: outline([[-2, 1.5], [2, 1.5], [0, -1.5]]),
    axes: 1,
    reason: 'The fold between the two equal sides matches both halves. The third side has a different length, so there are no other matching folds.',
  },
  {
    description: 'a rectangle with one off-centre line inside it',
    segments: [...rectangle, [[-1, -1.5], [-1, 1.5]]],
    axes: 1,
    reason: 'Of the two possible folds of the outline, only one also matches the off-centre line inside.',
  },
  {
    description: 'a rectangle with unequal adjacent side lengths',
    segments: rectangle,
    axes: 2,
    reason: 'The two folds through the middles of opposite sides match. Folds through opposite corners do not match its unequal side lengths.',
  },
  {
    description: 'a rectangle with one central line inside it',
    segments: [...rectangle, [[0, -1.5], [0, 1.5]]],
    axes: 2,
    reason: 'Both folds through the middles of opposite sides match the outline and the central line inside.',
  },
  {
    description: 'a square outline',
    segments: outline([[-2, -2], [2, -2], [2, 2], [-2, 2]]),
    axes: 4,
    reason: 'Two folds pass through the middles of opposite sides, and two pass through opposite corners.',
  },
];

function joinLetters(letters: string[]): string {
  if (letters.length <= 1) return letters.join('');
  return `${letters.slice(0, -1).join(', ')} and ${letters[letters.length - 1]}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const mode = r.int(0, 2);
  const letters = ['A', 'B', 'C', 'D'];
  const asymmetric = templates.filter(t => t.axes === 0);
  const symmetric = templates.filter(t => t.axes > 0);
  let selected: Template[];
  let target = 0;

  if (mode === 0) {
    selected = r.shuffle([r.pick(asymmetric), ...r.shuffle(symmetric).slice(0, 3)]);
  } else if (mode === 1) {
    target = r.pick([1, 2]);
    const matches = r.shuffle(templates.filter(t => t.axes === target)).slice(0, 2);
    const others = r.shuffle(templates.filter(t => t.axes !== target)).slice(0, 2);
    selected = r.shuffle([...matches, ...others]);
  } else {
    const count = r.int(1, 3);
    selected = r.shuffle([
      ...r.shuffle(symmetric).slice(0, count),
      ...r.shuffle(asymmetric).slice(0, 4 - count),
    ]);
  }

  const marks: Mark[] = [];
  selected.forEach((template, i) => {
    const cx = i % 2 === 0 ? 80 : 235;
    const cy = i < 2 ? 60 : 155;
    const scale = r.int(8, 10);
    const angle = r.int(0, 7) * Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const transform = ([x, y]: Point): Point => [
      cx + scale * (x * cos - y * sin),
      cy + scale * (x * sin + y * cos),
    ];
    marks.push({kind: 'text', x: cx - 5, y: cy - 46, text: letters[i]});
    for (const [start, end] of template.segments) {
      const [x1, y1] = transform(start);
      const [x2, y2] = transform(end);
      marks.push({kind: 'line', x1, y1, x2, y2});
    }
  });

  const workedSteps: NonNullable<Question['workedSteps']> = selected.map((template, i) => ({
    text: `Figure ${letters[i]} has ${template.axes} ${template.axes === 1 ? 'line' : 'lines'} of symmetry. ${template.reason}`,
  }));
  let prompt: string;
  let answer: string;
  let choices: string[] | undefined;
  let structuredResponse: Question['structuredResponse'];
  let unit: string | undefined;

  if (mode === 0) {
    prompt = 'Choose the figure with no lines of symmetry.';
    answer = letters[selected.findIndex(t => t.axes === 0)];
    choices = r.shuffle([...letters]);
    workedSteps.push({text: `Only figure ${answer} has no matching fold.`});
  } else if (mode === 1) {
    prompt = `Select the two figures that each have exactly ${target} ${target === 1 ? 'line' : 'lines'} of symmetry.`;
    const matching = letters.filter((_, i) => selected[i].axes === target);
    answer = JSON.stringify(matching);
    structuredResponse = {kind: 'named-pair', options: [...letters]};
    workedSteps.push({text: `Figures ${joinLetters(matching)} each have exactly ${target} ${target === 1 ? 'line' : 'lines'} of symmetry.`});
  } else {
    prompt = 'How many of the four figures have at least one line of symmetry?';
    const matching = letters.filter((_, i) => selected[i].axes > 0);
    answer = String(matching.length);
    choices = r.shuffle(['1', '2', '3', '4']);
    unit = 'figures';
    workedSteps.push({
      text: `Count ${joinLetters(matching)} once each. Count the figures, not all their fold lines.`,
      equation: `${matching.map(() => '1').join(' + ')} = ${matching.length}`,
    });
  }

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    context: [
      'Check the whole drawing of each figure, including any lines inside it.',
      'The letters are labels and are not part of the figures.',
    ],
    answer,
    choices,
    structuredResponse,
    unit,
    hint: 'Imagine folding along a straight line. Every edge and every line inside must land on a matching part.',
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    workedSteps,
    picture: {
      type: 'batch11-upper',
      label: selected.map((template, i) => `Figure ${letters[i]}: ${template.description}.`).join(' '),
      marks,
    },
  };
}
