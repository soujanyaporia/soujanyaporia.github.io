import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-linked-isosceles-angle-chain',
  level: 6,
  title: 'Follow angles through isosceles triangles',
  objective: 'Use equal sides, triangle angles and straight lines to find an angle in linked triangles.',
  skillIds: ['P5.S.SHAPE.01', 'P5.S.ANGLE.01'],
  canonicalPatternId: 'p6-linked-isosceles-angle-chain',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`rag-linked-isosceles-v1:${seed}:${index}`));
  const variant = Math.abs(seed + index) % 3;
  const key = `rag-linked-isosceles:${seed}:${index}`;

  if (variant === 0) {
    const c = rng.pick([42, 48, 54, 60]);
    const x = rng.pick([58, 66, 74, 82]);
    const angleABD = 180 - c;
    const angleABE = angleABD - x;
    const answer = (180 - angleABE) / 2;
    return {
      key, prompt: 'Find angle BEA.',
      context: [`A, B and C lie on one straight line. Triangle ABE has AB = BE. Triangle BCD has BD = CD. Angle BCD is ${c}° and angle EBD is ${x}°.`],
      answer: String(answer), unit: 'degrees',
      hint: 'Use BD = CD to find an angle at B. Then use the straight line and AB = BE.',
      explanation: `Since BD = CD, angle DBC = ${c}°. Angle ABD = 180° − ${c}° = ${angleABD}°. Angle ABE = ${angleABD}° − ${x}° = ${angleABE}°. Since AB = BE, angle BEA = (180° − ${angleABE}°) ÷ 2 = ${answer}°.`,
      workedSteps: [
        {text:'Triangle BCD has equal base angles.', equation:`Angle DBC = ${c}°.`},
        {text:'Angles along the straight line add to 180°.', equation:`Angle ABD = 180° − ${c}° = ${angleABD}°.`},
        {text:'Take away angle EBD to find angle ABE.', equation:`Angle ABE = ${angleABD}° − ${x}° = ${angleABE}°.`},
        {text:'Triangle ABE has equal base angles.', equation:`Angle BEA = (180° − ${angleABE}°) ÷ 2 = ${answer}°.`},
      ],
    };
  }

  if (variant === 1) {
    const v = rng.pick([48, 56, 64, 72]);
    const answer = (180 - v) / 2;
    return {
      key, prompt: 'Find angle CAE.',
      context: [`Triangles ABC and ADE are isosceles with BA = BC and DA = DE. Their sides cross at O. Angle COD is ${v}°; A, D, C lie on one straight line and A, B, E lie on another.`],
      answer: String(answer), unit: 'degrees',
      hint: 'Use the vertically opposite angle, then the equal sides in each triangle.',
      explanation: `Angle AOB = ${v}° because it is vertically opposite angle COD. The equal-side triangles give equal base angles; angle CAE = (180° − ${v}°) ÷ 2 = ${answer}°.`,
      workedSteps: [
        {text:'The angles where two straight lines cross are vertically opposite.', equation:`Angle AOB = angle COD = ${v}°.`},
        {text:'Use the equal sides to relate the base angles in the two isosceles triangles.', equation:`The two equal base-angle contributions leave 180° − ${v}°.`},
        {text:'Split the remaining angle equally.', equation:`Angle CAE = (180° − ${v}°) ÷ 2 = ${answer}°.`},
      ],
    };
  }

  const a = rng.pick([44, 52, 60, 68]);
  const c = rng.pick([16, 20, 24, 28]);
  const b = 180 - 2 * a;
  const d = 180 - a;
  const answer = 180 - d - c;
  return {
    key, prompt: 'Find angle DBC.',
    context: [`DA = DB. A, D and C lie on one straight line. Angle DAB is ${a}° and angle BCA is ${c}°.`],
    answer: String(answer), unit: 'degrees',
    hint: 'First find angle ADB in isosceles triangle ABD. Then use the straight line at D.',
    explanation: `Since DA = DB, angle ABD = angle DAB = ${a}°. Angle ADB = 180° − ${a}° − ${a}° = ${b}°. Angle BDC = 180° − ${b}° = ${d}°. In triangle BDC, angle DBC = 180° − ${d}° − ${c}° = ${answer}°.`,
    workedSteps: [
      {text:'Equal sides DA and DB give equal base angles.', equation:`Angle ABD = ${a}°.`},
      {text:'Find the vertex angle in triangle ABD.', equation:`Angle ADB = 180° − ${a}° − ${a}° = ${b}°.`},
      {text:'Use the straight line through A, D and C.', equation:`Angle BDC = 180° − ${b}° = ${d}°.`},
      {text:'The angles in triangle BDC add to 180°.', equation:`Angle DBC = 180° − ${d}° − ${c}° = ${answer}°.`},
    ],
  };
}
