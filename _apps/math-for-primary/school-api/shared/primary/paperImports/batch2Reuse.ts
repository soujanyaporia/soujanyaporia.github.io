import {Rng,hashString} from '../../engine/random';
import type {Activity} from '../catalog';
import type {Question} from '../generate';

/** Return a decimal string with exactly one digit, avoiding binary floating-point rounding. */
export function roundHundredthsToTenth(hundredths:number):string {
 if(!Number.isSafeInteger(hundredths)||hundredths<0)throw Error('Expected nonnegative whole hundredths');
 const tenths=Math.floor((hundredths+5)/10);
 return `${Math.floor(tenths/10)}.${tenths%10}`;
}
/** New original two-decimal practice; source paper numbers and wording are not copied. */
export function makeBatch2RoundingQuestion(activity:Activity,seed:number,index=0):Question {
 const rng=new Rng(hashString(`reuse-round-tenth-two-decimals:${seed}:${index}`));
 const hundredths=rng.int(1234,98567),number=(hundredths/100).toFixed(2),answer=roundHundredthsToTenth(hundredths),nextDigit=hundredths%10;
 return {key:`${activity.id}:${seed}:${index}`,prompt:'Round the number to the nearest tenth.',answer,
 picture:{type:'paper',layout:'cards',heading:'Round a decimal',cards:[{label:'Number',value:number,icon:'number'}]},
 hint:'Check the hundredths digit to decide whether to increase the tenths digit.',
 workedSteps:[{text:'Find the hundredths digit.',equation:`Hundredths digit: ${nextDigit}`},{text:nextDigit>=5?'Round the tenths digit up, carrying if needed.':'Keep the tenths digit.',equation:`${number} ≈ ${answer}`}],
 explanation:`The hundredths digit is ${nextDigit}. Rounded to the nearest tenth, ${number} is ${answer}.`};
}
