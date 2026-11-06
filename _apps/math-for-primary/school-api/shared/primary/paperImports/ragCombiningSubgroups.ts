import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-combining-subgroup-compositions',
 level:6,
 title:'Combining subgroup compositions',
 objective:'Combine group ratios and subgroup fractions to find a combined ratio or an unknown group total.',
 skillIds:['P6.S.RATIO.01','P6.S.RATIO.02','P6.S.RATIO.05'],
 canonicalPatternId:'p6-combining-subgroup-compositions',
} as const;

type Step={text:string;equation?:string};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const pairAnswer=(a:number,b:number)=>JSON.stringify([String(a),String(b)]);

function coprimePair(r:Rng,lo:number,hi:number):[number,number]{
 for(let i=0;i<200;i++){const a=r.int(lo,hi),b=r.int(lo,hi);if(a!==b&&gcd(a,b)===1)return [a,b];}
 return [lo,lo+1];
}
function properFraction(r:Rng,dens:number[]):[number,number]{
 for(let i=0;i<200;i++){const d=r.pick(dens),p=r.int(1,d-1);if(gcd(p,d)===1)return [p,d];}
 return [1,dens[0]];
}
const finish=(key:string,prompt:string,context:string[],answer:string,hint:string,steps:Step[],extra:Partial<Question>):Question=>({
 key,prompt,context,answer,hint,workedSteps:steps,
 explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
 ...extra,
});

/** Variant 1: two equal-sized groups with different internal ratios. */
function equalGroups(r:Rng,key:string):Question{
 const [n1,n2]=r.pick([['Blue','Green'],['Red','Yellow'],['North','South'],['Lion','Tiger']]);
 let x=coprimePair(r,1,6),y=coprimePair(r,1,6);
 for(let i=0;i<200&&x[0]+x[1]===y[0]+y[1];i++)y=coprimePair(r,1,6);
 if(x[0]+x[1]===y[0]+y[1]){x=[1,2];y=[2,3];}
 const target=r.pick(['boys','girls']),ti=target==='boys'?0:1;
 const s1=x[0]+x[1],s2=y[0]+y[1],common=lcm(s1,s2),m1=common/s1,m2=common/s2;
 const top=x[ti]*m1+y[ti]*m2,whole=2*common,g=gcd(top,whole),a=top/g,b=whole/g;
 const steps:Step[]=[
  {text:`The two teams are the same size, so give them the same total number of parts. Use a number that both ${s1} and ${s2} divide into.`,equation:`${s1} × ${m1} = ${common} and ${s2} × ${m2} = ${common}`},
  {text:'Scale each ratio to match that total.',equation:`${n1} Team: ${x[0]*m1} : ${x[1]*m1}; ${n2} Team: ${y[0]*m2} : ${y[1]*m2}`},
  {text:`Add the ${target} parts from both teams.`,equation:`${x[ti]*m1} + ${y[ti]*m2} = ${top}`},
  {text:'Two equal teams together have twice as many parts as one team.',equation:`2 × ${common} = ${whole}`},
  {text:'Write the ratio and simplify it.',equation:`${top} : ${whole} = ${a} : ${b}`},
 ];
 return finish(key,`What is the ratio of the number of ${target} to the total number of children in the club? Give your answer in simplest form.`,
  [`A club is split into two teams of equal size: the ${n1} Team and the ${n2} Team.`,`In the ${n1} Team, the ratio of boys to girls is ${x[0]} : ${x[1]}.`,`In the ${n2} Team, the ratio of boys to girls is ${y[0]} : ${y[1]}.`],
  pairAnswer(a,b),'Make both teams have the same number of ratio parts before you add.',steps,
  {structuredResponse:{kind:'number-pair',firstLabel:capital(target),secondLabel:'All children'}});
}
const capital=(s:string)=>s[0].toUpperCase()+s.slice(1);

