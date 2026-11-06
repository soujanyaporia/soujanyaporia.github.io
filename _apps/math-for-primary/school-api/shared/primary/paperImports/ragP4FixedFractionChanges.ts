import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-fixed-fraction-changes',
  level: 4,
  title: 'How much was there before or after?',
  objective: 'Use fixed amounts added or taken away to find a starting amount or a remainder.',
  skillIds: ['P4.S.FRAC.04', 'P4.S.FRAC.02'],
  canonicalPatternId: 'p4-fixed-fraction-additions-and-removals',
};

const forms = ['remainder', 'water', 'clay', 'ribbon'] as const;
type Form = (typeof forms)[number];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// All calculations use integer parts of one kg, litre or metre.
function label(parts: number, denominator: number): string {
  const whole = Math.floor(parts / denominator);
  const rest = parts % denominator;
  if (rest === 0) return String(whole);
  const factor = gcd(rest, denominator);
  const fraction = `${rest / factor}/${denominator / factor}`;
  return whole ? `${whole} ${fraction}` : fraction;
}

function chooseAmounts(rng: Rng, form: Form) {
  const [denominator, smallerDenominator] = rng.pick([[6, 3], [9, 3], [10, 5], [12, 4]]);
  const parts = Array.from({ length: denominator - 1 }, (_, i) => i + 1);
  const fine = parts.filter(n => gcd(n, denominator) === 1);
  const coarse = parts.filter(n => denominator / gcd(n, denominator) === smallerDenominator);
  const available = [...fine, ...coarse];
  const options: [number, number, number][] = [];
  for (const first of fine) {
    for (const second of coarse) {
      if (form === 'remainder') {
        if (first + second < denominator) options.push([first, second, 0]);
        continue;
      }
      for (const third of available) {
        if (third === first || third === second) continue;
        if (form === 'water') {
          const start = third + second - first;
          if (start > 0 && start < denominator) options.push([first, second, third]);
        } else if (first + second < denominator) {
          // For clay the two portions used must outweigh the top-up so the answer is mixed.
          if (form === 'ribbon' || third < first + second) options.push([first, second, third]);
        }
      }
    }
  }
  const [first, second, third] = rng.pick(options);
  return { denominator, first, second, third };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const offset = hashString(String(seed)) + index;
  const form = forms[((offset % forms.length) + forms.length) % forms.length];
  const { denominator, first, second, third } = chooseAmounts(new Rng(hashString(key)), form);
  const show = (n: number) => label(n, denominator);
  const steps: NonNullable<Question['workedSteps']> = [];

  function step(text: string, left: number, sign: '+' | '−', right: number): number {
    const value = sign === '+' ? left + right : left - right;
    const lines = [
      `${show(left)} ${sign} ${show(right)}`,
      `${left}/${denominator} ${sign} ${right}/${denominator}`,
      `${value}/${denominator}`,
      show(value),
    ];
    const equation = lines.filter((line, i) => i === 0 || line !== lines[i - 1]).join(' = ');
    steps.push({ text, equation });
    return value;
  }

  function question(context: string[], prompt: string, unit: string, hint: string, value: number): Question {
    const answer = show(value);
    return {
      key, context, prompt, unit, hint, answer, workedSteps: steps,
      explanation: steps.map(s => `${s.text} ${s.equation}.`).join(' ') + ` The answer is ${answer} ${unit}.`,
      proof: { op: '/', a: value, b: denominator },
      ...(form === 'clay' ? { requireMixed: true, requireSimplified: true } : {}),
    };
  }

  if (form === 'remainder') {
    const used = step('Add the two amounts of oats Nora took from the tin.', first, '+', second);
    const left = step('Take that total away from the oats she had at first.', denominator, '−', used);
    return question([
      'Nora started with 1 kg of oats in a tin.',
      `She took ${show(first)} kg out for breakfast.`,
      `Later she took ${show(second)} kg out for some snack bars.`,
    ], 'What mass of oats was left in the tin?', 'kg', 'How much went into the two meals altogether? Take that amount away from one kilogram.', left);
  }

  if (form === 'water') {
    const beforeWatering = step('Put back the water used for the plant to find how much was in the can just before watering.', third, '+', second);
    const start = step('Take away the water Dev poured in to find how much was there at first.', beforeWatering, '−', first);
    return question([
      'There was some water in a watering can.',
      `Dev poured ${show(first)} L of water into the can.`,
      `He poured ${show(second)} L out to water a plant.`,
      `There was ${show(third)} L left in the can.`,
    ], 'How much water was in the can before Dev added any?', 'L', 'Start with the water left at the end. Which amount had just been poured out?', start);
  }

  if (form === 'clay') {
    const beforeTopUp = step('Take the fresh clay away from the final kilogram to find how much was left after making the cup.', denominator, '−', third);
    const used = step('Find how much clay went into the bowl and the cup together.', first, '+', second);
    const start = step('Put the clay used for both objects back with the clay that was left. Write the total as a mixed number.', beforeTopUp, '+', used);
    return question([
      'A potter had some clay.',
      `She used ${show(first)} kg for a bowl.`,
      `She used ${show(second)} kg for a cup.`,
      `She added ${show(third)} kg of fresh clay to what was left.`,
      'She then had exactly 1 kg of clay.',
    ], 'How much clay did the potter have before she made the bowl and cup? Give your answer as a mixed number in simplest form.', 'kg', 'Work back from the final kilogram. What was left just before the fresh clay was added?', start);
  }

  const cut = step('Find the total length of the two pieces Siti cut off.', first, '+', second);
  const start = step('Join those two pieces to the ribbon left on the roll to find its original length.', cut, '+', third);
  return question([
    'Siti had a roll of ribbon.',
    `She cut off ${show(first)} m for a card.`,
    `She cut off ${show(second)} m for a badge.`,
    `The ribbon left on the roll measured ${show(third)} m.`,
  ], 'How long was the ribbon before Siti made either cut?', 'm', 'The original ribbon included both cut pieces and the piece still on the roll.', start);
}
