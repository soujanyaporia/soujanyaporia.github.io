import {Rng,hashString} from '../../engine/random';
import type {Question,Picture} from '../generate';
import type {PaperPicture} from '../paperPicture';
import {makeBatch4Early} from './batch4Early';
import {BATCH5_EARLY_PARTS,type Batch5EarlyPart} from './batch5EarlyMeta';
export {BATCH5_EARLY_PARTS,BATCH5_EARLY_SOURCE,type Batch5EarlyPart} from './batch5EarlyMeta';
export type Batch5EarlyQuestion=Question&{workedSteps:NonNullable<Question['workedSteps']>};
type Step=[text:string,equation?:string];
const names=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const collections=(a:number,b:number,different=false,heading='Compare the two sets'):PaperPicture=>({type:'paper',layout:'cards',heading,cards:[{label:'Set A',value:'Count the objects',icon:'fruit',count:a},{label:'Set B',value:'Count the objects',icon:different?'book':'fruit',count:b}]});

/** Shared small-number configurations preserve every source response without one generator per question. */
export function makeBatch5Early(part:Batch5EarlyPart,seed:number,index=0):Batch5EarlyQuestion{
 const meta=BATCH5_EARLY_PARTS.find(p=>p.id===part);if(!meta)throw Error(`Unknown early whole-paper response ${part}`);
 const group=part.startsWith('4')?'4':part.split('-')[0],r=new Rng(hashString(`hp-p1-quiz1-original-v1:${group}:${seed}:${index}`));
 const make=(prompt:string,answer:number|string,context:string[],hint:string,steps:Step[],extra:Partial<Batch5EarlyQuestion>={}):Batch5EarlyQuestion=>({key:`batch5-early-${part}:${seed}:${index}`,prompt,answer:String(answer),context,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra});
 if(part==='1'||part==='2'){
  const count=r.int(2,10),words=part==='2';
  return make(words?'Count the objects and write the number in words.':'Count the objects. Write the number.',words?names[count]:count,[],
   'Touch each object once as you count.',[['Count each object once.',`${count} objects`],...(words?[[`Write the number name: ${names[count]}.`] as Step]:[['The last count tells how many objects there are.'] as Step])],
   {picture:{type:'counters',count},...(words?{answerFormat:'number-words' as const}:{})});
 }
 if(part==='3'||group==='4'){
  const a=r.int(3,9),b=r.pick([2,3,4,5,6,7,8,9].filter(v=>v!==a)),picture=collections(a,b,part==='3');
  if(part==='3')return make('Which set has more objects?',a>b?'A':'B',[],
   'Count the objects in each set. Compare the counts, not the size of an object.',[['Count both sets.',`Set A: ${a}; Set B: ${b}`],['Choose the set with the greater count.',`${Math.max(a,b)} > ${Math.min(a,b)}`]],{picture,choices:['A','B']});
  const answer=part==='4a'?a:part==='4b'?b:part==='4c'?Math.min(a,b):Math.max(a,b);
  return make(part==='4a'?'How many objects are in Set A?':part==='4b'?'How many objects are in Set B?':`Complete the comparison. What belongs in the ${part==='4c'?'first':'second'} box?`,answer,
   part==='4c'||part==='4d'?['First box: ___ is smaller than second box: ___. Use the two pictured counts.']:[],
   'Count both sets before comparing.',[['Count the two sets.',`A: ${a}; B: ${b}`],['Use the smaller count first in the comparison.',`${Math.min(a,b)} is smaller than ${Math.max(a,b)}`]],{picture});
 }
 if(['5','7','8','9','12'].includes(part)){
  const whole=r.int(5,10),first=r.int(1,whole-1),second=whole-first,addition=part==='5',missingAdd=part==='7',missingRemove=part==='9',story=part==='12';
  const answer=addition?whole:missingAdd?second:missingRemove?first:second;
  const display=addition?`${first} + ${second} = ?`:missingAdd?`${first} + ? = ${whole}`:missingRemove?`${whole} − ? = ${second}`:`${whole} − ${first} = ?`;
  return make(story?`Amir packs ${whole} buns. ${first} ${first===1?'bun is':'buns are'} eaten. How many buns are left?`:'What number belongs in the empty box?',answer,[],
   addition?'Join both groups.':missingAdd?'Find the part needed to make the whole.':'Use the whole and the known part to find the other part.',
   [[addition?'Join the parts.':'Find the missing part.',addition?`${first} + ${second} = ${whole}`:`${whole} − ${missingAdd?first:missingRemove?second:first} = ${answer}`],['Check that both parts make the whole.',`${first} + ${second} = ${whole}`]],
   {...(!story?{display}:{}),...(part==='5'?{picture:{type:'counters' as const,count:whole,parts:[first,second]}}:part==='8'||part==='9'?{picture:{type:'counters' as const,count:whole,removed:first}}:{}),...(story?{unit:'buns'}:{})});
 }
 if(part==='6'||part==='10'){
  const whole=r.int(5,10),a=r.pick(Array.from({length:whole-1},(_,i)=>i+1).filter(n=>n*2!==whole)),b=whole-a,add=part==='6',operation=add?'+':'-';
  const picture:Picture=add?{type:'pattern',items:r.shuffle([whole,a,b]).map(String)}:collections(a,b,true,'Parts of one whole collection');
  return make(add?'Use every number card once to make a true addition equation.':'Count both pictured sets. Write a true subtraction equation.',add?`${a} + ${b} = ${whole}`:`${whole} - ${a} = ${b}`,
   add?['Use each number card exactly once.']:['Together Set A and Set B make one whole collection. Remove either set from the whole.'],
   'Find the whole and its two parts.',[['Count or read the two parts.',`${a} and ${b}`],['The parts join to make the whole.',`${a} + ${b} = ${whole}`],[add?'Check that the two chosen parts make the whole.':'A subtraction removes one part from the whole.',add?`${a} + ${b} = ${whole}`:`${whole} − ${a} = ${b}`]],
   {picture,numberSentence:{numbers:[whole,a,b],operation,...(!add?{freeEntry:true}:{})}});
 }
 if(part==='11'){
  // Reuse the verified equal-sum family; keep this early paper's target within ten.
  for(let variant=0;variant<100;variant++){
   const q=makeBatch4Early('equivalent-sum-choice',seed,index*100+variant);
   const value=(text:string)=>text.match(/\d+/g)!.map(Number).reduce((a,b)=>a+b,0);
   if(value(q.prompt)<=10){
    const choices=[...q.choices!];
    for(let i=0;i<choices.length;i++)if(value(choices[i])>10){
     const options=Array.from({length:9},(_,a)=>a+1).flatMap(a=>Array.from({length:9},(_,b)=>b+1).filter(b=>a+b<=10&&a+b!==value(q.prompt)).map(b=>`${a} + ${b}`)).filter(option=>!choices.includes(option));
     choices[i]=r.pick(options);
    }
    return {...q,key:`batch5-early-${part}:${seed}:${index}`,choices,workedSteps:q.workedSteps.map(({text,equation})=>({text,equation}))};
   }
  }
  throw Error('No small equal-sum variant found');
 }
 if(part==='13'){
  const step=r.pick([1,2]),start=r.int(1,2),gap=r.pick([2,3]),values=Array.from({length:6},(_,i)=>start+step*i);
  return make('What number belongs in the empty box?',values[gap],['The same amount is added at every step.'],'Compare two neighbouring known numbers.',
   [['Find the step.',`${values[1]} − ${values[0]} = ${step}`],['Use the same step at the empty box.',`${values[gap-1]} + ${step} = ${values[gap]}`]],{picture:{type:'pattern',items:values.map((v,i)=>i===gap?'?':String(v))}});
 }
 const whole=r.int(5,10),a=r.int(1,whole-1),b=whole-a,missing=group==='16',equation=part.endsWith('equation'),operation=missing?'-':'+',answer=missing?b:whole;
 const context=group==='14'?[`Ravi has ${a} ${a===1?'badge':'badges'}. A friend gives him ${b} more ${b===1?'badge':'badges'}.`]:group==='15'?[`Hana has ${a} red ${a===1?'bead':'beads'} and ${b} blue ${b===1?'bead':'beads'}.`]:[`There are ${whole} toy blocks altogether. ${a} ${a===1?'is':'are'} blue. The rest are yellow.`];
 const question=group==='14'?'How many badges does Ravi have now?':group==='15'?'How many beads does Hana have altogether?':'How many yellow blocks are there?';
 const first=missing?whole:a,second=missing?a:b,sentence=`${first} ${operation} ${second} = ${answer}`;
 return make(equation?'Build a number sentence to answer the story.':question,equation?sentence:answer,equation?[...context,question]:context,
  missing?'The whole includes the blue and yellow blocks. Remove the known blue part.':'Identify both amounts that belong to the whole.',
  [[missing?'Remove the known part from the whole.':'Join the two amounts.',`${first} ${operation==='-'?'−':'+'} ${second} = ${answer}`],['Check the relationship between the whole and both parts.',`${a} + ${b} = ${whole}`]],
  equation?{numberSentence:{numbers:[first,second],operation,missingResult:true,chooseOperation:true}}:{unit:group==='14'?'badges':group==='15'?'beads':'blocks'});
}
export function makeBatch5EarlySet(seed:number,index=0){return BATCH5_EARLY_PARTS.map(pattern=>({pattern,question:makeBatch5Early(pattern.id,seed,index)}));}