/** Variant 2: group ratio with a subgroup fraction in each part. */
function subgroupRatio(r:Rng,key:string):Question{
 const [m,n]=coprimePair(r,2,9),[p1,d1]=properFraction(r,[2,3,4,5,6,8]),[p2,d2]=properFraction(r,[2,3,4,5,6,8]);
 const A=m*p1*d2,B=n*p2*d1,g=gcd(A,B),a=A/g,b=B/g;
 const steps:Step[]=[
  {text:`Treat the ratio as parts: boys ${m} parts and girls ${n} parts.`},
  {text:'Find the parts that wear glasses in each group.',equation:`Boys: ${m} × ${p1}/${d1} = ${m*p1}/${d1}; Girls: ${n} × ${p2}/${d2} = ${n*p2}/${d2}`},
  {text:`Multiply both amounts by ${d1} × ${d2} = ${d1*d2} to remove the fractions.`,equation:`${m*p1*d2} : ${n*p2*d1}`},
  {text:'Simplify the ratio.',equation:`${A} : ${B} = ${a} : ${b}`},
 ];
 return finish(key,'What is the ratio of the number of boys who wear glasses to the number of girls who wear glasses? Give your answer in simplest form.',
  [`In a drama club, the ratio of the number of boys to the number of girls is ${m} : ${n}.`,`${p1}/${d1} of the boys wear glasses.`,`${p2}/${d2} of the girls wear glasses.`],
  pairAnswer(a,b),'Find how many parts of each group wear glasses, then compare them.',steps,
  {structuredResponse:{kind:'number-pair',firstLabel:'Boys with glasses',secondLabel:'Girls with glasses'}});
}

/** Variant 3: unknown group total from complementary subgroup counts. */
function groupTotal(r:Rng,key:string):Question{
 const fractions:[number,number][]=[[1,3],[2,5],[3,5],[1,4],[3,4],[2,7],[3,7],[1,2]];
 let k=2,p=1,n=3,q=2;
 for(let i=0;i<200;i++){[p,n]=r.pick(fractions);q=n-p;k=r.int(2,5);if(k*q>p)break;}
 if(k*q<=p){k=5;[p,n]=[1,3];q=2;}
 const t=r.int(3,12),B0=r.int(3,30),G0=t*(k*q-p)+k*B0,girls=p*t+G0,club=r.pick(['art','chess','science','garden']);
 const steps:Step[]=[
  {text:`Among children with glasses, girls are ${p} out of every ${n} parts. Let one unit be one part: girls with glasses are ${p} units and boys with glasses are ${q} units.`},
  {text:`Total boys = ${q} units + ${B0}. Total girls are ${k} times as many.`,equation:`${k} × (${q} units + ${B0}) = ${k*q} units + ${k*B0}`},
  {text:`Total girls is also ${p} units + ${G0}. Compare the two expressions for the girls.`,equation:`${k*q} units + ${k*B0} = ${p} units + ${G0}`},
  {text:'Take away the same amounts from both sides.',equation:`${k*q-p} units = ${G0} − ${k*B0} = ${G0-k*B0}`},
  {text:'Find one unit.',equation:`1 unit = ${G0-k*B0} ÷ ${k*q-p} = ${t}`},
  {text:'Find the total number of girls.',equation:`${p} × ${t} + ${G0} = ${girls}`},
 ];
 return finish(key,'How many girls are in the club?',
  [`In a school ${club} club, the number of girls is ${k} times the number of boys.`,`Of all the children in the club who wear glasses, ${p}/${n} are girls.`,`${G0} girls and ${B0} boys do not wear glasses.`],
  String(girls),'Use units for the children with glasses, then write the girls in two ways.',steps,{unit:'girls'});
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const variant=(((Math.floor(seed)+index)%3)+3)%3;
 return variant===0?equalGroups(r,key):variant===1?subgroupRatio(r,key):groupTotal(r,key);
}
