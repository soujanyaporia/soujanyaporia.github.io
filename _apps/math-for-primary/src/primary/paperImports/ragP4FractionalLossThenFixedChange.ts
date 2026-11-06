import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-fractional-loss-then-fixed-change',
  level: 4,
  title: 'Bookmarks in the school shop',
  objective: 'Find a starting or final count when a fraction of a collection is sold and a known number of items is then sold or added.',
  skillIds: ['P4.S.FRAC.03', 'P4.S.MD.03'],
  canonicalPatternId: 'p4-fractional-loss-then-fixed-change',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) + index) % 10 + 10) % 10;
  const findFinal = slot >= 5 && slot < 9;
  const receives = slot === 9;
  const fractions: [number, number][] = [[1, 3], [1, 4], [2, 5], [2, 3], [3, 7], [3, 8], [5, 9]];
  const [soldParts, totalParts] = receives ? [1, 2] : rng.pick(fractions);
  const keptParts = totalParts - soldParts;
  const perPart = rng.int(12, 34);
  const opening = totalParts * perPart;
  const noon = keptParts * perPart;
  const fixed = receives ? soldParts * perPart + rng.int(10, 80) : rng.int(3, noon - 2);
  const closing = receives ? noon + fixed : noon - fixed;

  const context = [
    `The school shop had ${findFinal ? opening : 'some'} bookmarks when it opened.`,
    `Before lunch, it sold ${soldParts}/${totalParts} of those bookmarks.`,
    `After lunch, it ${receives ? 'received' : 'sold'} ${fixed} more bookmarks.`,
  ];
  if (!findFinal) context.push(`At closing time, the shop had ${closing} bookmarks.`);

  const fractionStep = {
    text: `Think of all the bookmarks at opening time as ${totalParts} equal parts. Find the fraction still in the shop at noon.`,
    equation: `1 − ${soldParts}/${totalParts} = ${keptParts}/${totalParts}`,
  };
  const workedSteps = findFinal ? [
    fractionStep,
    { text: 'Find the number of bookmarks in one equal part.', equation: `${opening} ÷ ${totalParts} = ${perPart}` },
    { text: 'Count the bookmarks in the parts left at noon.', equation: `${perPart} × ${keptParts} = ${noon}` },
    { text: 'Take away the bookmarks sold after lunch.', equation: `${noon} − ${fixed} = ${closing} bookmarks` },
  ] : [
    {
      text: receives ? 'Set aside the new bookmarks to find how many were there at noon.' : 'Put back the bookmarks sold after lunch to find how many were there at noon.',
      equation: `${closing} ${receives ? '−' : '+'} ${fixed} = ${noon}`,
    },
    fractionStep,
    { text: 'Use the number left at noon to find the size of one part.', equation: `${noon} ÷ ${keptParts} = ${perPart}` },
    { text: 'Count all the parts the shop had when it opened.', equation: `${perPart} × ${totalParts} = ${opening} bookmarks` },
  ];

  return {
    key,
    context,
    prompt: findFinal ? 'How many bookmarks did the shop have at closing time?' : 'How many bookmarks did the shop have when it opened?',
    answer: String(findFinal ? closing : opening),
    unit: 'bookmarks',
    hint: findFinal ? 'What fraction of the bookmarks was left at noon? Use that count before you take away the afternoon sale.' : 'Work back to noon first. How many equal parts of the opening stock were still in the shop then?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
