import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-complete-tens-or-hundreds',
  level: 3,
  title: 'Count complete tens or hundreds',
  objective: 'Count all the full groups of ten or one hundred in a number, including a number found by adding or dividing.',
  skillIds: ['P3.S.WN.01', 'P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'complete-tens-or-hundreds',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['number', 'number', 'number', 'number', 'quotient', 'sum']);
  const unit = form === 'sum' ? 'hundreds' : 'tens';
  const size = unit === 'hundreds' ? 100 : 10;
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let display: string;
  let value: number;
  let prompt: string;
  let hint: string;

  if (form === 'quotient') {
    const divisor = rng.int(2, 9);
    const tensInShare = rng.int(10, Math.floor(999 / (10 * divisor)));
    value = tensInShare * 10;
    const dividend = value * divisor;
    display = `${dividend} ÷ ${divisor}`;
    prompt = 'Work out the division. How many complete tens are in the result?';
    hint = 'Find the quotient first. Then see how many groups of ten it contains.';
    workedSteps.push({ text: 'Find the quotient.', equation: `${display} = ${value}` });
  } else if (form === 'sum') {
    const hundredsInTotal = rng.int(32, 99);
    value = hundredsInTotal * 100;
    // Split the total into two four-digit addends that require regrouping.
    const first = rng.int(10, hundredsInTotal - 11) * 100 + 2 * rng.int(0, 49) + 1;
    const second = value - first;
    display = `${first} + ${second}`;
    prompt = 'Add the two numbers. How many complete hundreds are in the total?';
    hint = 'Add first so that any tens that make another hundred are counted.';
    workedSteps.push({ text: 'Find the total.', equation: `${display} = ${value}` });
  } else {
    value = 10 * rng.int(10, 99) + rng.pick([1, 3, 5, 7, 9]);
    display = String(value);
    prompt = 'How many complete tens can you make from this number?';
    hint = 'Each hundred gives you ten tens. Count those tens too, and set aside any extra ones.';
  }

  const count = Math.floor(value / size);
  const grouped = count * size;
  const leftover = value - grouped;
  if (leftover > 0) {
    workedSteps.push({
      text: `Set aside the last ${leftover === 1 ? 'one' : `${leftover} ones`}.`,
      equation: `${value} = ${grouped} + ${leftover}`,
    });
  }
  workedSteps.push({ text: `There are ${count} complete ${unit}.`, equation: `${grouped} ÷ ${size} = ${count}` });

  return {
    key, display, prompt, unit, hint, workedSteps,
    answer: String(count),
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    ...(form === 'number' ? {
      choices: rng.shuffle([count, count % 10, grouped, count + 1].map(String)),
    } : {}),
  };
}
