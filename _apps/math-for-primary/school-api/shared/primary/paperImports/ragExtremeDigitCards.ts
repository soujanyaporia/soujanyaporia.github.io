import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-extreme-digit-cards',
  level: 2 as const,
  title: 'Build a number from digit cards',
  objective: 'Choose three different cards and compare arrangements with an odd or even last digit to find the smallest or largest number.',
  skillIds: ['P2.S.WN.04', 'P2.S.WN.06'],
  canonicalPatternId: 'p2-extreme-odd-or-even-numeral-from-cards',
};

const goals = ['smallest-even', 'smallest-odd', 'smallest-even', 'largest-odd'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const goal = goals[((hashString(String(seed)) + index) >>> 0) % goals.length];
  const greatest = goal === 'largest-odd';
  const extreme = greatest ? 'largest' : 'smallest';
  const even = goal === 'smallest-even';
  const parity = even ? 'even' : 'odd';
  const count = goal === 'smallest-odd' ? 4 : 3;
  const evenCount = even ? rng.int(1, 2) : count - 2;
  const evens = rng.shuffle([0, 2, 4, 6, 8]).slice(0, evenCount);
  const odds = rng.shuffle([1, 5, 7]).slice(0, count - evenCount);
  const cards = rng.shuffle([...evens, ...odds]);

  const endings = even ? evens : odds;
  const bestForEachEnding = endings.map(ones => {
    const remaining = cards.filter(digit => digit !== ones)
      .sort((a, b) => greatest ? b - a : a - b);
    // With the ending reserved, choose the best hundreds digit before the tens.
    const hundreds = remaining.find(digit => digit > 0)!;
    const tens = remaining.find(digit => digit !== hundreds)!;
    return { ones, hundreds, tens, value: 100 * hundreds + 10 * tens + ones };
  });
  const values = bestForEachEnding.map(trial => trial.value).sort((a, b) => a - b);
  const answer = greatest ? values[values.length - 1] : values[0];
  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: `An ${parity} number ends in an ${parity} digit. Here ${endings.join(' or ')} can go last.` },
    ...bestForEachEnding.map(({ ones, hundreds, tens, value }) => ({
      text: `Save ${ones} for last. Put ${hundreds} first because it is the ${extreme} digit left above zero. Then put ${tens}, the ${extreme} remaining digit, in the tens place.`,
      equation: `${hundreds} × 100 + ${tens} × 10 + ${ones} = ${value}`,
    })),
    values.length === 1
      ? { text: `There is only one possible ending. With that ending, ${answer} is the ${extreme} number we can make.` }
      : { text: `Compare the best number for each ending. The ${extreme} is ${answer}.`, equation: values.join(' < ') },
  ];

  return {
    key,
    prompt: `Build a three-digit ${parity} number. What is the ${extreme} one you can make?`,
    context: [count === 4 ? 'Pick three of the four cards.' : 'Use all three cards.', 'Use each chosen card once. The first digit must be greater than zero.'],
    picture: { type: 'paper', layout: 'cards', heading: 'Digit cards', cards: cards.map((digit, i) => ({ label: `Card ${i + 1}`, value: String(digit), icon: 'number' })) },
    answer: String(answer),
    hint: `Try each ${parity} card in the ones place. For each ending, which card should go in the hundreds place?`,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
