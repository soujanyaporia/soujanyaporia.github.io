import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-height-from-diagram-offsets',
  level: 2,
  title: 'How tall is the post?',
  objective: 'Use a level line and equal blocks to find a height in centimetres.',
  skillIds: ['P2.S.AS.01', 'P2.S.MD.01', 'P2.S.MEASURE.01'],
  canonicalPatternId: 'p2-height-from-diagram-offsets',
};

type Task = Pick<Question, 'prompt' | 'context' | 'hint' | 'answer' | 'proof'> & {
  picture: Batch11UpperPicture;
  workedSteps: NonNullable<Question['workedSteps']>;
};

const floor = 164;
const left = 76;
const right = 228;
const line = (x1: number, y1: number, x2: number, y2: number, dashed = false): Batch11UpperMark =>
  ({ kind: 'line', x1, y1, x2, y2, dashed });
const label = (x: number, y: number, text: string): Batch11UpperMark => ({ kind: 'text', x, y, text });

function stack(x: number, edges: number[]): Batch11UpperMark[] {
  const top = edges[edges.length - 1];
  return [
    ...edges.map(y => line(x - 33, y, x + 33, y)),
    line(x - 33, floor, x - 33, top),
    line(x + 33, floor, x + 33, top),
  ];
}

function post(x: number, bottom: number, top: number): Batch11UpperMark {
  return { kind: 'path', d: `M ${x - 13} ${bottom} V ${top} H ${x + 13} V ${bottom} Z`, fill: '#cae3ef' };
}

function onSupports(rng: Rng): Task {
  const block = rng.pick([5, 8, 10]);
  const countA = rng.int(1, 2);
  const extra = rng.int(2, 4);
  const countB = countA + extra;
  const reference = rng.int(62, 87);
  const difference = extra * block;
  const answer = reference - difference;

  const top = 24;
  const blockPixels = (floor - top) * block / (reference + countA * block);
  const levels = (count: number) => Array.from({ length: count + 1 }, (_, i) => floor - i * blockPixels);
  const edgesA = levels(countA);
  const edgesB = levels(countB);
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `Post A stands on ${countA} ${countA === 1 ? 'block' : 'blocks'} and post B stands on ${countB} blocks. The stacks start on one floor. The tops of the posts meet the same dashed line.`,
    marks: [
      line(20, floor, 292, floor, true), line(20, top, 292, top, true),
      ...stack(left, edgesA), ...stack(right, edgesB),
      post(left, edgesA[countA], top), post(right, edgesB[countB], top),
      label(left - 6, 189, 'A'), label(right - 6, 189, 'B'),
    ],
  };
  return {
    prompt: 'How tall is post B on its own?',
    context: [`Each block is ${block} cm high.`, `Post A is ${reference} cm tall without its blocks.`],
    picture, answer: String(answer),
    hint: 'Look at the tops of the posts. Which post needs more blocks under it to reach the same line?',
    workedSteps: [
      { text: 'Count how many more blocks are under B than under A.', equation: `${countB} − ${countA} = ${extra}` },
      { text: 'Find the height of those extra blocks.', equation: `${extra} × ${block} = ${difference} cm` },
      { text: 'The tops are level. B starts higher, so the post itself is shorter.', equation: `${reference} − ${difference} = ${answer} cm` },
    ],
    proof: { op: '-', a: reference, b: { op: '*', a: { op: '-', a: countB, b: countA }, b: block } },
  };
}

function besideStack(rng: Rng, metreBase: boolean): Task {
  const block = metreBase ? rng.pick([8, 10]) : rng.pick([4, 5]);
  const below = metreBase ? rng.int(2, 4) : rng.int(4, 8);
  const above = rng.int(1, 2);
  const base = metreBase ? 100 : 0;
  const bandHeight = below * block;
  const answer = base + bandHeight;

  const total = base + (below + above) * block;
  const y = (cm: number) => floor - cm * (floor - 18) / total;
  const edges = [floor];
  if (metreBase) edges.push(y(base));
  for (let i = 1; i <= below + above; i++) edges.push(y(base + i * block));
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `The post and stack stand on one floor. ${metreBase ? 'The bottom block is labelled 1 m. Above it are' : 'The stack has'} ${below + above} equal blocks. The dashed line from the post meets a block edge. ${above === 1 ? 'One equal block is' : 'Two equal blocks are'} above that line.`,
    marks: [
      line(20, floor, 292, floor, true), line(left, y(answer), right - 33, y(answer), true),
      post(left, floor, y(answer)), ...stack(right, edges),
      label(left - 18, 189, 'Post'), label(right - 22, 189, 'Stack'),
    ],
  };
  if (metreBase) picture.marks.push(label(right - 15, (floor + y(base)) / 2 + 6, '1 m'));
  const productEquation = `${below} × ${block} = ${bandHeight} cm`;
  const product = { op: '*' as const, a: below, b: block };
  return {
    prompt: 'What is the height of the post?',
    context: metreBase ? [`Each small block is ${block} cm high.`, 'One metre is 100 centimetres.'] : [`Each block is ${block} cm high.`],
    picture, answer: String(answer),
    hint: 'Follow the line from the top of the post to the stack. Which blocks lie between the floor and that line?',
    workedSteps: metreBase ? [
      { text: 'Read the height of the bottom block in centimetres.', equation: '1 m = 100 cm' },
      { text: 'Count the small blocks below the dashed line. Find their height together.', equation: productEquation },
      { text: 'Add the bottom block and the small blocks that reach the line.', equation: `100 + ${bandHeight} = ${answer} cm` },
    ] : [
      { text: `The top of the post lines up with the top of a block. There are ${below} blocks from the floor to that line.` },
      { text: 'Multiply the number of blocks by the height of one block.', equation: productEquation },
    ],
    proof: metreBase ? { op: '+', a: base, b: product } : product,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.int(0, 2);
  const task = form === 0 ? onSupports(rng) : besideStack(rng, form === 2);
  return {
    ...task, key, unit: 'cm',
    explanation: task.workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
