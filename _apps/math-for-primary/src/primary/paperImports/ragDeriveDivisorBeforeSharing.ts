import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-derive-divisor-before-sharing',
  level: 2,
  title: 'Count the shares first',
  objective: 'Find how many people or days share a total, then divide to find the amount for one.',
  skillIds: ['P2.S.MD.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-derive-divisor-before-sharing',
};

const groupCounts = {
  friends: [4, 5, 10],
  tables: [5, 10],
  days: [2, 3, 4, 5],
};
const forms: (keyof typeof groupCounts)[] = ['friends', 'tables', 'days'];
const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Story = Pick<Question, 'context' | 'prompt' | 'hint' | 'unit' | 'choices'>;
type CountStep = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(forms);
  const count = rng.pick(groupCounts[form]);
  // In the choice form, dividing among the friends alone gives a plausible whole-number distractor.
  const shares = form === 'friends'
    ? Array.from({ length: 10 }, (_, i) => i + 1).filter(n => n % (count - 1) === 0)
    : [2, 3, 4, 6, 7, 9, 10];
  const each = rng.pick(shares);
  const total = count * each;

  function finish(story: Story, countStep: CountStep, conclusion: string): Question {
    const division = `${total} ÷ ${count} = ${each}`;
    return {
      ...story,
      key,
      answer: String(each),
      proof: { op: '/', a: total, b: count },
      workedSteps: [countStep, { text: conclusion, equation: division }],
      explanation: `${countStep.text} ${countStep.equation}. ${division}. ${conclusion}`,
    };
  }

  if (form === 'friends') {
    const friends = count - 1;
    return finish({
      context: [`Mei has ${total} beads. She shares all of them equally among herself and her ${friends} friends.`],
      prompt: 'How many beads does one friend get?',
      unit: 'beads',
      hint: 'Who gets a share besides the friends?',
      choices: rng.shuffle([each, total / friends, each - 1, total - friends].map(String)),
    }, {
      text: 'Count the friends and Mei herself.',
      equation: `${friends} + 1 = ${count}`,
    }, `Each friend gets ${each} beads, just like Mei.`);
  }

  if (form === 'tables') {
    const round = rng.int(2, count - 2);
    const square = count - round;
    return finish({
      context: [
        `There are ${round} pupils at the round table and ${square} pupils at the square table.`,
        `Their teacher shares all ${total} bookmarks equally among the pupils at both tables.`,
      ],
      prompt: 'How many bookmarks does each pupil get? Show your two number sentences on paper.',
      unit: 'bookmarks',
      hint: 'Find how many pupils there are at the two tables altogether.',
    }, {
      text: 'Add the pupils at the two tables.',
      equation: `${round} + ${square} = ${count}`,
    }, `Each pupil gets ${each} bookmarks.`);
  }

  const start = rng.int(0, week.length - count);
  const days = week.slice(start, start + count);
  return finish({
    context: [
      `Tara folded paper cranes every day from ${days[0]} to ${days[count - 1]} in the same week.`,
      `She folded ${total} cranes altogether, with the same number each day.`,
    ],
    prompt: 'How many cranes did Tara fold each day?',
    unit: 'cranes',
    hint: 'Say the days in order. Count the first day and the last day too.',
  }, {
    text: 'Count every day that Tara folded cranes.',
    equation: `${days.join(', ')} → ${count} days`,
  }, `Tara folded ${each} cranes each day.`);
}
