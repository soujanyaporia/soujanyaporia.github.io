import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rhombus-adjoining-angles',
  level: 6,
  title: 'Angles in a rhombus and an equilateral triangle',
  objective: 'Use rhombus side and angle properties with an equilateral triangle to find an unknown angle.',
  skillIds: ['P6.S.SHAPE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02'],
  canonicalPatternId: 'p6-rhombus-adjoining-angle-constraints',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const choices = [14, 18, 22, 26, 30, 34, 38, 42];
  const mixed = Math.imul(seed ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul(index + 1, 0x27d4eb2d);
  const given = choices[(mixed >>> 0) % choices.length];
  const rhombusAngle = 180 - given;
  const angleAtD = 360 - rhombusAngle - 60;
  const answer = (180 - angleAtD) / 2;
  const workedSteps = [
    {text: 'Adjacent angles in a rhombus add to 180°.', equation: `Angle ADC = 180° − ${given}° = ${rhombusAngle}°.`},
    {text: 'The equilateral triangle has a 60° angle at D. Angles around D add to 360°.', equation: `Angle EDC = 360° − ${rhombusAngle}° − 60° = ${angleAtD}°.`},
    {text: 'All rhombus sides are equal, and all equilateral-triangle sides are equal. So DC = DE and triangle DCE is isosceles.', equation: `Angle DEC = (180° − ${angleAtD}°) ÷ 2 = ${answer}°.`},
  ];
  return {
    key: `rag-rhombus-adjoining-angles:${seed}:${index}`,
    prompt: `ABCD is a rhombus. Triangle ADE is equilateral and shares side AD with the rhombus. Angle BAD is ${given}°. Find angle DEC.`,
    context: ['AB is parallel to DC.', 'The rhombus and equilateral triangle share side AD.'],
    answer: String(answer),
    unit: '°',
    hint: 'Find the rhombus angle at D first. Then use the 60° triangle angle and the equal sides.',
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    workedSteps,
  };
}
