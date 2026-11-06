import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-craft-club-equal-shares',
  level: 3,
  title: 'Share beads at craft club',
  objective: 'Count everyone who shares the beads, then find how many beads each child gets.',
  skillIds: ['P3.S.MD.04', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-sharing-with-derived-recipient-count',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const namedChild = rng.chance(0.5);
  const firstCount = namedChild ? 1 : rng.int(2, 4);
  const secondCount = rng.int(namedChild ? 3 : 2, 9 - firstCount);
  const children = firstCount + secondCount;
  const share = rng.int(19, 33);
  const total = children * share;

  const participants = namedChild
    ? `Mei and ${secondCount} classmates sit together at craft club.`
    : `At craft club, ${firstCount} children sit at the red table and ${secondCount} children sit at the blue table.`;
  const countStep = namedChild
    ? 'Count Mei as well as her classmates.'
    : 'Count the children at both tables.';
  const workedSteps = [
    { text: countStep, equation: `${firstCount} + ${secondCount} = ${children} children` },
    { text: 'Divide the beads equally among all the children.', equation: `${total} ÷ ${children} = ${share} beads` },
  ];

  return {
    key,
    context: [participants, `These children share all ${total} beads so that every child gets the same number.`],
    prompt: 'How many beads does each child get?',
    answer: String(share),
    unit: 'beads',
    hint: 'How many children need a share? Use that number to divide the beads.',
    workedSteps,
    explanation: `There are ${children} children. Sharing ${total} beads equally gives each child ${share} beads.`,
    proof: { op: '/', a: total, b: { op: '+', a: firstCount, b: secondCount } },
  };
}
