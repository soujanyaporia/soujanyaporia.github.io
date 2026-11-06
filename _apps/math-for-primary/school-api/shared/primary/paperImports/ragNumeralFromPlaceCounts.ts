import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-numeral-from-place-counts',
  level: 2,
  title: 'Build a number from its place counts',
  objective: 'Use hundreds, tens and ones to choose a numeral, exchanging groups of ten when needed.',
  skillIds: ['P2.S.WN.02'],
  canonicalPatternId: 'numeral-from-place-counts',
};

function placeCount(count: number, place: 'hundred' | 'ten' | 'one'): string {
  return `${count} ${place}${count === 1 ? '' : 's'}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['hundreds-tens', 'hundreds-ones', 'all-places', 'exchange-ones']);
  const hundreds = form === 'exchange-ones' && rng.chance(0.5) ? 0 : rng.int(2, 7);
  const tensLimit = form === 'hundreds-tens' ? 19 : 6;
  const tens = form === 'hundreds-ones' ? 0 : rng.int(2, tensLimit);
  let ones = 0;
  if (form === 'exchange-ones') {
    ones = 10 * rng.int(1, 2) + rng.pick([0, 1, 2, 3, 5, 6, 8, 9]);
  } else if (form !== 'hundreds-tens') {
    ones = rng.int(1, 9);
  }

  const groups = [];
  if (hundreds) groups.push(placeCount(hundreds, 'hundred'));
  if (tens) groups.push(placeCount(tens, 'ten'));
  if (ones) groups.push(placeCount(ones, 'one'));
  const description = `${groups.slice(0, -1).join(', ')} and ${groups[groups.length - 1]}`;

  const newTens = Math.floor(ones / 10);
  const remainingOnes = ones % 10;
  const combinedTens = tens + newTens;
  const newHundreds = Math.floor(combinedTens / 10);
  const remainingTens = combinedTens % 10;
  const combinedHundreds = hundreds + newHundreds;
  const total = 100 * combinedHundreds + 10 * remainingTens + remainingOnes;
  const steps: NonNullable<Question['workedSteps']> = [];

  if (newTens) {
    steps.push({
      text: 'Make a ten from each group of 10 ones.',
      equation: `${placeCount(ones, 'one')} = ${placeCount(newTens, 'ten')} and ${placeCount(remainingOnes, 'one')}`,
    }, {
      text: 'Add the new tens to the tens you already have.',
      equation: `${placeCount(tens, 'ten')} + ${placeCount(newTens, 'ten')} = ${placeCount(combinedTens, 'ten')}`,
    });
  }
  if (newHundreds) {
    steps.push({
      text: 'Exchange 10 tens for a hundred.',
      equation: `${placeCount(combinedTens, 'ten')} = ${placeCount(newHundreds, 'hundred')} and ${placeCount(remainingTens, 'ten')}`,
    }, {
      text: 'Count the hundreds together.',
      equation: `${placeCount(hundreds, 'hundred')} + ${placeCount(newHundreds, 'hundred')} = ${placeCount(combinedHundreds, 'hundred')}`,
    });
  }
  if (!newTens && !newHundreds) {
    steps.push({ text: 'Find the value of the hundreds.', equation: `${placeCount(hundreds, 'hundred')} = ${hundreds * 100}` });
    if (tens) steps.push({ text: 'Count the tens in tens.', equation: `${placeCount(tens, 'ten')} = ${tens * 10}` });
  }
  if (!tens) steps.push({ text: 'There are no tens. Write 0 in the tens place.' });
  if (!ones) steps.push({ text: 'There are no ones. Write 0 in the ones place.' });
  const values = combinedHundreds ? [100 * combinedHundreds, 10 * remainingTens, remainingOnes] : [10 * remainingTens, remainingOnes];
  steps.push({ text: 'Add the place values to get the number.', equation: `${values.join(' + ')} = ${total}` });

  // Include errors such as losing a carried ten or closing up an empty place.
  const alternatives = [
    100 * hundreds + 10 * (tens % 10) + (ones % 10),
    tens ? 100 * hundreds + tens + ones : 10 * hundreds + ones,
    100 * hundreds + 10 * ones + tens,
    total - (ones || 10 * tens),
    total - 10,
    total + 10,
  ];
  const wrong = [...new Set(alternatives)].filter(n => n > 0 && n < 1000 && n !== total).slice(0, 3);
  return {
    key,
    prompt: `Which number do you get when you put ${description} together?`,
    answer: String(total),
    choices: rng.shuffle([total, ...wrong].map(String)),
    hint: 'Each hundred is worth 100 and each ten is worth 10. Look for groups of ten that you can exchange.',
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    proof: { op: '+', a: { op: '+', a: { op: '*', a: hundreds, b: 100 }, b: { op: '*', a: tens, b: 10 } }, b: ones },
  };
}
