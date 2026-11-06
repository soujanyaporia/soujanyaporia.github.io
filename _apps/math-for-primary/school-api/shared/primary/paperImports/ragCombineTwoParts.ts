import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-combine-two-parts',
  level: 1,
  title: 'Find the total of two parts',
  objective: 'Find the two amounts to add and give their total as a number or a number name.',
  skillIds: ['P1.S.AS.01', 'P1.S.WN.01', 'P1.S.AS.08', 'P1.S.WN.03'],
  canonicalPatternId: 'combine-two-parts',
};

const tensNames = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const onesNames = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function nameFromTwentyToNinetyNine(n: number): string {
  const tens = tensNames[Math.floor(n / 10) - 2];
  const ones = onesNames[n % 10];
  return ones ? `${tens}-${ones}` : tens;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const start = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = (((start + index) % 3) + 3) % 3;

  if (variant === 0) {
    const inTub = rng.pick([3, 4, 7, 9]);
    const onMat = rng.int(2, 9);
    const total = inTub + onMat;
    return {
      key,
      context: [`There are ${inTub} counters in a tub. The picture shows the counters on a mat.`],
      picture: { type: 'counters', count: onMat },
      prompt: 'How many counters are in the tub and on the mat altogether?',
      answer: String(total),
      unit: 'counters',
      hint: 'Count each counter on the mat once. Add that count to the number in the tub.',
      workedSteps: [
        { text: `Count the counters on the mat. There are ${onMat}.` },
        { text: 'Add the tub count and the mat count.', equation: `${inTub} + ${onMat} = ${total}` },
      ],
      explanation: `The tub holds ${inTub} counters and the mat has ${onMat}. Together they make ${total} counters.`,
    };
  }

  if (variant === 1) {
    const colours = rng.shuffle(['red', 'blue', 'green', 'yellow']).slice(0, 3);
    const counts = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
    const piles = colours.map((colour, i) => ({ colour, count: counts[i] }));
    const [first, second] = rng.shuffle([...piles]);
    const total = first.count + second.count;
    return {
      key,
      context: piles.map(pile => `There are ${pile.count} ${pile.colour} buttons.`),
      prompt: `How many ${first.colour} and ${second.colour} buttons are there altogether?`,
      answer: String(total),
      unit: 'buttons',
      hint: 'Find the counts for the two colours in the question. Add just those counts.',
      workedSteps: [
        { text: `Pick out ${first.count} ${first.colour} buttons and ${second.count} ${second.colour} buttons.` },
        { text: 'Add those two piles.', equation: `${first.count} + ${second.count} = ${total}` },
      ],
      explanation: `Only the ${first.colour} and ${second.colour} piles belong in this total. Together they have ${total} buttons.`,
    };
  }

  const wholeTens = rng.pick([20, 40, 50]);
  const other = 10 * rng.int(2, 4) + rng.int(1, 9);
  const total = wholeTens + other;
  const answer = nameFromTwentyToNinetyNine(total);
  const jumps = Array.from({ length: wholeTens / 10 + 1 }, (_, i) => other + i * 10);
  return {
    key,
    display: `${wholeTens} + ${other}`,
    prompt: 'Which number name tells how much the two numbers make?',
    choices: rng.shuffle([total, wholeTens, other, total - 10].map(nameFromTwentyToNinetyNine)),
    answer,
    hint: 'Start at the number with ones. Count on in tens, then look for the name of the number you reach.',
    workedSteps: [
      { text: `Start at ${other} and count on ${wholeTens / 10} tens.`, equation: jumps.join(' → ') },
      { text: `Read ${total} as ${answer}.`, equation: `${wholeTens} + ${other} = ${total}` },
    ],
    explanation: `Adding ${wholeTens} to ${other} changes the tens and keeps the ones. The sum is ${total}, written ${answer}.`,
  };
}
