import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-quantity-unit-rate',
  level: 5,
  title: 'Prices for packs and measured amounts',
  objective: 'Find priced quantities from equal packs, measured amounts or related areas, then calculate the cost.',
  skillIds: ['P5.S.RATE.02', 'P5.S.FRAC.07', 'P4.S.DEC.06', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-quantity-and-unit-rate-conversion',
} as const;

const money = (cents: number): string => (cents / 100).toFixed(2);
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const start = (hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) % 3;
  const position = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = (start + position) % 3;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: Steps,
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
    const bags = r.pick([3, 4, 5, 6, 8, 9]);
    const whole = r.pick([1, 2, 4]);
    const [numerator, denominator] = r.pick([[1, 4], [1, 2], [3, 4]]);
    const improper = whole * denominator + numerator;
    // Multiples of 20 cents give exact cent amounts for halves and quarters.
    const rateCents = r.int(11, 48) * 20;
    const totalNumerator = bags * improper;
    const totalKg = totalNumerator / denominator;
    const totalCents = totalNumerator * rateCents / denominator;
    return make(
      [
        `A school kitchen uses ${bags} bags of rice each day.`,
        `Each bag holds ${whole} ${numerator}/${denominator} kg of rice.`,
        `Rice costs $${money(rateCents)} for 1 kg.`,
      ],
      'How much does the rice used in one day cost?',
      money(totalCents),
      'Find the mass of all the bags first. Then use the price of 1 kg.',
      [
        {text: 'Write the mass of one bag as an improper fraction.', equation: `${whole} ${numerator}/${denominator} kg = ${improper}/${denominator} kg.`},
        {text: 'Find the total mass used in one day.', equation: `${bags} × ${improper}/${denominator} = ${totalNumerator}/${denominator} = ${totalKg} kg.`},
        {text: 'Multiply the total mass by the price of 1 kg.', equation: `${totalKg} × $${money(rateCents)} = $${money(totalCents)}.`},
      ],
      {unit: 'dollars'},
    );
  }

  if (variant === 1) {
    const eraserPack = r.pick([2, 4, 5, 6]);
    const pencilPack = r.pick([3, 5, 6, 8, 9].filter(size => size !== eraserPack));
    const packs = r.pick([2, 3, 4, 5, 6, 7, 8, 9].filter(count => count * pencilPack !== 20));
    const packCents = r.pick([175, 225, 275, 325, 375, 425, 475, 525, 575, 625, 675, 725].filter(price => price * packs !== 3000));
    const pencils = packs * pencilPack;
    const totalCents = packs * packCents;
    return make(
      [
        `Erasers come in packs of ${eraserPack}. Pencils come in packs of ${pencilPack}.`,
        'Each pack of erasers costs the same as each pack of pencils.',
        `Farah buys ${pencils} pencils in complete packs and pays $${money(totalCents)} altogether.`,
      ],
      'How much does one pack of erasers cost?',
      money(packCents),
      'Work out how many packs of pencils were bought. Use that number to find the price of one pack.',
      [
        {text: 'Find the number of packs of pencils.', equation: `${pencils} ÷ ${pencilPack} = ${packs} packs.`},
        {text: 'Share the total payment equally among those packs.', equation: `$${money(totalCents)} ÷ ${packs} = $${money(packCents)} per pack.`},
        {text: `One pack of erasers has the same price, so it costs $${money(packCents)}. The number of erasers in that pack does not change this equal pack price.`},
      ],
      {unit: 'dollars'},
    );
  }

  const side = r.pick([4, 5, 6, 7, 9]);
  const multiple = r.pick([3, 4]);
  const squareArea = side * side;
  const rectangleArea = multiple * squareArea;
  const rectangleLength = rectangleArea / side;
  const roomLength = rectangleLength + side;
  const perimeter = 2 * (roomLength + side);
  const totalArea = squareArea + rectangleArea;
  const rateCents = r.pick([18, 21, 24, 27, 32]) * 100;
  const totalCents = totalArea * rateCents;
  return make(
    [
      'A rectangular room has a square section and a rectangular section. They share a full side of the square and together make the whole room.',
      `The square section has an area of ${squareArea} m².`,
      `The rectangular section has ${multiple} times the area of the square.`,
      `Covering the floor costs $${money(rateCents)} for each 1 m².`,
    ],
    '(a) What is the perimeter of the room in metres? (b) How much does it cost to cover the whole floor?',
    JSON.stringify([String(perimeter), money(totalCents)]),
    'Find the square’s side using equal factors of its area. Both sections have this width. Use lengths for the perimeter and areas for the covering cost.',
    [
      {text: 'Find the side of the square. This is also the width of the room.', equation: `${side} × ${side} = ${squareArea}, so the width is ${side} m.`},
      {text: 'Find the area of the rectangular section.', equation: `${multiple} × ${squareArea} = ${rectangleArea} m².`},
      {text: 'Divide this area by the shared width to find the rectangle’s length.', equation: `${rectangleArea} ÷ ${side} = ${rectangleLength} m.`},
      {text: 'Add the lengths of the two sections.', equation: `${rectangleLength} + ${side} = ${roomLength} m.`},
      {text: '(a) Find the distance around the outside of the room.', equation: `2 × (${roomLength} + ${side}) = ${perimeter} m.`},
      {text: 'Add the areas of both sections.', equation: `${squareArea} + ${rectangleArea} = ${totalArea} m².`},
      {text: '(b) Multiply the whole floor area by the cost per square metre.', equation: `${totalArea} × $${money(rateCents)} = $${money(totalCents)}.`},
    ],
    {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Perimeter (m)'},
          {label: '(b) Covering cost ($)', decimal: true},
        ],
      },
    },
  );
}
