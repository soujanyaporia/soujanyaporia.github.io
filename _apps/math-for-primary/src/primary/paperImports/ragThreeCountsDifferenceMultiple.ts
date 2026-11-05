import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p4-three-counts-difference-multiple',
  level: 4,
  title: 'Find the number of blue buttons',
  objective: 'Use a total, a difference and a times-as-many clue to find one of three counts.',
  skillIds: ['P4.S.MD.03', 'P4.S.MD.01'],
  canonicalPatternId: 'three-counts-total-difference-multiple',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const green = rng.int(640, 820);
  const factor = rng.pick([2, 4]);
  const extraRed = 10 * rng.int(130, 188);
  const blue = factor * green;
  const red = blue + extraRed;
  const total = red + blue + green;
  const parts = factor + factor + 1;
  const equalPartsTotal = total - extraRed;
  const conclusion = `There are ${blue} blue buttons.`;
  const workedSteps = [
    {
      text: 'Set aside the extra red buttons so that red and blue have the same number. This many buttons are left altogether.',
      equation: `${total} − ${extraRed} = ${equalPartsTotal}`,
    },
    {
      text: `Count the green buttons as one part. Blue has ${factor} parts, and the red buttons left also make ${factor} parts.`,
      equation: `${factor} + ${factor} + 1 = ${parts} parts`,
    },
    {
      text: 'Find the number of buttons in one part.',
      equation: `${equalPartsTotal} ÷ ${parts} = ${green}`,
    },
    {
      text: `Find the number in all ${factor} blue parts.`,
      equation: `${green} × ${factor} = ${blue}`,
    },
  ];

  return {
    key,
    context: [
      `A craft shop has ${total} buttons. Each button is red, blue or green.`,
      `There are ${extraRed} more red buttons than blue buttons.`,
      `There are ${factor} times as many blue buttons as green buttons.`,
    ],
    prompt: 'How many blue buttons are there? On paper, show your equations and write your answer in a sentence.',
    answer: String(blue),
    unit: 'buttons',
    hint: 'Think of the green buttons as one part. If you set the extra red buttons aside, how many parts will each colour have?',
    workedSteps,
    explanation: [...workedSteps.map(step => `${step.text} ${step.equation}.`), conclusion].join(' '),
  };
}
