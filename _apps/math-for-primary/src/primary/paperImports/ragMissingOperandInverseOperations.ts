import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-missing-operand-inverse-operations',
  level: 5,
  title: 'Find a missing number using inverse operations',
  objective: 'Evaluate known terms, then undo operations to find a missing whole number.',
  skillIds: ['P5.S.WN.03', 'P5.S.WN.02'],
  canonicalPatternId: 'p5-missing-operand-inverse-operations',
};

function makeRandom(seed: number, index: number) {
  let state = 2166136261;
  for (const char of `${seed}:${index}`) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  if (state === 0) state = 0x9e3779b9;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  const int = (min: number, max: number) => min + next() % (max - min + 1);
  const pick = (values: readonly number[]) => values[int(0, values.length - 1)]!;
  return {int, pick};
}

function fourChoices(
  random: ReturnType<typeof makeRandom>,
  answer: number,
  distractors: number[],
): string[] {
  const values = [...new Set([answer, ...distractors])]
    .filter(value => Number.isSafeInteger(value) && value > 0)
    .slice(0, 4);
  for (let value = answer + 1; values.length < 4; value++) {
    if (!values.includes(value)) values.push(value);
  }
  for (let i = values.length - 1; i > 0; i--) {
    const j = random.int(0, i);
    const old = values[i]!;
    values[i] = values[j]!;
    values[j] = old;
  }
  return values.map(String);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const random = makeRandom(seed, index);
  const variant = ((seed % 3) + (index % 3) + 6) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    const a = random.int(16, 29);
    const b = random.pick([3, 5, 6, 7, 9]);
    const c = b * random.int(2, 4);
    const d = random.int(3, 6);
    const offset = b + c;
    const first = a * b;
    const second = a * c;
    const third = d * offset;
    const known = first + second - third;
    const remaining = known - offset;
    const answer = remaining / b;
    return {
      key,
      prompt: 'Choose the number that makes both sides equal.',
      display: `${a} × ${b} + ${a} × ${c} − ${d} × ${offset} = □ × ${b} + ${offset}`,
      answer: String(answer),
      choices: fourChoices(random, answer, [known / b, (known + offset) / b, known]),
      hint: 'Calculate the side without the box. Then undo the addition and the multiplication on the other side.',
      explanation: `The left side is ${known}. Subtract ${offset}, then divide by ${b}. The missing number is ${answer}.`,
      workedSteps: [
        {text: 'Work out the first product.', equation: `${a} × ${b} = ${first}`},
        {text: 'Work out the second product.', equation: `${a} × ${c} = ${second}`},
        {text: 'Work out the product being subtracted.', equation: `${d} × ${offset} = ${third}`},
        {text: 'Finish calculating the left side.', equation: `${first} + ${second} − ${third} = ${known}`},
        {text: 'Subtract the amount added after the missing number is multiplied.', equation: `${known} − ${offset} = ${remaining}`},
        {text: 'Divide to find the missing number.', equation: `${remaining} ÷ ${b} = ${answer}`},
        {text: 'Put the number back. Both sides now have the same value.', equation: `${answer} × ${b} + ${offset} = ${known}`},
      ],
    };
  }

  if (variant === 1) {
    const a = random.pick([4, 5, 8, 9, 10, 11, 12]);
    const b = random.pick([3, 4, 5, 7, 8]);
    const divisor = random.pick([4, 5, 6, 8]);
    const product = a * b;
    const outer = Math.floor(product / divisor) + random.int(1, 4);
    const addend = outer * divisor - product;
    const bracketTotal = product + addend;
    const inner = random.int(3, 9);
    const answer = random.int(31, 59);
    const dividend = answer * inner;
    const target = outer * inner;
    return {
      key,
      prompt: 'Choose the number for □ that makes this statement true.',
      display: `(${a} × ${b} + ${addend}) ÷ ${divisor} × (${dividend} ÷ □) = ${target}`,
      answer: String(answer),
      choices: fourChoices(random, answer, [inner, target, dividend]),
      hint: 'Find the value of the first bracket and divide it by the next number. Use the total to find the value of the other bracket.',
      explanation: `The known part becomes ${outer}, so the last bracket must equal ${inner}. Since ${dividend} divided by the missing number is ${inner}, the missing number is ${answer}.`,
      workedSteps: [
        {text: 'Multiply inside the first bracket.', equation: `${a} × ${b} = ${product}`},
        {text: 'Finish the first bracket.', equation: `${product} + ${addend} = ${bracketTotal}`},
        {text: 'Divide this bracket value by the next number.', equation: `${bracketTotal} ÷ ${divisor} = ${outer}`},
        {text: 'Find the value needed in the last bracket.', equation: `${target} ÷ ${outer} = ${inner}`},
        {text: 'Divide the dividend by that bracket value to find the missing divisor.', equation: `${dividend} ÷ ${inner} = ${answer}`},
        {text: 'Check the number in the last bracket.', equation: `${outer} × (${dividend} ÷ ${answer}) = ${target}`},
      ],
    };
  }

  const a = random.int(24, 86) * 10;
  const b = random.pick([20, 30, 40, 50, 60, 70, 90]);
  const target = random.pick([80000, 90000, 120000, 150000]);
  const product = a * b;
  const answer = target - product;
  return {
    key,
    prompt: `Work out the product, then find how much to add to reach ${target}.`,
    display: `${a} × ${b} + □ = ${target}`,
    answer: String(answer),
    hint: 'Multiply first. Subtract the product from the total you want to reach.',
    explanation: `The product is ${product}. The amount still needed is ${target} − ${product} = ${answer}.`,
    workedSteps: [
      {text: 'Find the product.', equation: `${a} × ${b} = ${product}`},
      {text: 'Subtract the product from the target total.', equation: `${target} − ${product} = ${answer}`},
      {text: 'Check by adding the missing amount to the product.', equation: `${product} + ${answer} = ${target}`},
    ],
  };
}
