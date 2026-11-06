import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-simultaneous-remainders',
  level: 4,
  title: 'Two ways to arrange the tiles',
  objective: 'Find a total that fits two row sizes by checking the leftover tiles in each arrangement.',
  skillIds: ['P4.S.FACT.03', 'P4.S.MD.03'],
  canonicalPatternId: 'p4-simultaneous-remainder-conditions',
};

const rowSizes = [[4, 5], [5, 6], [5, 8], [8, 3], [9, 4], [4, 7]] as const;
const tileWord = (count: number) => count === 1 ? 'tile' : 'tiles';

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['exact', 'between', 'least'] as const);
  const [firstSize, secondSize] = rng.pick(rowSizes);

  // Each pair is coprime, so both remainders repeat together after one product.
  const period = firstSize * secondSize;
  const firstMatches: number[] = [];
  for (let n = 2 * Math.max(firstSize, secondSize); n < period; n++) {
    const firstFits = form === 'exact' ? n % firstSize === 0 : n % firstSize !== 0;
    if (firstFits && n % secondSize !== 0) firstMatches.push(n);
  }
  const firstMatch = rng.pick(firstMatches);
  // In the two-bound form a smaller match exists, so the lower bound matters.
  const total = form === 'between' ? firstMatch + period : firstMatch;
  const lower = form === 'between' ? total - rng.pick([period, firstSize + secondSize]) : 0;
  const stop = form === 'least' ? total + 1 : total + rng.int(Math.max(firstSize, secondSize) + 1, firstSize + secondSize);
  const firstRemainder = total % firstSize;
  const missing = firstSize - firstRemainder;
  const extra = total % secondSize;

  let opening = 'Nila has some tiles.';
  if (form === 'between') opening = `Nila has more than ${lower} tiles and fewer than ${stop} tiles.`;
  if (form === 'exact') opening = `Nila has fewer than ${stop} tiles.`;
  const context = [
    opening,
    form === 'exact'
      ? `She can lay out all her tiles in rows of ${firstSize} with every row full.`
      : `In rows of ${firstSize}, the last row needs ${missing} more ${tileWord(missing)} to be full.`,
    `She tries rows of ${secondSize} instead. After making all the full rows she can, she has ${extra} ${tileWord(extra)} left over.`,
  ];

  const candidates: number[] = [];
  for (let n = firstRemainder || firstSize; n < stop; n += firstSize) {
    if (n > lower) candidates.push(n);
  }
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (form !== 'exact') {
    workedSteps.push({
      text: `Take the empty places away from ${firstSize} to find how many tiles are in the last row.`,
      equation: `${firstSize} − ${missing} = ${firstRemainder}`,
    });
  }
  workedSteps.push({
    text: form === 'least'
      ? `Start with ${firstRemainder} and add ${firstSize} each time. Try these totals from smallest upwards until both clues fit.`
      : `List the totals allowed by the first row clue and the ${form === 'exact' ? 'upper limit' : 'two limits'}. Count up in steps of ${firstSize}.`,
    equation: candidates.join(', '),
  }, {
    text: `Make rows of ${secondSize} for each total in the list. The numbers left over, in the same order, are`,
    equation: candidates.map(n => n % secondSize).join(', '),
  }, {
    text: form === 'least'
      ? `(a) ${total} is the first total in the list with ${extra} ${tileWord(extra)} left over.`
      : `${total} is the only total in the list with ${extra} ${tileWord(extra)} left over.`,
    equation: `${Math.floor(total / secondSize)} × ${secondSize} + ${extra} = ${total}`,
  });
  const common = {
    key, context, workedSteps,
    hint: `List possible totals for rows of ${firstSize}. Try each total in rows of ${secondSize} and check what is left.`,
  };
  if (form === 'least') {
    const topUp = secondSize - extra;
    workedSteps.push({
      text: `(b) The ${extra} leftover ${tileWord(extra)} go into the last row. Work out how many places are still empty.`,
      equation: `${secondSize} − ${extra} = ${topUp}`,
    });
    return {
      ...common,
      prompt: `(a) What is the smallest number of tiles Nila could have? (b) With ${secondSize} tiles to a row, how many more tiles would fill the last row? Show your working on paper.`,
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Smallest total (tiles)', secondLabel: '(b) Tiles to add' },
      answer: JSON.stringify([String(total), String(topUp)]),
      explanation: `The smallest total that fits both clues is ${total} tiles. The last row needs ${topUp} more ${tileWord(topUp)} to make ${secondSize}.`,
    };
  }
  return {
    ...common,
    prompt: 'How many tiles does Nila have? Show your working on paper.',
    answer: String(total), unit: 'tiles',
    explanation: `Only ${total} tiles fit the limits and both row clues. Rows of ${firstSize} leave ${firstRemainder} over, and rows of ${secondSize} leave ${extra} over.`,
  };
}
