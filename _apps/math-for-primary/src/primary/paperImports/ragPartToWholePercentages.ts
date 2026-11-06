import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-part-to-whole-percentages',
  level: 5,
  title: 'Percentages of a collection',
  objective: 'Find a group as a percentage of the whole using counts of objects.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02'],
  canonicalPatternId: 'part-to-whole-percentages',
} as const;

const TOTALS = [60, 120, 140, 160, 180, 240, 280, 300, 360];
const PERCENTAGES = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
type Step = NonNullable<Question['workedSteps']>[number];

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed) % 3 + Math.trunc(index) % 3) % 3 + 3) % 3;
  const total = r.pick(TOTALS);
  const percentage = r.pick(PERCENTAGES);
  const target = total * percentage / 100;

  const finish = (
    context: string[],
    prompt: string,
    hint: string,
    steps: Step[],
    choices?: string[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer: String(percentage),
    unit: '%',
    hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
    ...(choices ? {choices} : {}),
  });

  const percentageStep: Step = {
    text: 'Divide the number in the required group by the total, then multiply by 100%.',
    equation: `${target} ÷ ${total} × 100% = ${percentage}%`,
  };

  if (variant === 0) {
    return finish(
      [`The pouch holds ${total} tokens in all.`, `Among them, ${target} tokens are silver.`],
      'What percentage of the tokens are silver?',
      'Use the silver tokens as the part and all the tokens as the whole.',
      [
        {text: 'Write the silver tokens as a fraction of all the tokens.', equation: `${target}/${total}`},
        percentageStep,
      ],
    );
  }

  // Every category has a positive count. Multiples of 5% keep the counts integral.
  const firstPercentage = 5 * r.int(1, (100 - percentage) / 5 - 1);
  const secondPercentage = 100 - percentage - firstPercentage;
  const first = total * firstPercentage / 100;
  const second = total - target - first;

  if (variant === 1) {
    const choices = r.shuffle(
      [...new Set([
        percentage,
        firstPercentage,
        secondPercentage,
        100 - percentage,
        percentage / 100,
        percentage / 10,
      ])].slice(0, 4).map(String),
    );
    return finish(
      [
        'A tray contains only circle cards, star cards and square cards. Each card has exactly one shape.',
        `It holds ${first} circle cards, ${target} star cards and ${second} square cards.`,
      ],
      'What percentage of the cards are star cards?',
      'Add the three groups to find the whole collection first.',
      [
        {text: 'Find the total number of cards.', equation: `${first} + ${target} + ${second} = ${total}`},
        {text: 'Use the star cards as the part and all the cards as the whole.', equation: `${target}/${total}`},
        percentageStep,
      ],
      choices,
    );
  }

  return finish(
    [
      `A carton holds ${total} badges altogether.`,
      'Each badge has exactly one colour: orange, purple or green.',
      `There are ${first} orange badges and ${second} purple badges. All the other badges are green.`,
    ],
    'What percentage of the badges are green?',
    'Add the orange and purple badges, then subtract their total from all the badges.',
    [
      {text: 'Find how many badges are orange or purple.', equation: `${first} + ${second} = ${first + second}`},
      {text: 'Subtract to find the number of green badges.', equation: `${total} − ${first + second} = ${target}`},
      percentageStep,
    ],
  );
}
