import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-rag-recover-factor-or-scaled-input',
  level: 5,
  title: 'Find the starting number or missing factor',
  objective: 'Use multiplication and division to recover an unknown number, then add the factors when their sum is requested.',
  skillIds: ['P5.S.WN.02', 'P5.S.WN.03'],
  canonicalPatternId: 'p5-recover-factor-or-scaled-input',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((Math.trunc(seed) + Math.trunc(index)) % 3 + 3) % 3;
  const make = (
    prompt: string,
    context: string[],
    answer: number,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    proof: NonNullable<Question['proof']>,
    display?: string,
  ): Question => ({
    key,
    prompt,
    context,
    answer: String(answer),
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
    proof,
    ...(display === undefined ? {} : {display}),
  });

  if (variant === 0) {
    const [multiplier, divisor] = r.pick([
      [200, 40], [300, 50], [400, 80],
      [600, 30], [800, 40], [900, 60],
    ]);
    let original = r.int(111, 799);
    let result = original * multiplier / divisor;
    if (result === 4230) {
      original += 1;
      result = original * multiplier / divisor;
    }
    const intermediate = result * divisor;
    return make(
      'What number did the calculation start with?',
      [
        `Start with a whole number. Multiply it by ${multiplier}, then divide by ${divisor}.`,
        `The result after both steps is ${result}.`,
      ],
      original,
      'Work backwards. Undo the division first, then undo the multiplication.',
      [
        {text: 'Multiply the result by the divisor to undo the last step.', equation: `${result} × ${divisor} = ${intermediate}`},
        {text: 'Divide by the multiplier to find the starting number.', equation: `${intermediate} ÷ ${multiplier} = ${original}`},
      ],
      {op: '/', a: {op: '*', a: result, b: divisor}, b: multiplier},
    );
  }

  if (variant === 1) {
    const scale = r.pick([10, 100, 1000]);
    const factor = r.int(3, 9);
    const missing = r.int(101, 299);
    const leftFactor = missing * factor;
    const rightFactor = scale * factor;
    const product = leftFactor * scale;
    return make(
      'Which number belongs in □ to make both sides equal?',
      [],
      missing,
      'Find the value of the complete side, then divide by the number beside the box.',
      [
        {text: 'Calculate the product on the left.', equation: `${leftFactor} × ${scale} = ${product}`},
        {text: 'Both sides have this value. Divide to find the missing factor.', equation: `${product} ÷ ${rightFactor} = ${missing}`},
      ],
      {op: '/', a: {op: '*', a: leftFactor, b: scale}, b: rightFactor},
      `${leftFactor} × ${scale} = □ × ${rightFactor}`,
    );
  }

  const known = r.int(22, 79);
  let other = r.int(23, 99);
  if (other === known) other += 1;
  const product = known * other;
  const sum = known + other;
  return make(
    'What do the two numbers add up to?',
    [`Two whole numbers multiply to make ${product}.`, `One of them is ${known}.`],
    sum,
    'First divide to find the other number. Then add the two numbers.',
    [
      {text: 'Divide the product by the number we know.', equation: `${product} ÷ ${known} = ${other}`},
      {text: 'Add both numbers to find their sum.', equation: `${known} + ${other} = ${sum}`},
    ],
    {op: '+', a: known, b: {op: '/', a: product, b: known}},
  );
}
