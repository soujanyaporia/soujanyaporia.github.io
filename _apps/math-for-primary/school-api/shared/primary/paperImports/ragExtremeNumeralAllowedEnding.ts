import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-extreme-numeral-allowed-ending',
  level: 3,
  title: 'Build a four-digit number',
  objective: 'Compare possible last digits to build the smallest or greatest number that meets a rule.',
  skillIds: ['P3.S.WN.01', 'P3.S.WN.03', 'P2.S.WN.06'],
  canonicalPatternId: 'extreme-numeral-with-an-allowed-ending',
};

const forms = ['greatestOdd', 'smallestEven', 'smallestFive', 'greatestEvenFromFive'] as const;
type Form = typeof forms[number];

function drawCards(r: Rng, form: Form): number[] {
  const even = r.shuffle([2, 4, 6, 8]);
  const odd = r.shuffle([1, 3, 5, 7, 9]);
  const otherOdd = odd.find(digit => digit !== 5)!;
  switch (form) {
    case 'smallestEven':
      return [0, even[0], even[1], otherOdd];
    case 'smallestFive':
      return [0, 5, otherOdd, even[0]];
    case 'greatestOdd':
      return [...odd.slice(0, 2), ...r.shuffle([0, ...even]).slice(0, 2)];
    case 'greatestEvenFromFive':
      return [8, ...even.filter(digit => digit !== 8).slice(0, 2), ...odd.slice(0, 2)];
  }
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(forms);
  const cards = r.shuffle(drawCards(r, form));
  const greatest = form === 'greatestOdd' || form === 'greatestEvenFromFive';
  const aim = greatest ? 'greatest' : 'smallest';
  const multipleOfFive = form === 'smallestFive';
  const odd = form === 'greatestOdd';
  const target = multipleOfFive ? 'multiple of 5' : odd ? 'odd number' : 'even number';
  const rule = multipleOfFive ? 'A multiple of 5 ends in 0 or 5.' : odd ? 'An odd number ends in 1, 3, 5, 7 or 9.' : 'An even number ends in 0, 2, 4, 6 or 8.';
  const endings = cards.filter(digit => multipleOfFive ? digit % 5 === 0 : digit % 2 === (odd ? 1 : 0)).sort((a, b) => a - b);

  const candidates = endings.map(last => {
    const rest = cards.filter(digit => digit !== last).sort((a, b) => greatest ? b - a : a - b);
    const [first] = rest.splice(rest.findIndex(digit => digit > 0), 1);
    const prefix = [first, ...rest.slice(0, 2)];
    const value = Number([...prefix, last].join(''));
    return { last, prefix, value, unused: rest[2] };
  });
  const ranked = candidates.map(candidate => candidate.value).sort((a, b) => a - b);
  const answer = greatest ? ranked[ranked.length - 1] : ranked[0];
  const workedSteps = [
    { text: `${rule} From these cards, ${endings.join(' or ')} can go last.` },
    { text: `Try each ending. Choose the ${aim} nonzero digit left for the thousands place. For the hundreds and then the tens, choose the ${aim} digit left each time.` },
    ...candidates.map(({ last, prefix, value, unused }) => ({
      text: `With ${last} last, the first three digits are ${prefix.join(', ')}. This makes ${value}.${unused === undefined ? '' : ` Leave out ${unused}.`}`,
    })),
    { text: `Compare from the thousands place. The ${aim} number is ${answer}.`, equation: ranked.join(' < ') },
  ];
  return {
    key,
    prompt: `Which is the ${aim} four-digit ${target} you can build?`,
    context: [cards.length === 5 ? 'Pick four of the five digit cards. Use each chosen card once.' : 'Use all four digit cards, once each.'],
    display: cards.join(', '),
    answer: String(answer),
    hint: 'Which cards could go last? Set one aside for that place and try arranging the other cards.',
    workedSteps,
    explanation: `${rule} The ${aim} number for each possible ending is shown in the working. Comparing them gives ${ranked.join(' < ')}, so the ${aim} is ${answer}.`,
  };
}
