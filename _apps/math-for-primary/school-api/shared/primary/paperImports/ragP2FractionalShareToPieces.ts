import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-fractional-share-to-pieces',
  level: 2,
  title: 'Count pieces from a fraction',
  objective: 'Use a fraction of a whole to count equal pieces, then find how many were used or what fraction is left.',
  skillIds: ['P2.S.FRAC.01', 'P2.S.FRAC.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-fractional-share-to-pieces',
};

function pieces(count: number): string {
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const total = rng.pick([4, 7, 8, 9, 10, 12]);

  if ((seed + index) % 2 === 0) {
    const left = rng.int(1, total - 1);
    const shareLeft = `${left}/${total}`;
    const used = total - left;
    return {
      key,
      context: [
        `Lina cut a ribbon into ${total} equal pieces.`,
        `She used some pieces to tie bows. ${shareLeft} of the ribbon was left.`,
      ],
      prompt: 'How many pieces did Lina use to tie bows?',
      answer: String(used),
      unit: 'pieces',
      hint: 'How many pieces does the fraction say are left? The other pieces went into the bows.',
      workedSteps: [
        { text: `Each piece is 1/${total} of the ribbon.`, equation: `${shareLeft} of the ribbon = ${pieces(left)}` },
        { text: 'Take the pieces left away from the starting count.', equation: `${total} − ${left} = ${used}` },
      ],
      explanation: `Lina started with ${pieces(total)} and had ${pieces(left)} left. She used ${pieces(used)} to tie bows.`,
    };
  }

  const given = rng.int(1, total - 3);
  const shareGiven = `${given}/${total}`;
  const afterGiving = total - given;
  const eaten = rng.int(2, afterGiving - 1);
  const left = afterGiving - eaten;
  const shareLeft = `${left}/${total}`;
  return {
    key,
    context: [
      `Mira broke a chocolate bar into ${total} equal pieces.`,
      `She gave ${shareGiven} of the whole bar to Ben. Then she ate ${eaten} of the other pieces.`,
    ],
    picture: {
      type: 'paper', layout: 'bars', heading: 'One whole chocolate bar',
      rows: [{ label: 'Bar', parts: Array.from({ length: total }, () => ({ size: 1, label: '' })) }],
    },
    prompt: 'What fraction of the original bar was left?',
    answer: shareLeft,
    hint: 'Count the pieces Ben got, then take away the pieces Mira ate. Use the starting number of pieces to write the fraction left.',
    workedSteps: [
      { text: `Each piece is 1/${total} of the bar.`, equation: `${shareGiven} of the bar = ${pieces(given)}` },
      { text: 'Count the pieces Mira still had after giving Ben his share.', equation: `${total} − ${given} = ${afterGiving}` },
      { text: 'Take away the pieces Mira ate.', equation: `${afterGiving} − ${eaten} = ${left}` },
      { text: 'Write the pieces left as a fraction of the original bar.', equation: `${left} out of ${total} equal pieces = ${shareLeft}` },
    ],
    explanation: `Ben got ${pieces(given)} and Mira ate ${pieces(eaten)}. That left ${pieces(left)} out of the original ${total}, or ${shareLeft} of the bar.`,
  };
}
