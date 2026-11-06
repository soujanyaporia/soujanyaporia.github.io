import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p5-forward-composition-updates',
  level: 5,
  title: 'Update a group and find its percentage',
  objective: 'Update category and total counts after an addition or removal, then find a category count or percentage.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02', 'P5.S.PCT.03'],
  canonicalPatternId: 'p5-forward-composition-updates',
};

type Variant = 'removed-count' | 'added-category-percent' | 'added-counts-percent' | 'added-category-count-percent';

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`rag-forward-composition-updates:${seed}:${index}`));
  const variant = rng.pick<Variant>([
    'removed-count', 'added-category-percent', 'added-counts-percent', 'added-category-count-percent',
  ]);
  const base = { key: `rag-forward-composition-updates:${seed}:${index}` };
  if (variant === 'removed-count') {
    const total = rng.pick([400, 500, 600]);
    const categoryPct = rng.pick([30, 40, 45, 60]);
    const removed = rng.pick([50, 75, 100]);
    const remainingPct = rng.pick([40, 50, 60, 70]);
    const initialCategory = total * categoryPct / 100;
    const remainingCategory = (total - removed) * remainingPct / 100;
    const answer = initialCategory - remainingCategory;
    return {
      ...base, context: [`A box held ${total} beads. ${categoryPct}% were red. After ${removed} beads were used, ${remainingPct}% of the beads left were red.`],
      prompt: 'How many red beads were used?', answer: String(answer), unit: 'beads',
      hint: 'Find the number of red beads at first and the number left. Subtract to find how many red beads were used.',
      explanation: `${total} × ${categoryPct}% = ${initialCategory} red beads at first. ${total} − ${removed} = ${total - removed} beads left; ${total - removed} × ${remainingPct}% = ${remainingCategory} red beads left. ${initialCategory} − ${remainingCategory} = ${answer}.`,
      workedSteps: [{ text: 'Find the red beads at first.', equation: `${total} × ${categoryPct}/100 = ${initialCategory}` }, { text: 'Find the red beads left, then subtract.', equation: `(${total} − ${removed}) × ${remainingPct}/100 = ${remainingCategory}; ${initialCategory} − ${remainingCategory} = ${answer}` }],
    };
  }
  const total = rng.pick([200, 300, 400, 500]);
  const initialCount = total * rng.pick([20, 25, 30, 40]) / 100;
  const added = rng.pick([20, 40, 60, 80]);
  if (variant === 'added-category-percent') {
    const newTotal = total + added;
    const answer = initialCount / newTotal * 100;
    return {
      ...base, context: [`A class has ${total} pupils. ${initialCount} are in the choir. Then ${added} pupils join another club.`],
      prompt: 'What percentage of the pupils are in the choir now?', answer: String(Number(answer.toFixed(2))), unit: '%',
      hint: 'The number in the choir stays the same. Find the new total before calculating the percentage.',
      explanation: `The choir still has ${initialCount} pupils. The new total is ${total} + ${added} = ${newTotal}. ${initialCount} ÷ ${newTotal} × 100% = ${Number(answer.toFixed(2))}%.`,
      workedSteps: [{ text: 'Find the new total.', equation: `${total} + ${added} = ${newTotal}` }, { text: 'Compare the unchanged choir count with the new total.', equation: `${initialCount} ÷ ${newTotal} × 100% = ${Number(answer.toFixed(2))}%` }],
    };
  }
  const initialPct = initialCount / total * 100;
  if (variant === 'added-counts-percent') {
    const newTotal = total + added;
    const answer = initialCount / newTotal * 100;
    return {
      ...base, context: [`A library has ${total} books. ${initialPct}% are storybooks. It receives ${added} more books, none of them storybooks.`],
      prompt: 'What percentage of the books are storybooks now?', answer: String(Number(answer.toFixed(2))), unit: '%',
      hint: 'Find the number of storybooks first. Add the new books to the total, then find the percentage.',
      explanation: `${total} × ${initialPct}% = ${initialCount} storybooks. The new total is ${total} + ${added} = ${newTotal}. ${initialCount} ÷ ${newTotal} × 100% = ${Number(answer.toFixed(2))}%.`,
      workedSteps: [{ text: 'Find the storybooks and the new total.', equation: `${total} × ${initialPct}% = ${initialCount}; ${total} + ${added} = ${newTotal}` }, { text: 'Find the new percentage.', equation: `${initialCount} ÷ ${newTotal} × 100% = ${Number(answer.toFixed(2))}%` }],
    };
  }
  const newCategory = initialCount + added;
  const newTotal = total + added;
  const answer = newCategory / newTotal * 100;
  return {
    ...base, context: [`A basket has ${total} oranges. ${initialPct}% are ripe. Then ${added} more ripe oranges are added.`],
    prompt: 'What percentage of the oranges are ripe now?', answer: String(Number(answer.toFixed(2))), unit: '%',
    hint: 'Find the ripe oranges and total oranges after the addition. Use the updated counts.',
    explanation: `${total} × ${initialPct}% = ${initialCount} ripe oranges at first. The new ripe count is ${initialCount} + ${added} = ${newCategory}; the new total is ${total} + ${added} = ${newTotal}. ${newCategory} ÷ ${newTotal} × 100% = ${Number(answer.toFixed(2))}%.`,
    workedSteps: [{ text: 'Update both counts.', equation: `${initialCount} + ${added} = ${newCategory}; ${total} + ${added} = ${newTotal}` }, { text: 'Find the percentage using the updated counts.', equation: `${newCategory} ÷ ${newTotal} × 100% = ${Number(answer.toFixed(2))}%` }],
  };
}
