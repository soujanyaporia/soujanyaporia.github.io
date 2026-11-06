import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-select-addends-for-a-target',
  level: 1,
  title: 'Choose numbers for a total',
  objective: 'Choose three cards for a given total or match each number with its partner for that total.',
  skillIds: ['P1.S.AS.03', 'P1.S.AS.06', 'P1.S.AS.07'],
  canonicalPatternId: 'p1-select-addends-for-a-target',
};

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function threeCards(rng: Rng, key: string): Question {
  const highCard = rng.int(7, 9);
  const otherCards = rng.shuffle(digits.filter(n => n !== highCard)).slice(0, 4);
  const cards = rng.shuffle([highCard, ...otherCards]);
  const byTotal = new Map<number, number[][]>();

  for (let i = 0; i < cards.length - 2; i++) {
    for (let j = i + 1; j < cards.length - 1; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        const total = cards[i] + cards[j] + cards[k];
        if (total > 20) continue;
        const triples = byTotal.get(total) ?? [];
        triples.push([cards[i], cards[j], cards[k]]);
        byTotal.set(total, triples);
      }
    }
  }

  // The three smallest cards always have a unique total, at most 5 + 6 + 7.
  const unique = [...byTotal.values()].filter(triples => triples.length === 1);
  const [first, second, third] = rng.pick(unique)[0];
  const partial = first + second;
  const target = partial + third;
  return {
    key,
    prompt: `Which three cards have a total of ${target}?`,
    display: cards.join('   ·   '),
    context: ['Pick three different cards. Write their numbers from left to right as you see them in the row.'],
    structuredResponse: {
      kind: 'number-fields',
      fields: [{ label: 'First card' }, { label: 'Second card' }, { label: 'Third card' }],
    },
    answer: JSON.stringify([first, second, third].map(String)),
    hint: 'Try two cards. How much more do you need? Look for that number on a card you have not used yet.',
    explanation: `${first} and ${second} make ${partial}. The card showing ${third} brings the total to ${target}.`,
    workedSteps: [
      { text: `Try the cards showing ${first} and ${second}.`, equation: `${first} + ${second} = ${partial}` },
      { text: `Find how much more you need. There is a ${third} card left to use.`, equation: `${target} − ${partial} = ${third}` },
      { text: 'Check the total of the three cards.', equation: `${first} + ${second} + ${third} = ${target}` },
    ],
  };
}

function matchPartners(rng: Rng, key: string): Question {
  const target = rng.int(8, 12);
  const smallParts = digits.filter(n => n < target - n && target - n <= 9);
  const firstSmall = rng.pick(smallParts.slice(0, 2));
  const secondSmall = rng.pick(smallParts.filter(n => n !== firstSmall));
  const starts = rng.shuffle([firstSmall, secondSmall].map(n => rng.chance(0.5) ? n : target - n));
  const partners = starts.map(n => target - n);
  const offered = rng.shuffle([...partners]);
  return {
    key,
    prompt: `Find a partner for each start number so that each pair adds up to ${target}.`,
    context: [`Start numbers: ${starts.join(', ')}`, `Partner numbers: ${offered.join(', ')}`, 'Use each partner once.'],
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: `Partner for ${starts[0]}`,
      secondLabel: `Partner for ${starts[1]}`,
    },
    answer: JSON.stringify(partners.map(String)),
    hint: 'Take a start number away from the total. Look for the answer among the partner numbers.',
    explanation: `${starts[0]} + ${partners[0]} and ${starts[1]} + ${partners[1]} both make ${target}. Each partner is used once.`,
    workedSteps: starts.map((start, i) => ({
      text: `Find how much to add to ${start}. Its partner is ${partners[i]}.`,
      equation: `${target} − ${start} = ${partners[i]}`,
    })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  return rng.int(0, 2) === 0 ? matchPartners(rng, key) : threeCards(rng, key);
}
