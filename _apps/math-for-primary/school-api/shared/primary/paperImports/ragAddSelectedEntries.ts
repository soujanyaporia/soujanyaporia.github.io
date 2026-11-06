import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-add-selected-entries',
  level: 3,
  title: 'Count sales over three days',
  objective: 'Read a scaled bar graph and add every count from the first named day to the last.',
  skillIds: ['P3.S.GRAPH.01', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-add-selected-entries',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const start = rng.int(0, days.length - 3);
  const minorStep = 2;
  const labelStep = 10;
  const minorValues = Array.from({ length: 25 }, (_, i) => 10 + i * minorStep)
    .filter(value => value % labelStep !== 0);
  // Any three-day window includes at least one bar between numbered grid lines.
  const values = rng.shuffle([
    ...rng.shuffle(minorValues).slice(0, 3),
    ...rng.shuffle([10, 20, 40, 50]).slice(0, 2),
  ]);
  const [first, middle, last] = days.slice(start, start + 3);
  const [a, b, c] = values.slice(start, start + 3);
  const subtotal = a + b;
  const total = subtotal + c;
  const workedSteps = [
    { text: `Count ${first}, ${middle} and ${last}. Each small step up the graph stands for ${minorStep} bookmarks.` },
    { text: `Read the three bars. The stall sold ${a} bookmarks on ${first}, ${b} on ${middle} and ${c} on ${last}.` },
    { text: 'Add the sales for the first two days.', equation: `${a} + ${b} = ${subtotal}` },
    { text: `Include the sales for ${last}.`, equation: `${subtotal} + ${c} = ${total} bookmarks` },
  ];

  return {
    key,
    prompt: `How many bookmarks did the stall sell over the three days from ${first} to ${last}?`,
    picture: {
      type: 'batch2-early', layout: 'sales-bars', heading: 'Daily bookmark sales',
      days, values, maximum: 60, minorStep, labelStep,
    },
    answer: String(total),
    unit: 'bookmarks',
    hint: 'Find the two days named in the question. Include the day between them when you add the bar heights.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    proof: { op: '+', a: { op: '+', a, b }, b: c },
  };
}
