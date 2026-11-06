import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-remainder-constraints',
  level: 3,
  title: 'Use the remainder',
  objective: 'Use a remainder to complete a group, choose an addend or find a number between two limits.',
  skillIds: ['P3.S.MD.02', 'P3.S.MD.04'],
  canonicalPatternId: 'divisibility-and-remainder-constraints',
} as const;

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(String(seed)) + Math.trunc(index);
  const variant = ((offset % 3) + 3) % 3;

  function question(fields: Pick<Question, 'prompt' | 'context' | 'hint' | 'answer' | 'unit' | 'choices'>, workedSteps: Steps): Question {
    return {
      key, ...fields, workedSteps,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 0) {
    const size = rng.pick([4, 5, 6, 8, 9]);
    const fullBags = rng.int(18, 27);
    const leftover = rng.int(0, size - 1);
    const total = fullBags * size + leftover;
    const extra = leftover === 0 ? 0 : size - leftover;
    const steps: Steps = [
      { text: 'Pack as many full bags as you can and count what is left.', equation: `${total} ÷ ${size} = ${fullBags} remainder ${leftover}` },
    ];
    if (leftover === 0) {
      steps.push({ text: 'Every badge already fits in a full bag. Nila needs 0 extra badges.', equation: `${fullBags} × ${size} = ${total}` });
    } else {
      steps.push(
        { text: 'The badges left over start one more bag. Count the empty places in that bag.', equation: `${size} − ${leftover} = ${extra}` },
        { text: 'Filling just those places makes every bag full.', equation: `${total} + ${extra} = ${(fullBags + 1) * size} = ${fullBags + 1} × ${size}` },
      );
    }
    return question({
      context: [`Nila has ${total} badges. She wants to pack them all in bags of exactly ${size} badges each.`],
      prompt: 'What is the smallest number of extra badges Nila needs?',
      unit: 'badges', answer: String(extra),
      hint: 'Make full bags first. If any badges are left, think about what their bag still needs.',
    }, steps);
  }

  if (variant === 1) {
    const divisor = rng.pick([5, 6, 7, 9]);
    const remainder = rng.int(1, divisor - 1);
    const smallest = divisor - remainder;
    const addend = smallest + rng.pick([0, divisor]);
    const wrongSmall = Array.from({ length: divisor - 1 }, (_, i) => i + 1).filter(n => n !== smallest);
    const [first, second] = rng.shuffle(wrongSmall);
    const choices = rng.shuffle([first, divisor, second + divisor, addend].map(String));
    const sum = remainder + addend;
    return question({
      context: [`A whole number divided by ${divisor} leaves a remainder of ${remainder}.`],
      prompt: `Which number could you add so that the new total divides exactly by ${divisor}?`,
      choices, answer: String(addend),
      hint: 'The full groups are already complete. Try adding each choice to the part left over.',
    }, [
      { text: `Start with the ${remainder} left over and add the chosen number.`, equation: `${remainder} + ${addend} = ${sum}` },
      { text: 'This sum makes full groups too, so nothing is left over.', equation: `${sum} ÷ ${divisor} = ${sum / divisor}` },
    ]);
  }

  const divisor = rng.int(4, 8);
  const groups = rng.int(4, 12);
  const remainder = rng.int(1, divisor - 1);
  const multiple = groups * divisor;
  const target = multiple + remainder;
  // Both neighbouring numbers with this remainder are on or outside the limits.
  const lower = target - rng.int(2, divisor);
  const upper = target + rng.int(2, divisor);
  const nearMultiples = [multiple - divisor, multiple, multiple + divisor];
  return question({
    context: [
      `My whole number is greater than ${lower} and less than ${upper}.`,
      `Dividing it by ${divisor} leaves a remainder of ${remainder}.`,
    ],
    prompt: 'What is my number?', answer: String(target),
    hint: `Count in ${divisor}s near the two limits. Add ${remainder} to each number you count.`,
  }, [
    { text: `Find nearby numbers that make full groups of ${divisor}.`, equation: nearMultiples.map((n, i) => `${groups - 1 + i} × ${divisor} = ${n}`).join(', ') },
    { text: 'Add the remainder to each. These are consecutive numbers with the required remainder.', equation: nearMultiples.map(n => `${n} + ${remainder} = ${n + remainder}`).join(', ') },
    { text: 'Keep the only result above the lower limit and below the upper limit.', equation: `${lower} < ${target} < ${upper}` },
  ]);
}
