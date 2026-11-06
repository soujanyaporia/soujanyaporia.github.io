import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-locate-and-value-decimal-digits',
  level: 4 as const,
  title: 'Find a digit and say what it is worth',
  objective: 'Read decimal places, find a digit’s value in a product and compare the values of two digits.',
  skillIds: ['P4.S.DEC.01', 'P4.S.DEC.06', 'P4.S.DEC.05'],
  canonicalPatternId: 'p4-locate-and-value-decimal-digits',
};

const places = ['ones', 'tenths', 'hundredths', 'thousandths'];
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;

  function choice(display: string, prompt: string, answer: string, options: string[], hint: string, workedSteps: NonNullable<Question['workedSteps']>): Question {
    return {
      key, display, prompt, answer, choices: rng.shuffle(options), hint, workedSteps,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 0 || variant === 1) {
    const whole = rng.int(1, 9);
    const fraction = rng.shuffle(digits.filter(digit => digit !== whole)).slice(0, 3);
    const writtenDigits = [whole, ...fraction];
    const display = `${whole}.${fraction.join('')}`;
    const readDigit = variant === 0;
    const position = rng.int(readDigit ? 1 : 0, 3);
    const place = places[position];
    const digit = String(writtenDigits[position]);
    return choice(display,
      readDigit ? `Which digit is in the ${place} place?` : `Which place does the digit ${digit} occupy?`,
      readDigit ? digit : place,
      readDigit ? writtenDigits.map(String) : [...places],
      'Start at the decimal point. The ones are just to its left and the tenths are just to its right.',
      [
        { text: `After the point, read ${fraction.join(', ')} as the tenths, hundredths and thousandths digits, in that order.` },
        { text: `In ${display}, the digit ${digit} is in the ${place} place.` },
      ]);
  }

  if (variant === 2) {
    const multiplier = rng.int(2, 9);
    const whole = rng.int(5, 10);
    const targets: { factorHundredths: number; position: number }[] = [];
    // Every product is between 10 and 99.99, so its four digits run from tens to hundredths.
    for (let part = 1; part < 100; part++) {
      const factorHundredths = whole * 100 + part;
      const written = String(factorHundredths * multiplier);
      for (let position = 0; position < written.length; position++) {
        const digit = written[position];
        if (digit !== '0' && written.indexOf(digit) === written.lastIndexOf(digit)) {
          targets.push({ factorHundredths, position });
        }
      }
    }
    const { factorHundredths, position } = rng.pick(targets);
    const productHundredths = factorHundredths * multiplier;
    const digit = Number(String(productHundredths)[position]);
    const placeNames = ['tens', 'ones', 'tenths', 'hundredths'];
    const options = placeNames.map(name => `${digit} ${digit === 1 ? name.slice(0, -1) : name}`);
    const answer = options[position];
    const value = digit * [1000, 100, 10, 1][position] / 100;
    const factor = (factorHundredths / 100).toFixed(2);
    const product = (productHundredths / 100).toFixed(2);
    return choice(`${factor} × ${multiplier}`, `How much is the digit ${digit} worth in the product?`, answer, options,
      'Multiply first. Then find the digit in your answer and look at its place.',
      [
        { text: `Count ${factor} in hundredths and multiply.`, equation: `${factorHundredths} hundredths × ${multiplier} = ${productHundredths} hundredths` },
        { text: 'Write that many hundredths as a decimal.', equation: `${factor} × ${multiplier} = ${product}` },
        { text: `In ${product}, the digit ${digit} is in the ${placeNames[position]} place.`, equation: `${answer} = ${value}` },
      ]);
  }

  const tens = rng.int(2, 6);
  const [ones, tenths, hundredths] = rng.shuffle(digits.filter(digit => digit > 0 && digit !== tens));
  const display = `${tens}${ones}.${tenths}${hundredths}`;
  const smaller = hundredths / 100;
  const answer = String((ones * 100 - hundredths) / 100);
  const options = [answer, String(Math.abs(ones - hundredths)), String((10 * ones - hundredths) / 10), String((100 * ones + hundredths) / 100)];
  return choice(display, `How much greater is the value of the digit ${ones} than the value of the digit ${hundredths}?`, answer, options,
    'Find what each digit is worth before you subtract.',
    [
      { text: `The digit ${ones} is in the ones place, so its value is ${ones}.` },
      { text: `The digit ${hundredths} is in the hundredths place.`, equation: `${hundredths} ÷ 100 = ${smaller}` },
      { text: 'Line up the decimal points and subtract.', equation: `${ones.toFixed(2)} − ${smaller.toFixed(2)} = ${answer}` },
    ]);
}
