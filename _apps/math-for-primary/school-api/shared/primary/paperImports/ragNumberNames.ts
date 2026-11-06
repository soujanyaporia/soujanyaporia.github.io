import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-words-to-numeral',
  level: 2,
  title: 'Read a number in words',
  objective: 'Write or choose the three-digit numeral for a number given in words.',
  skillIds: ['P2.S.WN.03'],
  canonicalPatternId: 'number-names',
};

const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const decades = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function nameBelowHundred(value: number): string {
  if (value < 20) return small[value];
  const decade = decades[Math.floor(value / 10)];
  const ones = value % 10;
  return ones === 0 ? decade : `${decade}-${small[ones]}`;
}

function numeralChoices(r: Rng, hundreds: number, tens: number, ones: number): string[] {
  const tail = 10 * tens + ones;
  const whole = 100 * hundreds + tail;
  const alternatives = [
    100 * hundreds + 10 * ones + tens,
    100 * hundreds + ones,
    tail,
    100 * hundreds + 10 * tens,
    10 * hundreds + ones,
    hundreds,
    hundreds === 9 ? whole - 100 : whole + 100,
  ];
  const wrong = [...new Set(alternatives)].filter(n => n > 0 && n !== whole);
  return r.shuffle([whole, ...wrong.slice(0, 3)]).map(String);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const tail = r.pick([
    r.int(11, 19),
    10 * r.int(2, 9) + r.int(1, 9),
    r.int(1, 9),
    10 * r.int(1, 9),
    0,
  ]);
  const sourceValues = [513, 713, 628];
  const hundreds = r.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(h => !sourceValues.includes(100 * h + tail)));
  const tens = Math.floor(tail / 10);
  const ones = tail % 10;
  const value = 100 * hundreds + tail;
  const head = `${small[hundreds]} hundred`;
  const tailName = nameBelowHundred(tail);
  const display = tail === 0 ? head : `${head} and ${tailName}`;
  const choice = r.chance(0.5);
  const expanded = `${hundreds * 100} + ${tens * 10} + ${ones} = ${value}`;
  const workedSteps = [
    { text: `“${head}” tells us to write ${hundreds} in the hundreds place.`, equation: `${hundreds} × 100 = ${hundreds * 100}` },
    { text: tail === 0 ? 'The name ends at hundred. Write 0 in both the tens place and the ones place.' : `“${tailName}” gives ${tens} in the tens place and ${ones} in the ones place.` },
    { text: 'Put the digits in order from hundreds to ones.', equation: expanded },
  ];
  return {
    key,
    prompt: choice ? 'Which number matches these words?' : 'Write this number using digits.',
    display,
    answer: String(value),
    ...(choice ? { choices: numeralChoices(r, hundreds, tens, ones) } : {}),
    hint: 'Find the hundreds first. Then listen for tens and ones. Use 0 for an empty place.',
    explanation: `The digits are ${hundreds}, ${tens} and ${ones}, in that order. ${expanded}.`,
    workedSteps,
    proof: { op: '+', a: hundreds * 100, b: tail },
  };
}
