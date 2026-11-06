import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-measurement-ordering',
  level: 5,
  title: 'Order measurements',
  objective: 'Convert measurements to a common unit, then order them or find the smallest.',
  skillIds: ['P5.S.DEC.02', 'P5.S.FRAC.03', 'P4.S.DEC.02'],
  canonicalPatternId: 'p5-measurement-ordering',
} as const;

type Measurement = {label: string; value: number; conversion: string};

function volumeMeasurements(r: Rng, plainMillilitres: boolean): Measurement[] {
  const whole = r.pick([2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18]);
  const [numerator, denominator] = r.pick([
    [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
    [1, 8], [3, 8], [5, 8], [7, 8], [3, 10], [7, 10],
  ]);
  const fractionPart = numerator * (1000 / denominator);
  const decimalPart = r.pick([100, 200, 300, 400, 500, 600, 700, 800, 900]
    .filter(value => value !== fractionPart));
  const remainder = r.pick([7, 18, 35, 65, 85, 105, 205, 305, 405, 605, 805, 950]
    .filter(value => value !== fractionPart && value !== decimalPart));
  const compoundLabel = `${whole} L ${remainder} mL`;
  const fractionLabel = `${whole} ${numerator}/${denominator} L`;
  const measurements: Measurement[] = [
    {
      label: compoundLabel,
      value: whole * 1000 + remainder,
      conversion: `${compoundLabel} = ${whole} × 1000 + ${remainder} = ${whole * 1000 + remainder} mL`,
    },
    {
      label: fractionLabel,
      value: whole * 1000 + fractionPart,
      conversion: `${fractionLabel} = ${whole} × 1000 + ${numerator} × (1000 ÷ ${denominator}) = ${whole * 1000 + fractionPart} mL`,
    },
  ];
  if (plainMillilitres) {
    const value = (whole - r.int(0, 1)) * 1000 + decimalPart;
    measurements.push({label: `${value} mL`, value, conversion: `${value} mL = ${value} mL`});
  } else {
    const label = `${whole}.${decimalPart / 100} L`;
    const value = whole * 1000 + decimalPart;
    measurements.push({label, value, conversion: `${label} = ${whole}.${decimalPart / 100} × 1000 = ${value} mL`});
  }
  return measurements;
}

function lengthMeasurements(r: Rng): Measurement[] {
  const first = r.int(11, 29) * 10;
  const second = first + r.int(3, 12) * 20;
  const kilometreTenths = r.pick([12, 14, 16, 18, 22, 24, 26, 28, 32, 34, 36, 38]);
  const kilometres = (kilometreTenths / 10).toFixed(1);
  const [numerator, denominator] = r.pick([[1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]]);
  return [
    {label: `${first} m`, value: first * 100, conversion: `${first} m = ${first} × 100 = ${first * 100} cm`},
    {label: `${second} m`, value: second * 100, conversion: `${second} m = ${second} × 100 = ${second * 100} cm`},
    {
      label: `${kilometres} km`,
      value: kilometreTenths * 10000,
      conversion: `${kilometres} km = ${kilometres} × 1000 × 100 = ${kilometreTenths * 10000} cm`,
    },
    {
      label: `${numerator}/${denominator} m`,
      value: numerator * (100 / denominator),
      conversion: `${numerator}/${denominator} m = ${numerator} × (100 ÷ ${denominator}) = ${numerator * (100 / denominator)} cm`,
    },
  ];
}

function orderChoices(labels: string[], r: Rng): string[] {
  const swapFirst = labels.slice();
  [swapFirst[0], swapFirst[1]] = [swapFirst[1], swapFirst[0]];
  const swapLast = labels.slice();
  const last = swapLast.length - 1;
  [swapLast[last - 1], swapLast[last]] = [swapLast[last], swapLast[last - 1]];
  return r.shuffle([labels, swapFirst, swapLast, labels.slice().reverse()]
    .map(values => values.join(', ')));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  // Four response variants within the same common-unit comparison family.
  const variant = ((seed >>> 0) + (index >>> 0)) % 4;
  const isLength = variant === 1;
  const descending = variant === 2;
  const smallest = variant === 3;
  const measurements = isLength ? lengthMeasurements(r) : volumeMeasurements(r, variant === 0);
  const commonUnit = isLength ? 'cm' : 'mL';
  const noun = isLength ? 'lengths' : 'volumes';
  const sorted = measurements.slice().sort((a, b) => descending ? b.value - a.value : a.value - b.value);
  const labels = sorted.map(value => value.label);
  let presented = r.shuffle(measurements);
  if (presented.every((value, position) => value.label === labels[position])) {
    presented = [...presented.slice(1), presented[0]];
  }
  const symbol = descending ? ' > ' : ' < ';
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: `Write every measurement in ${isLength ? 'centimetres' : 'millilitres'} before comparing.`,
      equation: isLength ? '1 km = 1000 m; 1 m = 100 cm' : '1 L = 1000 mL',
    },
    ...presented.map(value => ({text: `Express ${value.label} in ${commonUnit}.`, equation: value.conversion})),
    {
      text: descending ? 'Compare the converted amounts from greatest to least.' : 'Compare the converted amounts from least to greatest.',
      equation: sorted.map(value => `${value.value} ${commonUnit}`).join(symbol),
    },
    smallest
      ? {text: 'Choose the original measurement with the least converted amount.', equation: `${labels[0]} is the smallest`}
      : {text: 'Write the measurements in their original forms, keeping this order.', equation: labels.join(symbol)},
  ];
  const common: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: smallest
      ? `Which of these ${noun} is the smallest?`
      : descending
        ? `Put these ${noun} in order from largest to smallest.`
        : `Choose the list that puts these ${noun} in order from smallest to largest.`,
    answer: smallest ? labels[0] : labels.join(descending ? ',' : ', '),
    hint: `Use ${isLength ? 'centimetres' : 'millilitres'} for every measurement, then compare the amounts.`,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
  if (descending) return {...common, order: presented.map(value => value.label)};
  return {
    ...common,
    display: presented.map(value => value.label).join(' ; '),
    choices: smallest ? r.shuffle(measurements.map(value => value.label)) : orderChoices(labels, r),
  };
}
