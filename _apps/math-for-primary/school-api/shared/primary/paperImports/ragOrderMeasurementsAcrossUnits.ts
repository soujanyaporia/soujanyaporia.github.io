import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-order-measurements-across-units',
  level: 3,
  title: 'Compare four measurements',
  objective: 'Use the same unit for four readings, then put them in order or find the largest or smallest.',
  skillIds: ['P3.S.MEASURE.02', 'P3.S.MEASURE.03', 'P3.S.WN.03'],
  canonicalPatternId: 'p3-order-measurements-across-units',
};

const profiles = [
  {
    large: 'kg', small: 'g', factor: 1000, min: 3, max: 6,
    labels: ['Parcel P', 'Parcel Q', 'Parcel R', 'Parcel S'],
    ascending: 'Put the parcels in order, lightest first.',
    greatest: 'Which parcel is the heaviest?', smallest: 'Which parcel is the lightest?',
  },
  {
    large: 'L', small: 'ml', factor: 1000, min: 3, max: 6,
    labels: ['Red jug', 'Blue jug', 'Green jug', 'Yellow jug'],
    ascending: 'Put the amounts of water in order, starting with the least.',
    greatest: 'Which jug contains the most water?', smallest: 'Which jug contains the least water?',
  },
  {
    large: 'km', small: 'm', factor: 1000, min: 2, max: 4,
    labels: ['Mei', 'Ravi', 'Zul', 'Lina'],
    ascending: 'Put the runners in order, starting with the shortest distance they ran.',
    greatest: 'Who ran the farthest?', smallest: 'Who ran the shortest distance?',
  },
  {
    large: 'm', small: 'cm', factor: 100, min: 12, max: 24,
    labels: ['Jia', 'Dev', 'Min', 'Asha'],
    ascending: 'Put the children in order, starting with the shortest beanbag throw.',
    greatest: 'Who threw a beanbag the farthest?', smallest: 'Who threw a beanbag the shortest distance?',
  },
] as const;

const modes = ['ascending', 'greatest', 'smallest'] as const;
type Profile = typeof profiles[number];
type Reading = { value: number; text: string };

function compound(value: number, profile: Profile): Reading {
  const whole = Math.floor(value / profile.factor);
  const rest = value % profile.factor;
  return { value, text: `${whole} ${profile.large} ${rest} ${profile.small}` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const cycle = profiles.length * modes.length;
  const slot = ((hashString(String(seed)) + Math.trunc(index)) % cycle + cycle) % cycle;
  const profile = profiles[slot % profiles.length];
  const mode = modes[slot % modes.length];
  const whole = rng.int(profile.min, profile.max);
  const base = whole * profile.factor;
  const gap = rng.int(2, 6) * (rng.chance(0.5) ? 1 : -1);
  const nearby = base + 10 * gap;
  const fourth = base + rng.int(71, 89) * (rng.chance(0.5) ? 1 : -1);
  const readings: Reading[] = [
    { value: base, text: `${whole} ${profile.large}` },
    compound(base + gap, profile),
    { value: nearby, text: `${nearby} ${profile.small}` },
    compound(fourth, profile),
  ];

  let unitFact = `1 ${profile.large} = ${profile.factor} ${profile.small}`;
  if (profile.large === 'km' && mode === 'greatest') {
    // A short run recorded in centimetres can be compared in whole metres.
    const metres = rng.int(42, 84);
    readings[3] = { value: metres, text: `${metres * 100} cm` };
    unitFact += ' and 100 cm = 1 m';
  }

  const rows = rng.shuffle(readings).map((reading, i) => ({ ...reading, label: profile.labels[i] }));
  const ranked = [...rows].sort((left, right) => left.value - right.value);
  const amountsOnly = mode === 'ascending' && profile.large === 'L';
  const token = (row: typeof rows[number]) => amountsOnly ? row.text : row.label;
  const orderedTokens = ranked.map(token);
  const offered = rows.map(token);
  const answer = mode === 'ascending' ? orderedTokens.join(',')
    : mode === 'greatest' ? orderedTokens[3] : orderedTokens[0];
  if (mode === 'ascending' && offered.join(',') === answer) {
    [offered[0], offered[1]] = [offered[1], offered[0]];
  }

  const conclusion = mode === 'ascending'
    ? `From smallest to largest, the order is ${orderedTokens.join(', ')}.`
    : `${answer} has the ${mode === 'greatest' ? 'largest' : 'smallest'} measurement.`;
  const workedSteps = [
    { text: `Use ${profile.small} for all four readings.`, equation: unitFact },
    ...rows.filter(row => row.text !== `${row.value} ${profile.small}`).map(row => ({
      text: amountsOnly ? 'Write this amount in the smaller unit.' : `Convert the reading for ${row.label}.`,
      equation: `${row.text} = ${row.value} ${profile.small}`,
    })),
    { text: 'Compare the four readings.', equation: ranked.map(row => `${row.value} ${profile.small}`).join(' < ') },
    { text: conclusion },
  ];

  return {
    key, prompt: profile[mode], answer,
    ...(amountsOnly ? {} : { context: rows.map(row => `${row.label} — ${row.text}`) }),
    ...(mode === 'ascending' ? { order: offered } : { choices: offered }),
    hint: `Write each reading in ${profile.small} first. For a reading with two units, convert the larger unit and add the part that is left.`,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
