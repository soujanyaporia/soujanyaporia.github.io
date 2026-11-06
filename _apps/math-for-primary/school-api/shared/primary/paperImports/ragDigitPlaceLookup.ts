import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-digit-place-lookup',
  level: 2,
  title: 'Find the digit or its place',
  objective: 'Read a digit in a named place, or name the place of a given digit.',
  skillIds: ['P2.S.WN.02'],
  canonicalPatternId: 'digit-place-and-value',
};

const places = ['hundreds', 'tens', 'ones'];
const positions = ['third from the right', 'second from the right', 'first from the right'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const askForPlace = (hashString(String(seed)) + index) % 2 === 0;
  const column = rng.int(0, 2);
  let display: string;
  let digit: string;
  do {
    display = String(rng.int(100, 999));
    digit = display.charAt(column);
  } while (['251', '403', '916'].includes(display) ||
    (askForPlace && display.indexOf(digit) !== display.lastIndexOf(digit)));

  const place = places[column];
  const position = positions[column];
  const workedSteps = askForPlace ? [
    { text: `Find ${digit} in ${display}. It is ${position}.` },
    { text: `Count from the right: ones, tens, hundreds. This puts ${digit} in the ${place} place.` },
  ] : [
    { text: `Start at the right. The ${place} place is ${position}.` },
    { text: `Read the digit at that spot in ${display}: it is ${digit}.` },
  ];
  return {
    key, display,
    prompt: askForPlace ? `Which place is the digit ${digit} in?` : `Look at the ${place} place. Which digit is there?`,
    answer: askForPlace ? place : digit,
    ...(askForPlace ? { choices: rng.shuffle([...places, 'thousands']) } : {}),
    hint: 'Start with the ones place on the right. Each step left takes you to the next place.',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
