import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-extreme-value-choice',
  level: 2 as const,
  title: 'Choose the greatest or smallest value',
  objective: 'Read each choice as a whole number and select the greatest or smallest value.',
  skillIds: ['P2.S.WN.04', 'P2.S.WN.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-select-greatest-or-smallest-value',
};

const forms = ['greatest-numeral', 'smallest-numeral', 'greatest-sum', 'smallest-description'] as const;
type Step = NonNullable<Question['workedSteps']>[number];
type Option = { label: string; value: number; step?: Step };

function numeral(value: number): Option {
  return { label: String(value), value };
}

function numeralOptions(r: Rng): Option[] {
  const tens = r.int(2, 8);
  return [tens, tens + 1].flatMap(t => [
    numeral(10 * t + r.int(0, 4)),
    numeral(10 * t + r.int(5, 9)),
  ]);
}

function sumOptions(r: Rng): Option[] {
  const ones = r.int(3, 7);
  const left = 10 * r.int(2, 6) + ones;
  const right = 10 * r.int(2, 6) + (10 - ones);
  const value = left + right;
  const label = `${left} + ${right}`;
  const gap = r.int(1, 4);
  return [
    { label, value, step: { text: 'Add the two numbers on this choice.', equation: `${label} = ${value}` } },
    numeral(value + (r.chance(0.5) ? gap : -gap)),
    numeral(value - r.int(7, 16)),
  ];
}

function descriptionPair(r: Rng, hundreds: number, regroupTens: boolean): Option[] {
  const firstUsesTens = r.chance(0.5);
  return [r.int(2, 9), r.int(12, 19)].map((extra, i) => {
    const value = 100 * hundreds + extra;
    const usesTens = i === 0 ? firstUsesTens : !firstUsesTens;
    const count = usesTens ? Math.floor(value / 10) - Number(regroupTens) : hundreds;
    const place = usesTens ? 'tens' : 'hundreds';
    const base = count * (usesTens ? 10 : 100);
    const ones = value - base;
    return {
      label: `${count} ${place} and ${ones} ones`,
      value,
      step: { text: `${count} ${place} make ${base}. Add the ${ones} ones.`, equation: `${base} + ${ones} = ${value}` },
    };
  });
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) % forms.length;
  const form = forms[((offset + index) % forms.length + forms.length) % forms.length];
  const smallest = form === 'smallest-numeral' || form === 'smallest-description';
  const direction = smallest ? 'smallest' : 'greatest';
  let options: Option[];
  let hint: string;

  if (form === 'greatest-sum') {
    options = sumOptions(r);
    hint = 'Work out the sum. Compare its value with both of the other numbers.';
  } else if (form === 'smallest-description') {
    const hundreds = r.int(2, 7);
    const regroupFirst = r.chance(0.5);
    options = [
      ...descriptionPair(r, hundreds, regroupFirst),
      ...descriptionPair(r, hundreds + 1, !regroupFirst),
    ];
    hint = 'Write each choice as a number. Remember that 10 ones make a ten and 10 tens make a hundred.';
  } else {
    options = numeralOptions(r);
    hint = 'Compare the tens digits first. If they match, compare the ones digits.';
  }

  const shown = r.shuffle(options);
  const ordered = [...shown].sort((a, b) => a.value - b.value);
  const winner = smallest ? ordered[0] : ordered[ordered.length - 1];
  const steps: Step[] = shown.flatMap(option => option.step ? [option.step] : []);
  if (form === 'smallest-numeral' || form === 'greatest-numeral') {
    const neighbour = smallest ? ordered[1] : ordered[ordered.length - 2];
    steps.push({
      text: `${winner.value} and ${neighbour.value} have the same tens digit. Compare their ones digits.`,
      equation: `${winner.value % 10} ${smallest ? '<' : '>'} ${neighbour.value % 10}`,
    });
  }
  steps.push(
    { text: 'Read the values from smallest to greatest.', equation: ordered.map(option => option.value).join(' < ') },
    { text: `The ${direction} value is ${winner.value}. Choose ${winner.label}.` },
  );
  return {
    key,
    prompt: `Which choice has the ${direction} value?`,
    choices: shown.map(option => option.label),
    answer: winner.label,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
