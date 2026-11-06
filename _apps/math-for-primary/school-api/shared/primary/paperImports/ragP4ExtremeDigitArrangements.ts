import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-extreme-digit-arrangements',
  level: 4,
  title: 'Choose the last digit',
  objective: 'Choose a possible last digit, then use place value to build the largest or smallest number that fits the rule.',
  skillIds: ['P4.S.WN.01', 'P2.S.WN.06', 'P4.S.FACT.03'],
  canonicalPatternId: 'p4-extreme-digit-arrangements-by-units-digit',
};

const variants = [
  { size: 'smallest', target: 'even number' },
  { size: 'largest', target: 'odd number' },
  { size: 'largest', target: 'even number' },
  { size: 'largest', target: 'multiple of 5' },
] as const;
type Target = (typeof variants)[number]['target'];
const endingRules = {
  'even number': { digits: [0, 2, 4, 6, 8], clue: 'An even number ends in 0, 2, 4, 6 or 8.' },
  'odd number': { digits: [1, 3, 5, 7, 9], clue: 'An odd number ends in 1, 3, 5, 7 or 9.' },
  'multiple of 5': { digits: [0, 5], clue: 'A multiple of 5 ends in 0 or 5.' },
};

function deal(r: Rng, target: Target, length: number): number[] {
  let cards: number[];
  if (target === 'odd number') {
    const odd = r.pick([1, 7]);
    cards = [0, odd, r.pick([1, 3, 5, 7, 9].filter(d => d !== odd))];
  } else if (target === 'even number') {
    cards = [6, r.pick([0, 2, 4, 8]), r.pick([1, 3, 5, 7, 9])];
  } else {
    cards = [5, r.pick([1, 6, 7])];
    if (r.chance(0.5)) cards.push(0);
  }
  const unused = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !cards.includes(d)));
  return r.shuffle([...cards, ...unused.slice(0, length - cards.length)]);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) + index) % 4 + 4) % 4;
  const { size, target } = variants[slot];
  const length = target === 'multiple of 5' ? 4 : r.int(4, 5);
  const cards = deal(r, target, length);
  const rule = endingRules[target];
  const endings = rule.digits.filter(d => cards.includes(d));
  const smallest = size === 'smallest';
  const attempts = endings.map(end => {
    const front = cards.filter(d => d !== end).sort((a, b) => smallest ? a - b : b - a);
    if (front[0] === 0) {
      const first = front.findIndex(d => d !== 0);
      front.unshift(front.splice(first, 1)[0]);
    }
    return { end, value: Number([...front, end].join('')) };
  });
  const values = attempts.map(a => a.value);
  const answer = String(smallest ? Math.min(...values) : Math.max(...values));
  const shown = cards.join('') === answer ? [...cards.slice(1), cards[0]] : cards;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: `${rule.clue} Possible last digits from these cards: ${endings.join(', ')}.` },
    { text: smallest
      ? 'Try each possible ending. Put the smallest unused digit other than 0 first. Fill the spaces in between from smallest to largest.'
      : 'Try each possible ending. Fill the places before it from left to right, using the largest unused digit each time.',
      equation: attempts.map(a => `Ending in ${a.end}: ${a.value}`).join('; ') },
    { text: attempts.length === 1
      ? `Only ${endings[0]} can go last, so ${answer} is the ${size} number you can make.`
      : `Compare the numbers from the left. ${answer} is the ${size}.` },
  ];
  return {
    key,
    context: ['Each card shows one digit. Use every card once. The first digit cannot be 0.'],
    display: shown.join(', '),
    prompt: `What is the ${size} ${length}-digit ${target} you can make?`,
    answer,
    hint: 'Which cards could go last? Try keeping one of them for the end before you fill the other places.',
    workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}
