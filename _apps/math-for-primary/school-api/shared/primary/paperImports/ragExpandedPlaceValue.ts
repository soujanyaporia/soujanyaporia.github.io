import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-expanded-place-value-equations',
  level: 5,
  title: 'Build and complete place-value equations',
  objective: 'Compose whole numbers from place-value parts and find a missing part or group count.',
  skillIds: ['P5.S.WN.01', 'P5.S.WN.02'],
  canonicalPatternId: 'expanded-place-value-equations',
};

type Draw = (min: number, max: number) => number;
type Steps = NonNullable<Question['workedSteps']>;
const format = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function random(seed: number, index: number): Draw {
  let state = 2166136261;
  for (const ch of `${seed}:${index}`) {
    state = Math.imul(state ^ ch.charCodeAt(0), 16777619) >>> 0;
  }
  return (min, max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(state / 4294967296 * (max - min + 1));
  };
}

function shuffle<T>(items: readonly T[], draw: Draw): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = draw(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeDigits(draw: Draw): number[] {
  const length = draw(5, 7);
  const digits = Array.from({length}, () => draw(1, 9));
  digits[0] = draw(2, 6);
  digits[length - 1] = draw(1, 6);
  digits[draw(1, length - 2)] = 0;
  return digits;
}

function partsOf(digits: number[]) {
  return digits.map((digit, i) => ({digit, place: 10 ** (digits.length - i - 1)}))
    .filter(part => part.digit !== 0)
    .map(part => ({...part, value: part.digit * part.place}));
}

function expansionOf(n: number): string {
  return partsOf([...String(n)].map(Number)).map(part => format(part.value)).join(' + ');
}

function otherNumerals(digits: number[], draw: Draw): number[] {
  const zero = digits.indexOf(0);
  const positions = digits.map((_, i) => i).filter(i => i > 0 && i !== zero);
  return shuffle(positions, draw).slice(0, 3).map(position => {
    const changed = [...digits];
    [changed[zero], changed[position]] = [changed[position], changed[zero]];
    return Number(changed.join(''));
  });
}

function question(
  seed: number, index: number, prompt: string, display: string,
  answer: string, hint: string, workedSteps: Steps, choices?: string[],
): Question {
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt, display, answer, hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...(choices ? {choices} : {}),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const draw = random(seed, index);
  const variant = ((seed % 4 + index % 4) % 4 + 4) % 4;

  if (variant === 3) {
    const place = 10 ** draw(4, 5);
    const coefficient = draw(12, 79);
    const lowerCount = draw(11, 29);
    const nextCount = draw(1, 9);
    const lastPart = draw(11, place / 100 - 1);
    const firstKnown = lowerCount * (place / 10);
    const secondKnown = nextCount * (place / 100);
    const known = firstKnown + secondKnown + lastPart;
    const missingValue = coefficient * place;
    const total = missingValue + known;
    const knownProducts = `${lowerCount} × ${format(place / 10)} + ${nextCount} × ${format(place / 100)}`;
    const display = `${format(total)} = □ × ${format(place)} + ${knownProducts} + ${format(lastPart)}`;
    return question(seed, index,
      'Find the number that makes this equation true.', display, String(coefficient),
      'Find the value of the known parts. Subtract it from the whole number, then divide by the value of one group.',
      [
        {text: 'Multiply the known counts by their place values.', equation: `${knownProducts} = ${format(firstKnown + secondKnown)}`},
        {text: 'Add the last part to find the full known value.', equation: `${format(firstKnown + secondKnown)} + ${format(lastPart)} = ${format(known)}`},
        {text: 'Subtract the known value from the whole number.', equation: `${format(total)} − ${format(known)} = ${format(missingValue)}`},
        {text: `Find how many groups of ${format(place)} make the missing value.`, equation: `${format(missingValue)} ÷ ${format(place)} = ${coefficient}`},
        {text: 'Check by putting the number back in the box.', equation: `${coefficient} × ${format(place)} + ${knownProducts} + ${format(lastPart)} = ${format(total)}`},
      ]);
  }

  const digits = makeDigits(draw);
  const total = Number(digits.join(''));
  const parts = partsOf(digits);
  const expansion = parts.map(part => format(part.value)).join(' + ');

  if (variant === 0) {
    const firstSum = parts[0].value + parts[1].value;
    const remaining = parts.slice(2).map(part => format(part.value)).join(' + ');
    const choices = shuffle([total, ...otherNumerals(digits, draw)], draw).map(format);
    return question(seed, index,
      'Choose the numeral that completes this sum.', `${expansion} = □`, format(total),
      'Add the place-value parts. Keep a zero in any place that has no part.',
      [
        {text: 'Add the two parts with the greatest place values.', equation: `${format(parts[0].value)} + ${format(parts[1].value)} = ${format(firstSum)}`},
        {text: 'Add the remaining parts. A place with no part keeps a zero.', equation: `${format(firstSum)} + ${remaining} = ${format(total)}`},
      ], choices);
  }

  if (variant === 1) {
    const choices = shuffle([total, ...otherNumerals(digits, draw)], draw).map(expansionOf);
    const steps: Steps = parts.map(part => ({
      text: 'Write the value of this non-zero digit.',
      equation: `${part.digit} × ${format(part.place)} = ${format(part.value)}`,
    }));
    steps.push({text: 'Join these values in a sum. Zero places do not need a term.', equation: `${expansion} = ${format(total)}`});
    return question(seed, index,
      'Which sum shows the value of every non-zero digit in this number?', format(total), expansion,
      'Read each digit with its place value, then choose the sum of those values.', steps, choices);
  }

  const hidden = draw(0, parts.length - 1);
  const missing = parts[hidden].value;
  const knownParts = parts.filter((_, i) => i !== hidden);
  const known = knownParts.reduce((sum, part) => sum + part.value, 0);
  const right = parts.map((part, i) => i === hidden ? '□' : format(part.value)).join(' + ');
  return question(seed, index,
    'Fill the box so that both sides have the same value.', `${format(total)} = ${right}`, String(missing),
    'Add the parts already shown, then subtract their total from the whole number.',
    [
      {text: 'Add all the known parts.', equation: `${knownParts.map(part => format(part.value)).join(' + ')} = ${format(known)}`},
      {text: 'Subtract to find the missing part.', equation: `${format(total)} − ${format(known)} = ${format(missing)}`},
      {text: 'Put the missing part back and check the sum.', equation: `${expansion} = ${format(total)}`},
    ]);
}
