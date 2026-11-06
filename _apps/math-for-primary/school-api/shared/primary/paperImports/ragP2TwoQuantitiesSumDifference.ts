import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-two-quantities-sum-difference',
  level: 2 as const,
  title: 'Find the two amounts',
  objective: 'Use a difference to find a larger count, or use a sum and a difference to find two missing digits.',
  skillIds: ['P2.S.AS.01', 'P2.S.MD.02', 'P2.S.WN.02'],
  canonicalPatternId: 'p2-two-quantities-sum-and-difference',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = ((Math.trunc(seed + index) % 3) + 3) % 3;
  function make(context: string[], prompt: string, answer: string, hint: string, workedSteps: Steps, labels?: [string, string]): Question {
    return {
      key, context, prompt, answer, hint, workedSteps,
      explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
      ...(labels ? { structuredResponse: { kind: 'number-pair' as const, firstLabel: labels[0], secondLabel: labels[1] } } : {}),
    };
  }

  if (form === 0) {
    const blue = rng.int(8, 24), extra = rng.int(3, 17);
    const red = blue + extra, total = blue + red, equalTotal = total - extra;
    return make(
      [`There are ${total} buttons altogether in a blue tin and a red tin.`, `The red tin holds ${extra} more buttons than the blue tin.`],
      '(a) How many buttons are in the blue tin? (b) How many are in the red tin?',
      JSON.stringify([String(blue), String(red)]),
      'Imagine taking just the extra buttons out of the red tin. How would the two tins compare?',
      [
        { text: 'Set aside the extra red-tin buttons. The two tins now hold the same number.', equation: `${total} − ${extra} = ${equalTotal}` },
        { text: 'Half of the buttons left are in the blue tin.', equation: `${equalTotal} ÷ 2 = ${blue}` },
        { text: 'Put the extra buttons back to find how many were in the red tin.', equation: `${blue} + ${extra} = ${red}` },
      ], ['(a) Blue tin (buttons)', '(b) Red tin (buttons)'],
    );
  }

  if (form === 1) {
    const friday = rng.int(115, 245), more = rng.int(21, 37), fewer = rng.int(6, 19);
    const saturday = friday + more, sunday = saturday - fewer;
    return make(
      [`A bakery sold ${friday} buns on Friday.`, `On Saturday it sold ${more} more buns than on Friday.`],
      `(a) How many buns did the bakery sell on Saturday? (b) It sold ${fewer} fewer buns on Sunday than on Saturday. How many buns did it sell on Sunday?`,
      JSON.stringify([String(saturday), String(sunday)]),
      'Start with Friday’s count. For the second part, start with Saturday’s count.',
      [
        { text: 'Add the extra buns sold on Saturday to Friday’s count.', equation: `${friday} + ${more} = ${saturday}` },
        { text: 'The shop sold fewer buns on Sunday, so take that many away from Saturday’s count.', equation: `${saturday} − ${fewer} = ${sunday}` },
      ], ['(a) Saturday (buns)', '(b) Sunday (buns)'],
    );
  }

  const hundreds = rng.pick([1, 2, 3, 4, 5, 7, 8, 9]);
  const gap = rng.pick([1, 3, 4, 5]);
  const ones = rng.int(0, 9 - gap), tens = ones + gap, sum = tens + ones;
  const numeral = 100 * hundreds + 10 * tens + ones;
  return make(
    [`My hundreds digit is ${hundreds}.`, `My tens digit and my ones digit add up to ${sum}.`, `My ones digit is ${gap} less than my tens digit.`],
    'What is my three-digit number?', String(numeral),
    'Take the extra part of the tens digit away from the sum. What two equal parts are left?',
    [
      { text: 'Take away the difference. What is left is twice the ones digit.', equation: `${sum} − ${gap} = ${2 * ones}` },
      { text: 'Halve what is left to find the ones digit.', equation: `${2 * ones} ÷ 2 = ${ones}` },
      { text: 'Add the difference to find the tens digit.', equation: `${ones} + ${gap} = ${tens}` },
      { text: `Use ${hundreds} hundreds, ${tens} tens and ${ones} ones.`, equation: `${100 * hundreds} + ${10 * tens} + ${ones} = ${numeral}` },
    ],
  );
}
