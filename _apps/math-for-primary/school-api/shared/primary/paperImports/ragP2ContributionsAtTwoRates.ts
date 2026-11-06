import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-contributions-at-two-rates',
  level: 2,
  title: 'Count the wheels on the toy shelf',
  objective: 'Find the wheels on one kind of toy, then use its wheels per toy when asked for a toy count.',
  skillIds: ['P2.S.MD.01', 'P2.S.AS.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-contributions-at-two-rates',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const findCars = rng.chance(0.5);
  const bicycleCount = findCars ? rng.pick([2, 4, 6, 8, 10]) : rng.int(2, 10);
  const carCount = findCars ? rng.int(2, 10) : rng.int(6, 10);
  const bicycleWheels = bicycleCount * 2;
  const carWheels = carCount * 4;
  const total = bicycleWheels + carWheels;

  const context = [
    findCars
      ? `The toy shelf holds ${bicycleCount} bicycles and some cars.`
      : `The toy shelf holds ${carCount} cars and some bicycles.`,
    findCars ? 'Each bicycle has 2 wheels. Each car has 4 wheels.' : 'Each car has 4 wheels.',
    `The toys on the shelf have ${total} wheels in all.`,
  ];
  const workedSteps = findCars ? [
    { text: 'Count the wheels on the bicycles.', equation: `${bicycleCount} × 2 = ${bicycleWheels} wheels` },
    { text: 'Take away the bicycle wheels to find the wheels on the cars.', equation: `${total} − ${bicycleWheels} = ${carWheels} wheels` },
    { text: 'Each set of 4 car wheels belongs to one car.', equation: `${carWheels} ÷ 4 = ${carCount} cars` },
  ] : [
    { text: 'Count the wheels on the cars.', equation: `${carCount} × 4 = ${carWheels} wheels` },
    { text: 'All the other wheels belong to the bicycles.', equation: `${total} − ${carWheels} = ${bicycleWheels} wheels` },
  ];

  return {
    key,
    context,
    prompt: findCars ? 'How many cars are on the shelf?' : 'How many wheels are on the bicycles altogether?',
    answer: String(findCars ? carCount : bicycleWheels),
    unit: findCars ? 'cars' : 'wheels',
    hint: findCars
      ? 'Set aside the bicycle wheels first. How many groups of 4 can you make with the wheels left?'
      : 'Count the car wheels first. Which wheels are left when you take those away?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
