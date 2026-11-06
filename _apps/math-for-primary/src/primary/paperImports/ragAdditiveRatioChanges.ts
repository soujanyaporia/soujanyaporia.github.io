import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-additive-changes-between-two-ratios',
 level:6,
 title:'Ratios changed by fixed additions or removals',
 objective:'Use unit parts, fixed additions or removals and a final ratio to find an unknown amount or total.',
 skillIds:['P6.S.RATIO.01','P6.S.RATIO.02','P6.S.RATIO.04','P6.S.RATIO.05'],
 canonicalPatternId:'p6-additive-changes-between-two-ratios',
};

type Step={text:string;equation?:string};
type Built={context:string[];prompt:string;answer:number;unit:string;hint:string;steps:Step[]};

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
/** Coprime ordered pairs with parts from 1 to 5, so ratios are always in simplest form. */
const PAIRS:[number,number][]=[];
for(let x=1;x<=5;x++)for(let y=1;y<=5;y++)if(x!==y&&gcd(x,y)===1)PAIRS.push([x,y]);

function search<T>(tries:number,make:()=>T|null):T{
 for(let i=0;i<tries;i++){const v=make();if(v)return v;}
 throw new Error('No valid ratio configuration found');
}
const units=(coef:number,rhs:number)=>`${Math.abs(coef)} unit${Math.abs(coef)===1?'':'s'} = ${Math.abs(rhs)}`;
const oneUnit=(coef:number,rhs:number,u:number)=>`${Math.abs(rhs)} ÷ ${Math.abs(coef)} = ${u}`;
const NAME_PAIRS:[string,string][]=[['Mia','Jun'],['Aisha','Ben'],['Priya','Lee'],['Hana','Omar'],['Chen','Sara']];

/** Variant 1: both quantities receive additions; find the first starting amount. */
function initialFromAdditions(r:Rng):Built{
 const {a,b,c,d,u,p,q}=search(100000,()=>{
  const [a,b]=r.pick(PAIRS),[c,d]=r.pick(PAIRS);
  if(a===c&&b===d)return null;
  const u=r.int(4,16),p=r.int(4,45),num=u*(d*a-c*b)+d*p;
  if(num%c!==0)return null;
  const q=num/c;
  if(q<4||q>60||q===p||Math.max(a,b)*u>90)return null;
  return {a,b,c,d,u,p,q};
 });
 const [n1,n2]=r.pick(NAME_PAIRS),items=r.pick(['stickers','marbles','stamps','beads']);
 const coef=d*a-c*b,rhs=c*q-d*p;
 return {
  context:[
   `The ratio of ${n1}’s ${items} to ${n2}’s ${items} is ${a}:${b} at first.`,
   `Then ${n1} gets ${p} more ${items}, and ${n2} gets ${q} more ${items}.`,
   `Now the ratio of ${n1}’s ${items} to ${n2}’s ${items} is ${c}:${d}.`,
  ],
  prompt:`How many ${items} did ${n1} have at first?`,
  answer:a*u,unit:items,
  hint:'Call the parts of the first ratio units. Write both new amounts using units, then use the new ratio.',
  steps:[
   {text:`At first, ${n1} has ${a} units and ${n2} has ${b} units.`},
   {text:`After the extra ${items}, ${n1} has ${a} units + ${p} and ${n2} has ${b} units + ${q}. These are in the ratio ${c}:${d}, so:`,equation:`${d} × (${a} units + ${p}) = ${c} × (${b} units + ${q})`},
   {text:'Multiply out both sides.',equation:`${d*a} units + ${d*p} = ${c*b} units + ${c*q}`},
   {text:'Gather the units on one side and the plain numbers on the other.',equation:units(coef,rhs)},
   {text:'Divide to find the size of one unit.',equation:`${oneUnit(coef,rhs,u)}, so 1 unit = ${u}`},
   {text:`${n1} had ${a} units at first.`,equation:`${a} × ${u} = ${a*u}`},
  ],
 };
}

