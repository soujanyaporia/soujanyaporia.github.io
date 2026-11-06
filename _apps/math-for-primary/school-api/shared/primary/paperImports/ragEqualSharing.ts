import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-equal-sharing',
  level: 5,
  title: 'Share amounts equally',
  objective: 'Combine or convert measurements, find an equal share, and round when asked.',
  skillIds: ['P5.S.DEC.02', 'P4.S.DEC.05', 'P4.S.DEC.06', 'P4.S.DEC.07'],
  canonicalPatternId: 'measurement-equal-sharing',
};

type Steps = NonNullable<Question['workedSteps']>;

function litres(ml: number): string {
  const whole = Math.floor(ml / 1000);
  const decimal = String(ml % 1000).padStart(3, '0').replace(/0+$/, '');
  return decimal ? `${whole}.${decimal}` : String(whole);
}

const MASS_CASES = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  .flatMap(totalKg => [3, 6, 7, 8, 9]
    .filter(bags => (totalKg * 100) % bags !== 0)
    .map(bags => ({ totalKg, bags })));

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  // Consecutive indices cover all four forms for any integer seed.
  const variant = ((hashString(String(seed)) >>> 0) + Math.trunc(index) % 4 + 4) % 4;
  const make = (
    context: string[], prompt: string, answer: string, unit: string,
    hint: string, workedSteps: Steps,
  ): Question => ({
    key, context, prompt, answer, unit, hint, workedSteps,
    explanation: workedSteps
      .map(step => [step.text, step.equation].filter(Boolean).join(' '))
      .join(' '),
  });

  if (variant < 2) {
    const cups = r.pick([5, 6, 8, 9]);
    const waterL = r.int(1, 2);
    const juiceOptions = Array.from({ length: 53 }, (_, i) => 80 + 10 * i)
      .filter(juice => {
        const total = waterL * 1000 + juice;
        return total % cups === 0 && total / cups <= 500;
      });
    const juiceMl = r.pick(juiceOptions);
    const totalMl = waterL * 1000 + juiceMl;
    const eachMl = totalMl / cups;
    const bothLitres = variant === 0;
    const juiceAmount = bothLitres ? `${litres(juiceMl)} L` : `${juiceMl} ml`;
    const context = [
      `A helper mixes ${waterL} L of water with ${juiceAmount} of fruit juice.`,
      `All the drink is shared equally among ${cups} cups.`,
    ];
    const steps: Steps = bothLitres ? [
      {
        text: 'Add the two volumes to find the total drink.',
        equation: `${waterL} + ${litres(juiceMl)} = ${litres(totalMl)} L`,
      },
      {
        text: 'Divide the total by the number of cups.',
        equation: `${litres(totalMl)} ÷ ${cups} = ${litres(eachMl)} L`,
      },
      {
        text: 'Convert each share to millilitres. There are 1000 ml in 1 L.',
        equation: `${litres(eachMl)} × 1000 = ${eachMl} ml`,
      },
    ] : [
      {
        text: 'Express the water volume in millilitres.',
        equation: `${waterL} × 1000 = ${waterL * 1000} ml`,
      },
      {
        text: 'Add the fruit juice to find the total drink.',
        equation: `${waterL * 1000} + ${juiceMl} = ${totalMl} ml`,
      },
      {
        text: 'Divide the total by the number of cups.',
        equation: `${totalMl} ÷ ${cups} = ${eachMl} ml`,
      },
    ];
    return make(
      context,
      'How many millilitres of drink are in each cup?',
      String(eachMl), 'ml',
      bothLitres
        ? 'Add the volumes, divide equally, then convert each share to millilitres.'
        : 'Change the litres to millilitres before adding and sharing.',
      steps,
    );
  }

  if (variant === 2) {
    const pots = r.pick([3, 4, 6, 8, 9]);
    const shareOptions = Array.from({ length: 26 }, (_, i) => 250 + 50 * i)
      .filter(ml => ml % 1000 !== 0 && ml * pots <= 9900 && ml * pots !== 6000);
    const eachMl = r.pick(shareOptions);
    const totalMl = eachMl * pots;
    return make(
      [
        `An art club has ${totalMl} ml of liquid glue.`,
        `All the glue is shared equally among ${pots} pots.`,
      ],
      'How many litres of glue are in each pot? Write your answer as a decimal.',
      litres(eachMl), 'L',
      'Find the millilitres in one pot, then divide by 1000 to change to litres.',
      [
        {
          text: 'Divide the total volume equally among the pots.',
          equation: `${totalMl} ÷ ${pots} = ${eachMl} ml`,
        },
        {
          text: 'There are 1000 ml in 1 L, so divide by 1000.',
          equation: `${eachMl} ÷ 1000 = ${litres(eachMl)} L`,
        },
      ],
    );
  }

  const { totalKg, bags } = r.pick(MASS_CASES);
  // Integer arithmetic gives exact half-up rounding to hundredths.
  const hundredths = Math.floor((totalKg * 200 + bags) / (2 * bags));
  const answer = `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}`;
  const thousandths = Math.floor(totalKg * 1000 / bags);
  const tail = (totalKg * 1000) % bags === 0 ? '' : '…';
  const preview = `${Math.floor(thousandths / 1000)}.${String(thousandths % 1000).padStart(3, '0')}${tail}`;
  const thirdDigit = thousandths % 10;
  return make(
    [
      `A grocer has ${totalKg} kg of oats.`,
      `All the oats are packed into ${bags} bags of equal mass.`,
    ],
    'What is the mass of oats in each bag, in kilograms? Round your answer to 2 decimal places.',
    answer, 'kg',
    'Divide the total mass by the number of bags. Use the third decimal digit to round.',
    [
      {
        text: 'Find the mass in one equal bag.',
        equation: `${totalKg} ÷ ${bags} = ${preview} kg`,
      },
      {
        text: thirdDigit >= 5
          ? `The third decimal digit is ${thirdDigit}, so increase the hundredths digit by 1.`
          : `The third decimal digit is ${thirdDigit}, so keep the hundredths digit unchanged.`,
        equation: `${preview} kg ≈ ${answer} kg (2 decimal places)`,
      },
    ],
  );
}
