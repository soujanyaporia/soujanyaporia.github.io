import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p4-paper-rag-p4-sum-difference-two-quantities',
 level:4,
 title:'Find the smaller quantity from a total and a difference',
 objective:'Use a total and a "more than" difference to find the smaller of two quantities, including when other groups or a times-as-many group are in the total.',
 skillIds:['P3.S.AS.01','P4.S.MD.03'],
 canonicalPatternId:'p4-two-quantities-from-sum-and-difference',
};

const PAIRS:[string,string][]=[['Asha','Ben'],['Mei','Ravi'],['Hana','Iqbal'],['Zara','Chen'],['Dev','Lina'],['Tara','Omar']];
const TRIOS:[string,string,string][]=[['Larry','Kenny','Matt'],['Nora','Eli','Priya'],['Sam','Aiden','Jia'],['Bella','Raj','Cole']];
const ITEMS=['stamps','stickers','marbles','shells','beads','cards'];
const GROUPS:[string,string,string,string][]=[['Owls','Foxes','Bears','Hawks'],['Reds','Blues','Greens','Golds'],['Stars','Moons','Suns','Clouds']];

function finish(key:string,prompt:string,context:string[],answer:number,unit:string,hint:string,workedSteps:NonNullable<Question['workedSteps']>):Question{
 return {key,prompt,context,answer:String(answer),unit,hint,workedSteps,explanation:workedSteps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' ')};
}

export function makeRagQuestion(seed:number,index=0):Question{
 const s=Math.abs(Math.trunc(seed))||0,i=Math.abs(Math.trunc(index))||0;
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=(s+i)%3;
 if(variant===0){
  const [a,b]=r.pick(PAIRS),items=r.pick(ITEMS),small=r.int(110,950),diff=r.int(4,40)*5,total=2*small+diff;
  return finish(key,`How many ${items} does ${b} have?`,[`${a} and ${b} have ${total} ${items} altogether.`,`${a} has ${diff} more ${items} than ${b}.`],small,items,
   'If you take away the extra amount, both children have the same number left.',
   [{text:'Take away the extra amount so that the two amounts are equal.',equation:`${total} − ${diff} = ${total-diff}`},
    {text:`Share what is left equally. This is the smaller amount, ${b}'s.`,equation:`${total-diff} ÷ 2 = ${small}`}]);
 }
 if(variant===1){
  const [g1,g2,g3,g4]=r.pick(GROUPS),a=r.int(20,60),b=r.int(20,60),small=r.int(15,45),d=r.int(3,20),total=a+b+2*small+d,rest=total-a-b;
  return finish(key,`How many pupils are in the ${g3} group?`,[`A school has four groups: ${g1}, ${g2}, ${g3} and ${g4}. There are ${total} pupils in the four groups altogether.`,`The ${g1} group has ${a} pupils and the ${g2} group has ${b} pupils.`,`The ${g4} group has ${d} more pupils than the ${g3} group.`],small,'pupils',
   'First remove the two groups you already know. Then use the difference for the last two groups.',
   [{text:'Take away the two known groups to find the pupils in the other two groups.',equation:`${total} − ${a} − ${b} = ${rest}`},
    {text:'Take away the extra pupils so the last two groups are equal.',equation:`${rest} − ${d} = ${rest-d}`},
    {text:`Share equally. This is the smaller group, the ${g3} group.`,equation:`${rest-d} ÷ 2 = ${small}`}]);
 }
 const [a,b,c]=r.pick(TRIOS),items=r.pick(ITEMS),small=r.int(20,200),d=r.int(5,60),k=r.int(2,4),pair=2*small+d,total=(k+1)*pair;
 return finish(key,`How many ${items} does ${b} have?`,[`${a} has ${d} more ${items} than ${b}.`,`${c} has ${k} times the total number of ${items} that ${a} and ${b} have.`,`The three children have ${total} ${items} altogether.`],small,items,
  `Think of ${a} and ${b} together as 1 part. Then ${c} has ${k} of those parts.`,
  [{text:`${a} and ${b} together make 1 part and ${c} has ${k} parts, so count all the parts.`,equation:`1 + ${k} = ${k+1} parts`},
   {text:`Find how many ${items} ${a} and ${b} have together (1 part).`,equation:`${total} ÷ ${k+1} = ${pair}`},
   {text:'Take away the extra amount so the two amounts are equal.',equation:`${pair} − ${d} = ${pair-d}`},
   {text:`Share equally. This is the smaller amount, ${b}'s.`,equation:`${pair-d} ÷ 2 = ${small}`}]);
}
