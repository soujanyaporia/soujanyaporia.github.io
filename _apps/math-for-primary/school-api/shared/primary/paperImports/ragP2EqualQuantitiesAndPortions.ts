import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-equal-quantities-and-portions',
  level: 2,
  title: 'Weigh a group of rice sacks',
  objective: 'Use a level balance to find the mass of one sack, then find the mass of several equal sacks.',
  skillIds: ['P2.S.MEASURE.02', 'P2.S.AS.01', 'P2.S.MD.01'],
  canonicalPatternId: 'p2-equal-quantities-and-portions',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const firstKg = rng.int(2, 4);
  const secondKg = rng.int(2, 4);
  const besideSackKg = rng.int(1, Math.min(firstKg, secondKg) - 1);
  const sharedGrams = rng.pick([600, 750, 800]);
  const count = rng.pick([2, 3, 4, 5]);
  const weightsKg = firstKg + secondKg;
  const sackKg = weightsKg - besideSackKg;
  const totalKg = count * sackKg;

  const kgBlock = (kg: number) => ({ size: kg * 1000, label: `${kg} kg` });
  const gramBlock = { size: sharedGrams, label: '◆', tone: 'orange' as const };
  const sackPan = [
    { size: sackKg * 1000, label: '1 sack', tone: 'green' as const },
    kgBlock(besideSackKg),
    gramBlock,
  ];
  const weightsPan = [kgBlock(firstKg), kgBlock(secondKg), gramBlock];
  const [left, right] = rng.shuffle([sackPan, weightsPan]);

  const workedSteps = [
    { text: `Take a ${sharedGrams} g weight off each pan. The pans still balance.` },
    { text: 'Add the weights left on the pan without the sack.', equation: `${firstKg} kg + ${secondKg} kg = ${weightsKg} kg` },
    { text: 'Take away the weight beside the sack to find the mass of one sack.', equation: `${weightsKg} kg − ${besideSackKg} kg = ${sackKg} kg` },
    { text: `Count ${count} sacks of the same mass.`, equation: `${count} × ${sackKg} kg = ${totalKg} kg` },
  ];
  return {
    key,
    context: ['The two pans balance. All the rice sacks have the same mass.'],
    prompt: `How much do ${count} rice sacks weigh altogether?`,
    picture: {
      type: 'paper', layout: 'bars', heading: 'What is on each pan?',
      rows: [{ label: 'Left pan', parts: left }, { label: 'Right pan', parts: right }],
      caption: `Each ◆ stands for a ${sharedGrams} g weight.`,
    },
    answer: `${totalKg} kg`,
    choices: rng.shuffle([sackKg, totalKg, count * weightsKg, count * weightsKg - besideSackKg]).map(kg => `${kg} kg`),
    hint: 'Look for the same weight on both pans. What would be left on each pan if you took those two weights off?',
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    workedSteps,
  };
}
