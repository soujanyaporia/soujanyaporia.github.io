import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-repeated-quantities-fixed-additions',
  level: 5,
  title: 'Totals from equal amounts',
  objective: 'Multiply equal measurements, account for a removed amount, and convert or round the total.',
  skillIds: ['P5.S.RATE.02', 'P5.S.DEC.02', 'P4.S.DEC.04', 'P4.S.DEC.05'],
  canonicalPatternId: 'p5-repeated-quantities-fixed-additions',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variant = ((hashString(`${RAG_PATTERN.id}:${seed}`) + index) % 3 + 3) % 3;

  if (variant === 0) {
    const usedCm = random.pick([45, 55, 65, 85, 95, 105, 115, 125]);
    const pieceCount = random.pick([4, 5, 6, 7, 8, 9, 11, 12, 14, 16]);
    const pieceCm = random.pick([18, 22, 24, 28, 32, 36, 42, 48]);
    const remainingCm = pieceCount * pieceCm;
    const originalCm = remainingCm + usedCm;
    const usedMetres = (usedCm / 100).toFixed(2);
    const remainingMetres = (remainingCm / 100).toFixed(2);
    const answer = (originalCm / 100).toFixed(2);
    const workedSteps = [
      {
        text: 'Find the total length of the equal pieces.',
        equation: `${pieceCount} × ${pieceCm} = ${remainingCm} cm`,
      },
      {
        text: 'Convert that length to metres.',
        equation: `${remainingCm} ÷ 100 = ${remainingMetres} m`,
      },
      {
        text: 'Add the length cut off first.',
        equation: `${remainingMetres} + ${usedMetres} = ${answer} m`,
      },
    ];
    return {
      key,
      context: [
        `For a craft project, Amina cuts off ${usedMetres} m from a roll of cord.`,
        `She cuts all the cord left into ${pieceCount} equal pieces, each ${pieceCm} cm long.`,
      ],
      prompt: 'How long was the roll of cord at first? Give your answer in metres.',
      answer,
      unit: 'm',
      choices: random.shuffle([
        answer,
        remainingMetres,
        ((usedCm + pieceCm) / 100).toFixed(2),
        (originalCm / 10).toFixed(2),
      ]),
      hint: 'Find the length of all the pieces. Use metres for both lengths before adding.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (variant === 1) {
    const remainingCount = random.pick([64, 75, 86, 95, 110, 125, 150, 162, 175]);
    const removedCount = random.pick([7, 9, 12, 16, 18, 21]);
    const initialCount = remainingCount + removedCount;
    const unitGrams = random.pick([1037, 1264, 1486, 1728, 2143, 2357]);
    const unitKg = (unitGrams / 1000).toFixed(3);
    const totalGrams = remainingCount * unitGrams;
    const exactKg = (totalGrams / 1000).toFixed(3);
    const roundedTenths = Math.floor((totalGrams + 50) / 100);
    const answer = (roundedTenths / 10).toFixed(1);
    const workedSteps = [
      {
        text: 'Find how many tiles are delivered.',
        equation: `${initialCount} − ${removedCount} = ${remainingCount} tiles`,
      },
      {
        text: 'Multiply by the mass of one tile. Keep the full result.',
        equation: `${remainingCount} × ${unitKg} = ${exactKg} kg`,
      },
      {
        text: 'Round the total to one decimal place using its hundredths digit.',
        equation: `${exactKg} kg ≈ ${answer} kg`,
      },
    ];
    return {
      key,
      context: [
        `A supplier packs ${initialCount} identical tiles for a delivery.`,
        `Each tile has a mass of ${unitKg} kg.`,
        `${removedCount} tiles break and are taken out before delivery.`,
      ],
      prompt: 'What is the mass of the tiles delivered, in kilograms? Round your answer to 1 decimal place. You may use a calculator.',
      answer,
      unit: 'kg',
      hint: 'Count the tiles delivered first. Multiply by the mass of one tile, then round the final total.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  const gramsPerMeal = random.pick([48, 56, 64, 72, 75, 84, 92, 96]);
  const mealCount = random.pick([124, 136, 140, 153, 166, 180, 193, 216, 220, 247, 260, 283]);
  const totalGrams = gramsPerMeal * mealCount;
  const exactKg = (totalGrams / 1000).toFixed(3);
  const answer = String(Math.floor((totalGrams + 500) / 1000));
  const workedSteps = [
    {
      text: 'Find the rice needed for all the meals.',
      equation: `${mealCount} × ${gramsPerMeal} = ${totalGrams} g`,
    },
    {
      text: 'Convert grams to kilograms using 1000 g = 1 kg.',
      equation: `${totalGrams} ÷ 1000 = ${exactKg} kg`,
    },
    {
      text: 'Round the total to the nearest kilogram using its tenths digit.',
      equation: `${exactKg} kg ≈ ${answer} kg`,
    },
  ];
  return {
    key,
    context: [
      `A kitchen uses ${gramsPerMeal} g of rice for each meal.`,
      `The cook prepares ${mealCount} meals.`,
    ],
    prompt: 'Find the total mass of rice in kilograms. Give your answer to the nearest kilogram.',
    answer,
    unit: 'kg',
    hint: 'Multiply to find the total in grams, convert to kilograms, then round the total.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
