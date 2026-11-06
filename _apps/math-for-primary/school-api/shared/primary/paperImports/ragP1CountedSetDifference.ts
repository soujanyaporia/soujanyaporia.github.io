import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';
import type {PaperPicture,PaperIcon} from '../paperPicture';

export const RAG_PATTERN={
 id:'p1-counted-set-difference',
 level:1,
 title:'How many more or fewer?',
 objective:'Count two pictured sets, decide which is larger, and subtract to find how many more or fewer.',
 skillIds:['P1.S.WN.04','P1.S.AS.02','P1.S.AS.05'],
 canonicalPatternId:'p1-counted-set-difference',
};

const ITEMS:{plural:string;icon:PaperIcon}[]=[
 {plural:'pencils',icon:'pencil'},
 {plural:'apples',icon:'fruit'},
 {plural:'books',icon:'book'},
 {plural:'muffins',icon:'muffin'},
 {plural:'coins',icon:'coin'},
 {plural:'tickets',icon:'ticket'},
];
type Variant='more-number'|'fewer-number'|'more-sentence'|'fewer-sentence';
const VARIANTS:Variant[]=['more-number','fewer-number','more-sentence','fewer-sentence'];

/** Original comparison tasks: both counts are pictured, counts stay within 20 and always differ. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=VARIANTS[(((Math.trunc(seed)+Math.trunc(index))%4)+4)%4];
 const item=r.pick(ITEMS),small=r.int(5,16),diff=r.int(1,Math.min(7,20-small)),large=small+diff;
 const largeIsA=r.chance(.5);
 const countA=largeIsA?large:small,countB=largeIsA?small:large;
 const bigName=largeIsA?'A':'B',smallName=largeIsA?'B':'A';
 const picture:PaperPicture={type:'paper',layout:'cards',heading:`Two sets of ${item.plural}`,cards:[
  {label:'Set A',value:`Count the ${item.plural}`,icon:item.icon,count:countA},
  {label:'Set B',value:`Count the ${item.plural}`,icon:item.icon,count:countB},
 ]};
 const proof:Proof={op:'-',a:large,b:small};
 const countStep={text:'Count both sets.',equation:`Set A: ${countA}; Set B: ${countB}`,picture};
 const subtractStep={text:'The larger set has the extra objects. Subtract the smaller count from the larger count.',equation:`${large} − ${small} = ${diff}`,picture};
 const base={key:`${RAG_PATTERN.id}:${seed}:${index}`,picture};

 if(variant==='more-number'||variant==='fewer-number'){
  const more=variant==='more-number';
  return {...base,
   prompt:more?`How many more ${item.plural} does Set ${bigName} have than Set ${smallName}?`:`How many fewer ${item.plural} does Set ${smallName} have than Set ${bigName}?`,
   answer:String(diff),unit:item.plural,proof,
   hint:'Count each set once. Then find how many more the bigger set has.',
   explanation:`Set ${bigName} has ${large} and Set ${smallName} has ${small}. ${large} − ${small} = ${diff}.`,
   workedSteps:[countStep,subtractStep]};
 }
 const more=variant==='more-sentence';
 const subject=more?bigName:smallName,other=more?smallName:bigName,word=more?'more':'fewer';
 const sentence=(who:string,than:string,d:number)=>`Set ${who} has ${d} ${word} ${item.plural} than Set ${than}`;
 const correct=sentence(subject,other,diff);
 const choices=r.shuffle([correct,sentence(other,subject,diff),sentence(subject,other,diff+1),sentence(subject,other,diff>1?diff-1:diff+2)]);
 return {...base,
  prompt:'Count both sets. Which sentence is true?',
  answer:correct,choices,
  hint:`Find which set has ${more?'more':'fewer'}, then find the difference between the two counts.`,
  explanation:`Set ${bigName} has ${large} and Set ${smallName} has ${small}. The difference is ${large} − ${small} = ${diff}, so ${correct}.`,
  workedSteps:[countStep,subtractStep,{text:`Choose the sentence that names the set with ${more?'more':'fewer'} and uses ${diff}.`,equation:correct,picture}]};
}
