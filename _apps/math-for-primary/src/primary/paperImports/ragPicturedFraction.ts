import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-pictured-fraction',
  level: 2,
  title: 'Read or match a pictured fraction',
  objective: 'Use equal parts to name a fraction or find the pictures that show it.',
  skillIds: ['P2.S.FRAC.01', 'P2.S.FRAC.02'],
  canonicalPatternId: 'read-or-match-a-pictured-fraction',
};

type Figure = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>;
type Piece = Figure['pieces'][number];
type Exercise = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & { workedSteps: NonNullable<Question['workedSteps']> };
type Cell = 'white' | 'blue' | 'white halves' | 'blue halves' | 'one blue half';
const places = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];

function drawStrip(cells: Cell[], x: number, y: number, label: string): Piece[] {
  return cells.flatMap((cell, i): Piece[] => {
    const left = x + i;
    const a: Batch9Point = [left, y], b: Batch9Point = [left + 1, y];
    const c: Batch9Point = [left + 1, y + 1], d: Batch9Point = [left, y + 1];
    const name = `${label}, tile ${i + 1}`;
    if (cell === 'white' || cell === 'blue') {
      return [{ label: name, kind: 'square', points: [a, b, c, d], shaded: cell === 'blue' }];
    }
    return [
      { label: name + ', lower triangle', kind: 'triangle', points: [a, c, d], shaded: cell !== 'white halves' },
      { label: name + ', upper triangle', kind: 'triangle', points: [a, b, c], shaded: cell === 'blue halves' },
    ];
  });
}

function figure(pieces: Piece[]): Figure {
  return { type: 'batch9-early', layout: 'area-fraction', pieces };
}

function readGrid(r: Rng): Exercise {
  const total = r.pick([5, 6, 9, 10, 12]);
  const blue = r.int(1, total - 1);
  const readWhite = r.chance(0.5);
  const colour = readWhite ? 'unshaded' : 'shaded';
  const count = readWhite ? total - blue : blue;
  const answer = `${count}/${total}`;
  const otherCounts = r.shuffle(Array.from({ length: total - 1 }, (_, i) => i + 1));
  const wrong = [...new Set([total - count, ...otherCounts])].filter(n => n !== count).slice(0, 2);
  // Missing one box changes the denominator. Consecutive denominators share no proper fraction.
  const missedBox = `${Math.min(count, total - 2)}/${total - 1}`;
  return {
    prompt: `Which fraction names the ${colour} part of the grid?`,
    picture: { type: 'fraction', parts: total, filled: blue },
    choices: r.shuffle([answer, missedBox, ...wrong.map(n => `${n}/${total}`)]), answer,
    hint: 'Count all the equal boxes. Then count just the ones the question asks about.',
    workedSteps: [
      { text: `The whole grid has ${total} equal boxes. The bottom number is ${total}.` },
      { text: `${count} of the boxes are ${colour}. Write that count above ${total}.`, equation: answer },
    ],
  };
}

function readPiece(r: Rng): Exercise {
  const squares = r.int(3, 5);
  const whole = drawStrip(Array<Cell>(squares).fill('white halves'), 0, 1, 'Whole');
  const count = r.int(1, 3);
  const piece = drawStrip(['blue halves', 'blue halves'], squares + 1, 1, 'Separate piece').slice(0, count);
  const answer = `${count}/${whole.length}`;
  return {
    prompt: 'The strip on the left is one whole. What fraction of that whole is the blue piece on the right?',
    picture: figure([...whole, ...piece]), answer,
    hint: 'Look for a triangle of the same size in both pictures.',
    workedSteps: [
      { text: `The whole strip is made of ${whole.length} equal triangles.` },
      { text: `The blue piece covers ${count} of those triangles. Its fraction of the strip is ${answer}.` },
    ],
  };
}

function solidCells(total: number, blue: number): Cell[] {
  return Array.from({ length: total }, (_, i) => i < blue ? 'blue' : 'white');
}

function matchStrips(r: Rng, half: boolean): Exercise {
  const [n, d] = half ? [1, 2] : r.pick([[1, 3], [2, 3], [3, 4]]);
  const width = half ? r.pick([2, 4]) : d;
  const blue = n * width / d;
  const two = !half && r.chance(0.5);
  const full = solidCells(width, blue);
  const split = full.slice();
  split[0] = 'blue halves';
  // This decoy has the tempting count of regions, but its regions have unequal areas.
  const decoy: Cell[] = half ? ['blue halves', 'white', 'white'] : [...solidCells(d - 2, n - 1), 'one blue half'];
  const below: Cell[] = [...solidCells(width - 1, blue - 1), 'one blue half'];
  const above: Cell[] = [...solidCells(width - 1, blue), 'one blue half'];
  const strips = r.shuffle([half ? split : full, decoy, below, two ? split : above]).map(row => r.shuffle(row));
  const pieces: Piece[] = [];
  const matches: string[] = [];
  const comparisons: string[] = [];
  strips.forEach((cells, i) => {
    const label = places[i];
    pieces.push(...drawStrip(cells, i % 2 * 4.75, Math.floor(i / 2) * 2, label));
    const units = cells.reduce((sum, cell) => sum + (cell === 'one blue half' ? 1 : cell.startsWith('blue') ? 2 : 0), 0);
    const total = cells.length * 2;
    if (units * d === total * n) matches.push(label);
    comparisons.push(half ? `${label}: ${units} blue and ${total - units} white.` : `${label}: ${units} blue out of ${total}.`);
  });
  return {
    prompt: half ? 'Which strip has just as much blue as white?'
      : `Which ${two ? 'two strips have' : 'strip has'} ${n}/${d} of the whole strip coloured blue?`,
    context: ['Each of the four strips is a separate whole.'],
    picture: figure(pieces),
    answer: two ? JSON.stringify(matches) : matches[0],
    ...(two ? { structuredResponse: { kind: 'named-pair' as const, options: places.slice() } } : { choices: places.slice() }),
    hint: 'Two small triangles fill one square. Look at how much space each colour covers.',
    workedSteps: [
      { text: 'Imagine cutting every square into two equal triangles. Count in triangles throughout.' },
      { text: comparisons.join(' ') },
      { text: half ? `Only the ${matches[0].toLowerCase()} strip has the same amount of each colour, so half is blue.`
        : `For ${n}/${d}, ${n} out of every ${d} equal parts must be blue. ${matches.join(' and ')} ${two ? 'match' : 'matches'}.` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.weighted([['grid', 18], ['match', 8], ['piece', 2], ['half', 1]] as const);
  const item = mode === 'grid' ? readGrid(r) : mode === 'piece' ? readPiece(r) : matchStrips(r, mode === 'half');
  return { ...item, key, explanation: item.workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ') };
}
