import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p5-rag-rate-comparison',
  level: 5,
  title: 'Compare steady rates',
  objective: 'Compare two steady rates using equal time intervals or whole-task completion times, and find the difference between unit rates.',
  skillIds: ['P5.S.RATE.01', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-rate-comparison',
} as const;

function explain(steps: NonNullable<Question['workedSteps']>): string {
  return steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variant = random.int(0, 2);

  if (variant === 0) {
    const pagesR = random.int(3, 8);
    const secondsS = random.pick([2, 4, 5]);
    const possibleAmounts = Array.from({ length: 27 }, (_, offset) => offset + 9)
      .filter(amount => amount % secondsS !== 0);
    const pagesS = random.pick(possibleAmounts);
    const duration = secondsS * random.pick([3, 4, 6]);
    const rateS = pagesS / secondsS;
    const outputR = pagesR * duration;
    const outputS = pagesS * (duration / secondsS);
    const total = outputR + outputS;
    const claimOffset = random.pick([-1, 0, 1]) * random.int(1, 6);
    const claimedTotal = total + claimOffset;
    const firstJudgement = rateS > pagesR ? 'True' : 'False';
    const secondJudgement = claimedTotal === total ? 'True' : 'False';
    const judgements = ['True', 'False', 'Not possible to tell'];
    const choices = judgements.flatMap(first => judgements.map(second =>
      `(a) ${first}, (b) ${second}`,
    ));
    const fasterPrinter = rateS > pagesR ? 'Printer S' : 'Printer R';
    const steps: NonNullable<Question['workedSteps']> = [
      {
        text: 'Find how many pages each printer produces in one second.',
        equation: `Printer R produces ${pagesR} pages per second.`,
      },
      {
        text: 'Divide the pages from Printer S by its number of seconds.',
        equation: `${pagesS} ÷ ${secondsS} = ${rateS} pages per second`,
      },
      {
        text: `${fasterPrinter} produces more pages per second, so statement (a) is ${firstJudgement}.`,
      },
      {
        text: `Find the output of Printer R in ${duration} seconds.`,
        equation: `${pagesR} × ${duration} = ${outputR} pages`,
      },
      {
        text: `Printer S completes ${duration / secondsS} printing intervals in ${duration} seconds.`,
        equation: `${pagesS} × (${duration} ÷ ${secondsS}) = ${outputS} pages`,
      },
      {
        text: `Add the outputs and compare the result with the stated total of ${claimedTotal} pages. Statement (b) is ${secondJudgement}.`,
        equation: `${outputR} + ${outputS} = ${total} pages`,
      },
    ];
    return {
      key,
      context: [
        `Printer R makes ${pagesR} pages every second.`,
        `Printer S makes ${pagesS} pages every ${secondsS} seconds.`,
        `Both printers start together and run at steady rates for ${duration} seconds.`,
      ],
      prompt: `Judge both statements. (a) Printer S works faster than Printer R. (b) Together, the printers produce ${claimedTotal} pages in ${duration} seconds. Choose True, False or Not possible to tell for each statement.`,
      answer: `(a) ${firstJudgement}, (b) ${secondJudgement}`,
      choices: random.shuffle(choices),
      hint: 'Compare the pages produced in one second. Then work out how many pages each printer produces during the full printing time.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  if (variant === 1) {
    const slowerRate = random.int(3, 10) * 5;
    const difference = random.int(1, 6) * 5;
    const fasterRate = slowerRate + difference;
    const firstIsFaster = random.chance(0.5);
    const rateP = firstIsFaster ? fasterRate : slowerRate;
    const rateQ = firstIsFaster ? slowerRate : fasterRate;
    const minutesP = random.pick([2, 3, 4]);
    const minutesQ = random.pick([5, 6, 8]);
    const copiesP = rateP * minutesP;
    const copiesQ = rateQ * minutesQ;
    const winner = firstIsFaster ? 'Printer P' : 'Printer Q';
    const wrongDifference = rateP + rateQ;
    const choices = ['Printer P', 'Printer Q'].flatMap(printer =>
      [difference, wrongDifference].map(amount => `(a) ${printer}, (b) ${amount} copies`),
    );
    const steps: NonNullable<Question['workedSteps']> = [
      {
        text: 'Find the number of copies Printer P makes in one minute.',
        equation: `${copiesP} ÷ ${minutesP} = ${rateP} copies per minute`,
      },
      {
        text: 'Find the number of copies Printer Q makes in one minute.',
        equation: `${copiesQ} ÷ ${minutesQ} = ${rateQ} copies per minute`,
      },
      {
        text: `${winner} makes more copies in the same time, so it is the answer to part (a).`,
        equation: `${fasterRate} > ${slowerRate}`,
      },
      {
        text: 'For part (b), subtract the smaller one-minute output from the larger one.',
        equation: `${fasterRate} − ${slowerRate} = ${difference} copies`,
      },
    ];
    return {
      key,
      context: [
        'Two school printers work at steady rates.',
        `Printer P makes ${copiesP} copies in ${minutesP} minutes.`,
        `Printer Q makes ${copiesQ} copies in ${minutesQ} minutes.`,
      ],
      prompt: '(a) Which printer works faster? (b) How many extra copies does the faster printer make in one minute? Choose the answer that gives both parts.',
      answer: `(a) ${winner}, (b) ${difference} copies`,
      choices: random.shuffle(choices),
      hint: 'Find each printer’s output in one minute before comparing them. Use the same one-minute outputs to find the difference.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  const names = random.pick([
    ['Mira', 'Ravi'],
    ['Aina', 'Zaki'],
    ['Mei', 'Arun'],
  ]);
  const [firstName, secondName] = names;
  const denominators = [3, 5, 7, 8, 9, 10, 12];
  const firstDenominator = random.pick(denominators);
  const secondDenominator = random.pick(denominators.filter(value => value !== firstDenominator));
  const firstMinutes = random.int(2, 6);
  const firstTotal = firstDenominator * firstMinutes;
  const possibleTimes = [2, 3, 4, 5, 6].filter(minutes =>
    minutes !== firstMinutes && minutes * secondDenominator !== firstTotal,
  );
  const secondMinutes = random.pick(possibleTimes);
  const secondTotal = secondDenominator * secondMinutes;
  const winner = firstTotal < secondTotal ? firstName : secondName;
  const shorterTime = Math.min(firstTotal, secondTotal);
  const longerTime = Math.max(firstTotal, secondTotal);
  const steps: NonNullable<Question['workedSteps']> = [
    {
      text: `${firstName} needs ${firstMinutes} minutes for one of ${firstDenominator} equal parts. Find the time for all the parts.`,
      equation: `${firstDenominator} × ${firstMinutes} = ${firstTotal} minutes`,
    },
    {
      text: `${secondName} needs ${secondMinutes} minutes for one of ${secondDenominator} equal parts. Find the time for the whole board.`,
      equation: `${secondDenominator} × ${secondMinutes} = ${secondTotal} minutes`,
    },
    {
      text: 'Compare the times needed to finish one whole board.',
      equation: `${shorterTime} < ${longerTime}`,
    },
    {
      text: `They start together. ${winner} needs less time and finishes first.`,
    },
  ];
  return {
    key,
    context: [
      `${firstName} and ${secondName} each have an unpainted board of the same size. They start together and each paints at a steady rate.`,
      `${firstName} paints 1/${firstDenominator} of a board in ${firstMinutes} minutes.`,
      `${secondName} paints 1/${secondDenominator} of a board in ${secondMinutes} minutes.`,
    ],
    prompt: 'Who finishes painting a whole board first?',
    answer: winner,
    choices: random.shuffle([firstName, secondName, 'They finish together']),
    hint: 'Count how many equal parts make a whole board. Find each person’s time for all the parts, then compare.',
    workedSteps: steps,
    explanation: explain(steps),
  };
}
