import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p3-parity-list',
  level: 3 as const,
  title: 'Choose odd and even numbers from a list',
  objective: 'Use the ones digit to select numbers, compare them, and add selected values when asked.',
  skillIds: ['P2.S.WN.06', 'P3.S.WN.03', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-parity-selection-from-list',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = rng.pick(['least-even', 'least-even', 'only-odd', 'sum']);
  const firstTen = task === 'sum' ? rng.int(20, 34) : rng.int(206, 455);
  const offsets = rng.shuffle(Array.from({ length: 15 }, (_, i) => i))
    .slice(0, 4).sort((a, b) => a - b);

  // For the least-even task, the smallest option is odd, so comparing all four without filtering gives a different answer.
  const parities = task === 'least-even' ? [1, ...rng.shuffle([0, 0, 1])]
    : rng.shuffle(task === 'only-odd' ? [1, 0, 0, 0] : [1, 1, 0, 0]);
  const ascending = offsets.map((offset, i) =>
    10 * (firstTen + offset) + 2 * rng.int(0, 4) + parities[i]);
  const evens = ascending.filter(value => value % 2 === 0);
  const odds = ascending.filter(value => value % 2 === 1);
  const list = rng.shuffle(ascending).map(String);

  function question(prompt: string, answer: number, hint: string,
    workedSteps: NonNullable<Question['workedSteps']>, response: Pick<Question, 'choices' | 'display' | 'proof'>): Question {
    return {
      key, prompt, answer: String(answer), hint, workedSteps, ...response,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (task === 'only-odd') {
    const odd = odds[0];
    return question('Pick the odd number.', odd,
      'An odd number ends in 1, 3, 5, 7 or 9.', [
        { text: `Read the ones digits in order: ${list.map(value => value.slice(-1)).join(', ')}.` },
        { text: `Only ${odd} has an odd ones digit. It ends in ${odd % 10}.` },
      ], { choices: list });
  }

  const [smallEven, largeEven] = evens;
  const evenStep = { text: `The numbers ending in 0, 2, 4, 6 or 8 are ${smallEven} and ${largeEven}.` };
  if (task === 'least-even') {
    return question('Choose the smaller of the even numbers.', smallEven,
      'Look at each ones digit first. Then compare the even numbers.', [
        evenStep,
        { text: `Choose ${smallEven} because it is smaller.`, equation: `${smallEven} < ${largeEven}` },
      ], { choices: list });
  }

  const [smallOdd, largeOdd] = odds;
  const total = largeOdd + smallEven;
  return question('Find the largest odd number and the smallest even number in this list. What do they add up to?', total,
    'Find the odd numbers and compare them. Do the same with the even numbers before adding.', [
      { text: `The odd numbers are ${smallOdd} and ${largeOdd}. Keep ${largeOdd}.`, equation: `${smallOdd} < ${largeOdd}` },
      { text: `${evenStep.text} Keep ${smallEven}.`, equation: `${smallEven} < ${largeEven}` },
      { text: 'Add the two numbers you kept.', equation: `${largeOdd} + ${smallEven} = ${total}` },
    ], { display: list.join(', '), proof: { op: '+', a: largeOdd, b: smallEven } });
}
