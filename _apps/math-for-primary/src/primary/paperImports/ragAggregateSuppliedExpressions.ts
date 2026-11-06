import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p6-aggregate-supplied-expressions',
  level: 6,
  title: 'Combine amounts written with letters',
  objective: 'Combine component expressions, account for repeated quantities, and evaluate a requested total or subtotal.',
  skillIds: ['P6.S.ALG.02', 'P6.S.ALG.03', 'P6.S.ALG.04'],
  canonicalPatternId: 'p6-aggregate-supplied-expressions',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variantOffset = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = (variantOffset + (index >>> 0)) % 3;

  const make = (
    context: string[],
    prompt: string,
    values: number[],
    labels: string[],
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer: JSON.stringify(values.map(String)),
    structuredResponse: {
      kind: 'number-fields',
      fields: labels.map(label => ({ label })),
    },
    hint,
    workedSteps,
    explanation: workedSteps
      .map(step => [step.text, step.equation].filter(Boolean).join(' '))
      .join(' '),
  });

  if (variant === 0) {
    const extraCost = random.int(4, 8);
    const sketchbooks = random.int(3, 6);
    const notebooks = random.int(4, 8);
    const value = random.int(6, 11);
    const coefficient = sketchbooks + notebooks;
    const constant = sketchbooks * extraCost;
    const totalCost = coefficient * value + constant;

    return make(
      [
        'A stall sells sketchbooks and notebooks.',
        `A sketchbook costs (k + ${extraCost}) dollars.`,
        'A notebook costs k dollars.',
        `Lena buys ${sketchbooks} sketchbooks and ${notebooks} notebooks.`,
        'k is a positive whole number.',
      ],
      `(a) Complete the simplified expression for the total cost, (□k + □) dollars. (b) If k = ${value}, what is the total cost? Enter the two missing numbers for (a), then the cost in dollars for (b).`,
      [coefficient, constant, totalCost],
      ['(a) Number before k', '(a) Number added', '(b) Total cost in dollars'],
      'Count one k for every book. Each sketchbook also contributes its extra cost. Use the given value of k only for part (b).',
      [
        {
          text: 'Find the cost of all the sketchbooks.',
          equation: `${sketchbooks} × k + ${sketchbooks} × ${extraCost} = ${sketchbooks}k + ${constant}`,
        },
        {
          text: 'Add the cost of the notebooks and combine the k terms.',
          equation: `${sketchbooks}k + ${constant} + ${notebooks}k = ${coefficient}k + ${constant}`,
        },
        {
          text: `For part (b), replace k with ${value}. The result is in dollars.`,
          equation: `${coefficient} × ${value} + ${constant} = ${totalCost}`,
        },
      ],
    );
  }

  if (variant === 1) {
    const riverCoefficient = random.int(3, 5);
    const riverExtra = random.int(4, 8);
    const parkCoefficient = random.pick([2, 4, 5]);
    const parkReduction = random.int(2, 6);
    const hillCoefficient = random.pick([2, 4, 5]);
    const hillExtra = random.int(6, 9);
    const coefficient = riverCoefficient + parkCoefficient + hillCoefficient;
    const constant = riverExtra - parkReduction + hillExtra;

    return make(
      [
        'A cycle route has three sections, travelled one after another.',
        `The river section is (${riverCoefficient}k + ${riverExtra}) km long.`,
        `The park section is (${parkCoefficient}k − ${parkReduction}) km long.`,
        `The hill section is (${hillCoefficient}k + ${hillExtra}) km long.`,
        'k is a whole number and k is at least 4.',
      ],
      'Write the length of the whole route in its simplest form. Complete (□k + □) km by entering the number before k and the number added.',
      [coefficient, constant],
      ['Number before k', 'Number added'],
      'Add the three k terms together. Combine the ordinary numbers separately, keeping the subtraction sign.',
      [
        {
          text: 'Combine the k terms from the three sections.',
          equation: `${riverCoefficient}k + ${parkCoefficient}k + ${hillCoefficient}k = ${coefficient}k`,
        },
        {
          text: 'Combine the ordinary numbers.',
          equation: `${riverExtra} − ${parkReduction} + ${hillExtra} = ${constant}`,
        },
        {
          text: 'Put the two parts together to give the whole route length.',
          equation: `Total length = (${coefficient}k + ${constant}) km`,
        },
      ],
    );
  }

  const weekdayCoefficient = random.pick([2, 4, 5, 6]);
  const saturdayCoefficient = random.int(2, 4);
  const saturdayExtra = random.int(8, 15);
  const sundayCoefficient = random.pick([2, 4, 5]);
  const sundayReduction = random.int(3, 7);
  const value = random.int(4, 9) * 5;
  const weekdayTotalCoefficient = 5 * weekdayCoefficient;
  const weekendCoefficient = saturdayCoefficient + sundayCoefficient;
  const weekCoefficient = weekdayTotalCoefficient + weekendCoefficient;
  const constant = saturdayExtra - sundayReduction;
  const weekendTotal = weekendCoefficient * value + constant;

  return make(
    [
      'A school club folds paper cranes during one week.',
      `From Monday to Friday, the club folds ${weekdayCoefficient}d cranes each day.`,
      `On Saturday, the club folds (${saturdayCoefficient}d + ${saturdayExtra}) cranes.`,
      `On Sunday, the club folds (${sundayCoefficient}d − ${sundayReduction}) cranes.`,
      'd is a whole number and d is at least 4.',
    ],
    `(a) Complete the simplified expression for all seven days, (□d + □) cranes. (b) If d = ${value}, how many cranes does the club fold on Saturday and Sunday together? Enter the two missing numbers for (a), then the weekend count for (b).`,
    [weekCoefficient, constant, weekendTotal],
    ['(a) Number before d', '(a) Number added', '(b) Weekend count in cranes'],
    'Monday to Friday covers five days. For part (b), use just the two weekend expressions.',
    [
      {
        text: 'Find the number folded over the five weekdays.',
        equation: `5 × ${weekdayCoefficient}d = ${weekdayTotalCoefficient}d`,
      },
      {
        text: 'Add the two weekend amounts to obtain the whole-week expression.',
        equation: `${weekdayTotalCoefficient}d + ${saturdayCoefficient}d + ${saturdayExtra} + ${sundayCoefficient}d − ${sundayReduction} = ${weekCoefficient}d + ${constant}`,
      },
      {
        text: 'For part (b), combine Saturday and Sunday only.',
        equation: `${saturdayCoefficient}d + ${saturdayExtra} + ${sundayCoefficient}d − ${sundayReduction} = ${weekendCoefficient}d + ${constant}`,
      },
      {
        text: `Replace d with ${value} to find the weekend count.`,
        equation: `${weekendCoefficient} × ${value} + ${constant} = ${weekendTotal}`,
      },
    ],
  );
}
