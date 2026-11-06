import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-extreme-numeral',
  level: 2,
  title: 'Build the smallest or greatest number',
  objective: 'Choose digit cards for the hundreds, tens and ones places to make the smallest or greatest possible three-digit number.',
  skillIds: ['P2.S.WN.02', 'P2.S.WN.04'],
  canonicalPatternId: 'extreme-numeral-under-digit-constraints',
};

type Goal = 'greatest' | 'smallest';

function buildNumber(cards: number[], goal: Goal) {
  const remaining = [...cards].sort((a, b) => goal === 'smallest' ? a - b : b - a);
  const firstAllowed = remaining.findIndex(digit => digit > 0);
  const [hundreds] = remaining.splice(firstAllowed, 1);
  const [tens, ones, spare] = remaining;
  const value = `${hundreds}${tens}${ones}`;
  const zeroRule = goal === 'smallest' && cards.includes(0)
    ? ' Starting with 0 would leave fewer than three digits.' : '';
  const unused = spare === undefined ? '' : ` Leave the ${spare} card out.`;
  const steps = [
    { text: `For the ${goal} number, put ${hundreds} in the hundreds place. It is the ${goal} digit that can go first.${zeroRule}` },
    { text: `Of the cards left, ${tens} is the ${goal}, so use it for the tens. Then choose ${ones} for the ones.${unused}`, equation: `${hundreds * 100} + ${tens * 10} + ${ones} = ${value}` },
  ];
  return { goal, value, steps };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['choose-three', 'use-all', 'both'] as const);
  const paired = form === 'both';

  // One fresh digit in every deal keeps the card sets different from the examples.
  const fresh = rng.pick([1, 3, 5, 8]);
  const otherDigits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(digit => digit !== fresh));
  const cards = [fresh, ...otherDigits.slice(0, 2)];
  if (form !== 'use-all') cards.push(0);
  const shown = rng.shuffle(cards);

  const goals: Goal[] = paired ? ['greatest', 'smallest'] : ['smallest'];
  const results = goals.map(goal => buildNumber(shown, goal));
  const context = form === 'use-all'
    ? ['Use all three cards, once each. Show on paper how you chose their places.']
    : ['Choose three of the four cards. Use each chosen card once per number.'];
  if (paired) context.push('Keep each number between 100 and 1000. Put the cards back before making the second number.');

  return {
    key,
    prompt: paired
      ? 'What are the greatest and smallest three-digit numbers you can build?'
      : 'What is the smallest three-digit number you can build?',
    context,
    display: shown.join(', '),
    answer: paired ? JSON.stringify(results.map(result => result.value)) : results[0].value,
    ...(paired ? { structuredResponse: { kind: 'number-pair' as const, firstLabel: '(a) Greatest number', secondLabel: '(b) Smallest number' } } : {}),
    hint: 'Which card belongs in the hundreds place? Start there, then look at the cards left for the tens place.',
    workedSteps: results.flatMap(result => result.steps),
    explanation: ['The hundreds digit matters most. If two numbers have the same hundreds digit, compare their tens digits next.', ...results.map(result => `The ${result.goal} number is ${result.value}.`)].join(' '),
  };
}
