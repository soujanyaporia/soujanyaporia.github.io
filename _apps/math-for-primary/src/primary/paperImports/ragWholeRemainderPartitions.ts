import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p6-whole-remainder-partitions',
  level: 6 as const,
  title: 'Whole shares and the remainder',
  objective: 'Find category shares from fractions or percentages, split a remainder, and use the shares to form a ratio or recover a total.',
  skillIds: ['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.03', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-whole-remainder-partitions',
};

type Colour = 'red' | 'blue' | 'yellow';
type Shares = Record<Colour, number>;
const ORDERS: Colour[][] = [
  ['red', 'blue', 'yellow'], ['red', 'yellow', 'blue'],
  ['blue', 'red', 'yellow'], ['blue', 'yellow', 'red'],
  ['yellow', 'red', 'blue'], ['yellow', 'blue', 'red'],
];
const WHOLE_PAIRS: [number, number, number, number][] = [
  [1, 3, 1, 6], [1, 5, 3, 10], [2, 7, 1, 3], [1, 6, 3, 8],
  [3, 8, 1, 5], [1, 3, 2, 9], [3, 10, 1, 6], [1, 8, 1, 3],
];
const SPLITS: [number, number][] = [[2, 3], [3, 4], [2, 5], [4, 5], [3, 5], [5, 6]];
const DIFFERENCE_CASES: [number, number, number, number][] = [
  [1, 2, 2, 3], [3, 5, 3, 2], [2, 3, 4, 5], [3, 7, 4, 3],
  [5, 8, 2, 3], [3, 4, 5, 2], [1, 3, 5, 2], [4, 9, 5, 3],
];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function simplify(parts: number[]): number[] {
  const divisor = parts.reduce((a, b) => gcd(a, b));
  return parts.map(n => n / divisor);
}
function ratio(parts: number[]): string {
  return simplify(parts).join(' : ');
}
function fraction(n: number, d: number): string {
  const divisor = gcd(n, d);
  return d === divisor ? String(n / divisor) : `${n / divisor}/${d / divisor}`;
}
function ratioPrompt(order: Colour[]): string {
  return `What is the ratio of ${order[0]} buttons to ${order[1]} buttons to ${order[2]} buttons? Give the ratio in simplest whole-number form.`;
}
function orderedStep(shares: Shares, order: Colour[]): string {
  const parts = order.map(colour => shares[colour]);
  const divisor = parts.reduce((a, b) => gcd(a, b));
  const instruction = divisor === 1
    ? 'There is no common factor greater than 1.'
    : `Divide all three terms by ${divisor}.`;
  return `In the requested order, ${order.join(' : ')} = ${parts.join(' : ')}. ${instruction} The simplest ratio is ${ratio(parts)}.`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;
  const order = r.pick(ORDERS);
  const opening = 'A craft box contains only red, blue and yellow buttons.';
  const make = (
    context: string[], prompt: string, answer: string, hint: string,
    steps: string[], extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint,
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
    ...extra,
  });

  if (variant === 0) {
    const [a, b, c, d] = r.pick(WHOLE_PAIRS);
    const denominator = b * d;
    const red = a * d;
    const blue = c * b;
    const yellow = denominator - red - blue;
    const shares: Shares = {red, blue, yellow};
    const parts = order.map(colour => shares[colour]);
    const answer = ratio(parts);
    const missedBlue: Shares = {...shares, yellow: denominator - red};
    const addedShares: Shares = {...shares, yellow: red + blue};
    const options = [...new Set([
      answer,
      ratio(order.map(colour => missedBlue[colour])),
      ratio(order.map(colour => addedShares[colour])),
      ratio([parts[1], parts[0], parts[2]]),
      ratio([parts[0], parts[2], parts[1]]),
      ratio([parts[2], parts[1], parts[0]]),
    ])].slice(0, 4);
    return make(
      [opening, `${a}/${b} of all the buttons are red.`, `${c}/${d} of all the buttons are blue. The rest are yellow.`],
      ratioPrompt(order), answer,
      'Both fractions describe the whole box. Find the fraction left for yellow buttons, then compare all three shares using one denominator.',
      [
        `Use denominator ${denominator}: red = ${red}/${denominator} and blue = ${blue}/${denominator}.`,
        `Yellow = 1 − ${red}/${denominator} − ${blue}/${denominator} = ${yellow}/${denominator}.`,
        `With the same denominator, red : blue : yellow = ${red} : ${blue} : ${yellow}.`,
        orderedStep(shares, order),
      ],
      {choices: r.shuffle(options)},
    );
  }

  if (variant === 1) {
    const percent = r.pick([15, 20, 25, 30, 35, 45, 55, 60]);
    const [b, c] = r.pick(SPLITS);
    const remaining = 100 - percent;
    const splitUnits = b + c;
    const denominator = 100 * splitUnits;
    const shares: Shares = {
      red: percent * splitUnits,
      blue: remaining * b,
      yellow: remaining * c,
    };
    const parts = simplify(order.map(colour => shares[colour]));
    return make(
      [opening, `${percent}% of all the buttons are red. The rest are blue or yellow.`, `Among the remaining buttons, blue : yellow = ${b} : ${c}.`],
      `${ratioPrompt(order)} Enter one term in each labelled box.`,
      JSON.stringify(parts.map(String)),
      'Find the percentage left after the red buttons. Split that remainder into the blue and yellow ratio units.',
      [
        `Blue and yellow together make up 100% − ${percent}% = ${remaining}% of the box.`,
        `Their ratio has ${b} + ${c} = ${splitUnits} units. Blue is ${b}/${splitUnits} of the remainder; yellow is ${c}/${splitUnits} of the remainder.`,
        `As shares of the whole, red = ${percent}/100, blue = ${remaining}/100 × ${b}/${splitUnits} = ${fraction(shares.blue, denominator)}, and yellow = ${remaining}/100 × ${c}/${splitUnits} = ${fraction(shares.yellow, denominator)}.`,
        `Using denominator ${denominator}, red : blue : yellow = ${shares.red} : ${shares.blue} : ${shares.yellow}.`,
        orderedStep(shares, order),
      ],
      {structuredResponse: {
        kind: 'number-fields',
        fields: order.map(colour => ({label: `${colour[0].toUpperCase()}${colour.slice(1)} buttons`})),
      }},
    );
  }

  const [n, d, b, c] = r.pick(DIFFERENCE_CASES);
  const splitUnits = b + c;
  const denominator = d * splitUnits;
  const [red, blue, yellow] = simplify([n * splitUnits, (d - n) * b, (d - n) * c]);
  const totalUnits = red + blue + yellow;
  const differenceUnits = red - yellow;
  const valueOfUnit = 3 * r.int(1, 8);
  const difference = differenceUnits * valueOfUnit;
  const total = totalUnits * valueOfUnit;
  const options = [...new Set([
    String(total), String(difference), String(red * valueOfUnit),
    String((blue + yellow) * valueOfUnit), String(total + difference),
  ])].slice(0, 4);
  return make(
    [opening, `${n}/${d} of all the buttons are red. The rest are blue or yellow.`, `Among the remaining buttons, blue : yellow = ${b} : ${c}.`, `There are ${difference} more red buttons than yellow buttons.`],
    'How many buttons are in the box altogether?', String(total),
    'Express all three groups in common ratio units. Match the difference between red and yellow units to the given difference.',
    [
      `The blue and yellow buttons together are 1 − ${n}/${d} = ${d - n}/${d} of the whole.`,
      `Blue is ${d - n}/${d} × ${b}/${splitUnits} = ${fraction((d - n) * b, denominator)} of the whole. Yellow is ${d - n}/${d} × ${c}/${splitUnits} = ${fraction((d - n) * c, denominator)} of the whole.`,
      `Putting all shares over a common denominator and simplifying gives red : blue : yellow = ${red} : ${blue} : ${yellow}.`,
      `The difference is ${red} − ${yellow} = ${differenceUnits} units, so 1 unit = ${difference} ÷ ${differenceUnits} = ${valueOfUnit} buttons.`,
      `There are ${red} + ${blue} + ${yellow} = ${totalUnits} units altogether. Total = ${totalUnits} × ${valueOfUnit} = ${total} buttons.`,
    ],
    {unit: 'buttons', choices: r.shuffle(options)},
  );
}
