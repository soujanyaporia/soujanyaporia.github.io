import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-missing-entries-in-related-sums',
  level: 2 as const,
  title: 'Missing numbers in related sums',
  objective: 'Use equal totals, repeated shapes or place-value columns to find one missing number.',
  skillIds: ['P2.S.AS.01', 'P2.S.MD.01', 'P2.S.MD.02', 'P2.S.WN.02'],
  canonicalPatternId: 'p2-missing-entries-in-related-sums',
};

type Puzzle = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & {
  workedSteps: NonNullable<Question['workedSteps']>;
};

function equalSums(rng: Rng): Puzzle {
  const roundHundred = 100 * rng.int(3, 8);
  const first = roundHundred + rng.int(1, 9);
  const second = rng.int(23, 64);
  const total = first + second;
  const missing = total - roundHundred;
  return {
    prompt: 'Which number makes both sides equal?',
    display: `${first} + ${second} = ${roundHundred} + □`,
    answer: String(missing),
    hint: 'Work out the total on the left. The right side must reach that total too.',
    workedSteps: [
      { text: 'Add the two numbers on the left.', equation: `${first} + ${second} = ${total}` },
      { text: `Take away the ${roundHundred} already on the right.`, equation: `${total} − ${roundHundred} = ${missing}` },
      { text: 'Check the total on the right.', equation: `${roundHundred} + ${missing} = ${total}` },
    ],
  };
}

function shapeClues(rng: Rng): Puzzle {
  const star = rng.pick([2, 3, 4, 10]);
  const circle = rng.int(6, 9);
  const gap = rng.int(12, 27);
  const triangle = gap + circle;
  const threeStars = 3 * star;
  const product = circle * star;
  return {
    prompt: 'What do the two triangles add up to?',
    context: [
      'Each star (★), circle (●) or triangle (▲) stands for a number. A shape keeps its value in every line.',
      `★ + ★ + ★ = ${threeStars}`,
      `● × ★ = ${product}`,
      `▲ − ● = ${gap}`,
    ],
    display: '▲ + ▲ = ?',
    answer: String(triangle + triangle),
    hint: 'Start with the three equal stars. Use the value of one star in the next clue.',
    workedSteps: [
      { text: 'Share the first total equally among the three stars.', equation: `${threeStars} ÷ 3 = ${star}` },
      { text: 'Divide the product by the star to find the circle.', equation: `${product} ÷ ${star} = ${circle}` },
      { text: 'Add the circle back to find the triangle.', equation: `${gap} + ${circle} = ${triangle}` },
      { text: 'Add the two triangles.', equation: `${triangle} + ${triangle} = ${triangle + triangle}` },
    ],
  };
}

function sharedDigit(rng: Rng): Puzzle {
  const digit = rng.int(1, 7);
  const topHundreds = rng.int(1, 8 - digit);
  const topOnes = rng.int(4, 8);
  const bottomOnes = rng.int(10 - topOnes, 9);
  const bottomTens = rng.int(9 - digit, 9);
  const top = 100 * topHundreds + 10 * digit + topOnes;
  const bottom = 100 * digit + 10 * bottomTens + bottomOnes;
  const total = top + bottom;
  const totalDigits = String(total).split('').map(Number);
  const knownTens = bottomTens + 1;
  const tensToMake = 10 + totalDigits[1];
  return {
    prompt: 'Which digit belongs in both spaces?',
    context: ['Both question marks stand for the same digit.'],
    picture: {
      type: 'nanyang-p4', layout: 'table', caption: 'Written addition', rowHeader: 'Row',
      columns: ['Hundreds', 'Tens', 'Ones'],
      rows: [
        { label: 'First number', values: [topHundreds, null, topOnes] },
        { label: '+ Second number', values: [null, bottomTens, bottomOnes] },
        { label: '= Total', values: totalDigits },
      ],
    },
    answer: String(digit),
    hint: 'Add the ones first. Remember the extra ten when you look at the middle column.',
    workedSteps: [
      { text: 'The ones make a new ten. Carry it to the tens column.', equation: `${topOnes} + ${bottomOnes} = ${topOnes + bottomOnes}` },
      { text: `Count the tens we know. Since ${knownTens} is greater than the tens digit ${totalDigits[1]} in the total, the tens made a new hundred.`, equation: `${bottomTens} + 1 = ${knownTens}` },
      { text: `The tens must add up to ${tensToMake}. Find the missing digit.`, equation: `${tensToMake} − ${knownTens} = ${digit}` },
      { text: `Put ${digit} in both spaces and check the sum.`, equation: `${top} + ${bottom} = ${total}` },
    ],
  };
}

const variants = [equalSums, shapeClues, sharedDigit];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const count = variants.length;
  const offset = hashString(String(seed)) % count;
  const slot = (offset + index % count + count) % count;
  const puzzle = variants[slot](new Rng(hashString(key)));
  const explanation = puzzle.workedSteps.map(s => [s.text, s.equation].join(' ')).join(' ');
  return { ...puzzle, key, explanation };
}
