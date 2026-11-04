import {Rng,hashString} from '../../engine/random';
import type {Picture,Question,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {P3RafflesPicture,Point} from './p3RafflesPicture';

/**
 * Original variations of every answer field in the locally supplied Raffles Girls P3 2025 EOY.
 * Internal visual-review ledger: .generated/paper-imports/p3-raffles-2025-review.json.
 * Source question pages 2–14; answer-key pages 15–16. No source wording/artwork is shipped.
 * Q23(a)'s source key is wrong: 15:15 + 25 minutes → 15:40; 18:00 − 15:40 = 140 minutes.
 * Q13's scan lacks one internal tick; original diagrams here always show every equal interval.
 * This is 25 source questions / 37 answer fields, not 37 distinct mathematical strategies.
 */
export type RafflesPicture=Picture|P3RafflesPicture;
export type RafflesQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:RafflesPicture;workedSteps:{text:string;equation?:string;picture?:RafflesPicture}[]};
import {RAFFLES_2025_PARTS} from './p3Raffles2025Meta';
export {RAFFLES_2025_PARTS,type RafflesPart} from './p3Raffles2025Meta';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const frac=(n:number,d:number)=>{const k=gcd(n,d);return d/k===1?String(n/k):`${n/k}/${d/k}`;};
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;
const clock=(minutes:number)=>`${Math.floor(minutes/60)%12||12}:${String(minutes%60).padStart(2,'0')} ${minutes<720?'am':'pm'}`;
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});
const pattern=(items:(number|string)[]):Picture=>({type:'pattern',items:items.map(String)});
const numberNames=['zero','one','two','three','four','five','six','seven','eight','nine'];
const teens=['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n:number):string{
 if(n<10)return numberNames[n];if(n<20)return teens[n-10];
 if(n<100)return `${tens[Math.floor(n/10)]}${n%10?'-'+numberNames[n%10]:''}`;
 if(n<1000)return `${numberNames[Math.floor(n/100)]} hundred${n%100?' and '+words(n%100):''}`;
 return `${numberNames[Math.floor(n/1000)]} thousand${n%1000?(n%1000<100?' and ':' ')+words(n%1000):''}`;
}
const polygonArea=(points:Point[])=>Math.abs(points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+p[0]*next[1]-p[1]*next[0];},0))/2;

