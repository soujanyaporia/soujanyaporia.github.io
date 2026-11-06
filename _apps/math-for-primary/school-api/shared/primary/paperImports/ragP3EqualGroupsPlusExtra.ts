import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p3-equal-groups-plus-extra',
  level: 3,
  title: 'Find the whole count',
  objective: 'Multiply to count equal groups, then add what was left or given free.',
  skillIds: ['P3.S.MD.03', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-equal-groups-plus-an-extra-amount',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));

  if (rng.chance(0.5)) {
    const daily = rng.int(18, 32);
    const left = rng.int(36, 70);
    const days = 7;
    const used = days * daily;
    const start = used + left;
    return {
      key,
      context: [
        `For one full week, Siti takes ${daily} beads from a jar each day to make bracelets.`,
        `When the week is over, ${left} beads remain in the jar.`,
      ],
      prompt: 'How many beads were in the jar before Siti started?',
      choices: rng.shuffle([start, used, start - daily, start + daily].map(String)),
      answer: String(start),
      unit: 'beads',
      hint: 'How many days did Siti take beads from the jar? Count all the beads she took, then include those still in the jar.',
      workedSteps: [
        { text: 'Count the days Siti took beads.', equation: '1 week = 7 days' },
        { text: 'Find how many beads she took over the whole week.', equation: `${days} × ${daily} = ${used} beads` },
        { text: 'Put those beads back in the count to find how many she started with.', equation: `${left} + ${used} = ${start} beads` },
      ],
      explanation: `The jar started with the ${used} beads Siti took over seven days and the ${left} beads still inside. Together they make ${start} beads.`,
      proof: { op: '+', a: { op: '*', a: days, b: daily }, b: left },
    };
  }

  const groupSize = rng.pick([3, 4, 5, 7, 8, 9]);
  const free = rng.int(10, 23);
  const leastPaid = free * groupSize;
  const leastTotal = leastPaid + free;
  return {
    key,
    context: [
      `At a school fair, Jun gets 1 free badge for each group of ${groupSize} badges he pays for.`,
      `He receives ${free} free badges from this offer.`,
    ],
    prompt: 'Counting both paid and free badges, what is the least number of badges Jun could get from the stall?',
    answer: String(leastTotal),
    unit: 'badges',
    hint: 'Each free badge needs a full group of paid badges. How many such groups does Jun need?',
    workedSteps: [
      { text: `Each group earns one free badge, so Jun needs ${free} full groups.` },
      { text: 'Buying just those groups gives the smallest paid count.', equation: `${free} × ${groupSize} = ${leastPaid} paid badges` },
      { text: 'Include the badges the stall gives him free.', equation: `${leastPaid} + ${free} = ${leastTotal} badges` },
    ],
    explanation: `With ${leastPaid} paid badges, Jun earns all ${free} free badges. With one fewer paid badge, he would be short of the last group. His least total is ${leastTotal} badges.`,
    proof: { op: '+', a: { op: '*', a: free, b: groupSize }, b: free },
  };
}
