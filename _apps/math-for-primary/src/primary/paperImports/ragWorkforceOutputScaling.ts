import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-rag-workforce-output-scaling',
  level: 5,
  title: 'Plan time and team size',
  objective: 'Use steady productivity or daily use to find a duration or the number of workers needed.',
  skillIds: ['P5.S.RATE.02', 'P5.S.FRAC.06'],
  canonicalPatternId: 'p5-workforce-output-scaling',
} as const;

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function fraction(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  return d === 1 ? String(n) : `${n}/${d}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = ((Math.trunc(index) % 4) + 4) % 4;
  const variant = ((hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) + offset) % 4;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    unit: string,
    hint: string,
    steps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const perMinute = r.pick([9, 12, 15, 18, 21, 24]);
    const referenceMinutes = r.pick([3, 5, 6, 7]);
    const referenceOutput = perMinute * referenceMinutes;
    const machines = r.int(3, 6);
    const combinedRate = perMinute * machines;
    const minutes = r.pick([5, 7, 9, 11, 13, 15, 17, 19].filter(n => combinedRate * n !== 480));
    const targetOutput = combinedRate * minutes;
    return make(
      [
        `One bottling machine fills ${referenceOutput} bottles in ${referenceMinutes} minutes.`,
        `${machines} of these machines begin together and run without a break. Each fills bottles at the same steady rate.`,
      ],
      `How many minutes will they need to fill ${targetOutput} bottles altogether?`,
      String(minutes),
      'min',
      'Find what one machine fills in a minute, then find what all the machines fill in a minute.',
      [
        {text: 'Find the rate of one machine.', equation: `${referenceOutput} ÷ ${referenceMinutes} = ${perMinute} bottles per minute`},
        {text: 'Combine the rates of all the machines.', equation: `${perMinute} × ${machines} = ${combinedRate} bottles per minute`},
        {text: 'Divide the required number of bottles by the combined rate.', equation: `${targetOutput} ÷ ${combinedRate} = ${minutes} minutes`},
      ],
    );
  }

  if (variant === 1) {
    const beads = r.pick([4, 6, 8, 9]);
    const commonRate = r.pick([4, 6, 8]);
    const originalFactor = r.int(2, 5);
    const newFactor = r.pick([2, 3, 4, 5].filter(n => n !== originalFactor));
    const blocks = r.int(2, 5);
    const originalRate = commonRate * originalFactor;
    const newRate = commonRate * newFactor;
    const originalDays = newFactor * blocks;
    const days = originalFactor * blocks;
    const originalDailyUse = beads * originalRate;
    const totalBeads = originalDailyUse * originalDays;
    const newDailyUse = beads * newRate;
    return make(
      [
        `A craft club starts with a full box of beads. Each bracelet uses ${beads} beads.`,
        `The box is used up after ${originalDays} days when the club makes ${originalRate} bracelets each day. No beads are wasted.`,
      ],
      `If the club starts with the same full box and makes ${newRate} bracelets each day, how many days will the beads last?`,
      String(days),
      'days',
      'Find the number of beads in the full box. Then use the new number of beads needed each day.',
      [
        {text: 'Find the original daily use of beads.', equation: `${originalRate} × ${beads} = ${originalDailyUse} beads per day`},
        {text: 'Find how many beads fill the box.', equation: `${originalDailyUse} × ${originalDays} = ${totalBeads} beads`},
        {text: 'Find the daily use with the new plan.', equation: `${newRate} × ${beads} = ${newDailyUse} beads per day`},
        {text: 'Find how many days the same full box will last.', equation: `${totalBeads} ÷ ${newDailyUse} = ${days} days`},
      ],
    );
  }

  if (variant === 2) {
    const originalWorkers = r.pick([2, 4, 6]);
    const newWorkers = r.pick([3, 5, 7, 8]);
    const [n, d] = r.pick([[1, 4], [1, 3], [3, 8], [2, 5], [5, 12]] as const);
    const originalTime = fraction(n, d);
    const oneWorkerTime = fraction(originalWorkers * n, d);
    const answer = fraction(originalWorkers * n, d * newWorkers);
    const choices = r.shuffle([
      answer,
      originalTime,
      fraction(n * newWorkers, d * originalWorkers),
      fraction(n, d * newWorkers),
    ]);
    return make(
      [
        `A team of ${originalWorkers} cleaners finishes cleaning a hall in ${originalTime} hour.`,
        'Each cleaner works at the same steady rate. In either team, all cleaners start together and work without a break.',
      ],
      `How long would ${newWorkers} cleaners need for that hall? Choose the time in hours.`,
      answer,
      'h',
      'First imagine one cleaner doing the whole job. Then share that work equally among the new team.',
      [
        {text: 'One cleaner would need this long to do all the work.', equation: `${originalWorkers} × ${originalTime} = ${oneWorkerTime} hours`},
        {text: `Each of the ${newWorkers} cleaners does 1/${newWorkers} of the work, so takes this fraction of the one-cleaner time.`, equation: `${oneWorkerTime} × 1/${newWorkers} = ${answer} hour`},
      ],
      {choices, requireSimplified: true},
    );
  }

  const referenceWorkers = r.int(2, 5);
  const referenceHours = r.pick([3, 4, 5, 6]);
  const productivity = r.pick([6, 8, 9, 12, 15]);
  const referenceOutput = productivity * referenceWorkers * referenceHours;
  const targetHours = r.pick([2, 3, 4, 5, 6, 8].filter(n => n !== referenceHours));
  const workers = r.pick([2, 3, 4, 5, 6, 7, 8, 9].filter(n =>
    n !== referenceWorkers && n * targetHours !== referenceWorkers * referenceHours,
  ));
  const outputPerWorker = productivity * targetHours;
  const targetOutput = outputPerWorker * workers;
  return make(
    [
      `At a packing table, ${referenceWorkers} workers pack ${referenceOutput} boxes in ${referenceHours} hours.`,
      'Every worker packs boxes at the same steady rate. All workers start together and work without a break.',
    ],
    `How many workers must work for the full ${targetHours} hours to pack ${targetOutput} boxes?`,
    String(workers),
    'workers',
    'Find how many boxes one worker packs in an hour. Then find what one worker can pack in the new time.',
    [
      {text: 'Find the hourly output of the reference team.', equation: `${referenceOutput} ÷ ${referenceHours} = ${productivity * referenceWorkers} boxes per hour`},
      {text: 'Find the hourly output of one worker.', equation: `${productivity * referenceWorkers} ÷ ${referenceWorkers} = ${productivity} boxes per worker per hour`},
      {text: 'Find what one worker packs in the available time.', equation: `${productivity} × ${targetHours} = ${outputPerWorker} boxes`},
      {text: 'Find the number of workers needed.', equation: `${targetOutput} ÷ ${outputPerWorker} = ${workers} workers`},
    ],
  );
}
