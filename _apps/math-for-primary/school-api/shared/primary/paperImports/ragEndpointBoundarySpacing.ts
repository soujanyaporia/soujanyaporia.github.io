import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-endpoint-boundary-spacing',
  level: 5,
  title: 'Count points and spaces',
  objective: 'Relate points to the spaces between them to find lengths, counts and new equal spacings.',
  skillIds: ['P5.S.RATE.02', 'P5.S.DEC.02'],
  canonicalPatternId: 'p5-endpoint-boundary-spacing',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed) + Math.trunc(index)) % 3 + 3) % 3;
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
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}.` : ''}`).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const gaps = r.int(5, 18);
    const spacing = r.pick([120, 240, 360, 480]);
    const metres = gaps * spacing;
    const kilometres = String(metres / 1000);
    const markers = gaps + 1;
    return make(
      [
        `A walking route between two different gates is ${kilometres} km long.`,
        `Route markers are placed ${spacing} m apart all the way from one gate to the other.`,
        'There is a marker at each gate, including both the start and the finish.',
      ],
      'How many route markers are there altogether?',
      String(markers),
      'Use the same unit for both distances. Count the spaces, then include the marker at the start.',
      [
        {text: 'Convert the route length to metres.', equation: `${kilometres} × 1000 = ${metres} m`},
        {text: 'Find the number of equal spaces between markers.', equation: `${metres} ÷ ${spacing} = ${gaps} spaces`},
        {text: 'Each space reaches another marker. Count the starting marker as well.', equation: `${gaps} + 1 = ${markers} markers`},
      ],
      {unit: 'markers'},
    );
  }

  if (variant === 1) {
    const oldGaps = r.int(4, 8);
    const added = r.int(1, 3);
    const newGaps = oldGaps + added;
    const scale = r.pick([3, 6]);
    const oldSpacing = newGaps * scale;
    const oldPoints = oldGaps + 1;
    const newPoints = oldPoints + added;
    const length = oldGaps * oldSpacing;
    const newSpacing = oldGaps * scale;
    return make(
      [
        `A straight line has ${oldPoints} dots, including one at each end.`,
        `Each space between neighbouring dots is ${oldSpacing} cm long.`,
        `Mina redraws the dots using ${added} more dots along the same line.`,
        'The end dots stay in place, and all the dots are equally spaced again.',
      ],
      'How long is each space after the dots are redrawn?',
      String(newSpacing),
      'Find the line length from the original spaces. The line keeps the same length when more dots are added.',
      [
        {text: 'With a dot at both ends, there is one fewer space than dots.', equation: `${oldPoints} − 1 = ${oldGaps} spaces`},
        {text: 'Find the fixed length of the line.', equation: `${oldGaps} × ${oldSpacing} = ${length} cm`},
        {text: 'Find the new number of dots.', equation: `${oldPoints} + ${added} = ${newPoints} dots`},
        {text: 'Count the spaces in the new design.', equation: `${newPoints} − 1 = ${newGaps} spaces`},
        {text: 'Share the same line length among the new spaces.', equation: `${length} ÷ ${newGaps} = ${newSpacing} cm`},
      ],
      {unit: 'cm'},
    );
  }

  // Two linked answers: the length found in (a) is used again in (b).
  const newGaps = r.int(5, 9);
  const removed = r.int(2, 6);
  const oldGaps = newGaps + removed;
  const scale = r.pick([4, 8]);
  const spacing = newGaps * scale;
  const perSide = oldGaps + 1;
  const total = perSide * 2;
  const length = oldGaps * spacing;
  const remaining = perSide - removed;
  const newSpacing = oldGaps * scale;
  return make(
    [
      `A rectangular stage has ${total} lights altogether, placed only along two opposite sides.`,
      `On both sides, neighbouring lights are ${spacing} cm apart, with a light at each end.`,
      `${removed} lights are then removed from one of these sides.`,
      'All the lights left on that side are rearranged with equal spaces between them. There is still a light at each end, and the side length stays unchanged.',
    ],
    '(a) How long is one of these sides, in centimetres? (b) After the change, how far apart are neighbouring lights on the changed side, in centimetres?',
    JSON.stringify([String(length), String(newSpacing)]),
    'Opposite sides are equally long. Find the lights and spaces on one side first, then use that same side length after the change.',
    [
      {text: 'Opposite sides are equally long. With the same spacing and both ends occupied, they have the same number of lights.', equation: `${total} ÷ 2 = ${perSide} lights on each side`},
      {text: 'There is one fewer space than lights on one side.', equation: `${perSide} − 1 = ${oldGaps} spaces`},
      {text: '(a) Multiply the spaces by their length.', equation: `${oldGaps} × ${spacing} = ${length} cm`},
      {text: '(b) Find how many lights remain on the changed side.', equation: `${perSide} − ${removed} = ${remaining} lights`},
      {text: 'Both ends still have a light, so count one fewer space.', equation: `${remaining} − 1 = ${newGaps} spaces`},
      {text: 'Use the side length from part (a) to find the new spacing.', equation: `${length} ÷ ${newGaps} = ${newSpacing} cm`},
    ],
    {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Length of one side (cm)'},
          {label: '(b) New spacing (cm)'},
        ],
      },
    },
  );
}
