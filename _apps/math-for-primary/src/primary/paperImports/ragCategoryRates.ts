import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p5-category-rates-eligibility',
 level:5,
 title:'Charges by category, day and age',
 objective:'Choose the right rate for each person or day, then multiply, add and round when asked',
 skillIds:['P5.S.RATE.01','P5.S.RATE.02','P4.S.WN.02'],
 canonicalPatternId:'p5-category-rates-eligibility',
};

type Base=Pick<Question,'context'|'prompt'|'answer'|'hint'|'explanation'|'workedSteps'|'unit'>;
const WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const NAMES=['Kai','Mei','Raj','Sara','Tom','Nadia','Omar','Lily'];
const FAMILY=['Dad','Mum','Grandma','Grandpa','Aunt Lin','Uncle Sam','Jia','Ken','Zara','Ben','Amy','Dev'];
const money=(c:number)=>c%100===0?`$${c/100}`:`$${(c/100).toFixed(2)}`;
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':(['th','st','nd','rd'][n%10]??'th')}`;
const tickets=(n:number,word:string)=>`${n} ${word} ticket${n===1?'':'s'}`;

function dayRates(r:Rng):Base{
 const adultWd=r.int(16,22)*50,adultWe=adultWd+r.int(4,10)*50;
 const childWd=r.int(10,16)*50,childWe=childWd+r.int(2,9)*50,senior=r.int(6,12)*50;
 const weekend=r.chance(.5);
 const day=weekend?r.pick(['Saturday','Sunday']):r.pick(['Monday','Tuesday','Wednesday','Thursday','Friday']);
 const a=r.int(1,4),s=r.int(1,3),c=r.int(1,4),name=r.pick(NAMES);
 const adultRate=weekend?adultWe:adultWd,childRate=weekend?childWe:childWd;
 const total=a*adultRate+s*senior+c*childRate;
 return {
  context:[
   'Cinema ticket prices, per ticket:',
   `Adult: ${money(adultWd)} on weekdays, ${money(adultWe)} on weekends`,
   `Child: ${money(childWd)} on weekdays, ${money(childWe)} on weekends`,
   `Senior: ${money(senior)} on any day`,
   `${name} buys ${tickets(a,'adult')}, ${tickets(s,'senior')} and ${tickets(c,'child')} for a ${day} show.`,
  ],
  prompt:`How much does ${name} pay for all the tickets?`,
  answer:(total/100).toFixed(2),
  unit:'dollars',
  hint:'First decide if the day is a weekday or a weekend. Then use the matching prices for each kind of ticket.',
  workedSteps:[
   {text:`${day} is a ${weekend?'weekend':'weekday'}, so an adult ticket costs ${money(adultRate)} and a child ticket costs ${money(childRate)}.`},
   {text:'Find the cost of each kind of ticket.',equation:`${a} × ${money(adultRate)} = ${money(a*adultRate)}; ${s} × ${money(senior)} = ${money(s*senior)}; ${c} × ${money(childRate)} = ${money(c*childRate)}`},
   {text:'Add the three costs.',equation:`${money(a*adultRate)} + ${money(s*senior)} + ${money(c*childRate)} = ${money(total)}`},
  ],
  explanation:`Use the ${weekend?'weekend':'weekday'} prices: ${money(a*adultRate)} + ${money(s*senior)} + ${money(c*childRate)} = ${money(total)}.`,
 };
}

