import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-sharing-a-combined-total',
  level: 3,
  title: 'Share two collections equally',
  objective: 'Find how many items there are in both collections, then work out how many go in each equal group.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-sharing-a-combined-total',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const groups = rng.int(4, 9);

  if (rng.int(0, 1) === 0) {
    const perBag = rng.int(72, 96);
    const total = groups * perBag;
    // Only the combined collection divides evenly among the bags.
    const firstTin = groups * rng.int(25, 45) + rng.int(1, groups - 1);
    const secondTin = total - firstTin;

    return {
      key,
      context: [
        `The art club has ${firstTin} beads in one tin and ${secondTin} beads in another tin.`,
        `The club puts all the beads into ${groups} bags, with the same number in every bag.`,
      ],
      prompt: 'How many beads go in each bag?',
      answer: String(perBag),
      unit: 'beads',
      hint: 'Find how many beads the club can pack from both tins. Then think about one bag’s share.',
      workedSteps: [
        { text: 'Count the beads from both tins.', equation: `${firstTin} + ${secondTin} = ${total}` },
        { text: 'Share those beads equally among the bags.', equation: `${total} ÷ ${groups} = ${perBag}` },
      ],
      explanation: `The two tins hold ${total} beads altogether. Putting ${perBag} beads in each of the ${groups} bags uses all ${total} beads.`,
      proof: { op: '/', a: { op: '+', a: firstTin, b: secondTin }, b: groups },
    };
  }

  const roundStickers = rng.int(32, 60);
  const multiplier = rng.int(2, 5);
  const starStickers = roundStickers * multiplier;
  // Choose an exact share that leaves between 75 and 160 stickers for Iman to bring.
  const perTeam = rng.int(Math.ceil((starStickers + 75) / groups), Math.floor((starStickers + 160) / groups));
  const total = groups * perTeam;
  const extraStars = total - starStickers;

  return {
    key,
    context: [
      `Leela has ${roundStickers} round stickers.`,
      `She has ${multiplier} times as many star stickers as round stickers.`,
    ],
    prompt: `(a) How many star stickers does Leela have?\n(b) Iman brings ${extraStars} star stickers. Leela and Iman share all their star stickers equally among ${groups} teams. How many star stickers does each team get?`,
    answer: JSON.stringify([String(starStickers), String(perTeam)]),
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Leela’s star stickers',
      secondLabel: '(b) Star stickers per team',
    },
    unit: 'star stickers',
    hint: 'Use the round stickers to find Leela’s number of star stickers. Which stickers will the teams share?',
    workedSteps: [
      { text: '(a) Multiply to find how many star stickers Leela has.', equation: `${roundStickers} × ${multiplier} = ${starStickers}` },
      { text: '(b) Add Iman’s star stickers to Leela’s star stickers.', equation: `${starStickers} + ${extraStars} = ${total}` },
      { text: 'Divide the star stickers equally among the teams.', equation: `${total} ÷ ${groups} = ${perTeam}` },
    ],
    explanation: `Leela has ${starStickers} star stickers. With Iman’s ${extraStars} star stickers, there are ${total} to share. Each team gets ${perTeam} star stickers.`,
  };
}
