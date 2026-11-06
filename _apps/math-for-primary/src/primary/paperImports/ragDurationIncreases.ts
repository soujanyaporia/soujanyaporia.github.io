import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-duration-increases',
  level: 3,
  title: 'Compare the time three children took',
  objective: 'Use two time differences to find the longest duration and how much longer it is than the shortest.',
  skillIds: ['P3.S.TIME.02', 'P2.S.TIME.02'],
  canonicalPatternId: 'p3-compare-durations-by-successive-increases',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const minutePart = rng.int(32, 46);
  const raviExtra = rng.int(19, 28);
  const linaExtra = rng.int(14, 21);
  const meiMinutes = 60 + minutePart;
  const raviMinutes = meiMinutes + raviExtra;
  const linaMinutes = raviMinutes + linaExtra;
  const wholeHours = Math.floor(linaMinutes / 60);
  const minutesLeft = linaMinutes % 60;
  const extraMinutes = raviExtra + linaExtra;

  const workedSteps = [
    { text: 'Write Mei’s time in minutes.', equation: `1 h ${minutePart} min = 60 min + ${minutePart} min = ${meiMinutes} min` },
    { text: 'Ravi worked longer than Mei.', equation: `${meiMinutes} min + ${raviExtra} min = ${raviMinutes} min` },
    { text: 'Ravi took less time than Lina, so add the extra minutes to Ravi’s time to get Lina’s time.', equation: `${raviMinutes} min + ${linaExtra} min = ${linaMinutes} min` },
    { text: 'Group Lina’s minutes into whole hours and minutes left over.', equation: `${linaMinutes} min = ${wholeHours * 60} min + ${minutesLeft} min = ${wholeHours} h ${minutesLeft} min` },
    { text: 'From Mei to Ravi and then to Lina, both extra amounts count.', equation: `${raviExtra} min + ${linaExtra} min = ${extraMinutes} min` },
  ];

  return {
    key,
    context: [
      `Mei spent 1 h ${minutePart} min building a model boat.`,
      `Ravi worked on his boat for ${raviExtra} minutes longer than Mei did.`,
      `Ravi worked on his boat for ${linaExtra} minutes less than Lina did.`,
    ],
    prompt: '(a) How long did Lina work on her boat? Give your answer in hours and minutes. (b) How many more minutes did Lina spend on her boat than Mei spent on hers?',
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        { label: '(a) Lina’s time (whole hours)' },
        { label: '(a) Lina’s time (minutes left over)' },
        { label: '(b) Extra time compared with Mei (minutes)' },
      ],
    },
    answer: JSON.stringify([String(wholeHours), String(minutesLeft), String(extraMinutes)]),
    hint: 'Start with Mei’s time. Who worked longer than Mei? Who worked longer than Ravi? Remember that 60 minutes make an hour.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
