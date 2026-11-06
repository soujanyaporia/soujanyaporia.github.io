import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-arithmetic-with-tens',
  level: 1,
  title: 'Count on and back with tens',
  objective: 'Use the value of a ten to add whole tens or take ones away from a whole ten.',
  skillIds: ['P1.S.WN.02', 'P1.S.AS.05', 'P1.S.AS.08'],
  canonicalPatternId: 'p1-arithmetic-with-tens',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(String(seed)) + index;
  const variant = ((offset % 3) + 3) % 3;

  if (variant === 0) {
    const firstStart = 10 * rng.int(2, 8);
    const secondStart = rng.pick([20, 30, 40, 60, 70, 80].filter(n => n !== firstStart));
    const before = firstStart - 1;
    const after = secondStart + 10;
    return {
      key,
      prompt: 'Write a number for each part.',
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: `a) Which number comes just before ${firstStart}?`,
        secondLabel: `b) Add one ten to ${secondStart}. Where do you land?`,
      },
      answer: JSON.stringify([String(before), String(after)]),
      hint: 'For (a), count back one. For (b), start at the number in that part and count on in tens.',
      workedSteps: [
        { text: 'For (a), step back one from the first number.', equation: `${firstStart} − 1 = ${before}` },
        { text: 'For (b), one ten is worth 10. Take one step of 10 forwards.', equation: `${secondStart} + 10 = ${after}` },
      ],
      explanation: `${before} comes just before ${firstStart}. Counting on one ten from ${secondStart} gives ${after}.`,
    };
  }

  if (variant === 1) {
    const tens = rng.pick([2, 3, 4, 5, 6, 8, 9]);
    const take = rng.int(2, 9);
    const start = 10 * tens;
    const keptTens = start - 10;
    const leftOnes = 10 - take;
    const result = keptTens + leftOnes;
    return {
      key,
      prompt: `Start with ${tens} tens. Take away ${take} ones. What number is left?`,
      answer: String(result),
      hint: 'Split the last ten into 10 ones. Take the ones you need from that ten.',
      workedSteps: [
        { text: 'Find the starting number.', equation: `${tens} tens = ${start}` },
        { text: 'Split off the last ten.', equation: `${start} = ${keptTens} + 10` },
        { text: 'Take the ones from that ten.', equation: `10 − ${take} = ${leftOnes}` },
        { text: 'Put the remaining tens and ones together.', equation: `${keptTens} + ${leftOnes} = ${result}` },
      ],
      explanation: `Taking ${take} from the last ten leaves ${leftOnes} ones. Together with the other tens, that makes ${result}.`,
      proof: { op: '-', a: { op: '*', a: tens, b: 10 }, b: take },
    };
  }

  const tens = rng.int(2, 5);
  const ones = rng.int(2, 9);
  const extra = rng.int(2, 9 - tens);
  const start = 10 * tens + ones;
  const finalTens = tens + extra;
  const result = 10 * finalTens + ones;
  return {
    key,
    prompt: `You have ${tens} tens and ${ones} ones. You get ${extra} more tens. Which number do you have now?`,
    choices: rng.shuffle([result, start, start + extra, 10 * finalTens]).map(String),
    answer: String(result),
    hint: 'Count the tens together. Keep all the ones you started with.',
    workedSteps: [
      { text: 'Find how many tens you have now.', equation: `${tens} tens + ${extra} tens = ${finalTens} tens` },
      { text: 'Put those tens together with the original ones.', equation: `${10 * finalTens} + ${ones} = ${result}` },
    ],
    explanation: `You now have ${finalTens} tens and ${ones} ones. They make ${result}.`,
    proof: { op: '+', a: start, b: { op: '*', a: extra, b: 10 } },
  };
}
