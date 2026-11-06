import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-common-multiples',
  level: 5,
  title: 'Find shared multiples',
  objective: 'Find the second positive common multiple or list all positive common multiples below a limit.',
  skillIds: ['P4.S.FACT.03'],
  canonicalPatternId: 'p5-common-multiples',
};

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9],
  [3, 5], [3, 6], [3, 7], [3, 8], [4, 5], [4, 6], [4, 8], [5, 6],
];

function randomInt(seed: number, index: number) {
  let state = 2166136261;
  for (const ch of `${seed}:${index}`) {
    state = Math.imul(state ^ ch.charCodeAt(0), 16777619) >>> 0;
  }
  return (min: number, max: number): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const fraction = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    return min + Math.floor(fraction * (max - min + 1));
  };
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function multiplesThrough(step: number, last: number): string {
  return Array.from({length: last / step}, (_, i) => step * (i + 1)).join(', ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const pick = randomInt(seed, index);
  const bounded = pick(0, 1) === 1;
  const [a, b] = PAIRS[pick(0, PAIRS.length - 1)];
  const least = (a / gcd(a, b)) * b;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const firstSteps = [
    {
      text: `List positive multiples of ${a}.`,
      equation: `Multiples of ${a}: ${multiplesThrough(a, least)}`,
    },
    {
      text: `List positive multiples of ${b} until the lists share a number.`,
      equation: `Multiples of ${b}: ${multiplesThrough(b, least)}`,
    },
    {
      text: 'Find the smallest number in both lists. This is the least common multiple.',
      equation: `Least common multiple = ${least}`,
    },
  ];

  if (!bounded) {
    const second = 2 * least;
    return {
      key,
      prompt: `Put the positive common multiples of ${a} and ${b} in increasing order. What is the second number?`,
      context: ['Use numbers greater than 0.'],
      answer: String(second),
      hint: 'Find the first number shared by both multiplication tables. Add that number once more to reach the second common multiple.',
      explanation: `The first positive common multiple is ${least}. The next is ${least} + ${least} = ${second}.`,
      workedSteps: [
        ...firstSteps,
        {
          text: 'Common multiples increase by the least common multiple. Take one more equal jump to find the second.',
          equation: `${least} + ${least} = ${second}`,
        },
      ],
      proof: {op: '*', a: least, b: 2},
    };
  }

  // Keep two to four answers, and keep even the next common multiple within 100.
  const maxCount = Math.min(4, Math.floor(100 / least) - 1);
  const count = pick(2, maxCount);
  const exactBoundary = pick(0, 1) === 1;
  const limit = count * least + (exactBoundary ? least : pick(1, least - 1));
  const values = Array.from({length: count}, (_, i) => least * (i + 1));
  const next = least * (count + 1);
  return {
    key,
    prompt: `For ${a} and ${b}, find every positive common multiple less than ${limit}.`,
    context: [
      'Use numbers greater than 0.',
      'Enter one number in each box, from smallest to largest.',
    ],
    structuredResponse: {
      kind: 'number-fields',
      fields: values.map((_, i) => ({label: `Number ${i + 1} (in increasing order)`})),
    },
    answer: JSON.stringify(values.map(String)),
    hint: 'Find the smallest number shared by both multiplication tables. Keep adding it, stopping before the limit.',
    explanation: `The positive common multiples come in jumps of ${least}. Those below ${limit} are ${values.join(', ')}. The next, ${next}, is not below the limit.`,
    workedSteps: [
      ...firstSteps,
      {
        text: `Count in jumps of ${least}, keeping the common multiples below ${limit}.`,
        equation: `Common multiples below ${limit}: ${values.join(', ')}`,
      },
      {
        text: 'Check the next common multiple. It reaches or passes the limit, so leave it out.',
        equation: `${least} × ${count + 1} = ${next}; ${next} ${next === limit ? '=' : '>'} ${limit}`,
      },
    ],
  };
}
