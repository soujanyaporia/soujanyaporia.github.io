import type { Tool } from '../model';
/**
 * Pure geometry and arithmetic behind the manipulatives. Kept separate so tests can prove that pictures
 * are mathematically faithful: equal parts are equal, positions are proportional, totals are preserved.
 */
/** Left edge and width of each of `d` equal parts of a strip of width `w`. */
export const stripParts=(w:number,d:number)=>Array.from({length:d},(_,i)=>({x:(w*i)/d,width:w/d}));
/** Horizontal position of value `v` on a number line drawn from x0 to x1 for min..max. */
export const linePosition=(v:number,min:number,max:number,x0:number,x1:number)=>x0+((v-min)/(max-min))*(x1-x0);
/** Widths of bar-model parts: known parts proportional to value; unknown parts share what is left of the whole. */
export function barWidths(parts:(number|null)[],whole:number|null,width:number){
 const known=parts.reduce<number>((s,p)=>s+(p??0),0),unknown=parts.filter(p=>p===null).length,total=whole??(unknown?known*1.5:known);
 const rest=Math.max(0,total-known),each=unknown?rest/unknown:0;
 return parts.map(p=>total>0?((p??each)/total)*width:width/parts.length);
}
/** The number shown by a place-value chart: digits are ones, tenths, hundredths, thousandths… */
export const placeValue=(digits:number[],wholes=0)=>Math.round((wholes+digits.reduce((s,d,i)=>s+d/10**(i+1),0))*1e6)/1e6;
export const PLACE_NAMES=['tenths','hundredths','thousandths'];
export function expandedForm(digits:number[],wholes=0){
 const parts=[...(wholes?[`${wholes} one${wholes===1?'':'s'}`]:[]),...digits.map((d,i)=>d?`${d} ${d===1?PLACE_NAMES[i].slice(0,-1):PLACE_NAMES[i]}`:'').filter(Boolean)];
 return parts.length?parts.join(' + '):'0';
}
/** Total weight on one side of a balance, given the hidden value of the letter. */
export const sideWeight=(side:{x:number;n:number},xValue:number)=>side.x*xValue+side.n;
/** Beam angle in degrees: 0 when balanced, tilting towards the heavier side (capped). */
export const beamAngle=(t:Extract<Tool,{kind:'balance'}>)=>Math.max(-14,Math.min(14,(sideWeight(t.right,t.xValue)-sideWeight(t.left,t.xValue))*2));
export const isBalanced=(t:Extract<Tool,{kind:'balance'}>)=>sideWeight(t.left,t.xValue)===sideWeight(t.right,t.xValue);
export const sideText=(side:{x:number;n:number},letter='x')=>[side.x?(side.x===1?letter:`${side.x}${letter}`):'',side.n||!side.x?String(side.n):''].filter(Boolean).join(' + ');
/** Fraction-wall rows whose shaded lengths are equal (exact rational comparison). */
export function equalRows(t:Extract<Tool,{kind:'fractions'}>){const out:[number,number][]=[];for(let i=0;i<t.denominators.length;i++)for(let j=i+1;j<t.denominators.length;j++)if(t.shaded[i]>0&&t.shaded[i]*t.denominators[j]===t.shaded[j]*t.denominators[i])out.push([i,j]);return out;}
export const percentOf=(whole:number,percent:number)=>Math.round(whole*percent)/100;
export const ratioTotal=(t:Extract<Tool,{kind:'ratio'}>)=>t.units.reduce((s,u)=>s+u,0);
/** Sharing: items still in the pile. */
export const pileLeft=(t:Extract<Tool,{kind:'share'}>)=>t.total-t.given.reduce((s,g)=>s+g,0);
export const sharedEqually=(t:Extract<Tool,{kind:'share'}>)=>pileLeft(t)===0&&t.given.every(g=>g===t.given[0]);
/** Clock hands: minute-hand and hour-hand angles in degrees clockwise from 12. */
export const clockAngles=(minutes:number)=>({minute:(minutes%60)*6,hour:((minutes/60)%12)*30});
