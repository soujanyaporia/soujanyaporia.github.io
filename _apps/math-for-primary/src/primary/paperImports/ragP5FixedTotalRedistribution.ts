import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-fixed-total-redistribution',
  level: 5,
  title: 'Share the same total in new groups',
  objective: 'Recover a total from equal groups, regroup it, and compare equal shares.',
  skillIds: ['P5.S.RATE.02', 'P5.S.WN.03'],
  canonicalPatternId: 'p5-fixed-total-redistribution',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((Math.trunc(seed) % 3 + Math.trunc(index) % 3) % 3 + 3) % 3;
  const choices = (answer: number, wrong: number[]): string[] => {
    const values = [...new Set([answer, ...wrong.filter(n =>
      Number.isSafeInteger(n) && n > 0 && n !== answer,
    )])].slice(0, 4);
    if (values.length !== 4) throw new Error('Four distinct choices are required.');
    return r.shuffle(values.map(String));
  };
  const make = (
    context: string[], prompt: string, answer: number, unit: string,
    hint: string, workedSteps: Steps, extra: Partial<Question> = {},
  ): Question => ({
    key, context, prompt, answer: String(answer), unit, hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const perRow = r.pick([30, 40, 60, 70, 80]);
    const newSize = r.pick([10, 30, 40, 60].filter(n => n !== perRow));
    const possibleRows = Array.from({length: 25}, (_, i) => i + 12)
      .filter(n => (n * perRow) % newSize === 0);
    const rows = r.pick(possibleRows);
    const total = rows * perRow;
    const newRows = total / newSize;
    return make(
      [
        `A hall has ${rows} rows of chairs, with ${perRow} chairs in each row.`,
        `All these chairs are moved to a courtyard and arranged with ${newSize} chairs in each new row. There are no chairs left over.`,
      ],
      'How many rows of chairs are in the courtyard?',
      newRows, 'rows',
      'Find how many chairs there are altogether. Then find how many new rows they fill.',
      [
        {text: 'Multiply to count all the chairs in the hall.', equation: `${rows} × ${perRow} = ${total} chairs`},
        {text: 'The total stays the same. Divide by the number of chairs in each new row.', equation: `${total} ÷ ${newSize} = ${newRows} rows`},
      ],
      {proof: {op: '/', a: {op: '*', a: rows, b: perRow}, b: newSize}},
    );
  }

  if (variant === 1) {
    const children = r.pick([4, 5, 6, 7, 8]);
    const perBox = r.pick([8, 10, 12, 14, 15, 18, 20, 24]);
    const possibleBoxes = Array.from({length: 17}, (_, i) => i + 10)
      .filter(n => n !== 16 && (n * perBox) % children === 0);
    const boxes = r.pick(possibleBoxes);
    const friends = children - 1;
    const total = boxes * perBox;
    const share = total / children;
    return make(
      [
        `Mei brings ${boxes} boxes of stickers to a club. There are ${perBox} stickers in each box.`,
        `She takes all the stickers out of the boxes and shares them equally among herself and her ${friends} friends.`,
      ],
      'How many stickers does each child get?',
      share, 'stickers',
      'Count Mei as well as her friends. Find the total number of stickers before sharing.',
      [
        {text: 'Find the number of children receiving stickers, including Mei.', equation: `${friends} + 1 = ${children} children`},
        {text: 'Count the stickers in all the boxes.', equation: `${boxes} × ${perBox} = ${total} stickers`},
        {text: 'Divide all the stickers equally among the children.', equation: `${total} ÷ ${children} = ${share} stickers`},
      ],
      {
        choices: choices(share, [total, perBox, total / friends, boxes + perBox, share * 2]),
        proof: {op: '/', a: {op: '*', a: boxes, b: perBox}, b: children},
      },
    );
  }

  const [firstChildren, nextChildren] = r.pick([
    [3, 5], [3, 7], [3, 8], [4, 5], [4, 7], [5, 7], [5, 8], [7, 8],
  ]);
  const firstShare = nextChildren * r.pick([3, 4, 5, 7, 8]);
  const total = firstChildren * firstShare;
  const nextShare = total / nextChildren;
  const difference = firstShare - nextShare;
  return make(
    [
      `A bag has enough beads for ${firstChildren} children to get ${firstShare} beads each, with none left over.`,
      `All the beads in this bag are shared equally among ${nextChildren} children instead.`,
    ],
    'How many fewer beads would each child get with the larger group?',
    difference, 'beads',
    'The bag contains the same number of beads in both plans. Find the new share, then compare it with the first share.',
    [
      {text: 'Find the total number of beads in the bag.', equation: `${firstChildren} × ${firstShare} = ${total} beads`},
      {text: 'Share that same total among the larger group.', equation: `${total} ÷ ${nextChildren} = ${nextShare} beads`},
      {text: 'Subtract the new share from the first share.', equation: `${firstShare} − ${nextShare} = ${difference} beads`},
    ],
    {
      choices: choices(difference, [firstShare, nextShare, nextChildren - firstChildren]),
      proof: {
        op: '-', a: firstShare,
        b: {op: '/', a: {op: '*', a: firstChildren, b: firstShare}, b: nextChildren},
      },
    },
  );
}
