import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original overlap-and-union ratio-unit questions. All givens are stated in words; no figure is needed. */
export const RAG_PATTERN = {
 id:'p6-overlap-union-ratio-units',
 level:6,
 title:'Overlapping shapes: ratio units',
 objective:'Write two shapes and their shared part in common ratio units, count the overlap once, and find a fraction, a ratio or an area.',
 skillIds:['P6.S.RATIO.01','P6.S.RATIO.02','P6.S.RATIO.05'],
 canonicalPatternId:'p6-overlap-union-ratio-units',
};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const reduceRatio=(a:number,b:number)=>{const g=gcd(a,b);return `${a/g}:${b/g}`;};
const PAIRS:readonly (readonly [string,string])[]=[['square','rectangle'],['rectangle','triangle'],['square','triangle'],['rectangle','circle']];
const VARIANTS=['fraction','ratio','unshaded','union'] as const;

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-overlap-union-ratio-units:${seed}:${index}`));
 const variant=VARIANTS[(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%4];
 const [a,b]=r.pick(PAIRS);
 const key=`rag-overlap-union-ratio-units:${seed}:${index}`;
 const intro=`A ${a} and a ${b} overlap. The overlapping part is shaded. The whole figure is the two shapes together, so the shaded part is counted once.`;

 if(variant==='union'){
  const o0=r.int(1,4),a0=r.int(o0+1,o0+7),b0=r.int(o0+1,o0+7),g=gcd(gcd(o0,a0),b0);
  const o=o0/g,A=a0/g,B=b0/g,union=A+B-o,k=r.int(2,12),given=union*k,targetIsFirst=r.chance(.5);
  const target=targetIsFirst?a:b,units=targetIsFirst?A:B,answer=units*k;
  return {key,context:[intro,`Ratio: area of the ${a} : shaded area : area of the ${b} = ${A} : ${o} : ${B}.`,`The whole figure has area ${given} cm².`],prompt:`Find the area of the ${target}.`,answer:String(answer),unit:'cm²',
   hint:'The whole figure counts the shaded part only once. Add the two shapes, then take away one shaded part.',
   explanation:`The whole figure is ${A} + ${B} − ${o} = ${union} units. ${union} units = ${given} cm², so 1 unit = ${k} cm². The ${target} is ${units} × ${k} = ${answer} cm².`,
   workedSteps:[{text:`Whole figure in units: ${A} + ${B} − ${o} = ${union} units.`},{text:`One unit is ${given} ÷ ${union} = ${k} cm².`},{text:`The ${target} is ${units} units: ${units} × ${k} = ${answer} cm².`}]};
 }

 // Two ratios that each compare the shaded part with one whole shape.
 const p1=r.pick([1,2,3,4,5]);let p2=r.pick([1,2,3,4,5,6]);
 for(let i=0;i<30&&p2===p1;i++)p2=r.pick([1,2,3,4,5,6]);
 if(p2===p1)p2=p1+1;
 const coprimeTerm=(p:number)=>{for(let i=0;i<40;i++){const q=r.int(p+1,p+6);if(gcd(p,q)===1)return q;}return p+1;};
 const q1=coprimeTerm(p1),q2=coprimeTerm(p2);
 const o=lcm(p1,p2),A=q1*o/p1,B=q2*o/p2,union=A+B-o,unshaded=A+B-2*o;
 const ratioLines=[`Shaded area : area of the ${a} = ${p1} : ${q1}.`,`Shaded area : area of the ${b} = ${p2} : ${q2}.`];
 const equalise=`Give the shaded part ${o} units in both ratios: ${p1} : ${q1} = ${o} : ${A} and ${p2} : ${q2} = ${o} : ${B}.`;
 const shapeUnits=`So the ${a} is ${A} units, the ${b} is ${B} units and the shaded part is ${o} units.`;

 if(variant==='fraction'){
  const g=gcd(o,union),answer=`${o/g}/${union/g}`;
  return {key,context:[intro,...ratioLines],prompt:'What fraction of the whole figure is shaded?',answer,requireSimplified:true,
   hint:'Make the shaded part the same number of units in both ratios. Then count the shaded part once in the whole figure.',
   explanation:`${equalise} The whole figure is ${A} + ${B} − ${o} = ${union} units, so the shaded fraction is ${o}/${union} = ${answer}.`,
   workedSteps:[{text:equalise},{text:shapeUnits},{text:`Whole figure: ${A} + ${B} − ${o} = ${union} units.`},{text:`Shaded fraction = ${o}/${union} = ${answer}.`}]};
 }
 if(variant==='ratio'){
  const answer=reduceRatio(o,unshaded);
  const candidates=[reduceRatio(o,A+B),reduceRatio(o,union),reduceRatio(A-o,B-o),reduceRatio(unshaded,o),`${o+1}:${unshaded}`,`${o}:${unshaded+1}`];
  const wrong:string[]=[];for(const c of candidates)if(c!==answer&&!wrong.includes(c)&&wrong.length<3)wrong.push(c);
  return {key,context:[intro,...ratioLines],prompt:'What is the ratio of the shaded area to the total unshaded area of the figure?',answer,choices:r.shuffle([answer,...wrong]),
   hint:'Find the unshaded part of each shape, then add the two unshaded parts.',
   explanation:`${equalise} Unshaded part of the ${a} = ${A} − ${o} = ${A-o} units. Unshaded part of the ${b} = ${B} − ${o} = ${B-o} units. Total unshaded = ${unshaded} units, so the ratio is ${o} : ${unshaded} = ${answer.replace(':',' : ')}.`,
   workedSteps:[{text:equalise},{text:shapeUnits},{text:`Total unshaded: (${A} − ${o}) + (${B} − ${o}) = ${unshaded} units.`},{text:`Shaded : unshaded = ${o} : ${unshaded}, which simplifies to ${answer.replace(':',' : ')}.`}]};
 }
 const k=r.int(2,15),given=unshaded*k,answer=o*k;
 return {key,context:[intro,...ratioLines,`The part of the whole figure that is not shaded has area ${given} cm².`],prompt:'Find the shaded area.',answer:String(answer),unit:'cm²',
  hint:'Write both shapes in units with the same shaded part. The unshaded part is what is left after taking the shaded part from each shape.',
  explanation:`${equalise} The unshaded part is (${A} − ${o}) + (${B} − ${o}) = ${unshaded} units. ${unshaded} units = ${given} cm², so 1 unit = ${k} cm². The shaded area is ${o} × ${k} = ${answer} cm².`,
  workedSteps:[{text:equalise},{text:shapeUnits},{text:`Unshaded part: (${A} − ${o}) + (${B} − ${o}) = ${unshaded} units.`},{text:`One unit is ${given} ÷ ${unshaded} = ${k} cm².`},{text:`Shaded area = ${o} × ${k} = ${answer} cm².`}]};
}