/** Variant 2: three shares, fixed removals, final ratio of two shares; find the total left. */
function totalLeftThreeShares(r:Rng):Built{
 const {a,b,c,e,f,u,r1,r2,r3}=search(100000,()=>{
  const a=r.int(1,5),b=r.int(1,5),c=r.int(1,5);
  if(gcd(gcd(a,b),c)!==1)return null;
  const [e,f]=r.pick(PAIRS);
  if(f*b===e*c)return null;
  const u=r.int(4,14),t=r.int(1,30);
  const r2=b*u-e*t,r3=c*u-f*t;
  if(r2<2||r3<2)return null;
  const r1=r.int(2,a*u-1);
  if(r1<2)return null;
  return {a,b,c,e,f,u,r1,r2,r3};
 });
 const [i1,i2,i3]=r.pick([['mangoes','pears','limes'],['apples','plums','figs'],['oranges','guavas','kiwis']]);
 const coef=f*b-e*c,rhs=f*r2-e*r3,initial=(a+b+c)*u,left=initial-r1-r2-r3;
 return {
  context:[
   `At a fruit stall, the ratio of ${i1} to ${i2} to ${i3} is ${a}:${b}:${c} at first.`,
   `The owner sells ${r1} ${i1}, ${r2} ${i2} and ${r3} ${i3}.`,
   `After that, the ratio of ${i2} left to ${i3} left is ${e}:${f}.`,
  ],
  prompt:'How many pieces of fruit are left altogether?',
  answer:left,unit:'fruits',
  hint:`Use units for the starting amounts. Only the ${i2} and ${i3} ratio is known after the sale, so use it to find one unit.`,
  steps:[
   {text:`At first, the three amounts are ${a} units, ${b} units and ${c} units.`},
   {text:`After the sale, ${i2} left is ${b} units − ${r2} and ${i3} left is ${c} units − ${r3}. They are in the ratio ${e}:${f}, so:`,equation:`${f} × (${b} units − ${r2}) = ${e} × (${c} units − ${r3})`},
   {text:'Multiply out both sides.',equation:`${f*b} units − ${f*r2} = ${e*c} units − ${e*r3}`},
   {text:'Gather the units and the plain numbers.',equation:units(coef,rhs)},
   {text:'Divide to find one unit.',equation:`${oneUnit(coef,rhs,u)}, so 1 unit = ${u}`},
   {text:'Find the starting total, then take away everything that was sold.',equation:`${a+b+c} × ${u} = ${initial}; ${initial} − (${r1} + ${r2} + ${r3}) = ${left}`},
  ],
 };
}

/** Variant 3: "k times as much" at first, different additions, "m times as much" at the end; find the final total. */
function finalTotalTimesAsMuch(r:Rng):Built{
 const {k,m,u,p,q}=search(100000,()=>{
  const k=r.int(2,6),m=r.int(2,6);
  if(k===m)return null;
  const u=10*r.int(5,40),q=10*r.int(5,40),p=m*q-u*(k-m);
  if(p<=0||p>1000||p===q)return null;
  return {k,m,u,p,q};
 });
 const [n1,n2]=r.pick(NAME_PAIRS);
 const coef=k-m,rhs=m*q-p,total=(m+1)*(u+q);
 return {
  context:[
   `In Week 1, ${n1} saved ${k} times as much money as ${n2}.`,
   `In Week 2, ${n1} saved another $${p} and ${n2} saved another $${q}.`,
   `At the end of Week 2, ${n1} had saved ${m} times as much money as ${n2}.`,
  ],
  prompt:'How much money did the two children save altogether in the two weeks?',
  answer:total,unit:'dollars',
  hint:`Let ${n2}’s Week 1 savings be 1 unit. Write both final amounts using units, then use the final “times as much” fact.`,
  steps:[
   {text:`In Week 1, ${n2} saved 1 unit and ${n1} saved ${k} units.`},
   {text:`At the end, ${n1} has ${k} units + $${p} and ${n2} has 1 unit + $${q}. ${n1} has ${m} times as much as ${n2}:`,equation:`${k} units + ${p} = ${m} × (1 unit + ${q})`},
   {text:'Multiply out the right side.',equation:`${k} units + ${p} = ${m} units + ${m*q}`},
   {text:'Compare the units with the plain numbers.',equation:units(coef,rhs)},
   {text:'Divide to find one unit.',equation:`${oneUnit(coef,rhs,u)}, so 1 unit = $${u}`},
   {text:`Find each child’s final amount.`,equation:`${n2}: ${u} + ${q} = ${u+q}; ${n1}: ${m} × ${u+q} = ${m*(u+q)}`},
   {text:'Add the two final amounts.',equation:`${u+q} + ${m*(u+q)} = ${total}`},
  ],
 };
}

