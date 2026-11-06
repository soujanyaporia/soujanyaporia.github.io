import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-measurements-linked-by-a-difference',
  level: 2,
  title: 'How much longer or heavier?',
  objective: 'Use a stated difference to find another length or mass. When there are two comparisons, identify the starting measurement for each.',
  skillIds: ['P2.S.AS.01', 'P2.S.MEASURE.02'],
  canonicalPatternId: 'measurements-linked-by-a-difference',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((Math.trunc(seed) + Math.trunc(index)) % 8 + 8) % 8;
  function question(context: string[], prompt: string, answer: string, hint: string, workedSteps: Steps, response: Pick<Question, 'choices' | 'unit' | 'structuredResponse'>): Question {
    return { key, context, prompt, answer, hint, workedSteps, explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '), ...response };
  }

  if (slot < 3) {
    const ones = r.int(3, 8);
    const blue = 10 * r.int(14, 23) + ones;
    const extra = 10 * r.int(2, 3) + r.int(10 - ones, 9);
    const yellow = blue + extra;
    return question([
      `The blue rope is ${blue} cm long.`,
      `The yellow rope is ${extra} cm longer than the blue rope.`,
    ], 'How long is the yellow rope? Show your working.', String(yellow),
    'Which rope includes the extra length?', [
      { text: 'Add the extra length to the length of the blue rope.', equation: `${blue} cm + ${extra} cm = ${yellow} cm` },
      { text: 'Check how much longer the yellow rope is.', equation: `${yellow} cm − ${blue} cm = ${extra} cm` },
    ], { unit: 'cm' });
  }

  if (slot < 6) {
    const red = r.int(31, 56), gap = r.int(14, 22), green = red + gap;
    const cm = (value: number) => `${value} cm`;
    return question([
      `The red tower is ${red} cm tall.`,
      `The red tower is ${gap} cm shorter than the green tower.`,
    ], 'How tall is the green tower?', cm(green),
    'The red tower is shorter. Should the green tower be taller or shorter than the given height?', [
      { text: 'Start at the height of the red tower and add the missing height.', equation: `${red} cm + ${gap} cm = ${green} cm` },
      { text: 'Check that the red tower is shorter by the stated amount.', equation: `${green} cm − ${gap} cm = ${red} cm` },
    ], { choices: r.shuffle([green, red, red - gap, green - 10].map(cm)) });
  }

  const firstGap = 10 * r.int(11, 24), secondGap = 10 * r.int(4, 17) + 5;
  if (slot === 6) {
    const green = 10 * r.int(36, 69) + 5;
    const yellow = green - firstGap, red = green + secondGap;
    return question([
      `The green bag weighs ${green} g.`,
      `The green bag is ${firstGap} g heavier than the yellow bag.`,
      `The red bag is ${secondGap} g heavier than the green bag.`,
    ], 'Find the masses of the yellow bag and the red bag. Show your working for each.',
    JSON.stringify([String(yellow), String(red)]),
    'Start with the green bag both times. Which bag is lighter than it? Which is heavier?', [
      { text: 'The yellow bag is lighter. Take the extra mass away from the mass of the green bag.', equation: `${green} g − ${firstGap} g = ${yellow} g` },
      { text: 'The red bag is heavier. Add its extra mass to the mass of the green bag.', equation: `${green} g + ${secondGap} g = ${red} g` },
    ], { structuredResponse: { kind: 'number-pair', firstLabel: '(a) Yellow bag (g)', secondLabel: '(b) Red bag (g)' } });
  }

  const green = 10 * r.int(57, 88) + 5;
  const yellow = green - firstGap, red = yellow - secondGap;
  return question([
    `The green bag weighs ${green} g.`,
    `The yellow bag is ${firstGap} g lighter than the green bag.`,
    `The red bag is ${secondGap} g lighter than the yellow bag.`,
  ], 'What is the mass of the red bag? Show your working.', String(red),
  'The red bag is compared with the yellow bag. Which mass do you need to find first?', [
    { text: 'Find the mass of the yellow bag by subtracting from the mass of the green bag.', equation: `${green} g − ${firstGap} g = ${yellow} g` },
    { text: 'Now subtract from the mass of the yellow bag to find the mass of the red bag.', equation: `${yellow} g − ${secondGap} g = ${red} g` },
  ], { unit: 'g' });
}
