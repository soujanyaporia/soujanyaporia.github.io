import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-equal-square-tiles',
  level: 3,
  title: 'Area covered by square tiles',
  objective: 'Use the size and number of equal squares to find the area they cover.',
  skillIds: ['P3.S.AREA.01', 'P3.S.AREA.03'],
  canonicalPatternId: 'p3-area-covered-by-equal-squares',
};

type Steps = NonNullable<Question['workedSteps']>;

function tile(x: number, y: number, size: number, filled: boolean): Batch11UpperMark {
  return { kind: 'path', d: `M ${x} ${y} h ${size} v ${size} h -${size} Z`, fill: filled ? '#91bcaf' : 'white' };
}

function tileAreaSteps(side: number, count: number, unit: string): Steps {
  const one = side * side;
  return [
    { text: 'Multiply the side length by itself to find the area of one square.', equation: `${side} × ${side} = ${one} ${unit}²` },
    { text: 'Multiply the area of one square by the number of squares.', equation: `${count} × ${one} = ${count * one} ${unit}²` },
  ];
}

function shadedGrid(rng: Rng) {
  // Each row includes the fourth column, keeping the shaded region connected.
  const runs = [
    [rng.int(1, 2), rng.int(3, 4)],
    [0, rng.int(4, 5)],
    [rng.int(1, 2), 5],
    [rng.int(2, 3), rng.int(3, 4)],
  ];
  const marks: Batch11UpperMark[] = [];
  const rowDescriptions: string[] = [];
  runs.forEach(([first, last], row) => {
    const cells: string[] = [];
    for (let col = 0; col < 6; col++) {
      const shaded = first <= col && col <= last;
      marks.push(tile(64 + col * 32, 36 + row * 32, 32, shaded));
      cells.push(shaded ? 'shaded' : 'blank');
    }
    rowDescriptions.push(`Row ${row + 1} from the left: ${cells.join(', ')}.`);
  });
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: rowDescriptions.join(' '),
    marks,
  };
  return { picture, rowCounts: runs.map(([first, last]) => last - first + 1) };
}

function markedRow(count: number, spanTiles: number, spanCm: number): Batch11UpperPicture {
  const size = 42;
  const left = (320 - count * size) / 2;
  const end = left + spanTiles * size;
  const marks = Array.from({ length: count }, (_, i) => tile(left + i * size, 90, size, true));
  marks.push(
    { kind: 'line', x1: left, y1: 73, x2: end, y2: 73 },
    { kind: 'line', x1: left, y1: 67, x2: left, y2: 83 },
    { kind: 'line', x1: end, y1: 67, x2: end, y2: 83 },
    { kind: 'text', x: (left + end) / 2 - 18, y: 63, text: `${spanCm} cm` },
  );
  return {
    type: 'batch11-upper',
    marks,
    label: `A row of ${count} square tiles. The mark starts at the left of the row and ends at the right edge of tile ${spanTiles}. It reads ${spanCm} cm.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['given', 'given', 'grid', 'span'] as const);
  const finish = (task: Omit<Question, 'key' | 'explanation' | 'workedSteps'>, steps: Steps): Question => ({
    ...task, key, workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 'given') {
    const count = rng.int(2, 6);
    const side = rng.pick([2, 3, 4, 5, 8, 9]);
    return finish({
      context: [
        `A path is made of ${count} equal square slabs. They meet edge to edge without overlapping.`,
        `Each slab has sides ${side} m long.`,
      ],
      prompt: 'What area do the slabs cover altogether?',
      answer: String(count * side * side),
      unit: 'm²',
      hint: 'Find how many square metres one slab covers. Then include every slab.',
    }, tileAreaSteps(side, count, 'm'));
  }

  if (variant === 'grid') {
    const { picture, rowCounts } = shadedGrid(rng);
    const count = rowCounts.reduce((sum, value) => sum + value, 0);
    return finish({
      context: ['Each small square has sides 1 cm long.'],
      prompt: 'What is the area of the shaded part of the grid?',
      picture, answer: String(count), unit: 'cm²',
      hint: 'Count just the shaded squares. Start a new count for each row.',
    }, [
      { text: 'Count the shaded squares in each row, starting at the top.', equation: `${rowCounts.join(' + ')} = ${count} squares` },
      ...tileAreaSteps(1, count, 'cm'),
    ]);
  }

  const count = rng.int(2, 5);
  const side = rng.pick([2, 3, 4, 5, 8, 9]);
  const spanTiles = rng.int(1, Math.min(3, count - 1));
  const spanCm = spanTiles * side;
  const length = count * side;
  const area = length * side;
  return finish({
    context: ['Equal square tiles fit together in a row to make a rectangular strip.'],
    picture: markedRow(count, spanTiles, spanCm),
    prompt: '(a) How long is the strip? (b) What area does it cover?',
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Length (cm)', secondLabel: '(b) Area (cm²)' },
    answer: JSON.stringify([String(length), String(area)]),
    hint: 'Look at the ends of the mark. How many tile sides fit between them?',
  }, [
    spanTiles === 1
      ? { text: 'The mark covers one tile side, so it gives the width of the strip.', equation: `Side of one tile = ${side} cm` }
      : { text: `The mark covers ${spanTiles} equal tile sides. Divide to find one side.`, equation: `${spanCm} ÷ ${spanTiles} = ${side} cm` },
    { text: `(a) Count all ${count} tile sides along the strip.`, equation: `${count} × ${side} = ${length} cm` },
    { text: '(b) Multiply the length from (a) by the width of one tile.', equation: `${length} × ${side} = ${area} cm²` },
  ]);
}
