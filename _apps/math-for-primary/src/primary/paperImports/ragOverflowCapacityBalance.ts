import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-overflow-capacity-balance',
  level: 5,
  title: 'Water that spills out',
  objective: 'Use the water present, water added and water lost to find overflow or capacity.',
  skillIds: ['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.VOL.05', 'P5.S.FRAC.05', 'P5.S.DEC.02'],
  canonicalPatternId: 'p5-overflow-capacity-balance',
};

type Steps = NonNullable<Question['workedSteps']>;

function randomIntegers(seed: number, index: number) {
  let state = 2166136261;
  for (const character of `${seed}:${index}`) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return (minimum: number, maximum: number): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return minimum + Math.floor(state / 4294967296 * (maximum - minimum + 1));
  };
}

function litres(millilitres: number): string {
  const whole = Math.floor(millilitres / 1000);
  const remainder = String(millilitres % 1000).padStart(3, '0').replace(/0+$/, '');
  return remainder ? `${whole}.${remainder}` : String(whole);
}

function explanation(steps: Steps): string {
  return steps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const integer = randomIntegers(seed, index);
  const variant = ((seed % 3 + index % 3) % 3 + 3) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 2) {
    const remainders = [0, 5, 25, 80, 125, 305, 560, 875, 990];
    const wholeLitres = integer(1, 3);
    const remainingMl = remainders[integer(0, remainders.length - 1)];
    const capacityMl = wholeLitres * 1000 + remainingMl;
    const initialMl = integer(200, 850);
    const overflowMl = integer(25, 400);
    const addedMl = capacityMl - initialMl + overflowMl;
    const steps: Steps = [
      {text: 'Find all the water before subtracting what spilled.', equation: `${initialMl} + ${addedMl} = ${initialMl + addedMl} ml`},
      {text: 'The jug is full afterwards, so the water left equals its capacity.', equation: `${initialMl + addedMl} − ${overflowMl} = ${capacityMl} ml`},
      {text: 'Each 1000 ml makes 1 L. Write the remaining millilitres separately.', equation: `${capacityMl} ml = ${wholeLitres} L ${remainingMl} ml`},
    ];
    return {
      key,
      context: [
        `At first, a jug holds ${initialMl} ml of water.`,
        `Sana pours in another ${addedMl} ml. Exactly ${overflowMl} ml spills over the rim, leaving the jug full. No other water is lost.`,
      ],
      prompt: 'What is the capacity of the jug? Give your answer in litres and millilitres, with fewer than 1000 ml in the millilitres box.',
      answer: JSON.stringify([String(wholeLitres), String(remainingMl)]),
      structuredResponse: {kind: 'number-pair', firstLabel: 'Litres (L)', secondLabel: 'Millilitres (ml)'},
      hint: 'Combine the starting water and the added water, then take away what spilled.',
      workedSteps: steps,
      explanation: explanation(steps),
    };
  }

  if (variant === 0) {
    const fractions = [[1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [5, 6], [3, 8], [5, 8]] as const;
    const [numerator, denominator] = fractions[integer(0, fractions.length - 1)];
    const length = integer(5, 9) * 5;
    const width = integer(2, 5) * 5;
    const height = denominator * integer(3, 7);
    const capacityMl = length * width * height;
    const initialMl = capacityMl / denominator * numerator;
    const overflowMl = integer(1, 120) * 10;
    const addedMl = capacityMl - initialMl + overflowMl;
    const steps: Steps = [
      {text: 'Find the full capacity. One cubic centimetre holds one millilitre.', equation: `${length} × ${width} × ${height} = ${capacityMl} cm³ = ${capacityMl} ml`},
      {text: 'Find the water in the tank at first.', equation: `${capacityMl} ÷ ${denominator} × ${numerator} = ${initialMl} ml`},
      {text: 'Express the added water in millilitres too.', equation: `${litres(addedMl)} × 1000 = ${addedMl} ml`},
      {text: 'The tank retains its full capacity. The rest spills out.', equation: `${initialMl} + ${addedMl} − ${capacityMl} = ${overflowMl} ml`},
      {text: 'Convert the spilled water to litres.', equation: `${overflowMl} ÷ 1000 = ${litres(overflowMl)} L`},
    ];
    return {
      key,
      context: [
        `A rectangular tank measures ${length} cm long, ${width} cm wide and ${height} cm high on the inside.`,
        `In the beginning, ${numerator}/${denominator} of the tank's capacity is filled with water.`,
        `Arun pours ${litres(addedMl)} L of water into the tank. Water that does not fit spills over the top. No other water is lost.`,
      ],
      prompt: 'How many litres of water spill out?',
      answer: litres(overflowMl),
      unit: 'L',
      hint: 'Find the capacity and the water already present. Compare the total water with the capacity.',
      workedSteps: steps,
      explanation: explanation(steps),
    };
  }

  const fractions = [[1, 3], [1, 2], [2, 5], [3, 5]] as const;
  const [numerator, denominator] = fractions[integer(0, fractions.length - 1)];
  const length = integer(4, 8) * 5;
  const width = integer(6, 9) * 2;
  const height = denominator * integer(6, 10);
  const initialDepth = height / denominator * numerator;
  const outletHeight = initialDepth + integer(1, 3);
  const baseArea = length * width;
  const capacity = baseArea * height;
  const initial = capacity / denominator * numerator;
  const retained = baseArea * outletHeight;
  const spaceToOutlet = retained - initial;
  const cupSizes = [180, 220, 280, 320, 360];
  const cupVolume = cupSizes[integer(0, cupSizes.length - 1)];
  const minimumCups = Math.max(2, Math.floor(spaceToOutlet / cupVolume) + 1);
  const maximumCups = Math.min(minimumCups + 3, Math.floor((capacity - initial - 1) / cupVolume));
  const cups = integer(minimumCups, maximumCups);
  const added = cups * cupVolume;
  const overflow = initial + added - retained;
  const steps: Steps = [
    {text: 'Find the capacity up to the top of the tank.', equation: `${length} × ${width} × ${height} = ${capacity} cm³`},
    {text: 'Use the given fraction to find the starting water volume.', equation: `${capacity} ÷ ${denominator} × ${numerator} = ${initial} cm³`},
    {text: 'Water drains to the bottom edge of the outlet. Use that height to find the water retained.', equation: `${length} × ${width} × ${outletHeight} = ${retained} cm³`},
    {text: 'Find the water added from all the cups.', equation: `${cups} × ${cupVolume} = ${added} cm³`},
    {text: 'Subtract the retained water from the total water. The difference goes into the bucket.', equation: `${initial} + ${added} − ${retained} = ${overflow} cm³`},
    {text: 'Convert cubic centimetres to litres.', equation: `${overflow} ÷ 1000 = ${litres(overflow)} L`},
  ];
  return {
    key,
    context: [
      `A rectangular tank measures ${length} cm long, ${width} cm wide and ${height} cm high on the inside.`,
      `In the beginning, ${numerator}/${denominator} of the tank's capacity is filled with water.`,
      `The bottom edge of a side outlet is ${outletHeight} cm above the inside base. Water above this level flows through the outlet into an empty bucket.`,
      `Mei empties ${cups} full cups, each holding ${cupVolume} cm³ of water, into the tank. All the water from the outlet is caught in the bucket. No other water is lost.`,
    ],
    prompt: 'Once water stops flowing out, how many litres of water are in the bucket?',
    answer: litres(overflow),
    unit: 'L',
    hint: 'The outlet sets the final water level. Find the volume up to that level before calculating what flows out.',
    workedSteps: steps,
    explanation: explanation(steps),
  };
}
