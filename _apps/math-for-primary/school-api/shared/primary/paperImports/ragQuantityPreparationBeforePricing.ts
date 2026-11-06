import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id:'rag-p5-quantity-preparation-before-pricing',
 level:5,
 title:'Find the quantity first, then price it',
 objective:'Work out how many people, items or packs are chargeable or saleable from attendance changes, wastage or removed stock, then apply the unit or group price.',
 skillIds:['P5.S.RATE.02','P5.S.PCT.03','P4.S.MD.03'],
 canonicalPatternId:'p5-quantity-preparation-before-pricing',
} as const;

const dollars=(cents:number)=>(cents/100).toFixed(2);
type Steps=NonNullable<Question['workedSteps']>;

/** Variant 0: two-day attendance with a percentage change, then ticket revenue. */
function attendance(r:Rng,key:string):Question{
 const adults=r.int(20,60)*20,gap=r.pick([60,80,100,120,140,160,180,200]),childUp=r.pick([20,25,50]),adultDown=r.pick([5,10,20]),ticket=r.pick([20,25,30,40,45,50]);
 const event=r.pick(['school fair','science fair','book fair']);
 const children1=adults+gap,children2=children1*(100+childUp)/100,adults2=adults*(100-adultDown)/100,second=children2+adults2;
 const first=adults+children1,both=first+second,total=both*ticket;
 const extra=gap*(100+childUp)/100,rest=second-extra,pct=200+childUp-adultDown;
 const steps:Steps=[
  {text:`On the first day there were ${gap} more children than adults. Keep ${gap} children aside and see what they become on the second day.`,equation:`${gap} × ${100+childUp}% = ${extra}`},
  {text:'Take those children out of the second-day total.',equation:`${second} − ${extra} = ${rest}`},
  {text:`What is left is the first-day adults grown by ${childUp}% (as the matching children) plus the adults reduced by ${adultDown}%. That is ${100+childUp}% + ${100-adultDown}% = ${pct}% of the first-day adults.`,equation:`${rest} ÷ ${pct} × 100 = ${adults}`},
  {text:'(a) That is the number of adults on the first day.'},
  {text:'(b) Find the first-day visitors, then add the second-day visitors.',equation:`${adults} + ${children1} = ${first}; ${first} + ${second} = ${both}`},
  {text:'Multiply the number of visitors by the ticket price.',equation:`${both} × $${ticket} = $${total}`},
 ];
 return {key,
  prompt:'(a) How many adults visited on the first day? (b) How much money was collected from tickets over the two days?',
  context:[`Tickets for the ${event} cost $${ticket} each. Every visitor buys one ticket.`,`On the first day, ${gap} more children than adults visited.`,`On the second day, the number of children was ${childUp}% more than on the first day, and the number of adults was ${adultDown}% less than on the first day.`,`A total of ${second} people visited on the second day.`],
  structuredResponse:{kind:'number-fields',fields:[{label:'(a) Adults on the first day (people)'},{label:'(b) Money collected ($)',decimal:true}]},
  answer:JSON.stringify([String(adults),String(total)]),
  hint:'Let the first-day children be the adults plus the gap. Find what each group becomes on day 2 before looking for the money.',
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),workedSteps:steps};
}

/** Variant 1: equal monthly output, equal wastage, then cost of everything printed in a month. */
function printers(r:Rng,key:string):Question{
 const months=r.int(6,16),gap=r.pick([120,180,240,300,360,420]),goodB=r.int(15,42)*10,waste=r.pick([30,40,50,60,80]),costCents=r.pick([5,8,10,12,15,20,25,30,40,45]);
 const goodA=goodB+gap,totalA=goodA*months,totalB=goodB*months;
 const printed=(goodA+waste)+(goodB+waste),total=printed*costCents;
 const steps:Steps=[
  {text:'The same number is thrown away from each printer each month, so the monthly gap in good brochures stays the same as the gap in printing.'},
  {text:'Find how many more good brochures Printer A made over all the months.',equation:`${totalA} − ${totalB} = ${totalA-totalB}`},
  {text:'(a) Divide by the monthly gap.',equation:`${totalA-totalB} ÷ ${gap} = ${months} months`},
  {text:'Find the good brochures each printer makes in one month.',equation:`${totalA} ÷ ${months} = ${goodA}; ${totalB} ÷ ${months} = ${goodB}`},
  {text:'Add back the thrown-away brochures. Both were printed and cost money.',equation:`(${goodA} + ${waste}) + (${goodB} + ${waste}) = ${printed}`},
  {text:'(b) Multiply by the cost of one brochure.',equation:`${printed} × $${dollars(costCents)} = $${dollars(total)}`},
 ];
 return {key,
  prompt:'(a) For how many months did Printer A print? (b) What is the total cost of all the brochures printed by both printers in one month?',
  context:[`Printer A prints ${gap} more brochures than Printer B each month.`,`Each printer prints the same number of brochures every month, and ${waste} brochures from each printer are thrown away every month because of mistakes.`,`Over some months, Printer A makes ${totalA} good brochures and Printer B makes ${totalB} good ones.`,`Printing one brochure costs $${dollars(costCents)}, including the ones that are thrown away.`],
  structuredResponse:{kind:'number-fields',fields:[{label:'(a) Months'},{label:'(b) Cost in one month ($)',decimal:true}]},
  answer:JSON.stringify([String(months),dollars(total)]),
  hint:'Compare the two printers’ good totals first. The thrown-away brochures are the same for both.',
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),workedSteps:steps};
}

/** Variant 2: remove given-away stock, count the packs in the rest, then price the packs. */
function stock(r:Rng,key:string):Question{
 const item=r.pick(['keychains','badges','bookmarks','stickers']),pack=r.pick([3,4,5,6,8]),packs=r.int(8,35),removed=r.int(6,45),priceCents=r.pick([150,240,300,360,450,480,600,750]);
 const start=packs*pack+removed,rest=packs*pack,total=packs*priceCents;
 const steps:Steps=[
  {text:'Take away the items that are not sold.',equation:`${start} − ${removed} = ${rest}`},
  {text:`Find how many packs of ${pack} the rest makes.`,equation:`${rest} ÷ ${pack} = ${packs}`},
  {text:'Multiply the number of packs by the price of one pack.',equation:`${packs} × $${dollars(priceCents)} = $${dollars(total)}`},
 ];
 return {key,
  prompt:'How much money does the stall collect from selling all the rest?',
  context:[`The stall has ${start} ${item} to start with.`,`${removed} of them are given away as prizes.`,`The rest are sold in packs of ${pack} for $${dollars(priceCents)} a pack.`],
  answer:dollars(total),unit:'dollars',
  hint:'The prizes are not sold. Take them away before you count the packs.',
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),workedSteps:steps};
}

export function makeRagQuestion(seed:number,index=0):Question{
 const variant=(Math.abs(Math.trunc(seed))+index)%3;
 const r=new Rng(hashString(`rag-p5-quantity-preparation-before-pricing:${variant}:${seed}:${index}`));
 const key=`rag-p5-quantity-preparation-before-pricing:${seed}:${index}`;
 return variant===0?attendance(r,key):variant===1?printers(r,key):stock(r,key);
}
