import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'p3-shading-a-partitioned-whole',
  level: 3,
  title: 'Shading a partitioned whole',
  objective: 'Read a shaded fraction, shade a given share and find a rectangle with the matching unshaded area.',
  skillIds: ['P2.S.FRAC.01', 'P2.S.FRAC.02', 'P3.S.FRAC.01'],
  canonicalPatternId: 'shading-a-partitioned-whole',
};

type Diagram = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>;
type Tile = Diagram['pieces'][number];
type Item = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & {
  workedSteps: NonNullable<Question['workedSteps']>;
};

const positions = ['First', 'Second', 'Third', 'Fourth'];
const indices = (length: number) => Array.from({ length }, (_, i) => i);

function square(label: string, x: number, y: number, side: number, shaded: boolean): Tile {
  const points: Batch9Point[] = [[x, y], [x + side, y], [x + side, y + side], [x, y + side]];
  return { label, kind: 'square', points, shaded };
}

function diagram(pieces: Tile[]): Diagram {
  return { type: 'batch9-early', layout: 'area-fraction', pieces };
}

function groupSize(count: number, total: number) {
  for (let size = count; size >= 2; size--) {
    if (count % size === 0 && total % size === 0) return size;
  }
  return 1;
}

function fractionChoices(r: Rng, count: number, total: number, reduce: boolean) {
  const choices = new Map<number, string>();
  function add(n: number, d: number) {
    if (n <= 0 || n >= d || choices.has(n / d)) return;
    const group = reduce ? groupSize(n, d) : 1;
    choices.set(n / d, `${n / group}/${d / group}`);
  }
  add(count, total);
  add(total - count, total);
  add(count, total - 1);
  for (const n of r.shuffle(indices(total - 1))) add(n + 1, total);
  return r.shuffle([...choices.values()].slice(0, 4));
}

function readRectangle(r: Rng, joined: boolean): Item {
  const columns = r.pick(joined ? [4, 6] : [3, 4, 6]);
  const total = 2 * columns;
  const cells = indices(total);
  const pieces: Tile[] = [];
  const left = (8 - columns) / 2;
  let smallCells = cells;
  let covered = 0;
  if (joined) {
    const start = r.int(0, columns - 2);
    pieces.push(square('Shaded block, two small squares wide and two high', left + start, 0, 2, true));
    smallCells = cells.filter(i => i % columns < start || i % columns > start + 1);
    covered = 4;
  }
  const counts = cells.filter(n => n > 0 && (!joined || (n >= covered && groupSize(n, total) > 1)));
  const count = r.pick(counts);
  const marked = new Set(r.shuffle(smallCells).slice(0, count - covered));
  for (const i of smallCells) {
    const row = Math.floor(i / columns);
    const column = i % columns;
    pieces.push(square(`Row ${row + 1}, column ${column + 1}`, left + column, row, 1, marked.has(i)));
  }

  const group = joined ? groupSize(count, total) : 1;
  const raw = `${count}/${total}`;
  const answer = `${count / group}/${total / group}`;
  const workedSteps: Item['workedSteps'] = [
    { text: `The whole rectangle fits 2 rows of ${columns} small squares.`, equation: `2 × ${columns} = ${total}` },
  ];
  if (joined) {
    workedSteps.push({ text: 'Imagine extending the grid lines through the large shaded square. It is two small squares wide and two high.', equation: '2 × 2 = 4' });
    if (marked.size > 0) workedSteps.push({ text: 'Add the shaded squares outside that block.', equation: `4 + ${marked.size} = ${count}` });
  }
  workedSteps.push({ text: `${count} of the ${total} equal square spaces are shaded.`, equation: raw });
  if (joined) {
    workedSteps.push({ text: `Count the small squares in groups of ${group} to find the matching choice.`, equation: `${raw} = ${answer}` });
  }
  return {
    prompt: 'Which fraction describes the shaded part of this rectangle?',
    picture: diagram(pieces), choices: fractionChoices(r, count, total, joined), answer,
    hint: 'Use one small square as your counting unit for both the shaded part and the whole rectangle.',
    workedSteps, proof: { op: '/', a: count, b: total },
  };
}

function matchRectangle(r: Rng): Item {
  const [numerator, denominator] = r.pick([[1, 3], [1, 4], [3, 4]]);
  const total = 2 * denominator;
  const wanted = 2 * numerator;
  const opposite = total - wanted;
  const otherCounts = r.shuffle(indices(total - 1).map(i => i + 1).filter(n => n !== wanted && n !== opposite));
  const counts = r.shuffle([wanted, opposite, ...otherCounts.slice(0, 2)]);
  const pieces: Tile[] = [];
  counts.forEach((count, card) => {
    const order = r.shuffle(indices(total));
    const split = count !== opposite;
    // Two half-white squares contribute one square of unshaded area.
    const halfCells = new Set(split ? order.slice(0, 2) : []);
    const remaining = order.slice(halfCells.size);
    const white = new Set(remaining.slice(0, count - (split ? 1 : 0)));
    for (const i of order) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const label = `${positions[card]} rectangle, row ${row + 1}, column ${col + 1}`;
      const tile = square(label, card * 2.25 + col * 0.75, row * 0.75, 0.75, !white.has(i));
      if (!halfCells.has(i)) {
        pieces.push(tile);
        continue;
      }
      const [a, b, c, d] = tile.points;
      const upperShaded = r.chance(0.5);
      pieces.push(
        { label: label + ', upper half', kind: 'triangle', points: [a, b, c], shaded: upperShaded },
        { label: label + ', lower half', kind: 'triangle', points: [a, c, d], shaded: !upperShaded },
      );
    }
  });
  const answer = positions[counts.indexOf(wanted)];
  const target = `${numerator}/${denominator}`;
  return {
    prompt: `Which rectangle has ${target} of its area unshaded?`,
    context: ['Each rectangle is one whole. Read the four rectangles from left to right.'],
    picture: diagram(pieces), choices: [...positions], answer,
    hint: 'Count the white squares in each rectangle. Two white half-squares together cover one square.',
    workedSteps: [
      { text: `Each rectangle has ${total} square spaces. Find how many need to be white.`, equation: `${target} = ${wanted}/${total}` },
      { text: 'Pair the white halves. From left to right, the white areas in whole squares are ' + counts.join(', ') + '.' },
      { text: `In the ${answer.toLowerCase()} rectangle, ${wanted - 1} whole white ${wanted === 2 ? 'square' : 'squares'} and two white halves cover ${wanted} square spaces.` },
    ],
  };
}

function shadeRectangle(r: Rng): Item {
  const parts = r.pick([6, 8, 12]);
  const count = r.int(1, parts - 1);
  const target = `${count}/${parts}`;
  return {
    prompt: `Use the boxes to colour ${target} of the rectangle.`,
    fractionBuilder: parts, answer: target,
    hint: 'The bottom number counts all the equal boxes. The top number tells how many to colour.',
    workedSteps: [
      { text: `There are ${parts} equal boxes, so one box is 1/${parts} of the rectangle.` },
      { text: `Colour ${count} out of the ${parts} boxes.`, equation: target },
    ],
    proof: { op: '/', a: count, b: parts },
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) % 11 + index) % 11 + 11) % 11;
  let item: Item;
  if (slot === 10) item = matchRectangle(r);
  else if (slot === 9) item = shadeRectangle(r);
  else item = readRectangle(r, slot >= 5);
  const explanation = item.workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ');
  return { ...item, key, explanation };
}
