import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-combined-work-rates',
  level: 5,
  title: 'Working together at steady rates',
  objective: 'Combine two steady rates to find a working time, recover one individual rate, or check statements about their output.',
  skillIds: ['P5.S.RATE.01', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-combined-work-rates',
};

const verdicts = ['True', 'False', 'Not possible to tell'] as const;
const pairedVerdict = (first: string, second: string) => `(a) ${first}; (b) ${second}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const red = r.pick([12, 16, 24, 28, 32, 36]);
    const combined = r.pick([40, 60, 70, 90]);
    const blue = combined - red;
    const minutes = r.int(3, 18) * 5;
    const total = combined * minutes;
    return make(
      [
        'Two printers are making leaflets for a school fair.',
        `The red printer makes ${red} leaflets per minute.`,
        `The blue printer makes ${blue} leaflets per minute.`,
        `They start together and keep printing at these steady rates until they have made ${total} leaflets altogether.`,
      ],
      'How many minutes do the printers need?',
      String(minutes),
      'Find how many leaflets both printers make in one minute. Then use the total number of leaflets.',
      [
        {
          text: 'Both printers work during the same minute, so add their outputs for one minute.',
          equation: `${red} + ${blue} = ${combined} leaflets per minute`,
        },
        {
          text: 'Divide the required number of leaflets by the number made in one minute.',
          equation: `${total} ÷ ${combined} = ${minutes} minutes`,
        },
        {
          text: 'Check the total made by the two printers in this time.',
          equation: `${red} × ${minutes} + ${blue} × ${minutes} = ${total} leaflets`,
        },
      ],
      {
        unit: 'minutes',
        proof: {op: '/', a: total, b: {op: '+', a: red, b: blue}},
      },
    );
  }

  if (variant === 1) {
    const minutes = r.pick([10, 30, 40, 50]);
    const ben = r.pick([35, 40, 45, 50, 55, 60, 70, 75, 80, 85]);
    const asha = r.int(7, 18) * 3;
    const combined = asha + ben;
    const total = combined * minutes;
    return make(
      [
        'Asha and Ben type different pages for a class newsletter.',
        `They both type for ${minutes} minutes, starting together and working at steady rates without a break.`,
        `Together they type ${total} words.`,
        `Ben types ${ben} words per minute.`,
      ],
      'How many words does Asha type per minute?',
      String(asha),
      'Find their total number of words per minute, then take away Ben’s contribution.',
      [
        {
          text: 'Divide all the words by the time both children spent typing.',
          equation: `${total} ÷ ${minutes} = ${combined} words per minute together`,
        },
        {
          text: 'Remove Ben’s words per minute to find Asha’s words per minute.',
          equation: `${combined} − ${ben} = ${asha} words per minute`,
        },
        {
          text: 'Check by finding how many words each child types during the whole period.',
          equation: `${asha} × ${minutes} + ${ben} × ${minutes} = ${total} words`,
        },
      ],
      {
        unit: 'words/min',
        proof: {op: '-', a: {op: '/', a: total, b: minutes}, b: ben},
      },
    );
  }

  const x = r.int(3, 8);
  const interval = r.pick([3, 4, 6, 8]);
  const xPerInterval = x * interval;
  const yPerInterval = xPerInterval + r.pick([-4, -2, 0, 2, 4]);
  const blocks = r.int(2, 8);
  const seconds = interval * blocks;
  const combinedPerInterval = xPerInterval + yPerInterval;
  const actual = combinedPerInterval * blocks;
  const claimed = actual + (r.chance(0.5) ? 0 : r.pick([-2, -1, 1, 2]) * blocks);
  const first = yPerInterval > xPerInterval ? 'True' : 'False';
  const second = actual === claimed ? 'True' : 'False';
  const relation = yPerInterval > xPerInterval ? '>' : yPerInterval < xPerInterval ? '<' : '=';
  const comparisonText = yPerInterval > xPerInterval
    ? 'Machine Y prints more pages in the same time, so statement (a) is true.'
    : yPerInterval < xPerInterval
      ? 'Machine Y prints fewer pages in the same time, so statement (a) is false.'
      : 'The machines print the same number of pages in the same time. Machine Y is not faster, so statement (a) is false.';
  return make(
    [
      'Two machines print separate pages for a workbook.',
      `Machine X prints ${x} pages every second.`,
      `Machine Y prints ${yPerInterval} pages every ${interval} seconds.`,
      `Both machines start together and work at steady rates without stopping for ${seconds} seconds.`,
      '(a) In the same amount of time, Machine Y prints more pages than Machine X.',
      `(b) They produce ${claimed} pages altogether during this time.`,
    ],
    'For each statement, decide: True, False or Not possible to tell. Select the option showing both answers.',
    pairedVerdict(first, second),
    'Compare the machines over the same number of seconds. Then count their combined output for the whole printing time.',
    [
      {
        text: `Find Machine X’s output in ${interval} seconds so that the time intervals match.`,
        equation: `${x} × ${interval} = ${xPerInterval} pages`,
      },
      {
        text: comparisonText,
        equation: `${yPerInterval} ${relation} ${xPerInterval}; (a) ${first}`,
      },
      {
        text: `Add the outputs to find how many pages both machines print in each ${interval}-second interval.`,
        equation: `${xPerInterval} + ${yPerInterval} = ${combinedPerInterval} pages`,
      },
      {
        text: 'Count the complete intervals and find their total output.',
        equation: `${seconds} ÷ ${interval} = ${blocks}; ${combinedPerInterval} × ${blocks} = ${actual} pages`,
      },
      {
        text: actual === claimed
          ? 'The calculated total matches the claim, so statement (b) is true.'
          : 'The calculated total differs from the claim, so statement (b) is false.',
        equation: `${actual} ${actual === claimed ? '=' : '≠'} ${claimed}; (b) ${second}`,
      },
    ],
    {choices: verdicts.flatMap(a => verdicts.map(b => pairedVerdict(a, b)))},
  );
}
