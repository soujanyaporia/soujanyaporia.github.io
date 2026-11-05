import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import {BATCH7_MIDDLE_PARTS} from './batch7MiddleMeta';
export {BATCH7_MIDDLE_PARTS} from './batch7MiddleMeta';
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const dollars=(cents:number)=>(cents/100).toFixed(2);
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const frac=(n:number,d:number)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
/** Original quantities and wording; shared response controls and figure models only. */
export function makeBatch7Middle(part:string,seed:number,index=0):Question{
 if(!BATCH7_MIDDLE_PARTS.some(p=>p.id===part))throw Error(`Unknown batch7 middle part: ${part}`);
 const r=new Rng(hashString(`batch7-middle:${part}:${seed}:${index}`)),key=`batch7-middle:${part}:${seed}:${index}`;
 const make=(context:string[],prompt:string,answer:string|number,hint:string,equations:string[],extra:Partial<Question>={}):Question=>{
  const workedSteps=equations.map(equation=>({text:'',equation}));return {key,context,prompt,answer:String(answer),hint,workedSteps,explanation:equations.join(' '),...extra};
 };
 const choices=(answer:string,wrong:string[])=>r.shuffle([...new Set([answer,...wrong])].slice(0,4));
 if(part==='working-time'){
  const start=r.int(8,9)*60+r.pick([0,15,30]),first=r.pick([90,120,150]),pause=r.pick([30,45,60]),second=r.pick([75,105,135]),stop=start+first,resume=stop+pause,end=resume+second,total=first+second;
  return make([`Mei paints from ${clock(start)} to ${clock(stop)}. After a break, she paints again from ${clock(resume)} to ${clock(end)}. All times use the 24-hour clock.`],'How many minutes does Mei spend painting?',total,'Add the two working periods; exclude the break.',[`${stop} − ${start} = ${first} minutes`,`${end} − ${resume} = ${second} minutes`,`${first} + ${second} = ${total} minutes`],{unit:'minutes',choices:choices(String(total),[String(total+pause),String(first),String(second)])});
 }
 if(part==='latest-start'){
  const flight=r.int(14,19)*60+r.pick([5,20,35,50]),buffer=r.pick([25,35,45]),walk=r.pick([15,20,30]),latest=flight-buffer-walk;
  return make([`A flight departs at ${clock(flight)}. Hana must reach the gate at least ${buffer} minutes before departure. Walking to the gate takes ${walk} minutes. Times use the 24-hour clock.`],'What is the latest time Hana can start walking?',clock(latest),'Work backwards through both the arrival buffer and the walking time.',[`${clock(flight)} minus ${buffer} minutes = ${clock(flight-buffer)}`,`${clock(flight-buffer)} minus ${walk} minutes = ${clock(latest)}`],{choices:choices(clock(latest),[clock(flight-buffer),clock(flight-walk),clock(latest-10)])});
 }
 if(part==='unit-price-multiple'){
  const count=r.int(4,8),unit=r.int(12,45),times=r.int(3,9),cost=count*unit;
  return make([`${count} identical stools cost $${cost}. A bench costs ${times} times as much as one stool.`],'How much does one bench cost?',unit*times,'Find one stool’s price, then multiply by the stated factor.',[`$${cost} ÷ ${count} = $${unit}`,`$${unit} × ${times} = $${unit*times}`],{unit:'dollars'});
 }
 if(part==='rectangle-measures'){
  const length=r.int(7,15),width=r.int(3,6),area=length*width,perimeter=2*(length+width);
  return make([`A rectangular mat is ${length} cm long and ${width} cm wide.`],'Find its area and perimeter.',JSON.stringify([String(area),String(perimeter)]),'Area covers the inside; perimeter measures the distance around all four sides.',[`${length} × ${width} = ${area} cm²`,`2 × (${length} + ${width}) = ${perimeter} cm`],{structuredResponse:{kind:'number-pair',firstLabel:'Area (cm²)',secondLabel:'Perimeter (cm)'}});
 }
 if(part==='equal-start-gift'){
  const times=r.int(3,7),small=r.int(12,40),initial=times*small,given=initial-small;
  return make([`Ravi and Salma each start with the same number of stamps. Ravi gives away ${given} stamps. Salma then has ${times} times as many stamps as Ravi.`],'How many stamps did Ravi have at first?',initial,'The stamps given away represent the difference between the two final amounts.',[`${times} − 1 = ${times-1} equal units`,`${given} ÷ ${times-1} = ${small}`,`${small} × ${times} = ${initial}`],{unit:'stamps',choices:choices(String(initial),[String(small),String(given),String(initial+given)])});
 }
 if(part==='paired-price'){
  const count=r.int(3,7),cheap=r.int(65,195),gap=r.pick([35,45,55,65,75]),total=count*(cheap*2+gap);
  return make([`A club pays $${dollars(total)} for ${count} identical folders and ${count} identical notebooks. Each notebook costs $${dollars(gap)} more than each folder.`],'What is the price of one folder?',dollars(cheap),'Remove all the extra notebook costs, then share the remaining cost equally.',[`$${dollars(total)} − ${count} × $${dollars(gap)} = $${dollars(count*2*cheap)}`,`$${dollars(count*2*cheap)} ÷ ${count*2} = $${dollars(cheap)}`],{unit:'dollars',choices:choices(dollars(cheap),[dollars(cheap+gap),dollars(cheap*2+gap),dollars(cheap+10)])});
 }
 if(part==='bundle-cost'){
  const per=r.pick([3,4,6]),bundles=r.int(3,8),price=r.pick([275,325,395,450,525]),total=per*bundles;
  return make([`Muffins are sold in packs of ${per} for $${dollars(price)} per pack. Noor buys ${total} muffins in complete packs.`],'How much does Noor pay?',dollars(bundles*price),'Count the complete packs, then multiply by the price per pack.',[`${total} ÷ ${per} = ${bundles} packs`,`${bundles} × $${dollars(price)} = $${dollars(bundles*price)}`],{unit:'dollars'});
 }
 if(part==='promotion-change'){
  const paid=r.pick([2,3]),free=1,bundles=r.int(2,4),price=r.pick([250,350,450,550]),items=(paid+free)*bundles,cost=paid*bundles*price,payment=(Math.ceil(cost/1000)+1)*1000,answer=payment-cost;
  return make([`A shop offers “Buy ${paid}, get ${free} free” on chocolate bars costing $${dollars(price)} each. Every complete group receives the offer. Zed takes home ${items} bars and pays $${dollars(payment)}.`],'How much change does Zed receive?',dollars(answer),'Count complete promotional groups, pay only for the charged bars, then subtract from the payment.',[`${items} ÷ (${paid} + ${free}) = ${bundles} groups`,`${bundles} × ${paid} × $${dollars(price)} = $${dollars(cost)}`,`$${dollars(payment)} − $${dollars(cost)} = $${dollars(answer)}`],{unit:'dollars'});
 }
 if(part==='fraction-more-total'){
  const [n,d]=r.pick([[1,8],[1,5],[1,4],[3,10]]),[extra,den]=r.pick([[1,10],[1,8],[1,5]]),cake=frac(n*den+extra*d,d*den),answer=frac(2*n*den+extra*d,d*den);
  return make([`A baker uses ${n}/${d} kg of flour for biscuits. The flour used for a loaf is ${extra}/${den} kg more than that used for the biscuits.`],'How much flour is used altogether? Give a simplified fraction.',answer,'Find the loaf’s flour first, then add the flour for both bakes.',[`${n}/${d} + ${extra}/${den} = ${cake} kg`,`${n}/${d} + ${cake} = ${answer} kg`],{unit:'kg',requireSimplified:true});
 }
 if(part==='remaining-pages'){
  const [n,d,m,e]=r.pick([[1,4,1,6],[1,3,1,4],[1,5,3,10],[1,6,1,3]]),whole=d*e*r.int(8,20),left=whole-whole*n/d-whole*m/e;
  return make([`Ari reads ${n}/${d} of a book on Saturday and ${m}/${e} of the same book on Sunday. There are ${left} unread pages after Sunday.`],'How many pages are in the book?',whole,'Find the fraction left unread and use the page count to recover one whole.',[`Unread fraction = 1 − ${n}/${d} − ${m}/${e} = ${frac(d*e-n*e-m*d,d*e)}`,`${left} ÷ ${frac(d*e-n*e-m*d,d*e)} = ${whole} pages`],{unit:'pages'});
 }
 if(part==='rainfall-increase'){
  const labels=['Jan','Feb','Mar','Apr','May','Jun'],target=r.pick([10,25,40]),changes=r.shuffle([-20,30,target,-10,15]),values=[r.pick([120,160,200])];for(const change of changes)values.push(values.at(-1)!+change);const at=changes.indexOf(target)+1;
  return make(['The bar graph shows monthly rainfall in millimetres.'],`In which month did rainfall increase by ${target} mm from the previous month?`,labels[at],'Compare each month with the month immediately before it.',[changes.map((v,i)=>`${labels[i+1]}: ${values[i+1]} − ${values[i]} = ${v} mm`).join('; '),`${labels[at]} has an increase of ${target} mm.`],{picture:{type:'bars',labels,values,scale:5},choices:choices(labels[at],r.shuffle(labels.filter(v=>v!==labels[at])))});
 }
 const applesA=r.int(18,45),orangesA=r.int(25,70),applesB=r.int(35,85),orangesB=r.int(12,35);
 return make(['Each basket contains only apples and oranges.'],'Complete the missing counts in the table.',JSON.stringify([String(orangesA),String(applesB+orangesB)]),'Subtract to find a missing part; add to find a row total.',[`${applesA+orangesA} − ${applesA} = ${orangesA} oranges`,`${applesB} + ${orangesB} = ${applesB+orangesB} fruits`],{picture:{type:'nanyang-p4',layout:'table',caption:'Fruit in two baskets',rowHeader:'Basket',columns:['Apples','Oranges','Total'],rows:[{label:'Basket A',values:[applesA,null,applesA+orangesA]},{label:'Basket B',values:[applesB,orangesB,null]}]},structuredResponse:{kind:'number-pair',firstLabel:'Basket A oranges',secondLabel:'Basket B total'}});
}
