import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-unit-conversion',
  level: 5,
  title: 'Convert metric measurements',
  objective: 'Convert between compound and single metric units, using decimals or whole units and a remainder.',
  skillIds: ['P5.S.DEC.02'],
  canonicalPatternId: 'unit-conversion',
};

const UNIT_PAIRS = [
  {large: 'km', small: 'm', largeName: 'kilometres', smallName: 'metres', factor: 1000},
  {large: 'kg', small: 'g', largeName: 'kilograms', smallName: 'grams', factor: 1000},
  {large: 'm', small: 'cm', largeName: 'metres', smallName: 'centimetres', factor: 100},
  {large: 'L', small: 'ml', largeName: 'litres', smallName: 'millilitres', factor: 1000},
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const start = (hashString(`${RAG_PATTERN.id}:variant:${seed}`) >>> 0) % 3;
  const offset = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = (start + offset) % 3;
  const pair = r.pick(UNIT_PAIRS);
  const whole = r.int(4, 49);
  let remainder = r.pick([1, pair.factor - 1, r.int(1, pair.factor - 1)]);

  if (variant === 1) {
    // Require hundredths or thousandths, beyond the existing tenths-only range.
    if (pair.factor === 100) {
      remainder = 10 * r.int(0, 9) + r.int(1, 9);
    } else if (r.chance(0.5)) {
      remainder = (10 * r.int(0, 9) + r.int(1, 9)) * 10;
    } else {
      remainder = 10 * r.int(0, 99) + r.int(1, 9);
    }
  }

  const total = whole * pair.factor + remainder;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const relation = `1 ${pair.large} = ${pair.factor} ${pair.small}.`;

  if (variant === 0) {
    const steps = [
      relation,
      `Change the ${pair.largeName} part: ${whole} × ${pair.factor} = ${whole * pair.factor} ${pair.small}.`,
      `Add the remaining ${pair.smallName}: ${whole * pair.factor} + ${remainder} = ${total} ${pair.small}.`,
    ];
    return {
      key,
      context: [`The measurement is ${whole} ${pair.large} ${remainder} ${pair.small}.`],
      prompt: `Which number gives this measurement in ${pair.smallName}?`,
      answer: String(total),
      choices: r.shuffle([
        String(total),
        String(whole + remainder),
        String(whole * (pair.factor / 10) + remainder),
        String(whole * pair.factor + remainder * 10),
      ]),
      unit: pair.small,
      hint: 'Change the larger-unit part to smaller units first. Then add the smaller-unit part.',
      workedSteps: steps.map(text => ({text})),
      explanation: steps.join(' '),
      proof: {op: '+', a: {op: '*', a: whole, b: pair.factor}, b: remainder},
    };
  }

  if (variant === 1) {
    const answer = (total / pair.factor).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    const steps = [
      relation,
      `Divide by ${pair.factor} to change ${pair.smallName} to ${pair.largeName}: ${total} ÷ ${pair.factor} = ${answer} ${pair.large}.`,
    ];
    return {
      key,
      context: [`The measurement is ${total} ${pair.small}.`],
      prompt: `Write this measurement in ${pair.largeName}. Give your answer as a decimal.`,
      answer,
      unit: pair.large,
      hint: `Use ${pair.factor} ${pair.small} for each ${pair.large}. Keep any zeros needed after the decimal point.`,
      workedSteps: steps.map(text => ({text})),
      explanation: steps.join(' '),
      proof: {op: '/', a: total, b: pair.factor},
    };
  }

  const steps = [
    relation,
    `${whole} × ${pair.factor} = ${whole * pair.factor}, so there are ${whole} whole ${pair.largeName}.`,
    `The remainder is ${total} − ${whole * pair.factor} = ${remainder} ${pair.small}.`,
    `${total} ${pair.small} = ${whole} ${pair.large} ${remainder} ${pair.small}.`,
  ];
  return {
    key,
    context: [`The measurement is ${total} ${pair.small}.`],
    prompt: `Write this measurement in ${pair.largeName} and ${pair.smallName}. Use whole numbers, with fewer than ${pair.factor} ${pair.smallName} in the second box.`,
    answer: JSON.stringify([String(whole), String(remainder)]),
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: pair.large,
      secondLabel: pair.small,
    },
    hint: 'Find how many complete larger units fit. Put the leftover smaller units in the second box.',
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
  };
}
