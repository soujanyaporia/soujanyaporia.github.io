import { Rng, hashString } from '../../engine/random';
import type { Proof, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-successive-measurement-changes',
  level: 2 as const,
  title: 'Follow two changes in a measurement',
  objective: 'Use the middle measurement to find a final length or the mass that was added.',
  skillIds: ['P2.S.AS.01', 'P2.S.MEASURE.01', 'P2.S.MEASURE.02'],
  canonicalPatternId: 'successive-measurement-changes',
};

type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const slot = (((offset + index) % 6) + 6) % 6;

  function entry(context: string[], prompt: string, unit: 'cm' | 'm' | 'kg', answer: number, hint: string, workedSteps: Step[], proof: Proof): Question {
    return {
      key, context, prompt: `${prompt} Show your working.`, unit, answer: String(answer), hint, workedSteps, proof,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (slot < 4) {
    const gold = rng.int(125, 170);
    const shorterBy = rng.int(26, 48);
    const longerBy = rng.int(6, 22);
    const white = gold - shorterBy;
    const red = white + longerBy;
    const known = `The gold ribbon is ${gold} cm long.`;
    const firstLink = `The white ribbon is ${shorterBy} cm shorter than the gold ribbon.`;
    const secondLink = `The red ribbon is ${longerBy} cm longer than the white ribbon.`;
    const context = slot % 2 === 0 ? [known, firstLink, secondLink] : [secondLink, firstLink, known];
    return entry(context, 'How long is the red ribbon?', 'cm', red,
      'Start with the ribbon whose length you know. Which ribbon can you find next?', [
        { text: 'Take the difference away from the gold ribbon’s length to find the white ribbon’s length.', equation: `${gold} − ${shorterBy} = ${white} cm` },
        { text: 'The red ribbon is longer than the white ribbon, so add the extra length.', equation: `${white} + ${longerBy} = ${red} cm` },
      ], { op: '+', a: { op: '-', a: gold, b: shorterBy }, b: longerBy });
  }

  if (slot === 4) {
    const pond = rng.int(200, 320);
    const longerBy = rng.int(31, 59);
    const shorterBy = rng.int(12, 29);
    const hill = pond + longerBy;
    const lake = hill - shorterBy;
    return entry([
      `The pond path is ${pond} m long.`,
      `The hill path is ${longerBy} m longer than the pond path.`,
      `The lake path is ${shorterBy} m shorter than the hill path.`,
    ], 'How long is the lake path?', 'm', lake,
    'Which path do you need to find before you can work out the length of the lake path?', [
      { text: 'Add the extra distance to find the length of the hill path.', equation: `${pond} + ${longerBy} = ${hill} m` },
      { text: 'Take the difference away from the hill path’s length to find the length of the lake path.', equation: `${hill} − ${shorterBy} = ${lake} m` },
    ], { op: '-', a: { op: '+', a: pond, b: longerBy }, b: shorterBy });
  }

  const start = rng.int(145, 198);
  const sold = rng.int(37, 78);
  const finalMass = rng.int(215, 298);
  const left = start - sold;
  const delivered = finalMass - left;
  return entry([
    `A stall started the day with ${start} kg of potatoes.`,
    `It sold ${sold} kg before lunch.`,
    `After a delivery, the stall had ${finalMass} kg of potatoes.`,
  ], 'How many kilograms of potatoes were delivered?', 'kg', delivered,
  'How much was still at the stall just before the delivery?', [
    { text: 'Subtract the mass sold to find how much was left.', equation: `${start} − ${sold} = ${left} kg` },
    { text: 'Take the mass that was left away from the mass after the delivery.', equation: `${finalMass} − ${left} = ${delivered} kg` },
  ], { op: '-', a: finalMass, b: { op: '-', a: start, b: sold } });
}
