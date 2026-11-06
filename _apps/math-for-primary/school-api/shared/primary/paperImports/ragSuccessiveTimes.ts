import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-successive-times',
  level: 2,
  title: 'Follow two activities on the clock',
  objective: 'Find when one activity ends and use that time to find when the next activity ends.',
  skillIds: ['P2.S.TIME.01', 'P2.S.TIME.02'],
  canonicalPatternId: 'p2-follow-successive-intervals',
};

function clockReading(minutes: number) {
  const hour = String(Math.floor(minutes / 60) % 12 || 12);
  const minute = String(minutes % 60).padStart(2, '0');
  const period = minutes < 720 ? 'am' : 'pm';
  return { hour, minute, period, text: `${hour}:${minute} ${period}` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const guided = rng.chance(0.5);
  const startMinutes = rng.pick([8, 9, 13, 14, 15]) * 60 + 5 * rng.int(0, 11);
  const building = rng.pick([10, 20, 35, 45]);
  const flying = guided ? rng.pick([30, 60]) : rng.pick([10, 15, 25, 40]);
  const flyingWords = guided ? (flying === 30 ? 'half an hour' : 'an hour') : `${flying} minutes`;
  const start = clockReading(startMinutes);
  const ready = clockReading(startMinutes + building);
  const finish = clockReading(startMinutes + building + flying);
  const flight = `As soon as their kites are ready, the children fly them for ${flyingWords}.`;
  const workedSteps = [
    { text: 'Count on to the time when the kites are ready.', equation: `${start.text} + ${building} minutes = ${ready.text}` },
    ...(guided ? [{ text: 'Write the flying time in minutes.', equation: `${flying === 30 ? 'Half an hour' : 'One hour'} = ${flying} minutes` }] : []),
    { text: 'Count on from when the kites are ready.', equation: `${ready.text} + ${flying} minutes = ${finish.text}` },
  ];
  const common = {
    key, workedSteps,
    hint: 'Find when the kites are ready. Start counting the flying time from there.',
    explanation: `The kites are ready at ${ready.text}. The children fly them for ${flying} more minutes and finish at ${finish.text}.`,
  };

  if (guided) {
    return {
      ...common,
      context: ['The children build their kites at the kite club.', flight],
      picture: {
        type: 'paper', layout: 'timeline',
        points: [{ label: `Start building: ${start.text}` }, { label: 'Kites ready: ?' }, { label: 'Finish flying: ?' }],
        gaps: [`${building} minutes`, '? minutes'],
      },
      prompt: 'Fill in the two clock times and the missing number of minutes on the timeline.',
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          { label: `Kites ready (${start.period}) — hour` }, { label: 'Kites ready — minutes' },
          { label: 'Time spent flying (minutes)' },
          { label: `Finish flying (${start.period}) — hour` }, { label: 'Finish flying — minutes' },
        ],
      },
      answer: JSON.stringify([ready.hour, ready.minute, String(flying), finish.hour, finish.minute]),
    };
  }

  return {
    ...common,
    context: [`The children start building kites at ${start.text}.`, `It takes ${building} minutes to build the kites.`, flight],
    prompt: 'What time do the children finish flying their kites? Write the time with am or pm, like 7:05 am.',
    answer: finish.text,
  };
}
