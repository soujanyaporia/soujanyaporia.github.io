import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-divide-angle-total-in-ratio',
  level: 5,
  title: 'Share an angle using equal parts',
  objective: 'Use angle facts and a multiplicative relationship to find unknown angles.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.04', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02', 'P5.S.SHAPE.03'],
  canonicalPatternId: 'divide-an-angle-total-in-a-ratio',
};

const line = (x1:number, y1:number, x2:number, y2:number):Batch11UpperMark =>
  ({kind:'line', x1, y1, x2, y2});
const text = (x:number, y:number, value:string):Batch11UpperMark =>
  ({kind:'text', x, y, text:value});
const figure = (context:string[], marks:Batch11UpperMark[]):Batch11UpperPicture =>
  ({type:'batch11-upper', label:context.join(' '), marks});

export function makeRagQuestion(seed:number, index = 0):Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) + Math.trunc(index)) % 3 + 3) % 3;
  const make = (
    context:string[], prompt:string, answer:string, hint:string,
    steps:string[], picture:Batch11UpperPicture, extra:Partial<Question> = {},
  ):Question => ({
    key:`${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint, picture, unit:'degrees',
    workedSteps:steps.map(step => ({text:step})),
    explanation:steps.join(' '),
    ...extra,
  });

  if (variant === 0) {
    const multiple = r.pick([3, 4]);
    const small = multiple === 3 ? r.int(9, 16) : r.int(8, 13);
    const available = (multiple + 1) * small;
    const known = 90 - available;
    const context = [
      'AB and CD meet at O at right angles. A, O and B lie on one straight line; C, O and D lie on another.',
      'OP and OQ lie inside angle AOD, in the order OA, OP, OQ, OD.',
      `Angle AOP = ${known}°. Angle POQ is ${multiple} times angle QOD.`,
      'The sketch is not drawn to scale.',
    ];
    const end = (degrees:number):[number, number] => [
      125 + 115 * Math.cos(degrees * Math.PI / 180),
      150 - 115 * Math.sin(degrees * Math.PI / 180),
    ];
    const [px, py] = end(available);
    const [qx, qy] = end(small);
    return make(context, 'How large is angle QOD?', String(small),
      'Find the angle left inside the right angle. Then count the equal parts.', [
        'Perpendicular lines form right angles, so angle AOD = 90°.',
        `Angles POQ and QOD together are 90° − ${known}° = ${available}°.`,
        `Let angle QOD be 1 equal part. Angle POQ is ${multiple} such parts, so there are ${multiple + 1} parts altogether.`,
        `Angle QOD = ${available}° ÷ ${multiple + 1} = ${small}°.`,
      ], figure(context, [
        line(125, 25, 125, 180), line(25, 150, 290, 150),
        line(125, 150, px, py), line(125, 150, qx, qy),
        line(113, 150, 113, 138), line(113, 138, 125, 138),
        text(119, 19, 'A'), text(119, 197, 'B'),
        text(8, 155, 'C'), text(296, 155, 'D'), text(106, 171, 'O'),
        text(px + 6, py - 5, 'P'), text(qx + 6, qy + 4, 'Q'),
      ]));
  }

  if (variant === 1) {
    const multiple = r.pick([3, 4]);
    const small = multiple === 3 ? r.int(25, 28) : r.int(22, 23);
    const baseAngle = 180 - (multiple + 1) * small;
    const topAngle = r.pick([52, 56, 64, 68]);
    const first = 180 - topAngle - baseAngle;
    const second = multiple * small;
    const remaining = 180 - baseAngle;
    const context = [
      'ABCD is a trapezium. AB is parallel to DC, and E is between A and B.',
      'The two sides ED and EC are equal.',
      `Angle DAB = ${topAngle}° and angle EDC = ${baseAngle}°.`,
      `Angle BCE is ${multiple} times angle CBE.`,
      'The sketch is not drawn to scale.',
    ];
    return make(context,
      '(a) Find angle ADE. (b) Find angle BCE. Give both answers in degrees.',
      JSON.stringify([String(first), String(second)]),
      'For (a), use the parallel sides. For (b), use the equal sides to find an angle in triangle EBC, then count equal parts.', [
        `(a) AB is parallel to DC, so angle ADC = 180° − ${topAngle}° = ${180 - topAngle}°.`,
        `Angle ADE = ${180 - topAngle}° − ${baseAngle}° = ${first}°.`,
        `(b) ED = EC, so the base angles EDC and DCE are equal. Angle DCE = ${baseAngle}°.`,
        `EB is parallel to DC, so angle CEB = angle DCE = ${baseAngle}°.`,
        `The other two angles in triangle EBC total 180° − ${baseAngle}° = ${remaining}°.`,
        `Angle CBE is 1 equal part and angle BCE is ${multiple} parts. Angle CBE = ${remaining}° ÷ ${multiple + 1} = ${small}°.`,
        `Angle BCE = ${multiple} × ${small}° = ${second}°.`,
      ], figure(context, [
        line(30, 35, 288, 35), line(288, 35, 175, 160),
        line(175, 160, 95, 160), line(95, 160, 30, 35),
        line(95, 160, 135, 35), line(135, 35, 175, 160),
        line(109, 95, 121, 99), line(149, 99, 161, 95),
        line(217, 30, 223, 35), line(223, 35, 217, 40),
        line(127, 155, 133, 160), line(133, 160, 127, 165),
        text(13, 29, 'A'), text(292, 30, 'B'), text(178, 183, 'C'),
        text(80, 183, 'D'), text(128, 24, 'E'),
      ]), {
        structuredResponse:{
          kind:'number-pair',
          firstLabel:'(a) Angle ADE (degrees)',
          secondLabel:'(b) Angle BCE (degrees)',
        },
      });
  }

  const multiple = r.pick([2, 4]);
  const small = multiple === 2 ? r.int(24, 32) : r.int(14, 20);
  const third = multiple * small;
  const atB = r.pick([34, 38, 42, 46].filter(value => {
    const atA = 180 - third - value;
    return atA >= 60 && atA <= 96 && atA !== 80;
  }));
  const atA = 180 - third - atB;
  const context = [
    'In triangle ABD, C is between B and D on the straight side BD. AC is drawn.',
    `Angle BAC = ${atA}° and angle ABC = ${atB}°.`,
    `Angle ACB is ${multiple} times angle CAD.`,
    'The sketch is not drawn to scale.',
  ];
  return make(context, 'How large is angle CAD?', String(small),
    'Start with triangle ABC. Its third angle tells you the size of several equal parts.', [
      'The three angles in triangle ABC total 180°.',
      `Angle ACB = 180° − ${atA}° − ${atB}° = ${third}°.`,
      `Angle ACB contains ${multiple} equal parts, each the size of angle CAD.`,
      `Angle CAD = ${third}° ÷ ${multiple} = ${small}°.`,
    ], figure(context, [
      line(150, 25, 35, 170), line(150, 25, 280, 170),
      line(35, 170, 280, 170), line(150, 25, 205, 170),
      text(143, 19, 'A'), text(20, 190, 'B'),
      text(198, 190, 'C'), text(280, 190, 'D'),
    ]));
}
