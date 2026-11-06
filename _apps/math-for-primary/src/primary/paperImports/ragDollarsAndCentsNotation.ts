import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-dollars-and-cents-notation',
  level: 3,
  title: 'Write a money amount',
  objective: 'Read an amount in words, write a price with two cents digits, and group total cents into dollars and leftover cents.',
  skillIds: ['P2.S.MONEY.01', 'P2.S.MONEY.03', 'P3.S.WN.02'],
  canonicalPatternId: 'p3-dollars-and-cents-notation',
};

const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const teenPrices = [[13, 'thirteen'], [15, 'fifteen'], [16, 'sixteen'], [17, 'seventeen'], [18, 'eighteen'], [19, 'nineteen']] as const;

function price(dollars: number, cents: number): string {
  return `$${dollars}.${String(cents).padStart(2, '0')}`;
}

function inSeparateUnits(dollars: number, cents: number): string {
  return `${dollars} dollars and ${cents} ${cents === 1 ? 'cent' : 'cents'}`;
}

function finish(fields: Omit<Question, 'workedSteps' | 'explanation'>, workedSteps: NonNullable<Question['workedSteps']>): Question {
  const explanation = workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');
  return { ...fields, workedSteps, explanation };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) + index) >>> 0) % 4;

  if (slot === 0 || slot === 2) {
    const [dollars, dollarWord] = rng.pick(teenPrices);
    const cents = rng.int(1, 9);
    const centUnit = cents === 1 ? 'cent' : 'cents';
    const otherDollars = (dollars % 10) * 10;
    const answer = price(dollars, cents);
    return finish({
      key,
      context: [`The price in words is ${dollarWord} dollars and ${ones[cents]} ${centUnit}.`],
      prompt: 'Which price tag shows that amount?',
      answer,
      choices: rng.shuffle([answer, price(dollars, cents * 10), price(otherDollars, cents), price(otherDollars, cents * 10)]),
      hint: 'Read the dollar word first. After the point, leave room for two cents digits.',
    }, [
      { text: 'Write the whole dollars before the point.', equation: `${dollarWord} dollars = ${price(dollars, 0)}` },
      { text: 'The cents are less than ten, so their first digit is zero.', equation: `${cents} ${centUnit} = ${price(0, cents)}` },
      { text: 'Put the dollars and cents together.', equation: `${price(dollars, 0)} + ${price(0, cents)} = ${answer}` },
    ]);
  }

  if (slot === 1) {
    const dollars = rng.int(24, 89);
    const cents = rng.int(1, 9) * 10;
    const total = dollars * 100 + cents;
    const answer = inSeparateUnits(dollars, cents);
    const oneTenth = total / 10;
    return finish({
      key,
      context: [`An envelope holds ${total} cents.`],
      prompt: 'Which choice gives the whole dollars and the cents left over?',
      answer,
      choices: rng.shuffle([
        answer,
        inSeparateUnits(dollars, cents / 10),
        inSeparateUnits(Math.floor(oneTenth / 100), oneTenth % 100),
        inSeparateUnits(oneTenth, 0),
      ]),
      hint: 'Make groups of 100 cents. Each full group is one dollar.',
    }, [
      { text: 'Count the cents in the full dollars.', equation: `${dollars} × 100 cents = ${dollars * 100} cents` },
      { text: 'Find the cents left after taking out those dollars.', equation: `${total} − ${dollars * 100} = ${cents}` },
      { text: `The envelope holds ${answer}.`, equation: `${total} cents = ${price(dollars, cents)}` },
    ]);
  }

  const thousands = rng.pick([2, 3, 4, 5, 7, 8, 9]);
  const tensDigit = rng.int(2, 9);
  const onesDigit = rng.int(1, 9);
  const tail = tensDigit * 10 + onesDigit;
  const dollars = thousands * 1000 + tail;
  const tailWords = `${tens[tensDigit]}-${ones[onesDigit]}`;
  return finish({
    key,
    context: [`The cheque says “${ones[thousands]} thousand and ${tailWords} dollars only”.`],
    prompt: 'What number goes in the dollar box on this cheque?',
    unit: 'dollars',
    answer: `${dollars}.00`,
    hint: 'Find the thousands first. Which digit belongs in the hundreds place?',
  }, [
    { text: 'Read the thousands.', equation: `${thousands} × 1000 = ${thousands * 1000}` },
    { text: `There are no hundreds. Add ${tailWords} to the thousands.`, equation: `${thousands * 1000} + ${tail} = ${dollars}` },
    { text: 'The cheque gives whole dollars, so the cents digits are both zero.', equation: `${dollars} dollars = ${price(dollars, 0)}` },
  ]);
}
