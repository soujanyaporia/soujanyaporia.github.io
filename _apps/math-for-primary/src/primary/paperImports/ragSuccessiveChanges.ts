import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-successive-changes',
  level: 3,
  title: 'Follow two changes to a collection',
  objective: 'Find the final count by following two changes, or find the starting count by undoing them in reverse order.',
  skillIds: ['P3.S.AS.01'],
  canonicalPatternId: 'successive-increases-and-decreases',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['find-end-loss-gain', 'find-start-loss-gain', 'find-start-gain-loss'] as const);
  const findEnd = variant === 'find-end-loss-gain';
  const gainFirst = variant === 'find-start-gain-loss';

  // Either change can be the larger one. Even the largest removal fits in the starting stock.
  const start = rng.int(480, 1690);
  const smaller = rng.int(58, 139);
  const larger = rng.int(254, 348);
  const [loss, gain] = rng.chance(0.5) ? [smaller, larger] : [larger, smaller];
  const middle = gainFirst ? start + gain : start - loss;
  const end = gainFirst ? middle - loss : middle + gain;

  const take = `Asha took ${loss} tickets out of the box.`;
  const put = `Asha put ${gain} tickets into the box.`;
  const context = ['Asha looked after a box of tickets at the school fair.'];
  if (findEnd) context.push(`At the start, the box held ${start} tickets.`);
  context.push(...(gainFirst ? [put, take] : [take, put]));
  if (!findEnd) context.push(`At the end, the box held ${end} tickets.`);

  let workedSteps: NonNullable<Question['workedSteps']>;
  if (findEnd) {
    workedSteps = [
      { text: 'Find how many tickets were left when Asha took some out.', equation: `${start} − ${loss} = ${middle}` },
      { text: 'Add the tickets she put into the box.', equation: `${middle} + ${gain} = ${end}` },
    ];
  } else if (gainFirst) {
    workedSteps = [
      { text: 'Add back the tickets Asha took out last. This gives the count just before she took them.', equation: `${end} + ${loss} = ${middle}` },
      { text: 'Subtract the tickets she put in earlier to find the starting count.', equation: `${middle} − ${gain} = ${start}` },
    ];
  } else {
    workedSteps = [
      { text: 'Subtract the tickets Asha put in last. This gives the count just before she added them.', equation: `${end} − ${gain} = ${middle}` },
      { text: 'Add back the tickets she took out earlier to find the starting count.', equation: `${middle} + ${loss} = ${start}` },
    ];
  }

  const target = findEnd ? 'end' : 'start';
  const answer = findEnd ? end : start;
  return {
    key,
    context,
    prompt: `How many tickets were in the box at the ${target}?`,
    answer: String(answer),
    unit: 'tickets',
    hint: findEnd ? 'Start with the tickets in the box. What happened to them first?' : 'Start with the final count. How can you undo the last thing Asha did?',
    workedSteps,
    explanation: `${workedSteps.map(step => step.equation).join('. ')}. The box held ${answer} tickets at the ${target}.`,
  };
}
