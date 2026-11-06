import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-whole-from-known-part-or-combined-counts',
  level: 4,
  title: 'Find the starting number',
  objective: 'Work out how many equal parts a count represents and use those parts to find the starting number.',
  skillIds: ['P4.S.FRAC.03'],
  canonicalPatternId: 'p4-whole-from-known-part-or-combined-counts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['count used', 'count left', 'groups within half'] as const);

  if (form === 'groups within half') {
    const chess = rng.int(8, 15);
    const sorting = rng.int(6, 12);
    const stacking = rng.int(6, 14);
    const cardPlayers = sorting + stacking;
    const inHall = chess + cardPlayers;
    const whole = 2 * inHall;
    return {
      key,
      context: [
        'All the pupils in the games club met in the hall. Half went outside and the rest stayed in the hall.',
        `Of those who stayed, ${chess} played chess. All the others played a card game.`,
        `After the card game, ${sorting} of its players sorted the cards and the other ${stacking} stacked chairs.`,
      ],
      prompt: 'How many pupils met in the hall at the start? Show your working on paper.',
      answer: String(whole), unit: 'pupils',
      hint: 'Start with the card players. Who else stayed in the hall?',
      workedSteps: [
        { text: 'Count everyone who played the card game.', equation: `${sorting} + ${stacking} = ${cardPlayers}` },
        { text: 'Add the chess players to count everyone who stayed.', equation: `${cardPlayers} + ${chess} = ${inHall}` },
        { text: 'Those who stayed made up one half. Count both halves.', equation: `${inHall} × 2 = ${whole}` },
      ],
      explanation: `${inHall} pupils stayed in the hall. Another ${inHall} went outside, so ${whole} pupils were there at the start.`,
      proof: { op: '*', a: { op: '+', a: chess, b: { op: '+', a: sorting, b: stacking } }, b: 2 },
    };
  }

  const [usedParts, allParts] = rng.pick([[2, 5], [3, 7], [2, 7], [4, 7], [3, 8], [5, 8]]);
  const beadsPerPart = rng.int(17, 29);
  const left = form === 'count left';
  const knownParts = left ? allParts - usedParts : usedParts;
  const knownBeads = knownParts * beadsPerPart;
  const whole = allParts * beadsPerPart;
  const fraction = `${usedParts}/${allParts}`;
  const firstStep = left
    ? { text: 'Find the fraction of the beads left in the box.', equation: `1 − ${fraction} = ${knownParts}/${allParts}` }
    : { text: `Lian used ${usedParts} of the ${allParts} equal parts.`, equation: `${usedParts} parts = ${knownBeads} beads` };

  return {
    key,
    context: [
      `Lian used ${fraction} of the beads in a box to make bracelets.`,
      left ? `There were ${knownBeads} beads left in the box.` : `She used ${knownBeads} beads for the bracelets.`,
    ],
    prompt: 'How many beads were in the box before Lian made the bracelets?',
    answer: String(whole), unit: 'beads',
    ...(left ? { choices: rng.shuffle([knownBeads, usedParts * beadsPerPart, whole, whole + beadsPerPart].map(String)) } : {}),
    hint: left ? 'How many equal parts were left after Lian used the beads?' : 'How many equal parts did Lian use? Find the number of beads in one part.',
    workedSteps: [
      firstStep,
      { text: `Divide the ${knownBeads} beads into ${knownParts} equal parts.`, equation: `${knownBeads} ÷ ${knownParts} = ${beadsPerPart}` },
      { text: `The full box held ${allParts} equal parts.`, equation: `${beadsPerPart} × ${allParts} = ${whole}` },
    ],
    explanation: `The beads ${left ? 'left in the box' : 'used for the bracelets'} make up ${knownParts} equal parts. Each part has ${beadsPerPart} beads, so the box started with ${whole} beads.`,
    proof: { op: '*', a: { op: '/', a: knownBeads, b: knownParts }, b: allParts },
  };
}