function eligibility(r:Rng):Base{
 const stdA=r.int(55,75)*10,supA=stdA+r.int(15,25)*10,delA=supA+r.int(10,15)*10;
 const rooms=[['Standard',stdA],['Superior',supA],['Deluxe',delA]].map(([name,adult])=>({name:name as string,adult:adult as number,child:(adult as number)-r.int(15,30)*10}));
 const room=r.pick(rooms);
 for(let attempt=0;attempt<500;attempt++){
  const adults=r.int(2,3),kids=r.int(2,3);
  const ages=r.shuffle([...Array.from({length:adults},()=>r.int(25,72)),r.int(3,11),r.int(12,16),...(kids===3?[r.int(3,16)]:[])]);
  const names=r.shuffle([...FAMILY]).slice(0,ages.length);
  const adultCount=ages.filter(a=>a>=12).length,childCount=ages.length-adultCount;
  const total=adultCount*room.adult+childCount*room.child;
  if(total%100===50)continue;
  const rounded=Math.round(total/100)*100;
  return {
   context:[
    'A cruise charges a price per person. A child is aged below 12 years. Everyone aged 12 or more pays the adult price.',
    ...rooms.map(x=>`${x.name} room: adult $${x.adult}, child $${x.child}`),
    `Travellers: ${ages.map((a,i)=>`${names[i]} (age ${a})`).join(', ')}`,
   ],
   prompt:`The family chooses the ${room.name} room. How much does the family pay for everyone? Round off your answer to the nearest $100.`,
   answer:String(rounded),
   unit:'dollars',
   hint:'Look at each age. Only people below 12 pay the child price. Add the costs, then round.',
   workedSteps:[
    {text:`Count the people aged 12 or more: ${adultCount}. Count the people below 12: ${childCount}.`},
    {text:'Find the cost of each group in the chosen room.',equation:`${adultCount} × $${room.adult} = $${adultCount*room.adult}; ${childCount} × $${room.child} = $${childCount*room.child}`},
    {text:'Add the two costs.',equation:`$${adultCount*room.adult} + $${childCount*room.child} = $${total}`},
    {text:`Round $${total} to the nearest $100.`,equation:`$${total} ≈ $${rounded}`},
   ],
   explanation:`${adultCount} adult prices and ${childCount} child prices make $${total}. To the nearest $100 this is $${rounded}.`,
  };
 }
 throw new Error('No tie-free eligibility case found');
}

function wages(r:Rng):Base{
 const weekdayWage=r.int(4,9)*5,weekendWage=weekdayWage+r.int(1,3)*5;
 const start=r.int(1,7),end=r.int(21,28),first=r.int(0,6),name=r.pick(NAMES);
 let weekdays=0,weekends=0;
 for(let d=start;d<=end;d++){if((first+d-start)%7>=5)weekends++;else weekdays++;}
 const total=weekdays*weekdayWage+weekends*weekendWage;
 return {
  context:[
   'A cafe pays a helper a fixed wage for each day worked.',
   `Monday to Friday: $${weekdayWage} a day`,
   `Saturday and Sunday: $${weekendWage} a day`,
   `${name} works every day from the ${ordinal(start)}, a ${WEEKDAYS[first]}, to the ${ordinal(end)} of the same month. The first and last days are both counted.`,
  ],
  prompt:`How much is ${name} paid in all?`,
  answer:String(total),
  unit:'dollars',
  hint:'Count the days from the first date to the last date. Then sort them into weekdays and weekend days.',
  workedSteps:[
   {text:'Count all the days worked, including both ends.',equation:`${end} − ${start} + 1 = ${end-start+1}`},
   {text:`Use the weekday names to count the weekend days: ${weekends}. The other days are weekdays: ${weekdays}.`},
   {text:'Find the wages for each kind of day.',equation:`${weekdays} × $${weekdayWage} = $${weekdays*weekdayWage}; ${weekends} × $${weekendWage} = $${weekends*weekendWage}`},
   {text:'Add the wages.',equation:`$${weekdays*weekdayWage} + $${weekends*weekendWage} = $${total}`},
  ],
  explanation:`${weekdays} weekdays and ${weekends} weekend days: $${weekdays*weekdayWage} + $${weekends*weekendWage} = $${total}.`,
 };
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const variant=((((Math.trunc(seed)%3)+3)%3)+Math.trunc(index)%3+3)%3;
 const base=variant===0?dayRates(r):variant===1?eligibility(r):wages(r);
 return {key:`${RAG_PATTERN.id}:${seed}:${index}`,...base};
}
