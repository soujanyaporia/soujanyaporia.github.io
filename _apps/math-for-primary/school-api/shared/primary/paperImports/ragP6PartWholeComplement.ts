import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';

/** Part, whole and complement percentages: original wording, text-only givens, one numeric answer. */
export const RAG_PATTERN={
 id:'p6-part-whole-complement',
 level:6,
 title:'Part, whole and complement percentages',
 objective:'Use a known part and its percentage to find the whole, a complementary part, or an earlier quantity.',
 skillIds:['P6.S.PCT.01','P5.S.PCT.03'],
 canonicalPatternId:'p6-part-whole-complement-percentage',
};

type Step={text:string;equation:string};
const op=(o:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:o,a,b});

interface Stock{who:string;verb:string;thing:string;a:string;b:string}
const WHOLE_THEMES:Stock[]=[
 {who:'A shop',verb:'sold',thing:'ribbons',a:'red',b:'gold'},
 {who:'A bakery',verb:'baked',thing:'buns',a:'plain',b:'chocolate'},
 {who:'A library',verb:'lent out',thing:'books',a:'story',b:'science'},
];
interface Crowd{place:string;all:string;A:string;B:string}
const COMPLEMENT_THEMES:Crowd[]=[
 {place:'canteen',all:'children',A:'girls',B:'boys'},
 {place:'hall',all:'people',A:'adults',B:'children'},
 {place:'bag',all:'marbles',A:'red marbles',B:'blue marbles'},
];
const STOCK_THEMES:Stock[]=[
 {who:'Ms Chua',verb:'sold',thing:'mugs',a:'white',b:'green'},
 {who:'Mr Hari',verb:'sold',thing:'scarves',a:'wool',b:'cotton'},
 {who:'Mrs Koh',verb:'sold',thing:'caps',a:'grey',b:'yellow'},
];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p6-part-whole-complement:${seed}:${index}`));
 const key=`rag-p6-part-whole-complement:${seed}:${index}`;
 const variant=((Math.trunc(seed)+index)%3+3)%3;
 const finish=(prompt:string,context:string[],answer:number,unit:string,hint:string,steps:Step[],proof:Proof):Question=>({
  key,prompt,context,answer:String(answer),unit,hint,
  explanation:steps.map(s=>`${s.text} ${s.equation}`).join(' '),
  workedSteps:steps,proof,
 });

 if(variant===0){
  // The known count is the complement of the stated percentage; recover the whole.
  const t=r.pick(WHOLE_THEMES),other=r.pick([10,15,20,25,30,35,40,60,75]),unit=r.int(2,24),total=20*unit,known=total*(100-other)/100;
  return finish(
   `How many ${t.thing} were ${t.verb} altogether?`,
   [`Only ${t.a} ${t.thing} and ${t.b} ${t.thing} were ${t.verb}.`,`${t.who} ${t.verb} ${known} ${t.a} ${t.thing}.`,`${other}% of all the ${t.thing} ${t.verb} were ${t.b} ${t.thing}.`],
   total,t.thing,
   `The ${t.a} ${t.thing} are everything except the ${other}%. Find what percentage they are, then work back to 100%.`,
   [{text:`Find the percentage that are ${t.a} ${t.thing}.`,equation:`100% − ${other}% = ${100-other}%`},
    {text:'The known count is that percentage of the whole. Find 1%, then 100%.',equation:`${known} ÷ ${100-other} × 100 = ${total}`}],
   op('*',op('/',known,100-other),100));
 }

 if(variant===1){
  // A known category and its percentage give the whole; subtract to find the other category.
  const t=r.pick(COMPLEMENT_THEMES),p=r.pick([10,20,25,30,40,60,75,80]),unit=r.int(2,24),total=20*unit,known=total*p/100,answer=total-known;
  return finish(
   `How many ${t.B} are there?`,
   [`The ${t.place} has only ${t.A} and ${t.B}.`,`There are ${known} ${t.A}.`,`${p}% of all the ${t.all} are ${t.A}.`],
   answer,t.B,
   `First use the ${p}% to find the whole group. Then take away the ${t.A}.`,
   [{text:`The ${known} ${t.A} are ${p}% of the whole. Find 1%, then 100%.`,equation:`${known} ÷ ${p} × 100 = ${total}`},
    {text:`Subtract the known group from the whole to find the ${t.B}.`,equation:`${total} − ${known} = ${answer}`}],
   op('-',op('*',op('/',known,p),100),known));
 }

 // Two linked stages: total sold from its complement, total stock from the sold share, then the unsold split.
 const t=r.pick(STOCK_THEMES),redShare=r.pick([10,20,25,30,40,50,60,75]),soldShare=r.pick([20,25,40,50,60,75]),aUnsold=r.pick([10,20,25,30,40,50,60]);
 const k=r.int(1,6),stock=400*k,sold=stock/100*soldShare,bSold=sold*redShare/100,aSold=sold-bSold;
 const unsold=stock-sold,aLeft=unsold*aUnsold/100,bLeft=unsold-aLeft,answer=bSold+bLeft;
 return finish(
  `How many ${t.b} ${t.thing} did ${t.who} have at first?`,
  [`${t.who} had only ${t.a} ${t.thing} and ${t.b} ${t.thing}.`,`${t.who} sold ${aSold} ${t.a} ${t.thing}. ${redShare}% of the ${t.thing} sold were ${t.b}.`,`Altogether ${soldShare}% of the ${t.thing} were sold. ${aUnsold}% of the ${t.thing} left unsold were ${t.a}.`],
  answer,t.thing,
  `Work in stages: the number sold, then the number at first, then the unsold ${t.thing} that are ${t.b}.`,
  [{text:`Find how many ${t.thing} were sold. The ${t.a} ones are the complement of ${redShare}%.`,equation:`${aSold} ÷ ${100-redShare} × 100 = ${sold}`},
   {text:`Find the ${t.b} ${t.thing} sold.`,equation:`${sold} − ${aSold} = ${bSold}`},
   {text:`The ${sold} sold are ${soldShare}% of the ${t.thing} at first. Find the number at first.`,equation:`${sold} ÷ ${soldShare} × 100 = ${stock}`},
   {text:'Find the number left unsold.',equation:`${stock} − ${sold} = ${unsold}`},
   {text:`Find the unsold ${t.thing} that are not ${t.a}.`,equation:`${unsold} − ${aUnsold}/100 × ${unsold} = ${bLeft}`},
   {text:`Add the ${t.b} ${t.thing} sold and unsold.`,equation:`${bSold} + ${bLeft} = ${answer}`}],
  op('+',op('-',op('*',op('/',aSold,100-redShare),100),aSold),op('-',op('-',op('*',op('/',op('*',op('/',aSold,100-redShare),100),soldShare),100),op('*',op('/',aSold,100-redShare),100)),op('*',op('/',op('-',op('*',op('/',op('*',op('/',aSold,100-redShare),100),soldShare),100),op('*',op('/',aSold,100-redShare),100)),100),aUnsold))));
}
