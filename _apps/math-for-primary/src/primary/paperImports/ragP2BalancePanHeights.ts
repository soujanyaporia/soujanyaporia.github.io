import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p2-balance-pan-heights',
  level: 2,
  title: 'Read a pan balance',
  objective: 'Use the positions of two pans to compare a load with a known mass in kilograms.',
  skillIds: ['P2.S.MEASURE.02'],
  canonicalPatternId: 'p2-compare-balance-pan-heights',
};

const line = (x1: number, y1: number, x2: number, y2: number): Batch11UpperMark =>
  ({ kind: 'line', x1, y1, x2, y2 });
const path = (d: string, fill: string): Batch11UpperMark => ({ kind: 'path', d, fill });

function pan(x: number, y: number): Batch11UpperMark[] {
  return [
    path(`M ${x-55} ${y} L ${x-20} ${y+10} H ${x+20} L ${x+55} ${y} Z`, '#d5e6df'),
    line(x-55, y, x+55, y),
    line(x, y+10, x, y+23),
  ];
}

function load(x: number, y: number, halfWidth: number, label: string, fill: string): Batch11UpperMark[] {
  return [
    path(`M ${x-halfWidth} ${y} v -30 h ${2*halfWidth} v 30 Z`, fill),
    { kind: 'text', x: x-4.5*label.length, y: y-9, text: label },
  ];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const name = rng.pick(['Box', 'Crate', 'Parcel']);
  const a = rng.int(2, 4), b = rng.int(2, 4), total = a+b;
  const tilt = rng.pick([-16, 0, 16]);
  const left = { x: 72, y: 94+tilt }, right = { x: 248, y: 94-tilt };
  const objectOnLeft = rng.chance(0.5);
  const obj = objectOnLeft ? left : right, weights = objectOnLeft ? right : left;
  const side = objectOnLeft ? 'left' : 'right';
  const heights = tilt === 0 ? 'The two pans are level.' :
    `The ${tilt > 0 ? 'left' : 'right'} pan is lower than the other pan.`;
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `A pan balance. The ${name.toLowerCase()} is on the ${side} pan. The other pan holds weights marked ${a} kg and ${b} kg. ${heights}`,
    marks: [
      path('M 160 117 L 138 166 H 182 Z', '#bed8ce'),
      line(left.x, left.y+23, right.x, right.y+23),
      { kind: 'circle', cx: 160, cy: 117, r: 3, fill: '#235b4c' },
      ...pan(left.x, left.y), ...pan(right.x, right.y),
      ...load(obj.x, obj.y, 42, name, '#fae2b8'),
      ...load(weights.x-26, weights.y, 24, `${a} kg`, '#e1edf3'),
      ...load(weights.x+26, weights.y, 24, `${b} kg`, '#e1edf3'),
    ],
  };
  const relation = obj.y > weights.y ? 'more than' : obj.y < weights.y ? 'less than' : 'exactly';
  const answer = `It weighs ${relation} ${total} kg.`;
  const observation = obj.y === weights.y ? 'The pans are level, so their loads have the same mass.' :
    obj.y > weights.y ? `The ${name.toLowerCase()} is on the lower pan, so it is heavier than the weights.` :
    `The ${name.toLowerCase()} is on the higher pan, so it is lighter than the weights.`;
  const sum = `${a} kg + ${b} kg = ${total} kg`;
  return {
    key, picture, prompt: `Which sentence about the ${name.toLowerCase()} is true?`,
    choices: rng.shuffle(['less than', 'exactly', 'more than'].map(r => `It weighs ${r} ${total} kg.`)),
    answer, hint: 'Add the two weights. Then look at which pan is lower, or whether the pans are level.',
    workedSteps: [
      { text: 'Find the mass of the two weights together.', equation: sum },
      { text: observation }, { text: answer },
    ],
    explanation: `${sum}. ${observation} ${answer}`,
  };
}
