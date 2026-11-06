import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rag-adding-removing-observations',
  level: 6,
  title: 'Adding and removing observations',
  objective: 'Use changes in totals and counts to find an added value, a new average or an original group size.',
  skillIds: ['P6.S.AVG.01', 'P6.S.AVG.02'],
  canonicalPatternId: 'p6-average-adding-removing-observations',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`${RAG_PATTERN.id}:variant:${seed}`) >>> 0) + (index >>> 0)) % 4;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    steps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    explanation: steps.map(step => `${step.text}${step.equation ? ` ${step.equation}.` : ''}`).join(' '),
    workedSteps: steps,
    ...extra,
  });

  if (variant === 0) {
    const count = r.int(4, 7);
    const oldAverage = r.int(36, 64);
    const change = r.pick([-3, -2, -1, 1, 2, 3]);
    const newAverage = oldAverage + change;
    const oldTotal = count * oldAverage;
    const newCount = count + 1;
    const newTotal = newCount * newAverage;
    const addedScore = newTotal - oldTotal;

    return make(
      [
        `Nadia plays ${count} rounds of a word game. Her average score for these rounds is ${oldAverage} points.`,
        `After one more round, her average score for all the rounds is ${newAverage} points.`,
        'Each round has a maximum score of 100 points.',
      ],
      'How many points did Nadia score in the extra round?',
      String(addedScore),
      'Find the total score before and after the extra round, then subtract.',
      [
        {text: 'Find the total score before the extra round.', equation: `${count} × ${oldAverage} = ${oldTotal} points`},
        {text: 'Count all the rounds, including the extra round.', equation: `${count} + 1 = ${newCount} rounds`},
        {text: 'Use the new average to find the new total score.', equation: `${newCount} × ${newAverage} = ${newTotal} points`},
        {text: 'The difference between the totals is the score in the extra round.', equation: `${newTotal} − ${oldTotal} = ${addedScore} points`},
      ],
      {unit: 'points'},
    );
  }

  if (variant === 1) {
    const count = r.int(4, 6);
    const oldAverage = r.int(14, 22);
    const decrease = r.pick([0.5, 1, 1.5]);
    const addedMass = oldAverage - (count + 1) * decrease;
    const oldTotal = count * oldAverage;
    const newTotal = oldTotal + addedMass;
    const newCount = count + 1;
    const newAverage = newTotal / newCount;
    // These represent ignoring the addition, choosing the new mass, and
    // averaging the two stated masses without accounting for group size.
    const choices = r.shuffle([
      String(newAverage),
      String(oldAverage),
      String(addedMass),
      String((oldAverage + addedMass) / 2),
    ]);

    return make(
      [
        `A delivery centre has ${count} parcels with an average mass of ${oldAverage} kg.`,
        `One more parcel, with a mass of ${addedMass} kg, joins the group.`,
      ],
      'What is the average mass of all the parcels now?',
      String(newAverage),
      'Find the original total mass, add the extra mass, then divide by the new number of parcels.',
      [
        {text: 'Find the original total mass.', equation: `${count} × ${oldAverage} = ${oldTotal} kg`},
        {text: 'Add the mass of the extra parcel.', equation: `${oldTotal} + ${addedMass} = ${newTotal} kg`},
        {text: 'Include the extra parcel in the count.', equation: `${count} + 1 = ${newCount} parcels`},
        {text: 'Divide the new total mass by the new count.', equation: `${newTotal} ÷ ${newCount} = ${newAverage} kg`},
      ],
      {unit: 'kg', choices},
    );
  }

  if (variant === 2) {
    const removedCount = r.int(3, 6);
    const multiplier = r.pick([5, 6, 7].filter(value => removedCount * value >= 20));
    const classCount = removedCount * multiplier;
    const oldAverage = r.int(70, 80);
    const rise = r.pick([1, 2, 3]);
    const remainingAverage = oldAverage + rise;
    const removedAverage = oldAverage - (multiplier - 1) * rise;
    const removedTotal = removedCount * removedAverage;
    const shortfall = removedCount * oldAverage - removedTotal;
    const remainingCount = classCount - removedCount;

    return make(
      [
        `A class takes a quiz marked out of 100. The class average is ${oldAverage} marks.`,
        `The results of ${removedCount} pupils, whose average is ${removedAverage} marks, are left out. The average of the remaining pupils is then ${remainingAverage} marks.`,
      ],
      '(a) Find the total marks of the pupils whose results were left out. (b) How many pupils were in the class before any results were left out?',
      JSON.stringify([String(removedTotal), String(classCount)]),
      'First find the total marks left out. Compare this with the same number of pupils scoring the original average, then use the rise in average.',
      [
        {text: '(a) Multiply the average of the pupils left out by their number.', equation: `${removedCount} × ${removedAverage} = ${removedTotal} marks`},
        {text: '(b) Find how far their total falls below the total at the original class average.', equation: `${removedCount} × ${oldAverage} − ${removedTotal} = ${shortfall} marks`},
        {text: 'The remaining pupils balance this shortfall with extra marks above the original average. Find their average increase.', equation: `${remainingAverage} − ${oldAverage} = ${rise} marks`},
        {text: 'Divide the extra marks by the increase per pupil to find the number of remaining pupils.', equation: `${shortfall} ÷ ${rise} = ${remainingCount} pupils`},
        {text: 'Add back the pupils whose results were left out.', equation: `${remainingCount} + ${removedCount} = ${classCount} pupils`},
      ],
      {
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            {label: '(a) Total marks left out (marks)'},
            {label: '(b) Original class size (pupils)'},
          ],
        },
      },
    );
  }

  const count = r.int(4, 7);
  const centre = r.int(23, 29);
  const readings: number[] = [];
  for (let pair = 0; pair < Math.floor(count / 2); pair += 1) {
    const spread = r.int(1, 4);
    readings.push(centre - spread, centre + spread);
  }
  if (count % 2 !== 0) readings.push(centre);
  const times = r.shuffle(readings);
  const decrease = r.pick([0.5, 1]);
  const oldTotal = times.reduce((sum, value) => sum + value, 0);
  const oldAverage = oldTotal / count;
  const targetAverage = oldAverage - decrease;
  const newCount = count + 1;
  const targetTotal = newCount * targetAverage;
  const nextTime = targetTotal - oldTotal;

  return make(
    [
      `During training, Hana runs the same 100 m route ${count} times.`,
      `Her times, in seconds, are ${times.join(', ')}.`,
      `After one more run, she wants the average time for all her runs to be exactly ${decrease} seconds less than the average for these ${count} runs.`,
    ],
    'What time must Hana record for her next run?',
    String(nextTime),
    'Calculate the current average, subtract the required decrease, then work out the total time needed after one more run.',
    [
      {text: 'Add the recorded times.', equation: `${times.join(' + ')} = ${oldTotal} seconds`},
      {text: 'Find the current average time.', equation: `${oldTotal} ÷ ${count} = ${oldAverage} seconds`},
      {text: 'A smaller running time is faster. Subtract the required decrease.', equation: `${oldAverage} − ${decrease} = ${targetAverage} seconds`},
      {text: 'Count the runs after one more run.', equation: `${count} + 1 = ${newCount} runs`},
      {text: 'Find the total time needed for the target average.', equation: `${newCount} × ${targetAverage} = ${targetTotal} seconds`},
      {text: 'Subtract the time already recorded to find the next running time.', equation: `${targetTotal} − ${oldTotal} = ${nextTime} seconds`},
    ],
    {unit: 'seconds'},
  );
}
