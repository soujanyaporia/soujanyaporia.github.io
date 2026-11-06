import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p4-exposed-edges-of-equal-squares',
  level: 4,
  title: 'Follow the outside edges of square tiles',
  objective: 'Use the sides on the outside of a tile arrangement to find its perimeter or the side of one tile.',
  skillIds: ['P4.S.AREA.02', 'P4.S.AREA.01'],
  canonicalPatternId: 'p4-exposed-edges-of-equal-squares',
};

type Tile = [number, number];
type Measure = { kind: 'column' | 'ledge'; cm: number };

function tilePicture(tiles: Tile[], label: string, measure?: Measure): Batch11UpperPicture {
  const width = 1 + Math.max(...tiles.map(([x]) => x));
  const height = 1 + Math.max(...tiles.map(([, y]) => y));
  const size = 3 * Math.floor(Math.min(60, 210 / width, 144 / height) / 3);
  const left = Math.round((320 - width * size) / 2);
  const top = Math.round((200 - height * size) / 2);
  const marks: Batch11UpperMark[] = tiles.map(([x, y]) => ({
    kind: 'path', fill: '#e4f1eb',
    d: `M ${left + Math.round(x * size)} ${top + Math.round(y * size)} h ${size} v ${size} h -${size} Z`,
  }));
  function line(x1: number, y1: number, x2: number, y2: number) {
    marks.push({ kind: 'line', x1, y1, x2, y2 });
  }
  if (measure?.kind === 'column') {
    const x = left - 12;
    const bottom = top + height * size;
    line(x, top, x, bottom);
    line(x - 4, top, x + 4, top);
    line(x - 4, bottom, x + 4, bottom);
    marks.push({ kind: 'text', x: x - 57, y: (top + bottom) / 2 + 5, text: `${measure.cm} cm` });
  } else if (measure?.kind === 'ledge') {
    const right = left + Math.round(tiles[1][0] * size);
    const y = top + size + 9;
    line(left, y, right, y);
    line(left, y - 4, left, y + 4);
    line(right, y - 4, right, y + 4);
    marks.push({ kind: 'text', x: right - 52, y: y + 22, text: `${measure.cm} cm` });
  }
  return { type: 'batch11-upper', label, marks };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['span', 'side', 'row', 'inverse'] as const);
  const prompt = 'What is the perimeter of the whole shape?';
  function entry(context: string[], question: string, value: number, hint: string, steps: string[], picture?: Batch11UpperPicture): Question {
    return { key, context, prompt: question, answer: String(value), unit: 'cm', hint,
      explanation: steps.join(' '), workedSteps: steps.map(text => ({ text })), picture };
  }

  if (variant === 'side' && rng.chance(0.5)) {
    const side = 3 * rng.int(3, 6);
    const thirds = rng.int(1, 2);
    const ledge = side / 3 * thirds;
    const join = side - ledge;
    const separate = 8 * side;
    const perimeter = separate - 2 * join;
    const picture = tilePicture([[0, 0], [thirds / 3, 1]],
      `Two tiles touch along part of a side. The top tile sticks out ${ledge} cm to the left of the bottom tile.`,
      { kind: 'ledge', cm: ledge });
    const q = entry([`Each square tile has sides ${side} cm long. The mark shows how far the top tile sticks out on the left.`],
      prompt, perimeter, 'Find the length where the tiles touch. What happens to that length when you trace only the outside?', [
        `The tiles touch along ${side} − ${ledge} = ${join} cm.`,
        `Around the two tiles separately, the distance is 8 × ${side} = ${separate} cm.`,
        `We counted the join once for each tile. Take away both copies. ${separate} − 2 × ${join} = ${perimeter} cm.`,
      ], picture);
    const choices = rng.shuffle([perimeter, separate, separate - join, 6 * side]).map(n => `${n} cm`);
    return { ...q, choices, answer: `${perimeter} cm`, unit: undefined };
  }

  const side = rng.int(5, 12);
  if (variant === 'row') {
    const count = rng.int(3, 8);
    const edges = 2 * count + 2;
    return entry([`A row of ${count} equal square tiles forms a long rectangle. Each tile has sides ${side} cm long.`],
      'How far is it around the row of tiles?', edges * side, 'Count along the top and bottom, then look at both ends.', [
        `There are ${count} tile sides along the top and ${count} along the bottom.`,
        `Each end adds one more side. Count ${count} + ${count} + 2 = ${edges} outside sides.`,
        `The perimeter is ${edges} × ${side} = ${edges * side} cm.`,
      ]);
  }
  if (variant === 'inverse') {
    const perimeter = 6 * side;
    return entry([`Two equal square tiles share a whole side. The perimeter of the rectangle they form is ${perimeter} cm.`],
      'How long is one side of a tile?', side, 'Count the tile sides you would pass on a walk around both tiles together.', [
        'Along each long edge there are two tile sides. Each end has one tile side.',
        'That makes 2 + 2 + 1 + 1 = 6 equal lengths around the rectangle.',
        `One tile side is ${perimeter} ÷ 6 = ${side} cm.`,
      ]);
  }

  const height = rng.int(4, 6);
  const armRow = rng.int(2, height - 2);
  const topArm = rng.int(1, 3);
  const lowerArm = rng.int(1, 2);
  const tiles: Tile[] = Array.from({ length: height }, (_, y): Tile => [0, y]);
  for (let x = 1; x <= topArm; x++) tiles.push([x, 0]);
  for (let x = 1; x <= lowerArm; x++) tiles.push([x, armRow]);
  const span = side * height;
  const marked = variant === 'span';
  const description = `A column of ${height} tiles has ${topArm} more to the right in the top row and ${lowerArm} more to the right in row ${armRow + 1} from the top.`;
  const picture = tilePicture(tiles, description + (marked ? ` The left edge measures ${span} cm.` : ''),
    marked ? { kind: 'column', cm: span } : undefined);
  const joins = height - 1 + topArm + lowerArm;
  const edges = 4 * tiles.length - 2 * joins;
  const steps = [
    ...(marked ? [`The left edge spans ${height} tile sides. One side is ${span} ÷ ${height} = ${side} cm.`] : []),
    `The ${tiles.length} tiles have 4 × ${tiles.length} = ${4 * tiles.length} sides altogether before they are joined.`,
    `There are ${height - 1} joins down the column and ${topArm + lowerArm} along the two arms. Each join hides two sides, leaving ${4 * tiles.length} − 2 × ${joins} = ${edges} outside sides.`,
    `The perimeter is ${edges} × ${side} = ${edges * side} cm.`,
  ];
  return entry([marked ? 'The tiles are equal squares. The mark shows the height of the left column.'
    : `Each square tile has sides ${side} cm long.`], prompt, edges * side,
    marked ? 'Count the tiles beside the mark to find one side. Then trace the outside.' : 'Count only the tile sides you can trace around the outside.',
    steps, picture);
}
