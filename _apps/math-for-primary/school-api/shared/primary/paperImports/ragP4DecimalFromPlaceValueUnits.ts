import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-decimal-from-place-value-units',
  level: 4,
  title: 'Make a decimal from its parts',
  objective: 'Use counts of place-value units to write a decimal, regrouping or rounding to tenths when needed.',
  skillIds: ['P4.S.DEC.01', 'P4.S.DEC.04'],
  canonicalPatternId: 'p4-decimal-from-place-value-units',
};

type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) >>> 0) + (index >>> 0)) % 9;

  function question(prompt: string, answer: string, hint: string, workedSteps: Step[]): Question {
    return {
      key, prompt, answer, hint, workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    };
  }

  if (slot < 5) {
    const places = rng.int(1, 3);
    const unit = ['tenth', 'hundredth', 'thousandth'][places - 1];
    const unitsPerWhole = 10 ** places;
    const count = rng.pick([2, 3, 4, 5, 6, 7, 9, 13, 16, 19, 21, 24, 27, 32, 36]);
    const answer = (count / unitsPerWhole).toFixed(places);
    return question(
      `What decimal has the same value as ${count} ${unit}s?`, answer,
      `Think about how many ${unit}s make one whole. Use zeros to hold any empty places.`,
      [
        { text: `One whole contains ${unitsPerWhole} ${unit}s.`, equation: `1 ${unit} = ${(1 / unitsPerWhole).toFixed(places)}` },
        { text: `Write the value of all ${count} ${unit}s.`, equation: `${count} ÷ ${unitsPerWhole} = ${answer}` },
      ],
    );
  }

  if (slot === 8) {
    const ones = rng.int(2, 8);
    const tenths = rng.pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9]);
    const hundredths = rng.int(1, 9);
    const assembled = `${ones}.${tenths}${hundredths}`;
    const totalHundredths = 100 * ones + 10 * tenths + hundredths;
    const roundedTenths = Math.floor((totalHundredths + 5) / 10);
    const answer = (roundedTenths / 10).toFixed(1);
    const roundingStep = hundredths < 5 ? 'Keep the tenths digit.' : 'Round up by one tenth.';
    const carry = hundredths >= 5 && tenths === 9 ? ' Ten tenths make one whole.' : '';
    return question(
      `Build a number using only these digits. Put ${hundredths} in the hundredths place, ${ones} in the ones place and ${tenths} in the tenths place. What is the number rounded to the nearest tenth?`,
      answer, 'Write the number first. Look one place to the right of the tenths digit to decide how to round.',
      [
        { text: 'Put each digit in its place.', equation: `${ones} + ${(tenths / 10).toFixed(1)} + ${(hundredths / 100).toFixed(2)} = ${assembled}` },
        { text: `The hundredths digit is ${hundredths}. ${roundingStep}${carry}`, equation: `${assembled} ≈ ${answer}` },
      ],
    );
  }

  const includeThousandths = slot === 7;
  const tenths = rng.int(14, 39);
  const hundredths = includeThousandths ? rng.int(13, 29) : rng.pick([2, 3, 4, 5, 6, 8, 9]);
  const thousandths = includeThousandths ? rng.pick([2, 3, 4, 6, 7, 8, 9]) : 0;
  const totalHundredths = tenths * 10 + hundredths;
  const subtotal = (totalHundredths / 100).toFixed(2);
  const steps = [
    { text: 'Each tenth is worth ten hundredths.', equation: `${tenths} tenths = ${tenths * 10} hundredths` },
    { text: 'Combine the hundredths and write their value as a decimal.', equation: `${tenths * 10} + ${hundredths} = ${totalHundredths} hundredths = ${subtotal}`.replace(`${tenths * 10} + ${hundredths}`, `${tenths * 10} hundredths + ${hundredths} hundredths`) },
  ];
  let givens = `${tenths} tenths and ${hundredths} hundredths`;
  let answer = subtotal;
  if (includeThousandths) {
    givens = `${tenths} tenths, ${hundredths} hundredths and ${thousandths} thousandths`;
    answer = ((totalHundredths * 10 + thousandths) / 1000).toFixed(3);
    steps.push({ text: 'Add the thousandths in the third decimal place.', equation: `${subtotal} + ${(thousandths / 1000).toFixed(3)} = ${answer}` });
  }
  return question(`Put ${givens} together. Write their total as a decimal.`, answer,
    'Start by changing the tenths into hundredths so you can count them together.', steps);
}
