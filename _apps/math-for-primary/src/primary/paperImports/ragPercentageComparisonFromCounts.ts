import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-percentage-comparison-from-counts',
  level: 6,
  title: 'Compare quantities using percentages',
  objective: 'Choose the reference quantity, use matching units or a row total when needed, and calculate a percentage.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02'],
  canonicalPatternId: 'percentage-comparison-from-counts',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = (hashString(`${RAG_PATTERN.id}:${seed}`) % 3 + ((index % 3) + 3) % 3) % 3;
  const finish = (
    prompt: string,
    context: string[],
    percentage: number,
    workedSteps: Steps,
    extra: Partial<Question> = {},
  ): Question => ({
    key,
    prompt,
    context,
    answer: String(percentage),
    unit: '%',
    hint: 'Find the quantity being compared and the reference quantity. Divide, then multiply by 100.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const [first, second] = r.pick([
      ['Asha', 'Idris'], ['Mei', 'Ravi'], ['Hana', 'Joel'],
    ]);
    const [a, b] = r.pick([[5, 4], [5, 2], [2, 1], [4, 1], [5, 1]]);
    const scale = r.pick([6, 8, 10, 12]);
    const compared = a * scale;
    const reference = b * scale;
    const percentage = compared * 100 / reference;
    const answer = `${percentage}%`;
    const choices = r.shuffle([
      answer,
      `${percentage - 100}%`,
      `${reference * 100 / compared}%`,
      `${percentage + 100}%`,
    ]);
    return finish(
      `What is ${first}'s badge count as a percentage of ${second}'s badge count?`,
      [`${first} has ${compared} badges.`, `${second} has ${reference} badges.`],
      percentage,
      [
        {text: `${second}'s count is the reference, so it represents 100%.`},
        {text: `Compare ${first}'s count with that reference.`, equation: `${compared} ÷ ${reference} × 100% = ${percentage}%`},
        {text: `${first} has more badges, so the answer is greater than 100%.`},
      ],
      {
        answer,
        unit: undefined,
        choices,
        hint: `Use ${second}'s badge count as the denominator. The question compares the counts, rather than their difference.`,
      },
    );
  }

  if (variant === 1) {
    const hours = r.pick([2, 3, 4, 5, 7, 8, 9]);
    const comparedMinutes = hours * 60;
    const referenceMinutes = r.pick(
      [40, 50, 60, 75, 80, 100, 120, 150, 180, 200, 240].filter(minutes =>
        (comparedMinutes * 100) % minutes === 0 && comparedMinutes * 100 / minutes <= 500,
      ),
    );
    const percentage = comparedMinutes * 100 / referenceMinutes;
    return finish(
      "What is Lina's activity time as a percentage of Omar's activity time?",
      [`Lina's activity lasts ${hours} h.`, `Omar's activity lasts ${referenceMinutes} min.`],
      percentage,
      [
        {text: 'Write both durations in minutes.', equation: `${hours} × 60 = ${comparedMinutes} min`},
        {text: `Omar's ${referenceMinutes} minutes is the reference duration and represents 100%.`},
        {text: 'Divide the compared duration by the reference duration.', equation: `${comparedMinutes} ÷ ${referenceMinutes} × 100% = ${percentage}%`},
      ],
      {hint: "Convert Lina's hours to minutes first. Then compare her duration with Omar's duration."},
    );
  }

  const firstGirlsPercent = r.pick([25, 50, 75]);
  const secondGirlsPercent = r.pick([25, 50, 75].filter(value => value !== firstGirlsPercent));
  const classes = [firstGirlsPercent, secondGirlsPercent].map((percent, i) => {
    const total = r.pick([24, 28, 32, 36]);
    const girls = total * percent / 100;
    return {label: i === 0 ? '6C' : '6D', boys: total - girls, girls};
  });
  const selected = r.pick(classes);
  const category = r.pick(['Boys', 'Girls']);
  const columns = r.shuffle(['Boys', 'Girls']);
  const rows = r.shuffle(classes).map(group => ({
    label: group.label,
    values: columns.map(column => column === 'Girls' ? group.girls : group.boys),
  }));
  const total = selected.boys + selected.girls;
  const compared = category === 'Girls' ? selected.girls : selected.boys;
  const percentage = compared * 100 / total;
  return finish(
    `In Class ${selected.label}, what percentage of the pupils are ${category.toLowerCase()}?`,
    ['The table lists all the pupils in each class. Each pupil is counted once.'],
    percentage,
    [
      {text: `Use only the row for Class ${selected.label}. Add its boys and girls to find the whole class.`, equation: `${selected.boys} + ${selected.girls} = ${total} pupils`},
      {text: `There are ${compared} ${category.toLowerCase()} out of ${total} pupils in this class.`, equation: `${compared} ÷ ${total} × 100% = ${percentage}%`},
    ],
    {
      hint: `Find the total number of pupils in Class ${selected.label}. Use that total as the denominator.`,
      picture: {
        type: 'nanyang-p4',
        layout: 'table',
        caption: 'Pupils in two classes',
        rowHeader: 'Class',
        columns,
        rows,
      },
    },
  );
}
