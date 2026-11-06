import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5s-paper-rag-free-unit-promotions',
  level: 5,
  title: 'Count people with free places',
  objective: 'Find the number of paying people and add the free places earned by complete promotional groups.',
  skillIds: ['P5.S.RATE.02'],
  canonicalPatternId: 'p5-free-unit-promotions',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const threshold = r.pick([3, 4, 5, 6, 7, 9]);
  const completeGroups = r.int(1, 9);
  const remainder = r.int(0, threshold - 1);
  const paidPlaces = completeGroups * threshold + remainder;
  const price = r.pick([11, 12, 14, 16, 20, 22, 24]);
  const totalPayment = paidPlaces * price;
  const people = paidPlaces + completeGroups;
  const event = r.pick(['a puppet show', 'an art workshop', 'a garden tour']);
  const dollars = (amount: number) => `$${amount.toFixed(2)}`;
  const workedSteps = [
    {
      text: 'Divide the payment by the price of one paid place.',
      equation: `${dollars(totalPayment)} ÷ ${dollars(price)} = ${paidPlaces} paid places`,
    },
    {
      text: `Each complete group of ${threshold} paid places earns one free place. ${remainder === 0 ? 'There are no paid places left over.' : `The ${remainder} paid places left over do not earn another free place.`}`,
      equation: `${paidPlaces} ÷ ${threshold} = ${completeGroups} remainder ${remainder}`,
    },
    {
      text: `All ${completeGroups} free places are used. Add the people using paid places and free places.`,
      equation: `${paidPlaces} + ${completeGroups} = ${people} people`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `A group books places for ${event}.`,
      `Each paid place costs ${dollars(price)}.`,
      `Every ${threshold} paid places earn 1 extra place free. The offer is applied to the whole booking.`,
      'Every free place earned is used. Each person uses exactly one place.',
      `The booking costs ${dollars(totalPayment)} in all. There are no other charges.`,
    ],
    prompt: 'How many people are in the group?',
    answer: String(people),
    unit: 'people',
    hint: 'Find how many places were paid for. Then count the complete groups that earn free places.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
