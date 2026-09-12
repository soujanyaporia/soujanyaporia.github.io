import type { Rng } from '../../../engine/random';
import { choicesOf } from '../../gen';
import type { Item,Lesson } from '../../model';
import { apply,connect,discovery,explain,explore,gen,guided,hook,item,makeLesson,mastery,notice,reason,readiness,solo,worked } from '../kit';
import type { PlanEntry } from '../plan';
/**
 * Average (P6 standard and foundation). The average is taught as levelling out: the total shared
 * equally between the items. Every direction of the relationship — average, total, number of items,
 * a missing value — comes from the same sentence, so nothing here is a formula to memorise.
 */
const THINGS=[
 {what:'books read',who:['Ali','Bala','Chen','Devi','Ella'],unit:'books'},
 {what:'points scored',who:['Team A','Team B','Team C','Team D','Team E'],unit:'points'},
 {what:'shells collected',who:['Monday','Tuesday','Wednesday','Thursday','Friday'],unit:'shells'},
];
/** `n` whole numbers with exactly the requested average, so every question has an exact answer. */
function valuesWithAverage(r:Rng,n:number,average:number){
 const v=Array.from({length:n},()=>average);
 for(let k=0;k+1<n;k+=2){const d=r.int(0,Math.min(3,average-1));v[k]+=d;v[k+1]-=d;}
 return r.shuffle(v);
}
const sum=(v:number[])=>v.reduce((s,x)=>s+x,0);
function directGen(id:string){return gen(id,'direct',(r,key)=>{
 const n=r.int(3,5),average=r.int(4,12),values=valuesWithAverage(r,n,average),total=n*average;
 return item({key,prompt:`Find the average of these numbers: ${values.join(', ')}.`,answer:String(average),facet:'direct',rep:'bar-model',
  tool:{kind:'bar',parts:values,whole:total,labels:values.map(String)},
  hints:['Add every number to find the total.','The average shares that total equally between the numbers.',`${total} ÷ ${n}`],
  steps:[`Total: ${values.join(' + ')} = ${total}.`,`There are ${n} numbers.`,`${total} ÷ ${n} = ?`],
  another:[{title:'Level the bars',steps:[`Imagine pouring all ${total} into one pile.`,`Share it back equally between ${n}.`,`Each one gets ${average}.`],
   tool:{kind:'share',total,people:n,given:Array.from({length:n},()=>average),mode:'share'}}],
  wrong:{[String(total)]:`That is the total. The average shares the total equally between the ${n} numbers: ${total} ÷ ${n}.`},
  check:`${average} × ${n} = ${total} ✓`});
});}
function visualGen(id:string){return gen(id,'visual',(r,key)=>{
 const people=r.int(3,5),each=r.int(3,8),total=people*each;
 return item({key,prompt:'The counters were shared out equally. What is the average for each box?',answer:String(each),facet:'visual',rep:'sharing',
  tool:{kind:'share',total,people,given:Array.from({length:people},()=>each),mode:'share'},
  hints:['The average is what one box holds once the sharing is fair.','Count the counters in a single box.'],
  steps:[`${total} counters shared between ${people} boxes.`,`${total} ÷ ${people} = ?`],
  check:`${people} × ${each} = ${total} ✓`});
});}
function totalGen(id:string){return gen(id,'reverse',(r,key)=>{
 const n=r.int(3,6),average=r.int(5,12),total=n*average;
 return item({key,prompt:`The average of ${n} numbers is ${average}. What is their total?`,answer:String(total),facet:'reverse',rep:'bar-model',
  tool:{kind:'bar',parts:Array.from({length:n},()=>average),whole:total,labels:Array.from({length:n},()=>String(average))},
  hints:[`Each of the ${n} numbers is worth ${average} once they are levelled.`,`Total = average × number of items.`,`${average} × ${n}`],
  steps:[`Average × number of items = total.`,`${average} × ${n} = ?`],
  wrong:{[String(average+n)]:`That adds the average and the count. The total is ${n} lots of ${average}, so multiply: ${average} × ${n}.`},
  check:`${total} ÷ ${n} = ${average} ✓`});
});}
function countGen(id:string){return gen(id,'missing',(r,key)=>{
 const n=r.int(3,6),average=r.int(4,10),total=n*average;
 return item({key,prompt:`${total} is shared out so that the average is ${average}. How many items are there?`,answer:String(n),facet:'missing',rep:'sharing',
  hints:['Total = average × number of items.','So number of items = total ÷ average.',`${total} ÷ ${average}`],
  steps:[`${average} × ? = ${total}`,`${total} ÷ ${average} = ?`],
  wrong:{[String(total-average)]:`That subtracts. Ask instead how many ${average}s fit into ${total}: ${total} ÷ ${average}.`},
  check:`${n} × ${average} = ${total} ✓`});
});}
function missingValueGen(id:string){return gen(id,'gap',(r,key)=>{
 const n=r.int(3,4),average=r.int(5,10),values=valuesWithAverage(r,n,average),total=n*average;
 const shown=values.slice(0,n-1),hidden=values[n-1];
 return item({key,prompt:`The average of ${n} numbers is ${average}. ${n-1} of them are ${shown.join(', ')}. What is the last number?`,answer:String(hidden),facet:'missing',rep:'bar-model',
  hints:[`First find the total: average × number of items.`,`${average} × ${n} = ${total}.`,`Take away the numbers you already know: ${total} − ${sum(shown)}`],
  steps:[`Total = ${average} × ${n} = ${total}.`,`The known numbers make ${shown.join(' + ')} = ${sum(shown)}.`,`${total} − ${sum(shown)} = ?`],
  check:`${[...shown,hidden].join(' + ')} = ${total}, and ${total} ÷ ${n} = ${average} ✓`});
});}
function storyGen(id:string){return gen(id,'story',(r,key)=>{
 const set=r.pick(THINGS),n=r.int(3,5),average=r.int(4,9),values=valuesWithAverage(r,n,average),total=n*average;
 const who=set.who.slice(0,n);
 return item({key,prompt:`${who.map((w,i)=>`${w}: ${values[i]}`).join(', ')}. What is the average number of ${set.what}?`,answer:String(average),unit:set.unit,facet:'word',rep:'story',
  tool:{kind:'bar',parts:values,whole:total,labels:who},
  hints:['Find the total first, then share it equally.',`There are ${n} of them.`,`${total} ÷ ${n}`],
  steps:[`Total: ${values.join(' + ')} = ${total}.`,`${total} ÷ ${n} = ?`],
  check:`${average} × ${n} = ${total} ✓`});
});}
function reverseStoryGen(id:string){return gen(id,'rstory',(r,key)=>{
 const set=r.pick(THINGS),n=r.int(3,5),average=r.int(4,9),total=n*average;
 return item({key,prompt:`Over ${n} days the average number of ${set.what} was ${average}. How many were there in total?`,answer:String(total),unit:set.unit,facet:'word',rep:'story',
  hints:['Average × number of days = total.',`${average} × ${n}`],
  steps:[`Every day counts as ${average} once they are levelled.`,`${average} × ${n} = ?`],
  check:`${total} ÷ ${n} = ${average} ✓`});
});}
function unfamiliarGen(id:string){return gen(id,'unfamiliar',(r,key)=>{
 const n=r.int(3,4),average=r.int(4,9),values=valuesWithAverage(r,n,average),total=n*average;
 return item({key,prompt:`The bar is made of ${n} amounts joined end to end. If it is shared into ${n} equal parts, how big would each part be?`,answer:String(average),facet:'unfamiliar',rep:'bar-model',
  tool:{kind:'bar',parts:values,whole:total,labels:values.map(String)},
  hints:['The whole bar is the total.','Cut the whole bar into equal parts, one for each amount.',`${total} ÷ ${n}`],
  steps:[`The bar is ${total} long altogether.`,`Share it into ${n} equal parts.`,`${total} ÷ ${n} = ?`],
  check:`${n} equal parts of ${average} rebuild ${total} ✓`});
});}
function reasoningGen(id:string){return gen(id,'reasoning',(r,key)=>{
 const answer='No: the average is the total shared equally, so it need not be one of the numbers';
 const values=r.shuffle([r.int(2,4),r.int(6,8),r.int(9,12)]);
 return item({key,prompt:`The numbers are ${values.join(', ')}. Rani says the average must be one of these three numbers. Is Rani right?`,answer,
  choices:choicesOf(r,answer,['Yes: the average is always one of the numbers','Yes: the average is always the middle number','No: the average is always the largest number']),
  facet:'reasoning',rep:'bar-model',
  hints:['Work the average out and compare it with the list.','Levelling the amounts can land between them.'],
  steps:[`Total: ${values.join(' + ')} = ${sum(values)}.`,`${sum(values)} ÷ 3 = ${(sum(values)/3).toFixed(2).replace(/\.00$/,'')}.`,'The levelled amount can sit between the numbers, so it need not appear in the list.']});
});}
const notInListItem=(key:string):Item=>item({key,prompt:'Two boxes hold 4 counters and 7 counters. What is the average number of counters?',answer:'5.5',facet:'reasoning',rep:'sharing',
 hints:['Total first, then share between 2.','11 ÷ 2 is not a whole number, and that is allowed.'],
 steps:['4 + 7 = 11.','11 ÷ 2 = 5.5.','An average can be a decimal even when every amount is a whole number.'],
 check:'5.5 × 2 = 11 ✓'});
