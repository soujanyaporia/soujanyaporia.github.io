import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-cube-tank-fraction-depth',
  level: 6,
  title: 'Water moved between cube-shaped tanks',
  objective: 'Find a transferred volume, then use a water-depth ratio and square base area to find a tank edge.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.VOL.03', 'P6.S.RATIO.04', 'P6.S.VOL.02', 'P6.S.VOL.03'],
  canonicalPatternId: 'cubical-tanks-fraction-transfer-depth-ratio-missing-edge',
};

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

// Each family supplies feasible cube dimensions and a proper transfer fraction.
// Only the first edge, fraction and resulting depth ratio are shown to pupils.
const families: [number, number, number, number][] = [
  [12, 24, 1, 3],
  [16, 32, 1, 2],
  [12, 24, 2, 3],
  [16, 32, 3, 4],
  [18, 27, 1, 2],
  [12, 18, 3, 4],
  [24, 16, 1, 4],
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const [baseP, baseQ, numerator, denominator] = rng.pick(families);
  const scale = rng.int(1, 3);
  const edgeP = baseP * scale;
  const edgeQ = baseQ * scale;
  const capacityP = edgeP ** 3;
  const moved = capacityP * numerator / denominator;
  const leftParts = denominator - numerator;
  const depthP = edgeP * leftParts / denominator;
  const depthQ = moved / (edgeQ * edgeQ);
  const rawP = leftParts * edgeQ * edgeQ;
  const rawQ = numerator * edgeP * edgeP;
  const common = gcd(rawP, rawQ);
  const ratioP = rawP / common;
  const ratioQ = rawQ / common;
  const baseAreaQ = edgeQ * edgeQ;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Tank P starts full. Multiply its three equal inside dimensions to find the water volume.',
      equation: `${edgeP} × ${edgeP} × ${edgeP} = ${capacityP} cm³`,
    },
    {
      text: '(a) Find the fraction of the starting water that is moved to Tank Q.',
      equation: `${capacityP} ÷ ${denominator} × ${numerator} = ${moved} cm³`,
    },
    {
      text: `(b) Tank P has ${leftParts}/${denominator} of its water left. Its base stays the same, so its water depth is the same fraction of its full height.`,
      equation: `${edgeP} × ${leftParts}/${denominator} = ${depthP} cm`,
    },
    {
      text: `In the depth ratio, Tank P has ${ratioP} parts and Tank Q has ${ratioQ} parts. Use this to find the depth in Tank Q.`,
      equation: `${depthP} ÷ ${ratioP} × ${ratioQ} = ${depthQ} cm`,
    },
    {
      text: 'Tank Q was empty, so its water volume is the amount found in part (a). Divide that volume by its water depth to find its base area.',
      equation: `${moved} ÷ ${depthQ} = ${baseAreaQ} cm²`,
    },
    {
      text: 'The base of Tank Q is a square. Find the positive number that gives this area when multiplied by itself.',
      equation: `${edgeQ} × ${edgeQ} = ${baseAreaQ}, so its inside edge length is ${edgeQ} cm`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `Tank P and Tank Q each have a cube-shaped interior. Every inside edge of Tank P is ${edgeP} cm long.`,
      'At first, Tank P is full of water and Tank Q is empty.',
      `${numerator}/${denominator} of the water originally in Tank P is poured into Tank Q. All this water fits in Tank Q, and none is spilled.`,
      `After the transfer, the water depth in Tank P : the water depth in Tank Q is ${ratioP} : ${ratioQ}.`,
    ],
    prompt: '(a) Find the volume of water moved to Tank Q, in cm³. (b) Find the inside edge length of Tank Q, in cm.',
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        {label: '(a) Water moved (cm³)'},
        {label: '(b) Inside edge length of Tank Q (cm)'},
      ],
    },
    answer: JSON.stringify([String(moved), String(edgeQ)]),
    hint: 'Find the water moved and the depth left in Tank P. The ratio compares water depths. Use it to find the depth in Tank Q, then its square base area.',
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
    workedSteps,
  };
}
