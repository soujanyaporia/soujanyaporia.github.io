import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-named-place-value-changes',
  level: 3 as const,
  title: 'Count in tens, hundreds and thousands',
  objective: 'Use place-value units to find a new number or count the jumps between two numbers.',
  skillIds: ['P3.S.WN.01', 'P3.S.AS.01'],
  canonicalPatternId: 'changes-in-named-place-value-units',
};

const forms = ['increase', 'one-less', 'count', 'mixed-sum'] as const;
const units = [
  { single: 'ten', plural: 'tens', value: 10, min: 21, max: 48 },
  { single: 'hundred', plural: 'hundreds', value: 100, min: 2, max: 18 },
  { single: 'thousand', plural: 'thousands', value: 1000, min: 2, max: 5 },
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = forms[((seed + index) >>> 0) % forms.length];

  if (form === 'mixed-sum') {
    const start = rng.int(201, 275) * 10;
    const thousands = rng.int(2, 5);
    const tens = rng.int(14, 29);
    const largeJump = thousands * 1000;
    const smallJump = tens * 10;
    const total = start + largeJump + smallJump;
    const choices = [total, start + largeJump, start + largeJump + tens, largeJump + smallJump];
    return {
      key,
      prompt: `Start at ${start}. Add ${thousands} thousands and ${tens} tens. Which number do you reach?`,
      answer: String(total),
      choices: rng.shuffle(choices.map(String)),
      hint: 'Work out what each group is worth. Remember to include the starting number.',
      explanation: `The two jumps add ${largeJump} and ${smallJump} to ${start}, giving ${total}.`,
      workedSteps: [
        { text: 'Find the value of the thousands.', equation: `${thousands} × 1000 = ${largeJump}` },
        { text: 'Find the value of the tens.', equation: `${tens} × 10 = ${smallJump}` },
        { text: 'Add both values to the starting number.', equation: `${start} + ${largeJump} + ${smallJump} = ${total}` },
      ],
    };
  }

  const unit = rng.pick(units);
  if (form === 'one-less') {
    const start = rng.int(1000 + unit.value, 9999);
    const end = start - unit.value;
    return {
      key,
      prompt: `Which number is one ${unit.single} less than ${start}?`,
      answer: String(end),
      hint: `Think about the value of one ${unit.single}. Count back by that amount.`,
      explanation: `One jump back from ${start} takes away ${unit.value}, leaving ${end}.`,
      workedSteps: [
        { text: 'Write the size of one jump in ones.', equation: `1 ${unit.single} = ${unit.value} ones` },
        { text: 'Subtract that jump from the given number.', equation: `${start} − ${unit.value} = ${end}` },
      ],
    };
  }

  const jumps = rng.int(unit.min, unit.max);
  const change = jumps * unit.value;
  const maxStart = 9999 - change;
  if (form === 'count') {
    const start = 1000 * rng.int(1, Math.floor(maxStart / 1000));
    const end = start + change;
    return {
      key,
      prompt: `How many ${unit.plural} must you add to ${start} to reach ${end}?`,
      answer: String(jumps),
      unit: unit.plural,
      hint: `Find the difference first. How many groups of ${unit.value} fit in it?`,
      explanation: `The gap is ${change}. It takes ${jumps} jumps of ${unit.value} to cover it.`,
      workedSteps: [
        { text: 'Subtract the starting number to find the size of the gap.', equation: `${end} − ${start} = ${change}` },
        { text: `Count the ${unit.plural} in the gap.`, equation: `${change} ÷ ${unit.value} = ${jumps}` },
      ],
    };
  }

  const start = rng.int(1000, maxStart);
  const end = start + change;
  return {
    key,
    prompt: `Begin at ${start} and count on ${jumps} ${unit.plural}. Where do you finish?`,
    answer: String(end),
    hint: `Each jump adds ${unit.value}. Find the size of all the jumps together.`,
    explanation: `Counting on ${jumps} ${unit.plural} adds ${change} to ${start}, so you finish at ${end}.`,
    workedSteps: [
      { text: 'Find how much the number increases.', equation: `${jumps} × ${unit.value} = ${change}` },
      { text: 'Add the increase to the starting number.', equation: `${start} + ${change} = ${end}` },
    ],
  };
}