/** Seed/index identify a variation. Related subparts share givens, but each includes complete context. */
export function makeP3Raffles2025(part:string,seed:number,index=0):RafflesQuestion{
 const meta=RAFFLES_2025_PARTS.find(p=>p.id===part);if(!meta)throw Error(`Unknown P3 Raffles part: ${part}`);
 const group=part.replace(/[a-f]$/,''),r=new Rng(hashString(`p3-raffles-original-v1:${group}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,picture:RafflesPicture,hint:string,steps:{text:string;equation?:string;picture?:RafflesPicture}[],extra:Partial<RafflesQuestion>={}):RafflesQuestion=>({
  key:`p3-raffles-${part}:${seed}:${index}`,prompt,answer:String(answer),picture,hint,workedSteps:steps,
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra,
 });
 const choices=(answer:string|number,others:(string|number)[])=>r.shuffle([...new Set([String(answer),...others.map(String).filter(x=>x!==String(answer))])].slice(0,4));
 switch(group){
  case '1':{
   const ds=r.shuffle([1,2,3,4,5,6,7,8,9]).slice(0,4);if(ds.join('')==='7685')ds.reverse();const n=Number(ds.join(''));
   return make('Which digit is in the tens place?',ds[2],cards('Read the place value',[{label:'Number',value:String(n),icon:'number'}]),'Start at the right: ones, then tens.',[{text:'The second digit from the right is the tens digit.',equation:`${n} = ${ds[0]} thousands + ${ds[1]} hundreds + ${ds[2]} tens + ${ds[3]} ones`}],{choices:r.shuffle(ds.map(String)),proof:ds[2]});
  }
  case '2':{
   const [n,d]=r.pick([[1,3],[2,3],[3,4],[2,5],[3,5]]),k=r.pick([2,3].filter(k=>d*k<=12)),top=n*k,bottom=d*k,answer=frac(top,bottom);
   return make('Choose the fraction in simplest form.',answer,{type:'fraction',parts:bottom,filled:top},'Divide the top and bottom by the same common factor.',[{text:'Count the shaded parts and all equal parts.',equation:`${top}/${bottom}`},{text:'Divide both numbers by their greatest common factor.',equation:`${top} ÷ ${k} = ${n}; ${bottom} ÷ ${k} = ${d}`},{text:'The value stays the same.',equation:`${top}/${bottom} = ${answer}`}],{display:`${top}/${bottom}`,choices:choices(answer,[`${n}/${d+1}`,`${n}/${d+2}`,`${n+1}/${d}`]),requireSimplified:true,proof:op('/',top,bottom)});
  }
  case '3':{
   const kg=r.pick([2,4,5,6,7]),grams=r.int(11,89)*10,total=kg*1000+grams,answer=`${kg} kg ${grams} g`;
   return make('Choose the same mass in kilograms and grams.',answer,cards('Parcel mass',[{label:'Mass',value:`${total} g`,icon:'box'}]),'Make groups of 1000 grams. Keep the remaining grams.',[{text:'Each complete group of 1000 grams is one kilogram.',equation:`${total} = ${kg} × 1000 + ${grams}`},{text:'Write both units.',equation:answer}],{choices:choices(answer,[`${kg} kg ${grams/10} g`,`${kg+1} kg ${grams} g`,`${kg} kg ${grams+100} g`])});
  }
  case '4':{
   const hours=r.int(3,12),answer=hours*60;
   return make('How many minutes is this?',answer,cards('Change the time unit',[{label:'Duration',value:`${hours} hours`,icon:'clock'}]),'One hour has 60 minutes.',[{text:'Use 60 minutes for every hour.',equation:`${hours} × 60 = ${answer} minutes`}],{choices:choices(answer,[hours*100,hours*10,answer+60]),unit:'minutes',proof:op('*',hours,60)});
  }
  case '5':{
   const w=r.int(3,5),h=r.int(5,7),labels=r.shuffle(['J','K','L','M']);
   const points:Point[]=[[0,0],[w,0],[w+1,3],[w,h],[1,h],[1,2]],angles=[0,1,3,4].map((vertex,i)=>({vertex,label:labels[i]})),answer=labels[0];
   return make('Which labelled angle inside the shape is acute?',answer,{type:'raffles-p3',layout:'angle-polygon',points,angles,rotation:r.pick([0,90,180,270])},'An acute angle opens less than a right angle.',[{text:'Compare each marked corner with the square corner of a right angle.'},{text:`Angle ${answer} opens less than 90°, so it is acute.`}],{choices:r.shuffle(angles.map(a=>a.label))});
  }
  case '6':{
   const start=r.int(21,50)*100+20,up=r.pick([120,180,240]),down=r.pick([40,60,80]),values=[start];for(let i=1;i<7;i++)values.push(values[i-1]+(i%2?up:-down));
   const answer=values[4];return make('What number fills the gap?',answer,pattern(values.map((v,i)=>i===4?'?':v)),'Look for two alternating changes.',[{text:'Find the first change.',equation:`${values[1]} − ${values[0]} = ${up}`},{text:'Find the next change.',equation:`${values[1]} − ${values[2]} = ${down}`},{text:'The changes repeat: add, then subtract.',equation:`${values[3]} − ${down} = ${answer}`}],{choices:choices(answer,[values[3]+up,values[3]-up,values[3]+down]),proof:op('-',values[3],down)});
  }
  case '7':{
   const [n,d]=r.pick([[1,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6]]),k=r.pick([2,3,4].filter(k=>d*k<=12)),answer=d*k;
   return make('Find the missing denominator.',answer,cards('Keep the fractions equal',[{label:'First fraction',value:`${n}/${d}`},{label:'Equal fraction',value:`${n*k}/?`}]),'Find how many times greater the numerator became.',[{text:'Use the same multiplier on both parts.',equation:`${n*k} ÷ ${n} = ${k}`},{text:'Multiply the denominator by that number too.',equation:`${d} × ${k} = ${answer}`}],{display:`${n}/${d} = ${n*k}/□`,choices:choices(answer,[d+k,answer+k,answer-d]),proof:op('*',d,k)});
  }
  case '8':{
   const prices=r.shuffle([135,255,385,565].map(c=>c+r.int(0,2)*10)),labels=['Apple','Notebook','Muffin','Juice'];
   const selected=r.shuffle([0,1,2,3]).slice(0,2).sort(),paid=2000,cost=prices[selected[0]]+prices[selected[1]],change=paid-cost,answer=selected.map(i=>labels[i]).join(' and ');
   const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
   return make('Which two different items were bought?',answer,cards('School fair stall',labels.map((label,i)=>({label,value:money(prices[i]),icon:i===0?'fruit':i===2?'muffin':i===3?'water':'book'}))),'Find the amount spent, then look for two prices with that total.',[{text:'Subtract the change from the payment.',equation:`${money(paid)} − ${money(change)} = ${money(cost)}`},{text:'Check the pair of prices.',equation:`${money(prices[selected[0]])} + ${money(prices[selected[1]])} = ${money(cost)}`}],{context:[`Noor pays ${money(paid)} and receives ${money(change)} change. She buys exactly two different items.`],choices:choices(answer,r.shuffle(pairs.filter(([a,b])=>prices[a]+prices[b]!==cost).map(p=>p.map(i=>labels[i]).join(' and '))))});
  }
  case '9':{
   const glasses=r.pick([4,5,6,7]),each=r.pick([120,160,180,240]);let initial=glasses*each+r.int(4,9)*100;if(initial===1500)initial+=50;const answer=initial-glasses*each;
   return make('How much juice remains?',answer,cards('Prepare the picnic drinks',[{label:'Juice at first',value:`${initial} ml`,icon:'water'},{label:'Glasses filled',value:String(glasses)},{label:'Juice in each glass',value:`${each} ml`}]),'Find how much went into all glasses. Subtract it from the starting amount.',[{text:'Find the total poured.',equation:`${glasses} × ${each} = ${glasses*each} ml`},{text:'Subtract it from the starting volume.',equation:`${initial} − ${glasses*each} = ${answer} ml`}],{choices:choices(answer,[glasses*each,initial-each,answer+each]),unit:'ml',proof:op('-',initial,op('*',glasses,each))});
  }
  case '10':{
   const w=r.pick([3,5]),h=r.pick([2,4]);
   const vertices:Point[][]=[[[0,0],[w-1,0],[w-1,h],[0,h]],[[0,0],[w,0],[w+1,h],[0,h]],[[1,0],[w+1,0],[w,h],[0,h]],[[1,0],[w,0],[w+1,h/2],[w,h],[1,h],[0,h/2]]];
   const shuffled=r.shuffle(vertices),shapes=shuffled.map((points,i)=>({label:'WXYZ'[i],points}));
   const equal=shapes.filter(s=>polygonArea(s.points)===w*h),answer=equal.map(s=>s.label).join(' and '),pairs=shapes.flatMap((s,i)=>shapes.slice(i+1).map(t=>`${s.label} and ${t.label}`));
   return make('Which two shapes cover the same area?',answer,{type:'raffles-p3',layout:'polygons',shapes},'Count whole squares. Two half-squares make one square.',[{text:'Pair triangular half-squares before comparing the areas.'},{text:'Count the area inside each boundary.',equation:shapes.map(s=>`${s.label}: ${polygonArea(s.points)} cm²`).join('; ')},{text:`${answer} each cover ${w*h} cm².`}],{context:['Each small grid square is 1 cm by 1 cm.'],choices:choices(answer,r.shuffle(pairs.filter(p=>p!==answer)))});
  }
  case '11':{
   const n=r.int(4,9)*1000+r.int(1,9)*100+r.int(2,8)*10+r.int(1,9),name=words(n);
   return make('Write this number in words.',name,cards('Read the number',[{label:'Number',value:String(n)}]),'Read the thousands, then hundreds, then tens and ones.',[{text:'Split the number into its place values.',equation:`${n} = ${Math.floor(n/1000)*1000} + ${Math.floor(n/100)%10*100} + ${n%100}`},{text:name}],{answerFormat:'number-words'});
  }
  case '12':{
   let first=r.int(21,38)*100+r.int(1,99);const missing=r.int(25,48)*100+r.int(1,99);if(first===2615||first+missing===8510)first++;const total=first+missing;
   return make('Find the number in the empty box.',missing,{type:'paper',layout:'bars',totalLabel:`Whole: ${total}`,rows:[{label:'Parts',parts:[{size:first,label:String(first)},{size:missing,label:'?'}]}]},'Subtract the known part from the whole.',[{text:'Take away the known addend.',equation:`${total} − ${first} = ${missing}`},{text:'Check by joining both parts.',equation:`${first} + ${missing} = ${total}`}],{display:`${first} + □ = ${total}`,proof:op('-',total,first)});
  }
  case '13':{
   const parts=r.pick([5,6,8,9,10]),position=r.pick(Array.from({length:parts-1},(_,i)=>i+1).filter(n=>n!==4)),answer=frac(position,parts);
   return make('What fraction is at R?',answer,{type:'raffles-p3',layout:'fraction-line',parts,position,marker:'R'},'Count the equal spaces from 0 to 1. Then count the spaces from 0 to R.',[{text:`There are ${parts} equal spaces in one whole.`},{text:`R is ${position} spaces from zero.`,equation:`${position}/${parts} = ${answer}`}],{proof:op('/',position,parts)});
  }
  case '14':{
   const d=r.pick([3,5,6]),n=1,big=d*2,other=r.pick(Array.from({length:big-3},(_,i)=>i+1).filter(n=>n%2===1)),top=2+other,answer=frac(top,big);
   return make('Add these two fractions.',answer,{type:'corpus',layout:'fraction-rows',rows:[{label:'First',parts:d,filled:n},{label:'Second',parts:big,filled:other}]},'Split the larger parts so that both denominators match.',[{text:'Make equivalent fractions with the larger denominator.',equation:`1/${d} = 2/${big}`},{text:'Add the numerators and keep the common denominator.',equation:`2/${big} + ${other}/${big} = ${top}/${big}`},{text:'Simplify if possible.',equation:`${top}/${big} = ${answer}`}],{display:`1/${d} + ${other}/${big} = ?`,requireSimplified:true,proof:op('+',op('/',1,d),op('/',other,big))});
  }
  case '15':{
   const a=r.int(4,9)*80,b=r.int(11,24)*90,c=r.int(4,9)*70,answer=a+b;
   return make('How far is home from the garden along this route?',answer,{type:'paper',layout:'timeline',points:[{label:'Home',icon:'child'},{label:'Bus stop',icon:'ticket'},{label:'Garden',icon:'fruit'},{label:'Museum',icon:'book'}],gaps:[`${a} m`,`${b} m`,`${c} m`]},'Stop adding when you reach the garden.',[{text:'Use only the two legs from home to the garden.',equation:`${a} + ${b} = ${answer} m`},{text:'The last leg goes beyond the garden, so it is not part of this journey.'}],{unit:'m',proof:op('+',a,b)});
  }
  case '16':{
   const rise=r.pick([2,3]),sign=r.pick([-1,1]),flip=(p:Point):Point=>[p[0],sign===1?p[1]:10-p[1]],labels=r.shuffle(['RS','TU','VW']),answer=labels[0];
   const raw:[string,Point,Point][]=[['PQ',[1,1],[7,1+rise]],[labels[0],[1,5],[7,5+rise]],[labels[1],[2,1],[5,7]],[labels[2],[7,1],[3,8]]];
   const segments=raw.map(([label,from,to])=>({label,from:flip(from),to:flip(to)}));
   return make('Which other line is parallel to PQ?',answer,{type:'raffles-p3',layout:'parallel-lines',segments,reference:'PQ'},'Parallel lines follow the same direction and keep the same distance apart.',[{text:`PQ moves 6 grid squares across and ${rise} ${sign===1?'down':'up'}. ${answer} has exactly the same change.`},{text:'The two lines would never meet if extended.',equation:`PQ ∥ ${answer}`}],{choices:r.shuffle(['RS','TU','VW'])});
  }
  case '17':{
   let smaller=r.int(11,29)*100+r.int(1,99),difference=r.int(21,39)*100+r.int(1,99);if(difference===2635)difference++;if(smaller+difference===3569)smaller++;const larger=smaller+difference;
   return make('Find the smaller number.',smaller,cards('Compare two numbers',[{label:'Greater number',value:String(larger)},{label:'Difference',value:String(difference)}]),'The difference is the extra part of the greater number.',[{text:'Remove the difference from the greater number.',equation:`${larger} − ${difference} = ${smaller}`},{text:'Check the difference.',equation:`${larger} − ${smaller} = ${difference}`}],{proof:op('-',larger,difference)});
  }
  case '18':{
   const divisor=r.pick([4,5,7,8,9]),quotient=r.int(21,95),rem=r.int(1,divisor-1),total=divisor*quotient+rem;
   return make('What is the remainder?',rem,cards('Equal groups',[{label:'Number to share',value:String(total)},{label:'Group size',value:String(divisor)}]),'Find the greatest multiple that is not larger than the number.',[{text:'Find the complete groups.',equation:`${quotient} × ${divisor} = ${quotient*divisor}`},{text:'Count what cannot make another complete group.',equation:`${total} − ${quotient*divisor} = ${rem}`}],{display:`${total} ÷ ${divisor}`,proof:op('-',total,op('*',quotient,divisor))});
  }
  case '19':{
   const side=r.pick([5,6,8,9]),delta=r.int(1,2),width=side-delta,height=side+delta,areaP=side*side,areaQ=width*height,perimeter=4*side;
   const picture:P3RafflesPicture={type:'raffles-p3',layout:'rectangles',rectangles:[{label:'P',width:side,height:side},{label:'Q',width,height}]};
   const steps=[{text:'Area counts the square centimetres inside.',equation:`P: ${side} × ${side} = ${areaP} cm²; Q: ${width} × ${height} = ${areaQ} cm²`},{text:'Perimeter counts the centimetres around the boundary.',equation:`P: 4 × ${side} = ${perimeter} cm; Q: 2 × (${width} + ${height}) = ${perimeter} cm`}];
   const fields:Record<string,[string,string|number,string|undefined]>={a:['What is the area of square P?',areaP,'cm²'],b:['What is the perimeter of square P?',perimeter,'cm'],c:['What is the area of rectangle Q?',areaQ,'cm²'],d:['What is the perimeter of rectangle Q?',perimeter,'cm'],e:['Which measurement is the same for both shapes?','perimeter',undefined],f:['Which measurement is different for the two shapes?','area',undefined]};
   const [prompt,answer,unit]=fields[part.at(-1)!];return make(prompt,answer,picture,'Use length × width for area. Add all four sides for perimeter.',steps,{unit,...(typeof answer==='string'?{choices:['area','perimeter']}:{proof:answer})});
  }
  case '20':{
   const cup=r.pick([90,110,130,170]),factor=r.pick([3,4,5,7]),jug=cup*factor,bottle=cup+r.int(2,5)*80,answer=bottle-cup;
   return make('How much more water is in the bottle than in the cup?',answer,cards('Compare the water',[{label:'Jug',value:`${jug} ml`,icon:'water'},{label:'Bottle',value:`${bottle} ml`,icon:'water'},{label:'Jug amount',value:`${factor} times the cup amount`}]),'Find the cup amount first, then compare it with the bottle.',[{text:'One cup amount is one equal share of the jug amount.',equation:`${jug} ÷ ${factor} = ${cup} ml`},{text:'Subtract the cup amount from the bottle amount.',equation:`${bottle} − ${cup} = ${answer} ml`}],{unit:'ml',proof:op('-',bottle,op('/',jug,factor))});
  }
  case '21':{
   const first=r.int(14,22)*10+3,fewer=r.int(3,6)*10+2,second=first-fewer,third=r.int(11,23)*10+7,total=first+second+third;
   const picture=cards('Sam reads a story',[{label:'Day 1',value:`${first} pages`,icon:'book'},{label:'Day 2',value:`${fewer} fewer pages`},...(part==='21b'?[{label:'Whole book',value:`${total} pages`,icon:'book' as const}]:[])]);
   const steps=[{text:'Find the second day’s reading.',equation:`${first} − ${fewer} = ${second} pages`}];
   if(part==='21a')return make('How many pages does Sam read on day 2?',second,picture,'Fewer means subtract from day 1.',steps,{unit:'pages',proof:op('-',first,fewer)});
   return make('Sam finishes the book on day 3. How many pages does he read that day?',third,picture,'Find day 2, add the first two days, then find the pages left.',[...steps,{text:'Find the pages read in the first two days.',equation:`${first} + ${second} = ${first+second}`},{text:'Subtract from the book total.',equation:`${total} − ${first+second} = ${third} pages`}],{unit:'pages',proof:op('-',total,op('+',first,op('-',first,fewer)))});
  }
  case '22':{
   const pack=r.pick([5,6]),single=r.pick([3,4,5]),bundle=pack*single-r.int(2,pack-1),small=pack-1,count=pack*2+r.int(1,pack-1),bundles=Math.floor(count/pack),loose=count%pack,answer=bundles*bundle+loose*single;
   const picture=cards('Muffin stall',[{label:'One muffin',value:`$${single}`,icon:'muffin'},{label:`Bundle of ${pack}`,value:`$${bundle}`,icon:'box'}]);
   if(part==='22a')return make(`What is the cost of exactly ${small} muffins?`,small*single,picture,'There are not enough muffins in the order for a bundle.',[{text:'Use the single-item price for each muffin.',equation:`${small} × $${single} = $${small*single}`}],{unit:'dollars',proof:op('*',small,single)});
   return make(`What is the lowest cost of exactly ${count} muffins?`,answer,picture,'Use complete discounted bundles, then buy the remaining muffins singly.',[{text:'Each complete bundle costs less than the same number of singles.',equation:`${pack} × $${single} = $${pack*single} > $${bundle}`},{text:'Split the exact order into bundles and singles.',equation:`${count} = ${bundles} × ${pack} + ${loose}`},{text:'Add both costs.',equation:`${bundles} × $${bundle} + ${loose} × $${single} = $${answer}`}],{unit:'dollars',proof:op('+',op('*',bundles,bundle),op('*',loose,single))});
  }
  case '23':{
   const arrival=13*60+r.pick([10,20,35,45]),wait=r.pick([15,20,30,40]),duration=r.pick([75,95,110,125]),start=arrival+wait,end=start+duration,busWait=r.pick([10,20,30]),ride=r.pick([20,25,40,45]),board=end+busWait,home=board+ride;
   if(part==='23a')return make('How many minutes does the show last?',duration,{type:'paper',layout:'timeline',points:[{label:`Arrive ${clock(arrival)}`},{label:'Show starts ?'},{label:`Show ends ${clock(end)}`}],gaps:[`${wait} min waiting`,'Show duration ?']},'The waiting time is before the show, not part of it.',[{text:'Find the show’s start time.',equation:`${clock(arrival)} + ${wait} minutes = ${clock(start)}`},{text:'Count from the start to the end.',equation:`${clock(end)} − ${clock(start)} = ${duration} minutes`}],{unit:'minutes',proof:op('-',end,op('+',arrival,wait))});
   const answer=clock(board);return make('At what time does Tia board the bus?',answer,{type:'paper',layout:'timeline',points:[{label:'Board bus ?'},{label:`Reach home ${clock(home)}`}],gaps:[`${ride} min ride`]},'Work backwards from reaching home.',[{text:'Subtract the journey time from the arrival time.',equation:`${clock(home)} − ${ride} minutes = ${answer}`}],{context:['Tia takes a bus home after the show.'],choices:choices(answer,[clock(home),clock(board-ride),clock(home+ride)])});
  }
  case '24':{
   const scale=r.pick([2,4]),palette=Array.from({length:19},(_,i)=>12+i*2).filter(v=>v%scale===0&&v!==20&&v!==30),days=['Tuesday','Wednesday','Thursday','Friday'];
   let a:number[],b:number[],eligible:number[];
   do{a=r.shuffle(palette).slice(0,4);b=r.shuffle(palette).slice(0,4);const differences=a.map((v,i)=>v-b[i]);eligible=differences.flatMap((d,i)=>d>0&&differences.filter(v=>v===d).length===1?[i]:[]);}while(!eligible.length);
   const target=r.pick(eligible),pair=r.pick(b.flatMap((low,i)=>b.flatMap((high,j)=>high>low?[[i,j]]:[]))),totalDay=r.int(0,3);
   const picture:P3RafflesPicture={type:'raffles-p3',layout:'grouped-bars',days,series:[{label:'Notebooks',values:a},{label:'Cards',values:b}],scale};
   const sub=part.at(-1),answer=sub==='a'?days[target]:sub==='b'?b[pair[1]]-b[pair[0]]:sub==='c'?a[totalDay]+b[totalDay]:a.reduce((x,y)=>x+y,0);
   const prompt=sub==='a'?`On which day were ${a[target]-b[target]} more notebooks than cards collected?`:sub==='b'?`How many fewer cards were collected on ${days[pair[0]]} than on ${days[pair[1]]}?`:sub==='c'?`How many items were collected on ${days[totalDay]} altogether?`:'How many notebooks were collected across all four days?';
   const equation=sub==='a'?`${days[target]}: ${a[target]} − ${b[target]} = ${a[target]-b[target]}`:sub==='b'?`${b[pair[1]]} − ${b[pair[0]]} = ${answer}`:sub==='c'?`${a[totalDay]} + ${b[totalDay]} = ${answer}`:`${a.join(' + ')} = ${answer}`;
   return make(prompt,answer,picture,'Read the legend and scale before comparing or adding the bars.',[{text:`Each grid interval represents ${scale} items.`},{text:sub==='a'?'Compare both categories on each day.':sub==='b'?'Use the cards bars on the two named days.':sub==='c'?'Add both categories on the named day.':'Add the notebooks bar for every day.',equation}],sub==='a'?{choices:r.shuffle(days)}:{unit:'items',proof:Number(answer)});
  }
  case '25':{
   let amber:number,mult:number,extra:number,boxes:number,total:number;
   do{amber=r.int(16,39);mult=r.pick([3,4]);extra=r.pick([5,7,9,11]);boxes=r.pick([5,6,7,9]);total=(mult+2)*amber+extra;}while(total%boxes!==0||total===112||total/boxes===14||amber===26);
   if(part==='25a')return make('How many stickers go in each packet?',total/boxes,cards('Pack party stickers',[{label:'Stickers altogether',value:String(total),icon:'ticket'},{label:'Equal packets',value:String(boxes),icon:'bag'}]),'Divide the total by the packet count.',[{text:'Each packet gets an equal share.',equation:`${total} ÷ ${boxes} = ${total/boxes}`},{text:'Check all packets account for every sticker.',equation:`${boxes} × ${total/boxes} = ${total}`}],{unit:'stickers',proof:op('/',total,boxes)});
   const picture:PaperPicture={type:'paper',layout:'bars',heading:'Three sticker colours',totalLabel:`Altogether: ${total} stickers`,caption:'Equal boxes stand for the same unknown amount. The extra piece is not drawn to scale.',rows:[{label:'Amber',parts:[{size:1,label:'?'}]},{label:'Teal',parts:Array.from({length:mult},()=>({size:1,label:'?'}))},{label:'Purple',parts:[{size:1,label:'?'},{size:.6,label:`${extra} extra`,tone:'orange'}]}]};
   return make('How many amber stickers are there?',amber,picture,'Remove the extra stickers, then share the rest into equal boxes.',[{text:'Take away the extra part.',equation:`${total} − ${extra} = ${total-extra}`},{text:'Count the equal boxes.',equation:`1 + ${mult} + 1 = ${mult+2}`},{text:'One box is the amber amount.',equation:`${total-extra} ÷ ${mult+2} = ${amber}`},{text:'Check all three colours.',equation:`${amber} + ${mult*amber} + ${amber+extra} = ${total}`}],{context:[`There are ${mult} times as many teal stickers as amber stickers.`,`There are ${extra} more purple stickers than amber stickers.`],unit:'stickers',proof:op('/',op('-',total,extra),mult+2)});
  }
  default:throw Error(`Unimplemented P3 Raffles part: ${part}`);
 }
}
