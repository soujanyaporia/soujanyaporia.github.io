import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-digit-place-and-value',
  level: 4,
  title: 'Find a digit’s place and value',
  objective: 'Use a digit’s position to choose a number, name a place or find the digit’s value after a calculation.',
  skillIds: ['P4.S.WN.01', 'P4.S.MD.01'],
  canonicalPatternId: 'p4-digit-place-in-given-or-calculated-number',
};

const places = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const format = (n: number) => n.toLocaleString('en-SG');
type Draft = Pick<Question, 'prompt' | 'display' | 'answer' | 'hint'> & {
  choices: string[];
  workedSteps: NonNullable<Question['workedSteps']>;
};

function selectNumeral(r: Rng): Draft {
  const width = r.int(4, 5);
  const base = r.shuffle(digits).slice(0, width);
  const digit = base[0];
  const column = r.pick([1, 2, 3, 3]);
  const unit = 10 ** column;
  const place = places[column];
  const value = digit * unit;
  const byValue = r.chance(0.5);

  // Put the same digit in a different column of each choice.
  function option(columnFromRight: number): string {
    const arranged = base.slice();
    const at = width - 1 - columnFromRight;
    [arranged[0], arranged[at]] = [arranged[at], arranged[0]];
    return format(Number(arranged.join('')));
  }
  const otherColumns = Array.from({ length: width }, (_, i) => i).filter(i => i !== column);
  const answer = option(column);
  const choices = r.shuffle([answer, ...r.shuffle(otherColumns).slice(0, 3).map(option)]);
  return {
    prompt: byValue
      ? `Pick the number where the digit ${digit} is worth ${format(value)}.`
      : `Pick the number with the digit ${digit} in the ${place} place.`,
    answer, choices,
    hint: byValue ? 'How much must one unit of that place be worth?' : 'Start with the ones on the right and count across to the named place.',
    workedSteps: [
      { text: `The digit ${digit} in the ${place} place is worth ${format(value)}.`, equation: `${digit} × ${format(unit)} = ${format(value)}` },
      { text: `Look at the ${place} digit of each choice. Only ${answer} has ${digit} there.` },
    ],
  };
}

function namePlace(r: Rng, numeral: number, expression?: string): Draft {
  const text = String(numeral);
  const uniqueDigits = [...text].filter(d => d !== '0' && text.indexOf(d) === text.lastIndexOf(d));
  const digit = r.pick(uniqueDigits);
  const column = text.length - 1 - text.indexOf(digit);
  const answer = places[column];
  const otherPlaces = places.slice(0, text.length).filter(place => place !== answer);
  const workedSteps: Draft['workedSteps'] = [];
  if (expression) workedSteps.push({ text: 'Multiply to find the number to read.', equation: `${expression} = ${format(numeral)}` });
  workedSteps.push({
    text: `Read ${format(numeral)} from the right, starting with ones. The digit ${digit} is in the ${answer} place.`,
    equation: `${digit} × ${format(10 ** column)} = ${format(Number(digit) * 10 ** column)}`,
  });
  return {
    display: expression ?? format(numeral),
    prompt: `Which place holds the digit ${digit} in ${expression ? 'the product' : 'this number'}?`,
    answer,
    choices: r.shuffle([answer, ...r.shuffle(otherPlaces).slice(0, 3)]),
    hint: expression ? 'Multiply first. Then count places from the right of your answer.' : 'Start at the right with ones, then move left to tens and hundreds.',
    workedSteps,
  };
}

function valueInDifference(r: Rng): Draft {
  const prefix = r.shuffle(digits.slice(0, 8)).slice(0, 4).join('');
  const difference = Number(prefix) * 10;
  // Make subtraction require regrouping in the tens column while keeping both operands five digits long.
  const tens = r.int(10 - Number(prefix[3]), 9);
  const maxHundreds = Math.floor((99999 - difference - 10 * tens) / 100);
  const smaller = r.int(100, maxHundreds) * 100 + 10 * tens;
  const larger = smaller + difference;
  const column = r.int(1, 4);
  const digit = Number(prefix[4 - column]);
  const unit = 10 ** column;
  const value = digit * unit;
  const display = `${format(larger)} − ${format(smaller)}`;
  return {
    display,
    prompt: `How much is the digit ${digit} worth in the difference?`,
    answer: format(value),
    choices: r.shuffle([10, 100, 1000, 10000].map(weight => format(digit * weight))),
    hint: 'Line up the places and subtract. Then find the digit in your result.',
    workedSteps: [
      { text: 'Subtract to find the number to read.', equation: `${display} = ${format(difference)}` },
      { text: `In ${format(difference)}, the digit ${digit} is in the ${places[column]} place.`, equation: `${digit} × ${format(unit)} = ${format(value)}` },
    ],
  };
}

function build(r: Rng, slot: number): Draft {
  if (slot < 6) return selectNumeral(r);
  if (slot === 6) {
    const numeral = Number(r.shuffle(digits).slice(0, r.int(4, 5)).join(''));
    return namePlace(r, numeral);
  }
  if (slot === 7) return valueInDifference(r);

  // The product keeps these three distinct leading digits. Its last digit can repeat at most one of them.
  const prefix = Number(r.shuffle(digits).slice(0, 3).join(''));
  const multiplier = r.int(2, 9);
  const factor = Math.ceil(prefix * 10 / multiplier);
  return namePlace(r, factor * multiplier, `${format(factor)} × ${multiplier}`);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const slot = ((hashString(String(seed)) + index) % 9 + 9) % 9;
  const draft = build(new Rng(hashString(key)), slot);
  return {
    ...draft, key,
    explanation: draft.workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
