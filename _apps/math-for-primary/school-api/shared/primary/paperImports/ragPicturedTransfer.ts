import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-pictured-transfer',
  level: 1,
  title: 'Share the pencils',
  objective: 'Count two pictured sets and find how many pencils to pass so both children have an equal share.',
  skillIds: ['P1.S.WN.01', 'P1.S.AS.05', 'P1.S.MD.02'],
  canonicalPatternId: 'p1-transfer-to-equalise-holdings',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const transfer = rng.int(1, 4);
  const gap = 2 * transfer;
  const smaller = rng.int(2, 12 - gap);
  const larger = smaller + gap;
  const equalShare = smaller + transfer;
  const sitiGives = rng.chance(0.5);
  const giver = sitiGives ? 'Siti' : 'Arun';
  const receiver = sitiGives ? 'Arun' : 'Siti';
  const sitiCount = sitiGives ? larger : smaller;
  const arunCount = sitiGives ? smaller : larger;

  const picture: PaperPicture = {
    type: 'paper',
    layout: 'cards',
    heading: 'Pencils before sharing',
    cards: [
      { label: 'Siti', value: 'Pencils', icon: 'pencil', count: sitiCount },
      { label: 'Arun', value: 'Pencils', icon: 'pencil', count: arunCount },
    ],
  };

  return {
    key,
    prompt: `Count each child’s pencils. How many pencils should ${giver} give ${receiver} so they have the same number?`,
    picture,
    unit: 'pencils',
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        { label: 'Siti’s pencils at the start' },
        { label: 'Arun’s pencils at the start' },
        { label: `Pencils ${giver} gives ${receiver}` },
      ],
    },
    answer: JSON.stringify([sitiCount, arunCount, transfer].map(String)),
    hint: 'Match one pencil from each child at a time. What happens to the extra pencils when you pass one across?',
    workedSteps: [
      { text: `Count each pencil once. Siti has ${sitiCount} and Arun has ${arunCount}.` },
      { text: `Find how many extra pencils ${giver} has.`, equation: `${larger} − ${smaller} = ${gap}` },
      { text: `Split the extra pencils into two equal groups. ${giver} keeps one group and gives the other to ${receiver}.`, equation: `${gap} = ${transfer} + ${transfer}` },
      { text: 'Check how many pencils each child now has.', equation: `${larger} − ${transfer} = ${equalShare}.  ${smaller} + ${transfer} = ${equalShare}.` },
    ],
    explanation: `Every pencil passed takes one from ${giver} and adds one to ${receiver}, closing the gap by two. Passing ${transfer} leaves both children with ${equalShare} pencils.`,
  };
}
