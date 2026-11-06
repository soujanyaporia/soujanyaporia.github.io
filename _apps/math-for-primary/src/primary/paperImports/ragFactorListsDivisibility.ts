import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-factor-lists-divisibility-tests',
  level: 5,
  title: 'Factor lists and exact division',
  objective: 'Complete factor lists and use remainders to identify nonfactors and exactly divisible numbers.',
  skillIds: ['P4.S.FACT.01', 'P5.S.WN.02'],
  canonicalPatternId: 'p5-factor-lists-and-divisibility-tests',
};

const FACTOR_TOTALS = [
  12, 18, 24, 30, 36, 40, 42, 44, 45, 48, 50, 54, 56, 60,
  63, 66, 70, 72, 75, 78, 80, 84, 88, 90, 96, 98, 100,
];
type Steps = NonNullable<Question['workedSteps']>;

function factorPairs(total: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let first = 1; first * first <= total; first++) {
    if (total % first === 0) pairs.push([first, total / first]);
  }
  return pairs;
}

function factorsFromPairs(pairs: [number, number][]): number[] {
  return pairs.flatMap(([a, b]) => a === b ? [a] : [a, b]).sort((a, b) => a - b);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const build = (
    prompt: string,
    answer: string,
    hint: string,
    steps: Steps,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    answer,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const total = r.pick(FACTOR_TOTALS);
    const pairs = factorPairs(total);
    const factors = factorsFromPairs(pairs);
    const [smaller, larger] = r.pick(pairs.filter(([a, b]) => a > 1 && a < b));
    const listed = factors.filter(value => value !== smaller && value !== larger);
    const steps: Steps = [
      {
        text: 'Find multiplication pairs that make the number. Check smaller factors in order until the pairs start repeating.',
        equation: pairs.map(([a, b]) => `${a} × ${b} = ${total}`).join('; '),
      },
      {
        text: 'Put all the factors in order. Write each factor only once.',
        equation: factors.join(', '),
      },
      {
        text: 'Compare the complete list with the unfinished list.',
        equation: `Missing factors: ${smaller} and ${larger}`,
      },
    ];
    return build(
      'Find the two missing factors. Enter the smaller factor first.',
      JSON.stringify([String(smaller), String(larger)]),
      'Find factor pairs, then check which factors are absent from the list.',
      steps,
      {
        context: [`This is an unfinished list of the factors of ${total}.`],
        display: listed.join(', '),
        structuredResponse: {
          kind: 'number-pair',
          firstLabel: 'Smaller missing factor',
          secondLabel: 'Larger missing factor',
        },
      },
    );
  }

  if (variant === 1) {
    const total = r.pick(FACTOR_TOTALS);
    const factors = factorsFromPairs(factorPairs(total));
    const trueFactors = r.shuffle(factors.filter(value => value > 1 && value < total)).slice(0, 3);
    const nonfactors = Array.from({length: total - 2}, (_, i) => i + 2)
      .filter(value => value <= 30 && total % value !== 0);
    const nonfactor = r.pick(nonfactors);
    const candidates = r.shuffle([...trueFactors, nonfactor]);
    const steps: Steps = candidates.map(candidate => {
      const quotient = Math.floor(total / candidate);
      const remainder = total - candidate * quotient;
      return {
        text: remainder === 0
          ? `${candidate} is a factor because the remainder is 0.`
          : `${candidate} is not a factor because the remainder is ${remainder}.`,
        equation: `${total} = ${candidate} × ${quotient}${remainder === 0 ? '' : ` + ${remainder}`}`,
      };
    });
    steps.push({text: `Only ${nonfactor} leaves a remainder, so choose ${nonfactor}.`});
    return build(
      `Three of these numbers are factors of ${total}. Which number is not?`,
      String(nonfactor),
      'Divide the given number by each choice. A factor leaves no remainder.',
      steps,
      {choices: candidates.map(String)},
    );
  }

  const divisor = r.pick([30, 40, 50, 60, 80, 90]);
  const pool = Array.from({length: 600}, (_, i) => 3000 + i * 10);
  const answer = r.pick(pool.filter(value => value % divisor === 0));
  const distractors = r.shuffle(pool.filter(value => value % divisor !== 0)).slice(0, 3);
  const candidates = r.shuffle([answer, ...distractors]);
  const steps: Steps = candidates.map(candidate => {
    const quotient = Math.floor(candidate / divisor);
    const remainder = candidate - divisor * quotient;
    return {
      text: remainder === 0
        ? `${candidate} divides exactly by ${divisor}.`
        : `${candidate} leaves a remainder of ${remainder} when divided by ${divisor}.`,
      equation: `${candidate} = ${divisor} × ${quotient}${remainder === 0 ? '' : ` + ${remainder}`}`,
    };
  });
  steps.push({
    text: `Only ${answer} leaves no remainder. Write this number as the answer.`,
    equation: `${answer} ÷ ${divisor} = ${answer / divisor}`,
  });
  return build(
    `Which number in the list can be divided by ${divisor} with no remainder?`,
    String(answer),
    'Both the numbers and the divisor end in 0. Divide both by 10, then check whether the division is exact.',
    steps,
    {display: candidates.join(', ')},
  );
}
