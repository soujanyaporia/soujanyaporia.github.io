import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-equal-gap-distance',
  level: 2,
  title: 'How far apart are the flags?',
  objective: 'Count the gaps between two numbered flags and use the length of one gap to find the distance.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.AS.01', 'P2.S.MD.01'],
  canonicalPatternId: 'p2-distance-between-equally-spaced-positions',
};

function flagRow(start: number, end: number, metres: number, full: boolean): Batch11UpperPicture {
  const prefix = full ? end : Math.max(3, start);
  const shown = Array.from({ length: prefix }, (_, i) => i + 1);
  if (!full) shown.push(end);
  const x = (position: number) => 24 + (position - 1) * 270 / (end - 1);
  const marks: Batch11UpperPicture['marks'] = [
    { kind: 'line', x1: x(1), y1: 100, x2: x(prefix), y2: 100 },
    { kind: 'path', d: `M ${x(1)} 80 V 72 H ${x(2)} V 80` },
    { kind: 'text', x: (x(1) + x(2)) / 2 - 14, y: 64, text: `${metres} m` },
  ];
  if (!full) marks.push({ kind: 'line', x1: x(prefix), y1: 100, x2: x(end), y2: 100, dashed: true });
  for (const position of shown) {
    marks.push(
      { kind: 'circle', cx: x(position), cy: 100, r: 5, fill: '#235b4c' },
      { kind: 'text', x: x(position) - String(position).length * 5, y: 126, text: String(position) },
    );
  }
  return {
    type: 'batch11-upper',
    label: `Flags shown from left to right: ${shown.join(', ')}. The gap from flag 1 to flag 2 is labelled ${metres} m.`,
    marks,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['sentence', 'from-first', 'from-inside']);
  const start = form === 'from-inside' ? rng.int(2, 5) : 1;
  const end = rng.int(Math.max(5, start + 3), 10);
  const metres = rng.pick([4, 5]);
  const gaps = end - start;
  const distance = gaps * metres;
  const sentence = form === 'sentence';
  const ask = `How far is it from flag ${start} to flag ${end}?`;
  return {
    key,
    context: [
      'The flags are numbered in order along a straight path. Every gap from one flag to the next is the same length.',
      sentence ? 'Each dot shows a flag.' : 'Each dot shows a flag. The dashed line skips over flags that are not drawn.',
    ],
    picture: flagRow(start, end, metres, sentence),
    prompt: sentence ? `${ask} Write a multiplication sentence for the distance in metres.` : ask,
    answer: sentence ? `${gaps} * ${metres} = ${distance}` : String(distance),
    unit: 'm',
    ...(sentence ? { numberSentence: { operation: '*' as const, numbers: [gaps, metres], chooseOperation: true, missingResult: true, freeEntry: true } } : {}),
    hint: 'Moving to the next flag takes you across one gap. How many such moves do you need?',
    workedSteps: [
      { text: `Count the gaps from flag ${start} to flag ${end}.`, equation: `${end} − ${start} = ${gaps}` },
      { text: `Each of the ${gaps} gaps is ${metres} m long.`, equation: `${gaps} × ${metres} m = ${distance} m` },
    ],
    explanation: `The flag numbers go up by 1 for each gap. There are ${gaps} gaps to cross, so the distance is ${distance} m.`,
    proof: { op: '*', a: { op: '-', a: end, b: start }, b: metres },
  };
}
