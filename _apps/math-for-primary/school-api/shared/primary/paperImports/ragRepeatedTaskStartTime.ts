import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-repeated-task-start-time',
  level: 2,
  title: 'Find when the first task began',
  objective: 'Add equal task durations and count backwards from a finish time after noon.',
  skillIds: ['P2.S.AS.01', 'P2.S.TIME.02'],
  canonicalPatternId: 'repeated-task-duration-to-start-before-noon',
};

function clockTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [
    ...(hours ? [`${hours} ${hours === 1 ? 'hour' : 'hours'}`] : []),
    ...(rest ? [`${rest} ${rest === 1 ? 'minute' : 'minutes'}`] : []),
  ].join(' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const name = r.pick(['Asha', 'Mei', 'Sara', 'Lina']);
  const count = r.pick([4, 5]);
  const each = r.pick([15, 20, 25]);
  const afterNoon = r.pick([5, 10, 15, 20, 25, 35, 40, 45, 50, 55]);
  const total = count * each;
  const finish = 12 * 60 + afterNoon;
  const beforeNoon = total - afterNoon;
  const answer = clockTime(finish - total);
  const finishLabel = clockTime(finish);
  const workedSteps = [
    {
      text: 'Noon is 12:00 pm. Find the finishing time.',
      equation: `12:00 pm + ${afterNoon} minutes = ${finishLabel}`,
    },
    {
      text: `Add the time for all ${count} cards.`,
      equation: `${Array.from({length: count}, () => each).join(' + ')} = ${total} minutes`,
    },
    {
      text: 'Count backwards to noon first.',
      equation: `${finishLabel} − ${afterNoon} minutes = 12:00 pm`,
    },
    {
      text: 'Find how much time is still left to count back.',
      equation: `${total} − ${afterNoon} = ${beforeNoon} minutes = ${durationText(beforeNoon)}`,
    },
    {
      text: 'Count back the remaining time from noon to find the start.',
      equation: `12:00 pm − ${durationText(beforeNoon)} = ${answer}`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `What time did ${name} start decorating the first card? Write your answer like 8:05 am.`,
    context: [
      `${name} decorates ${count} cards, one after another, with no breaks.`,
      `Each card takes ${each} minutes to decorate.`,
      `${name} finishes the last card ${afterNoon} minutes after noon.`,
    ],
    answer,
    hint: 'Find the total time for all the cards. Work backwards from the finishing time, using noon to help.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
