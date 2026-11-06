import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p6-mixed-sector-composite-perimeter',
  level: 6,
  title: 'Mixed curved perimeters',
  objective: 'Find related radii, identify exposed edges, and add circular arcs and straight lengths.',
  skillIds: ['P6.S.CIRCLE.02', 'P6.S.CIRCLE.03'],
  canonicalPatternId: 'p6-mixed-sector-composite-perimeter',
};

const lengthText = (value: number): string => String(Number(value.toFixed(2)));

export function makeRagQuestion(seed: number, index = 0): Question {
  const identity = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(identity));
  const variant = hashString(`${identity}:variant`) % 3;
  const base = {key: identity, unit: 'cm'};

  if (variant === 0) {
    const radius = random.pick([6, 10, 12, 16, 18, 20, 24, 28]);
    const largeDiameter = 2 * radius;
    const smallRadius = largeDiameter / 4;
    const smallDiameter = 2 * smallRadius;
    const upperArcs = 3.14 * radius / 2;
    const smallArcs = 2 * 3.14 * smallRadius;
    const exposedDiameter = largeDiameter - smallDiameter;
    const straightEdges = 2 * radius + exposedDiameter + smallDiameter;
    const perimeter = upperArcs + smallArcs + straightEdges;
    const picture: Batch11UpperPicture = {
      type: 'batch11-upper',
      label: `A square sits below a large semicircle, with its top side centred on the large diameter. O is the large centre and OC is ${radius} cm. The quarter-circle COD above O is unshaded. Two equal semicircles have the square's vertical sides as diameters and face into the square. The remaining parts are shaded. Dashed lines show the square's top and vertical sides.`,
      marks: [
        {
          kind: 'path',
          d: 'M 80 110 A 80 80 0 0 1 96 62 L 160 110 L 208 46 A 80 80 0 0 1 240 110 H 200 A 40 40 0 0 0 200 190 H 120 A 40 40 0 0 0 120 110 H 80 Z',
          fill: '#dcefe6',
        },
        {kind: 'path', d: 'M 96 62 A 80 80 0 0 1 208 46'},
        {kind: 'line', x1: 120, y1: 110, x2: 200, y2: 110, dashed: true},
        {kind: 'line', x1: 120, y1: 110, x2: 120, y2: 190, dashed: true},
        {kind: 'line', x1: 200, y1: 110, x2: 200, y2: 190, dashed: true},
        {kind: 'path', d: 'M 152 104 L 158 96 L 166 102'},
        {kind: 'text', x: 12, y: 20, text: `OC = ${radius} cm`},
        {kind: 'text', x: 78, y: 59, text: 'C'},
        {kind: 'text', x: 213, y: 40, text: 'D'},
        {kind: 'text', x: 155, y: 126, text: 'O'},
      ],
    };
    const workedSteps = [
      {text: `The large radius is ${radius} cm, so its diameter is 2 × ${radius} = ${largeDiameter} cm.`},
      {text: `A small radius is ${largeDiameter} ÷ 4 = ${smallRadius} cm. Its diameter is 2 × ${smallRadius} = ${smallDiameter} cm. This is also the square's side length.`},
      {text: `Removing a quarter-circle from the upper semicircle leaves a quarter-circle of shaded outer arc in total. Its length is 1/4 × 2 × 3.14 × ${radius} = ${lengthText(upperArcs)} cm.`},
      {text: `The two small semicircular edges have total length 2 × 3.14 × ${smallRadius} = ${lengthText(smallArcs)} cm.`},
      {text: `The straight boundary includes two large radii, the exposed ends of the large diameter, and the square's bottom. Their total is 2 × ${radius} + (${largeDiameter} − ${smallDiameter}) + ${smallDiameter} = ${straightEdges} cm. The dashed square edges lie inside the figure or beside the unshaded cut-outs.`},
      {text: `The shaded perimeter is ${lengthText(upperArcs)} + ${lengthText(smallArcs)} + ${straightEdges} = ${lengthText(perimeter)} cm.`},
    ];
    return {
      ...base,
      prompt: 'Find (a) the diameter of a small semicircle and (b) the total perimeter of the shaded parts.',
      context: [
        'A large semicircle sits above a square. The square’s top side lies in the middle of the large diameter, with O at its midpoint.',
        `O is the centre of the large semicircle and the unshaded quarter-circle COD. C and D lie on the large curved edge. OC = ${radius} cm.`,
        'Two equal semicircles face into the square. Their diameters are its left and right sides. The large diameter is 4 times a small radius.',
        'The parts outside the quarter-circle and the two small semicircles are shaded. Dashed lines help show the square.',
        'Use π = 3.14.',
      ],
      picture,
      answer: JSON.stringify([lengthText(smallDiameter), lengthText(perimeter)]),
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Small diameter (cm)'},
          {label: '(b) Shaded perimeter (cm)', decimal: true},
        ],
      },
      hint: 'Find the small radius first. Then trace every edge next to a shaded part, including the inward curves.',
      workedSteps,
      explanation: workedSteps.map(step => step.text).join(' '),
    };
  }

  if (variant === 1) {
    const smallRadius = 7 * random.int(2, 4);
    const largeRadius = smallRadius + 7 * random.int(1, 3);
    const smallPixels = 80 * smallRadius / largeRadius;
    const largeArc = 11 * largeRadius / 7;
    const smallArc = 11 * smallRadius / 7;
    const arcs = largeArc + smallArc;
    const radiiSum = largeRadius + smallRadius;
    const straightEdges = 2 * radiiSum;
    const perimeter = arcs + straightEdges;
    const picture: Batch11UpperPicture = {
      type: 'batch11-upper',
      label: `Two quarter-circles touch only at O. The lower-left quarter-circle has radius ${largeRadius} cm. The upper-right quarter-circle has radius ${smallRadius} cm. Each has two exposed straight radii.`,
      marks: [
        {kind: 'path', d: 'M 170 100 H 90 A 80 80 0 0 0 170 180 Z', fill: '#dcefe6'},
        {
          kind: 'path',
          d: `M 170 100 V ${100 - smallPixels} A ${smallPixels} ${smallPixels} 0 0 1 ${170 + smallPixels} 100 Z`,
          fill: '#dcefe6',
        },
        {kind: 'text', x: 98, y: 92, text: `${largeRadius} cm`},
        {kind: 'text', x: 181, y: 121, text: `${smallRadius} cm`},
        {kind: 'text', x: 151, y: 116, text: 'O'},
      ],
    };
    const workedSteps = [
      {text: `The larger curved edge is 1/4 × 2 × 22/7 × ${largeRadius} = ${largeArc} cm.`},
      {text: `The smaller curved edge is 1/4 × 2 × 22/7 × ${smallRadius} = ${smallArc} cm.`},
      {text: `The shapes touch at one point, so all four straight radii are exposed. Their total length is 2 × ${largeRadius} + 2 × ${smallRadius} = ${straightEdges} cm.`},
      {text: `The perimeter is ${largeArc} + ${smallArc} + ${straightEdges} = ${perimeter} cm.`},
    ];
    return {
      ...base,
      prompt: 'What is the total perimeter of the figure?',
      context: [
        `Two quarter-circles meet only at O. Their radii are ${largeRadius} cm and ${smallRadius} cm.`,
        'They lie in opposite corners around O, as shown. Use π = 22/7.',
      ],
      picture,
      answer: lengthText(perimeter),
      choices: random.shuffle([perimeter, arcs, arcs + radiiSum, perimeter + arcs].map(lengthText)),
      hint: 'Each quarter-circle contributes a curved edge and two straight radii.',
      workedSteps,
      explanation: workedSteps.map(step => step.text).join(' '),
    };
  }

  const radius = 7 * random.int(3, 8);
  const smallRadius = radius / 2;
  const quadrantArc = 11 * radius / 7;
  const semicircleArc = 11 * radius / 7;
  const perimeter = quadrantArc + semicircleArc + radius;
  const picture: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `A quarter-circle has centre A and radii AB and AC of ${radius} cm. AB is horizontal and AC is vertical. An unshaded semicircle with diameter AB curves into the quarter-circle. The region between that semicircle, the outer quadrant arc BC and the straight side AC is shaded.`,
    marks: [
      {
        kind: 'path',
        d: 'M 105 30 A 75 75 0 0 0 255 30 A 150 150 0 0 1 105 180 Z',
        fill: '#dcefe6',
      },
      {kind: 'line', x1: 105, y1: 30, x2: 255, y2: 30, dashed: true},
      {kind: 'text', x: 88, y: 26, text: 'A'},
      {kind: 'text', x: 260, y: 35, text: 'B'},
      {kind: 'text', x: 91, y: 195, text: 'C'},
      {kind: 'text', x: 22, y: 116, text: `${radius} cm`},
    ],
  };
  const workedSteps = [
    {text: `AB is a radius of the quarter-circle and the diameter of the semicircle. The semicircle's radius is ${radius} ÷ 2 = ${lengthText(smallRadius)} cm.`},
    {text: `The outer quarter-circle arc is 1/4 × 2 × 22/7 × ${radius} = ${quadrantArc} cm.`},
    {text: `The inward semicircular arc is 1/2 × 22/7 × ${radius} = ${semicircleArc} cm.`},
    {text: `AC is the exposed straight side, measuring ${radius} cm. The shaded perimeter is ${quadrantArc} + ${semicircleArc} + ${radius} = ${perimeter} cm.`},
  ];
  return {
    ...base,
    prompt: 'What is the perimeter of the shaded part?',
    context: [
      `The quarter-circle has centre A and radius ${radius} cm. AB and AC are its radii.`,
      'A semicircle with diameter AB lies inside the quarter-circle. The part outside the semicircle is shaded.',
      'Use π = 22/7.',
    ],
    picture,
    answer: lengthText(perimeter),
    choices: random.shuffle([perimeter, quadrantArc + semicircleArc, quadrantArc + radius, quadrantArc].map(lengthText)),
    hint: 'Trace the shaded edge. It has two curved pieces and the straight side AC.',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
