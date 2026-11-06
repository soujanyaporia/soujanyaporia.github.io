import { Rng, hashString } from '../../engine/random';
import type { Question, Picture } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-square-overlap-angles',
  level: 5,
  title: 'Find a sum of angles in two squares',
  objective: 'Use square corners and a given angle to find and add two unknown angles.',
  skillIds: ['P5.S.SHAPE.03', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'p5-square-diagonal-overlapping-square-angles',
};

const line = (x1:number,y1:number,x2:number,y2:number):Batch11UpperMark => ({kind:'line',x1,y1,x2,y2});
const label = (x:number,y:number,text:string):Batch11UpperMark => ({kind:'text',x,y,text});

export function makeRagQuestion(seed:number,index=0):Question {
  const rng = new Rng(hashString(`rag-square-overlap-angles:${seed}:${index}`));
  const given = rng.pick([24, 32, 38, 46, 54]);
  const answer = 180 - 2 * given;
  const marks:Batch11UpperMark[] = [
    // Square ABCD and square CWXY share side WC. Rays CB and CD make the
    // right angle at C in the first square; CY is perpendicular to CW.
    line(65,85,145,45), line(145,45,220,105), line(220,105,140,145), line(140,145,65,85),
    line(140,145,220,105),
    line(145,45,185,5), line(185,5,260,65), line(260,65,220,105), line(65,85,145,45),
    label(145,35,'B'), label(225,105,'C'), label(136,155,'D'), label(54,82,'A'),
    label(132,42,'W'), label(186,0,'X'), label(264,63,'Y'),
    label(205,91,`${given}°`), label(194,127,'?'), label(238,82,'?'),
  ];
  const picture = {type:'batch11-upper',label:`Two squares ABCD and CWXY share side WC. Angle WCB is ${given} degrees.`,marks} as Batch11UpperPicture as unknown as Picture;
  const steps = [
    `At C, the square corner is 90°. The angle between WC and CD is 90° − ${given}° = ${90-given}°.`,
    `The second square also has a 90° corner at C, so the angle between BC and CY is 90° − ${given}° = ${90-given}°.`,
    `The required sum is ${90-given}° + ${90-given}° = ${answer}°.`,
  ];
  return {
    key:`rag-square-overlap-angles:${seed}:${index}`,
    context:[`Two squares ABCD and CWXY share side WC. Angle WCB is ${given}°.`],
    prompt:'Find the sum of angle WCD and angle BCY.',
    answer:String(answer), unit:'degrees', picture,
    hint:'Each square has a 90° corner at C. Subtract the given angle from each corner, then add.',
    explanation:steps.join(' '), workedSteps:steps.map(text=>({text})),
  };
}
