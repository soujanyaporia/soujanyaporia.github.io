import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-sum-of-segments-or-lengths',
  level: 3,
  title: 'Find the length of a bike ride',
  objective: 'Add two route lengths in metres, then give the total in kilometres and metres.',
  skillIds: ['P3.S.MEASURE.03', 'P3.S.MEASURE.02', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-sum-of-segments-or-lengths',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const firstKm = rng.int(1, 4);
  const firstExtraM = rng.int(63, 79) * 10;
  const secondM = rng.int(1, 4) * 1000 + rng.int(41, 79) * 10;
  const firstLabel = `${firstKm} km ${firstExtraM} m`;
  const firstM = firstKm * 1000 + firstExtraM;
  const totalM = firstM + secondM;
  const wholeKm = Math.floor(totalM / 1000);
  const remainingM = totalM % 1000;

  const workedSteps = [
    {
      text: 'From the library to the theatre, change the kilometres to metres and add the extra metres.',
      equation: `${firstLabel} = ${firstKm * 1000} m + ${firstExtraM} m = ${firstM} m`,
    },
    {
      text: 'Add the distance from the theatre to the orchard to get the length of the whole ride.',
      equation: `${firstM} m + ${secondM} m = ${totalM} m`,
    },
    {
      text: 'Each group of 1000 m makes 1 km. Write the whole kilometres and the metres left over.',
      equation: `${totalM} m = ${wholeKm} km ${remainingM} m`,
    },
  ];

  return {
    key,
    prompt: 'Mei cycles from the library to the theatre and then to the orchard. How far does she cycle in all? Write the distance in kilometres and metres.',
    picture: {
      type: 'paper', layout: 'timeline',
      points: [
        {label: 'Library', icon: 'book'},
        {label: 'Theatre', icon: 'ticket'},
        {label: 'Orchard', icon: 'fruit'},
      ],
      gaps: [firstLabel, `${secondM} m`],
    },
    structuredResponse: {kind: 'number-pair', firstLabel: 'Whole kilometres', secondLabel: 'Remaining metres'},
    answer: JSON.stringify([String(wholeKm), String(remainingM)]),
    hint: 'Follow the two arrows. Use 1 km = 1000 m to write both distances in metres before you add.',
    workedSteps,
    explanation: `The two paths measure ${firstM} m and ${secondM} m. Together they measure ${totalM} m, so Mei cycles ${wholeKm} km ${remainingM} m.`,
  };
}
