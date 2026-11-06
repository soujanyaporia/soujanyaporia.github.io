import { Rng, hashString } from '../../engine/random';
import type { Picture, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-written-arithmetic-digits',
  level: 2 as const,
  title: 'Find the hidden digits',
  objective: 'Use place value and regrouping to recover digits in three-digit addition and subtraction.',
  skillIds: ['P2.S.AS.01', 'P2.S.WN.02'],
  canonicalPatternId: 'p2-missing-digits-in-written-arithmetic',
};

const digits = (n: number) => String(n).split('').map(Number);

function placeTable(operation: '+' | '−', rows: (number | null)[][]): Picture {
  const labels = operation === '+' ? ['Start', '+ Add', '= Total'] : ['Start', '− Take away', '= Difference'];
  return {
    type: 'nanyang-p4', layout: 'table', rowHeader: 'Working',
    caption: operation === '+' ? 'Written addition' : 'Written subtraction',
    columns: ['Hundreds', 'Tens', 'Ones'],
    rows: rows.map((values, i) => ({ label: labels[i], values })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = (hashString(String(seed)) % 3 + index % 3 + 3) % 3;
  const finish = (question: Omit<Question, 'key' | 'explanation'> & {
    workedSteps: NonNullable<Question['workedSteps']>;
  }): Question => ({
    ...question, key,
    explanation: question.workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 2) {
    const hundreds = rng.int(5, 9), ones = rng.int(2, 8);
    const lowerHundreds = rng.int(1, hundreds - 2), lowerTens = rng.int(1, 9);
    const lowerOnes = rng.int(1, ones);
    const start = hundreds * 100 + ones;
    const taken = lowerHundreds * 100 + lowerTens * 10 + lowerOnes;
    const [leftHundreds, leftTens, leftOnes] = digits(start - taken);
    return finish({
      prompt: 'What digits go in the two spaces?',
      picture: placeTable('−', [digits(start), [lowerHundreds, null, lowerOnes], [null, leftTens, leftOnes]]),
      structuredResponse: { kind: 'number-pair', firstLabel: 'Tens in the second row', secondLabel: 'Hundreds in the answer row' },
      answer: JSON.stringify([String(lowerTens), String(leftHundreds)]),
      hint: 'Start with the ones. How can you take away tens when the top row has zero tens?',
      workedSteps: [
        { text: 'Subtract the ones. They need no exchange.', equation: `${ones} − ${lowerOnes} = ${leftOnes}` },
        { text: `Exchange 1 hundred for 10 tens. There are ${leftTens} tens left, so find how many tens were taken away.`, equation: `10 − ${leftTens} = ${lowerTens}` },
        { text: `There are now ${hundreds - 1} hundreds on top. Subtract the hundreds in the second row.`, equation: `${hundreds - 1} − ${lowerHundreds} = ${leftHundreds}` },
        { text: 'Put both digits back and check.', equation: `${start} − ${taken} = ${start - taken}` },
      ],
    });
  }

  const letters = variant === 1;
  const hundreds = rng.int(3, 5), lowerHundreds = rng.int(1, 8 - hundreds);
  const ones = rng.int(2, 8);
  const lowerOnes = letters ? 10 - ones : rng.int(10 - ones, 9);
  const lowerTens = rng.int(4, 8);
  const tens = rng.pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    digit => digit + lowerTens + 1 >= 10 && (!letters || digit !== lowerOnes),
  ));
  const first = hundreds * 100 + tens * 10 + ones;
  const second = lowerHundreds * 100 + lowerTens * 10 + lowerOnes;
  const sum = first + second;
  const total = digits(sum);
  const check = { text: 'Check the addition with all the digits in place.', equation: `${first} + ${second} = ${sum}` };

  if (letters) {
    return finish({
      prompt: 'Which digit goes in space A?',
      context: ['A and B stand for different digits.'],
      picture: { type: 'missing-column', operation: '+', top: [hundreds, 'A', ones], bottom: [lowerHundreds, lowerTens, 'B'], total, target: 'A' },
      answer: String(tens),
      hint: 'Use the ones to find B first. Remember the new ten when you work out A.',
      workedSteps: [
        { text: 'The ones add to 10 because the sum ends in 0 and the top ones digit is greater than 0. Find B and carry 1 ten.', equation: `B = 10 − ${ones} = ${lowerOnes}` },
        { text: `The sum has ${total[0]} hundreds. The two hundreds digits add to ${hundreds + lowerHundreds}, so 1 hundred came from the tens.`, equation: `${hundreds} + ${lowerHundreds} + 1 = ${total[0]}` },
        { text: `The tens made ${10 + total[1]} tens. Take away the ${lowerTens} tens in the second row and the 1 carried ten to find A.`, equation: `A = ${10 + total[1]} − ${lowerTens} − 1 = ${tens}` },
        check,
      ],
    });
  }

  return finish({
    prompt: 'Which digit is missing from the ones column?',
    picture: placeTable('+', [digits(first), [lowerHundreds, lowerTens, null], total]),
    answer: String(lowerOnes),
    hint: 'Take the first number away from the total to find the second number.',
    workedSteps: [
      { text: 'Work backwards from the total to find the whole second number.', equation: `${sum} − ${first} = ${second}` },
      { text: `The last digit of ${second} is ${lowerOnes}. Put it in the ones column.` },
      check,
    ],
  });
}
