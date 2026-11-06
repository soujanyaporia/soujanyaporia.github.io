import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-extreme-digit-cards',
  level: 3,
  title: 'Build a four-digit number from cards',
  objective: 'Choose digits by place value to make the smallest number or the greatest number within two limits.',
  skillIds: ['P3.S.WN.01', 'P3.S.WN.03'],
  canonicalPatternId: 'p3-extreme-numeral-from-digit-cards',
} as const;

function chooseBounds(cards: number[], r: Rng) {
  const positive = cards.filter(d => d > 0).sort((a, b) => a - b);
  // There are at least three positive cards. Keep two possible starts and
  // at least one larger card that would put the numeral over the upper limit.
  const edge = r.int(2, positive.length - 1);
  return {
    lower: 1000 * r.int(1, positive[edge - 2]),
    upper: 1000 * positive[edge],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['smallest-choice', 'smallest-entry', 'greatest-pick-four', 'greatest-use-all']);
  const count = form === 'greatest-pick-four' ? 5 : 4;
  const anchor = r.pick([0, 7]);
  const otherDigits = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== anchor));
  const cards = r.shuffle([anchor, ...otherDigits.slice(0, count - 1)]);
  const bounds = form.startsWith('greatest') ? chooseBounds(cards, r) : undefined;
  const preferred = [...cards].sort((a, b) => bounds ? b - a : a - b);
  // Any three distinct remaining digits give a suffix strictly between 0 and 1000.
  const first = preferred.find(d => d > 0 && (!bounds || (1000 * d >= bounds.lower && 1000 * d < bounds.upper)));
  if (first === undefined) throw new Error('The cards need a valid thousands digit.');
  const remaining = preferred.filter(d => d !== first);
  const [hundreds, tens, ones] = remaining;
  const numeral = (h: number, t: number, o: number) => `${first}${h}${t}${o}`;
  const answer = numeral(hundreds, tens, ones);
  if (cards.slice(0, 4).join('') === answer) {
    [cards[0], cards[1]] = [cards[1], cards[0]];
  }

  const context = [count === 5 ? 'Pick four of the five cards. Use each chosen card once.' : 'Use all four cards once each.'];
  if (bounds) context.push(`Your number must be greater than ${bounds.lower} and less than ${bounds.upper}.`);
  if (form !== 'smallest-choice') context.push('Show your working on paper, then enter your number.');

  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: bounds
      ? `Start with ${first}. It is the largest card you can put in the thousands place and still stay below ${bounds.upper}.`
      : `Put ${first}, the smallest nonzero card, in the thousands place.${cards.includes(0) ? ' Starting with 0 would give fewer than four digits.' : ''}` },
    { text: `Fill the hundreds, tens and ones places in turn. Each time, take the ${bounds ? 'largest' : 'smallest'} card left. This gives ${hundreds}, then ${tens}, then ${ones}.`,
      equation: `${first * 1000} + ${hundreds * 100} + ${tens * 10} + ${ones} = ${answer}` },
  ];
  if (bounds) {
    workedSteps.push({
      text: count === 5 ? `Leave the ${remaining[3]} card out. Check the number against both limits.` : 'You have used every card. Check the number against both limits.',
      equation: `${bounds.lower} < ${answer} < ${bounds.upper}`,
    });
  }

  const question: Question = {
    key, context, answer, workedSteps,
    prompt: `What is the ${bounds ? 'greatest' : 'smallest'} four-digit number you can build?`,
    picture: { type: 'paper', layout: 'cards', heading: 'Digit cards',
      cards: cards.map((digit, i) => ({ label: `Card ${i + 1}`, value: String(digit), icon: 'number' })) },
    hint: bounds ? 'Look at the two limits. Which cards could go in the thousands place?' : 'Look at the thousands place first. Which card gives the smallest four-digit start?',
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
  if (form === 'smallest-choice') {
    question.choices = r.shuffle([answer, numeral(hundreds, ones, tens), numeral(tens, hundreds, ones), numeral(tens, ones, hundreds)]);
  }
  return question;
}
