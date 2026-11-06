import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-place-value-decomposition',
  level: 4,
  title: 'Build a number from place-value groups',
  objective: 'Combine thousands, hundreds and ones into a numeral, or choose equal groups that make a given number.',
  skillIds: ['P4.S.WN.01'],
  canonicalPatternId: 'p4-place-value-decomposition',
};

const units = [
  { name: 'ones', size: 1 },
  { name: 'tens', size: 10 },
  { name: 'hundreds', size: 100 },
  { name: 'thousands', size: 1000 },
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.int(1, 15);

  if (form === 15) {
    const count = rng.int(31, 94);
    const unit = rng.pick(units.slice(1));
    const total = count * unit.size;
    return {
      key,
      display: String(total),
      prompt: 'Which groups make the number shown?',
      choices: rng.shuffle(units.map(item => `${count} ${item.name}`)),
      answer: `${count} ${unit.name}`,
      hint: 'Each choice has the same number of groups. How much must one group be worth?',
      workedSteps: [
        { text: 'Share the total equally among the groups to find the value of one group.', equation: `${total} ÷ ${count} = ${unit.size}` },
        { text: `Check by counting in ${unit.name}.`, equation: `${count} × ${unit.size} = ${total}` },
      ],
      explanation: `Each group is worth ${unit.size}, so ${count} ${unit.name} make ${total}.`,
    };
  }

  const regroup = form > 7;
  const [hundredDigit, oneDigit] = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
  const thousands = regroup ? rng.int(14, 85) : rng.int(5, 9);
  const hundreds = regroup ? 10 + hundredDigit : hundredDigit;
  const ones = regroup ? 10 * rng.int(2, 4) + oneDigit : oneDigit;
  const total = thousands * 1000 + hundreds * 100 + ones;
  const base = {
    key,
    display: `${thousands} thousands, ${hundreds} hundreds and ${ones} ones`,
    answer: String(total),
  };

  if (regroup) {
    const tens = Math.floor(ones / 10);
    return {
      ...base,
      prompt: 'Show on paper how you regroup. Then enter the number in digits.',
      hint: 'Ten hundreds make a thousand. Ten ones make a ten.',
      workedSteps: [
        { text: 'Make another thousand from ten of the hundreds.', equation: `${hundreds} hundreds = 1 thousand + ${hundredDigit} hundreds` },
        { text: 'Make as many tens as you can from the ones.', equation: `${ones} ones = ${tens} tens + ${oneDigit} ones` },
        { text: `You now have ${thousands + 1} thousands. Add the values of all the places.`, equation: `${(thousands + 1) * 1000} + ${hundredDigit * 100} + ${tens * 10} + ${oneDigit} = ${total}` },
      ],
      explanation: `After regrouping, the number has ${thousands + 1} thousands, ${hundredDigit} hundreds, ${tens} tens and ${oneDigit} ones. This gives ${total}.`,
    };
  }

  return {
    ...base,
    prompt: 'Which numeral matches these groups?',
    choices: rng.shuffle([
      String(total),
      `${thousands}${hundreds}${ones}0`,
      `${thousands}0${hundreds}${ones}`,
      `${thousands}0${ones}${hundreds}`,
    ]),
    hint: 'Find the value of each group. Which place has no group?',
    workedSteps: [
      { text: 'Find the value of the thousands.', equation: `${thousands} × 1000 = ${thousands * 1000}` },
      { text: 'Find the value of the hundreds.', equation: `${hundreds} × 100 = ${hundreds * 100}` },
      { text: 'Add the ones. There are no tens, so the tens digit is zero.', equation: `${thousands * 1000} + ${hundreds * 100} + ${ones} = ${total}` },
    ],
    explanation: `The digits from left to right are ${thousands}, ${hundreds}, 0 and ${ones}, giving ${total}.`,
  };
}
