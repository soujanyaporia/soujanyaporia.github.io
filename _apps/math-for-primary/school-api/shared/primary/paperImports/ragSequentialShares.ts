import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

/** Original generator: successive percentage/fraction allocations are expressed as shares of the original whole. */
export const RAG_PATTERN={
 id:'p5-sequential-shares-remainder',
 level:5,
 title:'Sequential shares and remainder reconstruction',
 objective:'Express successive percentage and fraction allocations as shares of the original whole, then recover the whole or a category from a final quantity or a count difference.',
 skillIds:['P5.S.PCT.03','P5.S.PCT.02','P5.S.FRAC.05'],
 canonicalPatternId:'p5-sequential-shares-remainder-reconstruction',
};

type MoneyCase={S:number;p:number;a:number;b:number;F:number;G:number;L:number};
type ShareCase={A:number;B:number;T:number;ps:number[]};

const FRACS:[number,number][]=[[1,4],[3,4],[2,5],[3,5],[1,3],[2,3]];

function buildMoneyCases():MoneyCase[]{
 const out:MoneyCase[]=[];
 for(let S=1000;S<=4000;S+=200)for(const p of [20,25,30,40]){
  const W=S*(100-p)/100;
  for(const [a,b] of FRACS)for(let F=100;F<=500;F+=50){
   const R=W-F;if(R<=0||R%b!==0)continue;
   const keep=R*(b-a)/b;
   for(const G of [60,80,100,120,150,200]){const L=keep-G;if(L>=100)out.push({S,p,a,b,F,G,L});}
  }
 }
 return out;
}

function buildShareCases():ShareCase[]{
 const out:ShareCase[]=[];
 for(const A of [20,25,30,40,50,60])for(const B of [20,25,40,50,60,75,80]){
  const ps=[A,(100-A)*B/100,(100-A)*(100-B)/100];
  if(!ps.every(Number.isInteger))continue;
  for(let T=40;T<=1200;T+=20)if(ps.every(p=>(T*p)%100===0))out.push({A,B,T,ps});
 }
 return out;
}

const MONEY_CASES=buildMoneyCases();
const SHARE_CASES=buildShareCases();

const PEOPLE=[
 {name:'Nadia',subj:'She',poss:'her'},
 {name:'Kai',subj:'He',poss:'his'},
 {name:'Priya',subj:'She',poss:'her'},
 {name:'Tomas',subj:'He',poss:'his'},
];
const THEMES=[
 {noun:'beads',cats:['red','blue','green']},
 {noun:'stamps',cats:['bird','fish','flower']},
 {noun:'cards',cats:['sports','animal','space']},
 {noun:'balloons',cats:['gold','silver','purple']},
];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-sequential-shares:${seed}:${index}`));
 const key=`rag-sequential-shares:${seed}:${index}`;
 const variant=((Math.trunc(seed)%3)+3+index%3)%3;
 if(variant===0){
  const c=r.pick(MONEY_CASES),who=r.pick(PEOPLE),{S,p,a,b,F,G,L}=c;
  const keep=L+G,R=keep/(b-a)*b,W=R+F;
  return {
   key,
   context:[
    `${who.name} spent ${p}% of ${who.poss} monthly pay on rent and $${F} on bus fares.`,
    `${who.subj} then gave ${a}/${b} of the money that was left to ${who.poss} grandmother and spent $${G} on a book.`,
    `${who.subj} had $${L} left at the end.`,
   ],
   prompt:`How much was ${who.name}'s monthly pay?`,
   answer:S.toFixed(2),
   unit:'dollars',
   hint:'Work backwards. Undo the book and the gift first, then the bus fares, then use the percentage that was left after rent.',
   explanation:`Before the gift there was $${R}. Adding the bus fares gives $${W}, which is ${100-p}% of the pay, so the pay was $${S}.`,
   workedSteps:[
    {text:`Money left after the gift and the book: $${L} + $${G} = $${keep}.`},
    {text:`That is ${b-a}/${b} of the money before the gift, so before the gift there was $${keep} ÷ ${b-a} × ${b} = $${R}.`},
    {text:`Add back the bus fares: $${R} + $${F} = $${W}. This is ${100-p}% of the pay.`},
    {text:`Pay = $${W} ÷ ${100-p} × 100 = $${S}.`},
   ],
  };
 }
 const c=r.pick(SHARE_CASES),theme=r.pick(THEMES),cats=r.shuffle(theme.cats),{A,B,T,ps}=c,noun=theme.noun;
 const intro=`${A}% of the ${noun} were ${cats[0]}. ${B}% of the rest were ${cats[1]}, and the remaining ${noun} were ${cats[2]}.`;
 const stepsShares=[
  {text:`After the ${cats[0]} ${noun}, ${100-A}% of all the ${noun} are left.`},
  {text:`${cats[1]}: ${B}% of ${100-A}% = ${ps[1]}% of all. ${cats[2]}: ${100-B}% of ${100-A}% = ${ps[2]}% of all.`},
 ];
 if(variant===1){
  const Z=T*ps[2]/100,first=T*A/100;
  return {
   key,
   context:[intro,`There were ${Z} ${cats[2]} ${noun}.`],
   prompt:`How many ${cats[0]} ${noun} were there?`,
   answer:String(first),
   unit:noun,
   hint:`Find what percentage of all the ${noun} are ${cats[2]}. Use it to find the total first.`,
   explanation:`${ps[2]}% of the total is ${Z}, so the total is ${T}. ${A}% of ${T} is ${first}.`,
   workedSteps:[...stepsShares,{text:`${ps[2]}% is ${Z}, so the total is ${Z} ÷ ${ps[2]} × 100 = ${T}.`},{text:`${cats[0]} ${noun}: ${A}% of ${T} = ${first}.`}],
  };
 }
 const pairs=[[0,1],[0,2],[1,0],[1,2],[2,0],[2,1]].filter(([i,j])=>ps[i]>ps[j]);
 const [i,j]=r.pick(pairs),D=T*(ps[i]-ps[j])/100,d=ps[i]-ps[j];
 return {
  key,
  context:[intro,`There were ${D} more ${cats[i]} ${noun} than ${cats[j]} ${noun}.`],
  prompt:`How many ${noun} were there altogether?`,
  answer:String(T),
  unit:noun,
  hint:'Write each colour as a percentage of the whole. The difference in percentages matches the difference in numbers.',
  explanation:`${ps[i]}% − ${ps[j]}% = ${d}% of the total is ${D}, so the total is ${T}.`,
  workedSteps:[...stepsShares,{text:`The ${cats[i]} share is ${ps[i]}% and the ${cats[j]} share is ${ps[j]}%. The difference is ${d}% of all the ${noun}.`},{text:`${d}% is ${D}, so the total is ${D} ÷ ${d} × 100 = ${T}.`}],
 };
}