/** Variant 4: a fraction equality sets the first ratio; one box gains, one loses; find the final amount in Box P. */
function finalFromFractionEquality(r:Rng):Built{
 const {x,y,z,w,a,b,c,d,u,p,q}=search(100000,()=>{
  const y=r.int(2,9),w=r.int(2,9),x=r.int(1,y-1),z=r.int(1,w-1);
  const g=gcd(z*y,w*x),a=z*y/g,b=w*x/g;
  if(a===b||a>14||b>14)return null;
  const [c,d]=r.pick(PAIRS),u=r.int(3,25),p=r.int(2,40),num=u*(c*b-d*a)-d*p;
  if(num<=0||num%c!==0)return null;
  const q=num/c;
  if(q<2||q>=b*u||a*u>300||b*u>300)return null;
  return {x,y,z,w,a,b,c,d,u,p,q};
 });
 const items=r.pick(['counters','buttons','tiles','coins']);
 const coef=c*b-d*a,rhs=d*p+c*q,end=a*u+p;
 return {
  context:[
   `${x}/${y} of the ${items} in Box P is the same as ${z}/${w} of the ${items} in Box Q.`,
   `${p} ${items} are added to Box P, and ${q} ${items} are taken out of Box Q.`,
   `Now the ratio of the ${items} in Box P to the ${items} in Box Q is ${c}:${d}.`,
  ],
  prompt:`How many ${items} are in Box P in the end?`,
  answer:end,unit:items,
  hint:'First turn the fraction statement into a ratio of Box P to Box Q. Then use units for the changes.',
  steps:[
   {text:`Equal amounts: ${x}/${y} of P = ${z}/${w} of Q, so P : Q = ${z}/${w} : ${x}/${y}. Multiply both by ${w*y} to remove the fractions.`,equation:`P : Q = ${z*y} : ${w*x} = ${a} : ${b}`},
   {text:`At first, Box P has ${a} units and Box Q has ${b} units.`},
   {text:`In the end, Box P has ${a} units + ${p} and Box Q has ${b} units − ${q}. Their ratio is ${c}:${d}, so:`,equation:`${d} × (${a} units + ${p}) = ${c} × (${b} units − ${q})`},
   {text:'Multiply out both sides.',equation:`${d*a} units + ${d*p} = ${c*b} units − ${c*q}`},
   {text:'Gather the units and the plain numbers.',equation:units(coef,rhs)},
   {text:'Divide to find one unit.',equation:`${oneUnit(coef,rhs,u)}, so 1 unit = ${u}`},
   {text:`Box P at the end is its starting units plus the ${items} added.`,equation:`${a} × ${u} + ${p} = ${end}`},
  ],
 };
}

const VARIANTS=[initialFromAdditions,totalLeftThreeShares,finalTotalTimesAsMuch,finalFromFractionEquality];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const which=(((Math.trunc(seed)+index)%VARIANTS.length)+VARIANTS.length)%VARIANTS.length;
 const built=VARIANTS[which](r);
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  context:built.context,
  prompt:built.prompt,
  answer:String(built.answer),
  unit:built.unit,
  hint:built.hint,
  workedSteps:built.steps,
  explanation:built.steps.map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' '),
 };
}
