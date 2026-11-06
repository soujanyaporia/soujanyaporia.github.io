import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id: 'p6-connected-parallel-figures',
 level: 6,
 title: 'Connected parallel-sided figures',
 objective: 'Pass angles through parallel sides of joined parallelograms and trapeziums, then add, subtract or take angles from a straight line.',
 skillIds: ['P6.S.SHAPE.01','P5.S.SHAPE.02','P5.S.ANGLE.01'],
 canonicalPatternId: 'p6-connected-parallel-sided-figures',
};

const NOTE = 'The figure is not drawn to scale.';

export function makeRagQuestion(seed: number, index = 0): Question {
 const r = new Rng(hashString(`rag-p6-connected-parallel-figures:${seed}:${index}`));
 const key = `rag-p6-connected-parallel-figures:${seed}:${index}`;
 const variant = (((Math.floor(seed) + index) % 3) + 3) % 3;

 if (variant === 0) {
 // Parallelogram with an extended diagonal: exterior angle of a triangle.
 const a = r.int(25, 60), b = r.int(80, 100), inner = 180 - a - b, ans = a + b;
 return {
 key,
 prompt: 'Find angle YXT.',
 context: [
 'WXYZ is a parallelogram. Going round the shape, the corners are W, X, Y and Z, so WX is parallel to ZY.',
 `The line from Z through X carries on to T, so Z, X and T are in a straight line. ${NOTE}`,
 `Angle WXZ is ${a}°. Angle ZYX is ${b}°.`,
 ],
 answer: String(ans),
 unit: '°',
 hint: 'Sketch the parallelogram and the line ZT. Which angle in triangle XYZ is equal to angle WXZ?',
 explanation: `WX is parallel to ZY, so angle XZY = ${a}°. In triangle XYZ, angle YXZ = 180° − ${b}° − ${a}° = ${inner}°. Z, X and T are on a straight line, so angle YXT = 180° − ${inner}° = ${ans}°.`,
 workedSteps: [
 {text: 'WX is parallel to ZY, so the alternate angles at the line ZX are equal.', equation: `Angle XZY = Angle WXZ = ${a}°`},
 {text: 'The three angles of triangle XYZ add up to 180°.', equation: `Angle YXZ = 180° − ${b}° − ${a}° = ${inner}°`},
 {text: 'Z, X and T lie on a straight line, so angle YXT and angle YXZ make 180°.', equation: `Angle YXT = 180° − ${inner}° = ${ans}°`},
 ],
 };
 }

 if (variant === 1) {
 // Parallelogram joined to a trapezium: sum of two angles.
 const x = r.int(100, 140), y = 180 - x, ans = 2 * y;
 return {
 key,
 prompt: 'Find the sum of angle KNM and angle NMP.',
 context: [
 'KLMN is a parallelogram. Going round the shape, the corners are K, L, M and N, so KN is parallel to LM.',
 `L, M and P are in a straight line, with M between L and P. KLPN is a trapezium with KN parallel to LP. ${NOTE}`,
 `Angle LKN is ${x}°.`,
 ],
 answer: String(ans),
 unit: '°',
 hint: 'Use the parallel sides of the parallelogram. Then use the straight line LMP.',
 explanation: `KL is parallel to NM, so angle KNM = 180° − ${x}° = ${y}°. Opposite angles of a parallelogram are equal, so angle LMN = ${x}°. L, M and P are on a straight line, so angle NMP = 180° − ${x}° = ${y}°. The sum is ${y}° + ${y}° = ${ans}°.`,
 workedSteps: [
 {text: 'KL is parallel to NM, so angle LKN and angle KNM add up to 180°.', equation: `Angle KNM = 180° − ${x}° = ${y}°`},
 {text: 'Opposite angles of a parallelogram are equal.', equation: `Angle LMN = Angle LKN = ${x}°`},
 {text: 'L, M and P are on a straight line.', equation: `Angle NMP = 180° − ${x}° = ${y}°`},
 {text: 'Add the two angles that the question asks for.', equation: `${y}° + ${y}° = ${ans}°`},
 ],
 };
 }

 // Trapezium: co-interior angle, then remove a component.
 const a = r.int(60, 120), whole = 180 - a, c = r.int(15, whole - 15), ans = whole - c;
 return {
 key,
 prompt: 'Find angle EHR.',
 context: [
 'EFGH is a trapezium. Going round the shape, the corners are E, F, G and H, and EF is parallel to HG.',
 `R is a point inside angle EHG, so the line HR lies between HE and HG. ${NOTE}`,
 `Angle HEF is ${a}°. Angle RHG is ${c}°.`,
 ],
 answer: String(ans),
 unit: '°',
 hint: 'Angles between parallel lines on the same side of a slanting line add up to 180°. Find angle EHG first.',
 explanation: `EF is parallel to HG, so angle EHG = 180° − ${a}° = ${whole}°. Angle EHR is angle EHG without angle RHG: ${whole}° − ${c}° = ${ans}°.`,
 workedSteps: [
 {text: 'EF is parallel to HG, so angles HEF and EHG add up to 180°.', equation: `Angle EHG = 180° − ${a}° = ${whole}°`},
 {text: 'Angle EHG is made of angle EHR and angle RHG. Take away the part that is given.', equation: `Angle EHR = ${whole}° − ${c}° = ${ans}°`},
 ],
 };
}