/** Builder for every AVG objective: meaning, and recovering a total or a count from an average. */
export function avg(p:PlanEntry):Lesson{
 const id=p.id,reverse=/recover|relationship/i.test(p.objective);
 const first=reverse?totalGen(id):directGen(id);
 return makeLesson(p,{
  objectives:reverse
   ?['Find the total from an average and the number of items','Find the number of items from a total and an average','Find a missing value when the average is known']
   :['Read an average as the total shared equally','Find the average of a small set of numbers','Explain why an average need not be one of the numbers'],
  canDo:reverse
   ?['turn “average × number of items = total” around in any direction','find a total from an average','find how many items there were','find a missing value when the average is known']
   :['share a total equally to find the average','work out the average of three to five numbers','read an average from a bar model','say why an average can sit between the numbers'],
  representations:['counters','sharing','bar-model','symbols','story'],
  misconceptions:[
   {name:'Adding the numbers and stopping',fix:'The sum is only the first step. The average shares that total equally between the items, so divide by how many there are.'},
   {name:'Thinking the average must be one of the numbers',fix:'Levelling the amounts can land between them: 4 and 7 level out at 5.5, which is in neither box.'},
   {name:'Dividing by the wrong number',fix:'Divide by how many items there are, not by one of the values. Count the items first.'}],
  grows:['P2: sharing equally','P4: division with remainders','P6: average as total ÷ number of items','Secondary: mean, median and mode'],
  stages:[
   readiness([
    item({key:'warm-1',prompt:'What is 12 ÷ 4?',answer:'3',hints:['How many 4s make 12?'],steps:['4 × 3 = 12, so 12 ÷ 4 = 3.'],
     tool:{kind:'share',total:12,people:4,given:[3,3,3,3],mode:'share'}}),
    item({key:'warm-2',prompt:'What is 6 + 9 + 5 + 4?',answer:'24',hints:['Add two at a time.'],steps:['6 + 9 = 15.','15 + 5 = 20.','20 + 4 = ?']})],
    [{text:'Sharing equally means every part ends up the same size.',tool:{kind:'share',total:12,people:3,given:[4,4,4],mode:'share'}},
     {text:'Division undoes multiplication: 3 × 4 = 12, so 12 ÷ 4 = 3.',math:'3 × 4 = 12   12 ÷ 4 = 3'}],
    'Two quick ones about adding and sharing.'),
   hook('The uneven bookshelves','Four shelves hold 5, 2, 4 and 1 books. Ravi wants every shelf to hold the same number of books, without buying or removing any. Can he do it, and how many would each shelf hold?',
    {kind:'bar',parts:[5,2,4,1],whole:12,labels:['5','2','4','1']}),
   explore({title:'Level them out',text:'Move all 12 books into the boxes so that every box holds the same number. Drag a counter, or use “Give one to everyone”.',
    tool:{kind:'share',total:12,people:4,given:[0,0,0,0],mode:'share'},
    goal:t=>t.kind==='share'&&t.given.length===4&&t.given.every(g=>g===3)&&t.total===12,
    goalHint:'All 12 must be shared, with the same number in every box.',
    success:'Every box holds 3. The 12 books levelled out at 3 each, and 3 is the average.'}),
   notice('What do you notice?','You started with 5, 2, 4 and 1, and finished with 3, 3, 3 and 3.',[
    {text:'The total stayed 12, but it is now shared equally',correct:true,reply:'Yes. Nothing was added or removed; the same total was just levelled out.'},
    {text:'The total changed from 12 to 3',correct:false,reply:'12 is still the total. The 3 is what each box holds after levelling: 12 ÷ 4 = 3.'},
    {text:'The average is 5, the biggest amount',correct:false,reply:'The biggest shelf had 5, but after levelling every shelf holds 3. The average is 3.'}],
    {kind:'share',total:12,people:4,given:[3,3,3,3],mode:'share'}),
   connect('One idea, three ways to write it',[
    {text:'Level the amounts until every part is the same.',tool:{kind:'share',total:12,people:4,given:[3,3,3,3],mode:'share'}},
    {text:'The whole bar shared into four equal parts.',tool:{kind:'bar',parts:[3,3,3,3],whole:12,labels:['3','3','3','3']}},
    {text:'The total divided by how many there are.',math:'12 ÷ 4 = 3'},
    {text:'Turned around, the same sentence gives the total.',math:'3 × 4 = 12'}]),
   explain({title:reverse?'Turning the sentence around':'What an average is',
    text:reverse
     ?'One sentence links the three quantities: average × number of items = total. Knowing any two gives the third. If you know the average and how many there are, multiply to get the total. If you know the total and the average, divide to find how many items there are.'
     :'The average is the amount each item would have if the total were shared out equally. So the average is the total divided by the number of items. Nothing is added or taken away — the same total is simply levelled.',
    math:reverse?'total = average × number of items     number of items = total ÷ average':'average = total ÷ number of items',
    tool:{kind:'bar',parts:[3,3,3,3],whole:12,labels:['3','3','3','3']},
    why:{question:'Why do we divide by how many there are?',
     answer:'Because the total is being split into one equal share per item. Four shelves means four equal shares, so we divide by 4. If there were six shelves, the same 12 books would level out lower, at 2 each — the number of shares is what decides the size of each share.',
     tool:{kind:'share',total:12,people:6,given:[2,2,2,2,2,2],mode:'share'}}}),
   reverse
    ?worked('The average of 5 numbers is 8. What is their total?',[
      {text:'What does an average of 8 tell us?',ask:{prompt:'An average of 8 means…',choices:['each of the 5 numbers counts as 8 once levelled','one of the numbers is 8','the total is 8'],answer:'each of the 5 numbers counts as 8 once levelled'}},
      {text:'Picture 5 equal parts, each worth 8.',tool:{kind:'bar',parts:[8,8,8,8,8],whole:40,labels:['8','8','8','8','8']}},
      {text:'Rebuild the total by multiplying.',math:'8 × 5',ask:{prompt:'What is the total?',answer:'40'}},
      {text:'So the total is 40.',math:'total = 8 × 5 = 40'},
      {text:'Check by going back the other way.',math:'40 ÷ 5 = 8 ✓'}])
    :worked('Find the average of 7, 3, 8 and 6.',[
      {text:'First find the total.',math:'7 + 3 + 8 + 6',ask:{prompt:'What is the total?',answer:'24'}},
      {text:'Count how many numbers there are.',ask:{prompt:'How many numbers?',answer:'4'}},
      {text:'Share the total equally between them.',math:'24 ÷ 4',tool:{kind:'bar',parts:[6,6,6,6],whole:24,labels:['6','6','6','6']}},
      {text:'So the average is 6.',math:'24 ÷ 4 = 6'},
      {text:'Check: four 6s rebuild the total.',math:'6 × 4 = 24 ✓'}]),
   guided(first,4,'The model is there if you want it.'),
   solo(reverse?countGen(id):directGen(id),4),
   apply(reverse?reverseStoryGen(id):storyGen(id),2,'Decide first what you are given, and what you are looking for.'),
   reason([reasoningGen(id)(0,0),notInListItem('half-way')]),
   mastery([
    {facet:'direct',gen:directGen(id)},{facet:'visual',gen:visualGen(id)},{facet:'reverse',gen:totalGen(id)},
    {facet:'missing',gen:reverse?countGen(id):missingValueGen(id)},{facet:'word',gen:reverse?reverseStoryGen(id):storyGen(id)},
    {facet:'unfamiliar',gen:unfamiliarGen(id)},{facet:'reasoning',gen:reasoningGen(id)}]),
   discovery('You discovered: one sentence, three questions','Average, total and number of items are locked together. Whichever one is missing, the same sentence finds it — so you never need a separate rule for “backwards” questions.',
    'average × number of items = total',{kind:'bar',parts:[3,3,3,3],whole:12,labels:['3','3','3','3']}),
  ]});
}
