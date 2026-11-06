import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-picture-graph-removals',
  level: 1 as const,
  title: 'What is left on the sticker sheet?',
  objective: 'Read the rows named in the question and find how many stickers remain after some are peeled off.',
  skillIds: ['P1.S.GRAPH.01', 'P1.S.AS.02', 'P1.S.AS.01'],
  canonicalPatternId: 'p1-picture-graph-remainder-after-removals',
};

const stickers = (n: number, kind: string) => `${n} ${kind} sticker${n === 1 ? '' : 's'}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const phase = hashString(String(seed)) + index;
  const mode = ((phase % 3) + 3) % 3; // one row, two rows, or the whole sheet
  const labels = rng.shuffle(['Star', 'Leaf', 'Moon', 'Fish']);
  const values = rng.shuffle([3, 4, 5, 6, 7, 8]).slice(0, labels.length);
  const [a, b] = rng.shuffle([0, 1, 2, 3]);
  const kind = labels[a].toLowerCase();
  const take = rng.int(mode === 0 ? 3 : mode === 1 ? 2 : 1, Math.min(5, values[a]));
  const peeled = [stickers(take, kind)];
  const steps: NonNullable<Question['workedSteps']> = [];
  let prompt: string, hint: string, answer: number;

  if (mode === 2) {
    prompt = 'How many stickers are left on the whole sheet?';
    hint = 'The question asks about every kind of sticker. Count all the rows before taking any away.';
    const start = values.reduce((sum, count) => sum + count, 0);
    answer = start - take;
    steps.push({text: 'Count the stickers in each row and add the four counts.', equation: `${values.join(' + ')} = ${start}`},
      {text: `Take the ${kind} stickers Lina peeled off away from the total.`, equation: `${start} − ${take} = ${answer}`});
  } else {
    const left = values[a] - take;
    steps.push({text: `Count the symbols in the ${kind} row.`, equation: `${values[a]} symbols = ${stickers(values[a], kind)}`},
      {text: `Take away the ${kind} stickers Lina peeled off.`, equation: `${values[a]} − ${take} = ${left}`});
    if (mode === 0) {
      prompt = `How many ${kind} stickers are left on the sheet?`;
      hint = `Find the ${kind} row. Count its symbols, then take away the stickers Lina peeled off.`;
      answer = left;
    } else {
      const other = labels[b].toLowerCase();
      const takeOther = rng.int(2, Math.min(5, values[b]));
      const leftOther = values[b] - takeOther;
      peeled.push(stickers(takeOther, other));
      prompt = `How many ${kind} stickers and ${other} stickers are left altogether?`;
      hint = `Find what is left in the ${kind} row and in the ${other} row. Then put those two counts together.`;
      answer = left + leftOther;
      steps.push({text: `Count the ${other} row and take away the ${other} stickers Lina peeled off.`, equation: `${values[b]} − ${takeOther} = ${leftOther}`},
        {text: `Add the ${kind} and ${other} stickers that are left.`, equation: `${left} + ${leftOther} = ${answer}`});
    }
  }

  return {
    key, prompt, context: ['The graph shows Lina’s sticker sheet before she starts. Each symbol stands for 1 sticker.', `Lina peels off ${peeled.join(' and ')}.`],
    picture: {type: 'bars', pictures: true, scale: 1, labels, values},
    unit: 'stickers', answer: String(answer), hint, workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
