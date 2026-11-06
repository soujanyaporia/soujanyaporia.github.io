import { Rng, hashString } from '../../engine/random';
import type { Proof, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-sum-difference-two-parts',
  level: 3,
  title: 'Find the smaller part',
  objective: 'Use a total and a difference to find the smaller part, then use it if the question asks for another amount.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04', 'P3.S.MD.03'],
  canonicalPatternId: 'sum-and-difference-of-two-parts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = (hashString(String(seed)) >>> 0) % 7;
  const slot = ((offset + Math.trunc(index) % 7) + 7) % 7;
  const age = slot === 6;
  const scaled = slot === 5;
  const books = slot === 3 || slot === 4;

  // Build the total from two equal parts and a positive excess so halving is exact.
  const smaller = age ? rng.int(4, 15) : scaled ? rng.int(18, 125) : rng.int(65, 495);
  const gap = age ? rng.int(2, 9) : scaled ? rng.int(8, 58) : 10 * rng.int(1, 95) + rng.int(1, 9);
  const equalParts = 2 * smaller;
  const total = equalParts + gap;
  const half: Proof = { op: '/', a: { op: '-', a: total, b: gap }, b: 2 };
  let proof: Proof = half;
  let answer = smaller;
  let context: string[];
  let prompt: string;
  let unit: string | undefined;
  let remove: string;
  let share: string;
  let lastStep: { text: string; equation: string } | undefined;

  if (age) {
    const years = rng.int(2, 6);
    context = [`Nora is ${gap} years older than Amir.`, `${years} years ago, their ages added up to ${total} years.`];
    prompt = 'How old is Amir now?';
    unit = 'years';
    remove = 'Nora was just as many years older then. Take those extra years off the past total to get twice Amir’s age at that time.';
    share = 'Halve what is left to find how old Amir was then.';
    answer = smaller + years;
    proof = { op: '+', a: half, b: years };
    lastStep = { text: 'Count forward from Amir’s age then to his age now.', equation: `${smaller} + ${years} = ${answer} years` };
  } else if (scaled) {
    const factor = rng.int(2, 6);
    context = [`Mira and Ravi have ${total} beads between them.`, `Ravi has ${gap} more beads than Mira.`, `Jo has ${factor} times as many beads as Mira.`];
    prompt = 'How many beads does Jo have?';
    unit = 'beads';
    remove = 'The total counts only Mira’s and Ravi’s beads. Set aside Ravi’s extra beads to leave two equal groups.';
    share = 'One of those groups is Mira’s collection.';
    answer = smaller * factor;
    proof = { op: '*', a: half, b: factor };
    lastStep = { text: `Jo has ${factor} groups the size of Mira’s collection.`, equation: `${smaller} × ${factor} = ${answer} beads` };
  } else if (books) {
    context = [`A library lent ${total} books altogether on Monday and Tuesday.`, `It lent ${gap} more books on Tuesday than on Monday.`];
    prompt = 'How many books did the library lend on Monday?';
    unit = 'books';
    remove = 'Set aside the extra books lent on Tuesday. The rest is twice the number lent on Monday.';
    share = 'Divide by two to find Monday’s count.';
  } else {
    context = [`The numbers on two cards add up to ${total}.`, `One number is ${gap} greater than the other.`];
    prompt = 'Which number is on the card with the lower value?';
    remove = 'Take the extra amount away from the total. What is left is two copies of the lower number.';
    share = 'Halve that amount to find the number on the card.';
  }

  const workedSteps = [
    { text: remove, equation: `${total} − ${gap} = ${equalParts}` },
    { text: share, equation: `${equalParts} ÷ 2 = ${smaller}` },
    ...(lastStep ? [lastStep] : []),
  ];
  return {
    key, context, prompt, unit, answer: String(answer), proof,
    hint: 'Imagine taking the extra amount away from the larger part. What two equal parts would be left?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
