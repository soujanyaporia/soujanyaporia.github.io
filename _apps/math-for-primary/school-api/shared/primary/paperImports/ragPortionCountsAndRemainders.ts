import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-portion-counts-and-remainders',
  level: 5,
  title: 'Pack portions and find what remains',
  objective: 'Convert measurements to common units, account for earlier use, and find an exact portion count or the amount left after filling complete portions.',
  skillIds: ['P5.S.DEC.02', 'P5.S.VOL.05', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-portion-counts-and-remainders',
};

const major = (minor: number): string => String(minor / 1000);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((Math.trunc(seed) + Math.trunc(index)) % 3 + 3) % 3;
  const finish = (
    context: string[],
    prompt: string,
    answer: string,
    unit: string,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    choices?: string[],
  ): Question => ({
    key, context, prompt, answer, unit, hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
    ...(choices ? {choices} : {}),
  });

  if (variant === 0) {
    const capacity = r.pick([200, 250, 350, 400, 450]);
    const total = r.int(6, 20) * capacity + 50 * r.int(1, capacity / 50 - 1);
    const full = Math.floor(total / capacity);
    const packed = full * capacity;
    const left = total - packed;
    return finish(
      [
        `At a class picnic, a jug holds ${major(total)} L of lemon drink.`,
        `Each cup holds ${capacity} ml. Lina fills as many cups completely as possible. Nothing is spilled.`,
      ],
      'How much drink is left in the jug? Give your answer in millilitres.',
      String(left),
      'ml',
      'Change litres to millilitres. Find how many full cups fit, then subtract the drink in those cups.',
      [
        {text: 'There are 1000 millilitres in one litre.', equation: `${major(total)} × 1000 = ${total} ml`},
        {text: `${full} cups can be filled completely.`, equation: `${full} × ${capacity} = ${packed} ml`},
        {text: `The leftover is less than ${capacity} ml, so it cannot fill another cup.`, equation: `${total} − ${packed} = ${left} ml`},
      ],
    );
  }

  if (variant === 1) {
    const portion = r.pick([40, 50, 80, 100, 125]);
    const targetCount = r.int(9, 24);
    let usedPortions = r.int(2, 6);
    // Keep the displayed starting mass different from the reference example.
    if ((targetCount + usedPortions) * portion === 1200) usedPortions += 1;
    const used = usedPortions * portion;
    const total = targetCount * portion + used;
    const available = total - used;
    const count = available / portion;
    const choices = r.shuffle([
      count,
      count + usedPortions,
      count - usedPortions,
      count + 2 * usedPortions,
    ].map(String));
    return finish(
      [
        `A baker starts with ${major(total)} kg of oats.`,
        `The baker uses ${used} g to make biscuits.`,
        `All the remaining oats are packed into bags of ${portion} g each.`,
      ],
      'How many bags are filled?',
      String(count),
      'bags',
      'Change kilograms to grams, subtract the oats used, then divide by the mass in each bag.',
      [
        {text: 'Write the starting mass in grams.', equation: `${major(total)} × 1000 = ${total} g`},
        {text: 'Subtract the oats used for biscuits.', equation: `${total} − ${used} = ${available} g`},
        {text: 'Divide by the mass in one bag. There are no oats left over.', equation: `${available} ÷ ${portion} = ${count} bags`},
      ],
      choices,
    );
  }

  const firstMass = r.pick([1100, 1300, 1700, 1900]);
  const firstCount = r.int(12, 28);
  const smallMass = r.pick([200, 400, 500, 600, 800]);
  const available = r.int(7, 23) * smallMass + 50 * r.int(1, smallMass / 50 - 1);
  const firstPacked = firstCount * firstMass;
  const total = firstPacked + available;
  const smallCount = Math.floor(available / smallMass);
  const secondPacked = smallCount * smallMass;
  const left = available - secondPacked;
  return finish(
    [
      `A shop has ${major(total)} kg of rice.`,
      `The shop first fills ${firstCount} bags with ${major(firstMass)} kg of rice in each bag.`,
      `It then fills as many smaller bags completely as possible, putting ${major(smallMass)} kg in each one. No rice is lost.`,
    ],
    'How much rice is left unpacked? Give your answer in kilograms.',
    major(left),
    'kg',
    'Find the mass in the first group of bags. Use what remains to fill complete smaller bags, then find the unpacked mass.',
    [
      {
        text: 'Convert all three masses to grams to calculate with whole numbers.',
        equation: `${major(total)} × 1000 = ${total} g; ${major(firstMass)} × 1000 = ${firstMass} g; ${major(smallMass)} × 1000 = ${smallMass} g`,
      },
      {text: 'Find the mass packed in the first group.', equation: `${firstCount} × ${firstMass} = ${firstPacked} g`},
      {text: 'Find the rice available for the smaller bags.', equation: `${total} − ${firstPacked} = ${available} g`},
      {
        text: `${smallCount} smaller bags can be filled. The leftover is less than ${smallMass} g, so another complete bag cannot be filled.`,
        equation: `${smallCount} × ${smallMass} = ${secondPacked} g; ${available} − ${secondPacked} = ${left} g`,
      },
      {text: 'Convert the unpacked mass back to kilograms.', equation: `${left} ÷ 1000 = ${major(left)} kg`},
    ],
  );
}
