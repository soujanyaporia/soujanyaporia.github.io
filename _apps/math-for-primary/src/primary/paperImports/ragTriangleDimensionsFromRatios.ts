import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-triangle-dimensions-from-ratios',
  level: 5,
  title: 'Find triangle area from equal length units',
  objective: 'Use a perimeter and side proportions to find two perpendicular lengths, then calculate triangle area.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02'],
  canonicalPatternId: 'triangle-dimensions-from-ratios',
};

function seedToken(seed: number, index: number): number {
  let token = 2166136261;
  const text = `${RAG_PATTERN.id}:${seed}:${index}`;
  for (let i = 0; i < text.length; i += 1) {
    token = Math.imul(token ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return token;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const token = seedToken(seed, index);
  const selection = token % 3;
  const triple = selection === 0
    ? ([3, 4, 5] as const)
    : selection === 1
      ? ([5, 12, 13] as const)
      : ([8, 15, 17] as const);
  const reverse = ((token >>> 7) & 1) === 1;
  const abUnits = reverse ? triple[1] : triple[0];
  const bcUnits = reverse ? triple[0] : triple[1];
  const caUnits = triple[2];
  const unitLength = 2 + ((token >>> 16) % 9);
  const totalUnits = abUnits + bcUnits + caUnits;
  const perimeter = totalUnits * unitLength;
  const ab = abUnits * unitLength;
  const bc = bcUnits * unitLength;
  const area = ab * bc / 2;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'The perimeter includes all three sides. Add their length units.',
      equation: `${abUnits} + ${bcUnits} + ${caUnits} = ${totalUnits} units`,
    },
    {
      text: 'Divide the perimeter by the total number of units to find the length of one unit.',
      equation: `${perimeter} ÷ ${totalUnits} = ${unitLength} cm`,
    },
    {
      text: 'Find the length of AB.',
      equation: `${abUnits} × ${unitLength} = ${ab} cm`,
    },
    {
      text: 'Find the length of BC.',
      equation: `${bcUnits} × ${unitLength} = ${bc} cm`,
    },
    {
      text: 'AB and BC meet at the right angle. Use them as the base and perpendicular height.',
      equation: `${ab} × ${bc} ÷ 2 = ${area} cm²`,
    },
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'Find the area of triangle ABC.',
    context: [
      'Triangle ABC has a right angle at B.',
      `The lengths AB, BC and CA are ${abUnits}, ${bcUnits} and ${caUnits} equal units respectively. One unit represents the same length on every side.`,
      `The perimeter of triangle ABC is ${perimeter} cm.`,
    ],
    answer: String(area),
    unit: 'cm²',
    hint: 'Count the length units around all three sides first. Find the length of one unit, then use the two sides that meet at B to calculate the area.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  };
}
