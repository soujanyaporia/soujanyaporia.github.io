import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-constant-rate-conversion',
  level: 5,
  title: 'Work with time and constant rates',
  objective: 'Use time per item, pay for part of an hour, and a water-volume graph to solve constant-rate problems.',
  skillIds: ['P5.S.RATE.01', 'P5.S.RATE.02', 'P5.S.FRAC.07'],
  canonicalPatternId: 'p5-constant-rate-conversion',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) % 3;
  const position = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = (offset + position) % 3;
  const make = (
    context: string[], prompt: string, answer: string,
    hint: string, workedSteps: Steps, extra: Partial<Question> = {},
  ): Question => ({
    key, context, prompt, answer, hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const hours = r.pick([2, 3, 5, 6, 7, 8]);
    const totalMinutes = hours * 60;
    const minutesPerItem = r.pick([6, 8, 10, 12, 15, 24, 30].filter(value => totalMinutes % value === 0));
    const count = totalMinutes / minutesPerItem;
    const answer = String(count);
    const wrong = [...new Set([hours, minutesPerItem, totalMinutes, count + 1, count + 2])]
      .filter(value => value !== count).slice(0, 3).map(String);
    return make(
      [`A craft machine finishes one keyring every ${minutesPerItem} minutes. It makes keyrings one at a time at a steady rate, without any breaks.`],
      `How many keyrings does it finish in ${hours} hours?`,
      answer,
      'Change the hours to minutes. Then find how many equal making times fit.',
      [
        {text: 'Convert the whole working time to minutes.', equation: `${hours} × 60 = ${totalMinutes} minutes`},
        {text: `Each finished keyring takes ${minutesPerItem} minutes.`, equation: `${totalMinutes} ÷ ${minutesPerItem} = ${count} keyrings`},
      ],
      {unit: 'keyrings', choices: r.shuffle([answer, ...wrong])},
    );
  }

  if (variant === 1) {
    const hourlyDollars = r.pick([9, 11, 13, 14, 15, 16, 18, 20, 22]);
    const wholeHours = r.pick([2, 3, 4, 6, 7]);
    const [numerator, denominator] = r.pick([[1, 2], [1, 4], [3, 4]] as const);
    const wholeCents = hourlyDollars * 100 * wholeHours;
    const fractionCents = hourlyDollars * 100 * numerator / denominator;
    const totalCents = wholeCents + fractionCents;
    return make(
      [
        `A helper earns $${hourlyDollars.toFixed(2)} for each hour of work.`,
        'Pay is worked out at this rate for the exact time worked, including part of an hour.',
      ],
      `How much does the helper earn for ${wholeHours} ${numerator}/${denominator} hours of work?`,
      (totalCents / 100).toFixed(2),
      'Find the pay for the whole hours and for the fraction of an hour. Add them.',
      [
        {text: 'Find the pay for the whole hours.', equation: `${wholeHours} × $${hourlyDollars.toFixed(2)} = $${(wholeCents / 100).toFixed(2)}`},
        {text: `Find the pay for ${numerator}/${denominator} of an hour.`, equation: `$${hourlyDollars.toFixed(2)} ÷ ${denominator} × ${numerator} = $${(fractionCents / 100).toFixed(2)}`},
        {text: 'Add the two amounts.', equation: `$${(wholeCents / 100).toFixed(2)} + $${(fractionCents / 100).toFixed(2)} = $${(totalCents / 100).toFixed(2)}`},
      ],
      {unit: 'dollars'},
    );
  }

  const litresPerMinute = r.pick([2, 4, 5, 6, 8]);
  const interval = r.pick([2, 3, 4]);
  const remainingIntervals = r.int(1, 3);
  const elapsed = 3 * interval;
  const moreMinutes = remainingIntervals * interval;
  const initial = litresPerMinute * (elapsed + moreMinutes);
  const times = [0, interval, 2 * interval, elapsed];
  const values = times.map(time => initial - litresPerMinute * time);
  const remaining = values[values.length - 1];
  const lost = initial - remaining;
  return make(
    [
      'Water leaks from a tank at a steady rate. No water is added. The graph shows how much water remains.',
      'Horizontal axis: time in minutes. Vertical axis: water remaining in litres. Time starts at 0 minutes.',
      'The water keeps leaking at the same rate until the tank is empty.',
    ],
    `(a) How many litres of water leak out each minute? (b) How many more minutes after the ${elapsed}-minute reading will the tank take to become empty?`,
    JSON.stringify([String(litresPerMinute), String(moreMinutes)]),
    'Use the fall in volume and the time between readings to find the rate. Then use the water still left.',
    [
      {text: 'Read the volumes at the first and last plotted times.', equation: `${initial} litres at 0 minutes; ${remaining} litres at ${elapsed} minutes`},
      {text: 'Find how much water leaked between those readings.', equation: `${initial} − ${remaining} = ${lost} litres`},
      {text: 'Find the water lost in one minute.', equation: `${lost} ÷ ${elapsed} = ${litresPerMinute} litres per minute`},
      {text: 'Find the additional time using only the water left at the last reading.', equation: `${remaining} ÷ ${litresPerMinute} = ${moreMinutes} more minutes`},
    ],
    {
      picture: {type: 'bars', line: true, labels: times.map(String), values, scale: litresPerMinute * interval},
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Leakage rate (litres per minute)',
        secondLabel: `(b) More time after ${elapsed} minutes (minutes)`,
      },
    },
  );
}
