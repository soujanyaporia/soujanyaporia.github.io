import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-parts-of-a-whole',
  level: 2,
  title: 'Find the missing third part',
  objective: 'Use a total and two known parts to find the part that is missing.',
  skillIds: ['P2.S.AS.01'],
  canonicalPatternId: 'p2-parts-of-a-whole',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = ((Math.trunc(seed) + Math.trunc(index)) % 3 + 3) % 3;
  const a = r.int(201, 419);
  const b = r.int(151, 283);
  const known = a + b;
  const whole = form === 2 ? 1000 : known + r.int(121, 289);
  const missing = whole - known;

  let task: Pick<Question, 'prompt' | 'context' | 'display' | 'unit'>;
  if (form === 0) {
    task = {
      context: [`A box holds ${whole} beads. Each bead is just one colour: red, green or blue.`, `There are ${a} red beads and ${b} green beads.`],
      prompt: 'How many blue beads are in the box?',
      unit: 'beads',
    };
  } else if (form === 1) {
    task = {
      context: [`The numbers on three cards add up to ${whole}.`, `Two cards show ${a} and ${b}.`],
      prompt: 'What number is on the last card?',
    };
  } else {
    task = { display: `${a} + ${b} + □ = ${whole}`, prompt: 'Which number goes in the square?' };
  }

  const workedSteps = [
    { text: form === 0 ? 'Count the red and green beads together.' : 'Add the two numbers you know.', equation: `${a} + ${b} = ${known}` },
    { text: form === 0 ? 'Take that count away from the total to find the blue beads.' : 'Take that sum away from the total to find the missing number.', equation: `${whole} − ${known} = ${missing}` },
  ];
  return {
    key, ...task, answer: String(missing),
    hint: form === 0 ? 'Which two colours can you count together first?' : 'How much of the total do the two given numbers already make?',
    workedSteps,
    explanation: `${workedSteps[0].equation}. ${workedSteps[1].equation}. ${form === 0 ? `There are ${missing} blue beads.` : `The missing number is ${missing}.`}`,
    proof: { op: '-', a: whole, b: { op: '+', a, b } },
  };
}
