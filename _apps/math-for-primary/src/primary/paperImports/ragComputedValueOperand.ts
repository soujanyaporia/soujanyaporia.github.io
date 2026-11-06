import { Rng, hashString } from '../../engine/random';
import type { Proof, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-computed-value-operand',
  level: 2,
  title: 'Find the number that makes both sides equal',
  objective: 'Work out a sum, a product or a number given in tens and ones, then find the missing number in the equation.',
  skillIds: ['P2.S.AS.01', 'P2.S.MD.01', 'P2.S.MD.02', 'P2.S.WN.02'],
  canonicalPatternId: 'p2-missing-operand-against-a-computed-value',
};

const tables = [2, 3, 4, 5, 10];
const regroupings: { groups: number; size: number; newSize: number }[] = [];
for (let groups = 3; groups <= 7; groups++) {
  for (const size of tables) {
    for (const newSize of tables) {
      const newCount = groups * size / newSize;
      // Require a different grouping, beyond simply swapping the two factors.
      if (newSize !== size && newSize !== groups && Number.isInteger(newCount) && newCount >= 2 && newCount <= 10) {
        regroupings.push({ groups, size, newSize });
      }
    }
  }
}

type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;

  function options(answer: number, intermediate: number, step = 1): string[] {
    return rng.shuffle([answer, intermediate, answer - step, answer + step]).map(String);
  }

  function question(display: string, answer: number, hint: string, steps: Step[], proof: Proof, choices?: string[]): Question {
    return {
      key,
      prompt: choices ? 'Choose the number that belongs in the square.' : 'Write the number that belongs in the square.',
      display,
      answer: String(answer),
      hint,
      workedSteps: steps,
      explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
      proof,
      ...(choices ? { choices } : {}),
    };
  }

  if (variant === 0) {
    const size = rng.pick(tables);
    const first = rng.int(4, 8) * size;
    const total = first + size + size;
    const answer = total / size;
    return question(`□ × ${size} = ${first} + ${size} + ${size}`, answer,
      'Add the three numbers. How many groups of the given size make that total?', [
        { text: 'Find the total on the right.', equation: `${first} + ${size} + ${size} = ${total}` },
        { text: `Count the groups of ${size}.`, equation: `${total} ÷ ${size} = ${answer}` },
        { text: 'Check the product.', equation: `${answer} × ${size} = ${total}` },
      ], { op: '/', a: { op: '+', a: { op: '+', a: first, b: size }, b: size }, b: size }, options(answer, total));
  }

  if (variant === 1) {
    const { groups, size, newSize } = rng.pick(regroupings);
    const total = groups * size;
    const answer = total / newSize;
    return question(`${groups} groups of ${size} = □ × ${newSize}`, answer,
      'Find how many there are altogether. Keep that total when you change the group size.', [
        { text: `Count all ${groups} groups.`, equation: `${groups} × ${size} = ${total}` },
        { text: `Make new groups of ${newSize}.`, equation: `${total} ÷ ${newSize} = ${answer}` },
        { text: 'Check that the new groups have the same total.', equation: `${answer} × ${newSize} = ${total}` },
      ], { op: '/', a: { op: '*', a: groups, b: size }, b: newSize }, options(answer, total));
  }

  if (variant === 2) {
    const a = rng.pick([2, 3, 4]);
    const b = rng.int(2, Math.floor(9 / a));
    const share = a * b;
    const divisor = rng.pick(tables);
    const answer = share * divisor;
    return question(`${a} × ${b} = □ ÷ ${divisor}`, answer,
      'Work out the left side. That is how many belong in each equal share.', [
        { text: 'Find the size of one share.', equation: `${a} × ${b} = ${share}` },
        { text: `Put ${divisor} shares together to find the starting number.`, equation: `${share} × ${divisor} = ${answer}` },
        { text: 'Check by sharing the starting number.', equation: `${answer} ÷ ${divisor} = ${share}` },
      ], { op: '*', a: { op: '*', a, b }, b: divisor }, options(answer, share, divisor));
  }

  const tens = 10 * rng.int(1, 8) + rng.int(4, 8);
  const ones = rng.int(2, 9);
  const known = 10 * tens + ones;
  const total = (Math.floor(tens / 10) + 1) * 100 + rng.int(0, 9);
  const answer = total - known;
  return question(`(${tens} tens and ${ones} ones) + □ = ${total}`, answer,
    'Count each ten as 10. How much more do you need to reach the total?', [
      { text: `Change ${tens} tens into ones.`, equation: `${tens} × 10 = ${10 * tens}` },
      { text: 'Add the extra ones.', equation: `${10 * tens} + ${ones} = ${known}` },
      { text: 'Take the known part away from the total.', equation: `${total} − ${known} = ${answer}` },
      { text: 'Put the missing part back to check.', equation: `${known} + ${answer} = ${total}` },
    ], { op: '-', a: total, b: { op: '+', a: { op: '*', a: tens, b: 10 }, b: ones } });
}
