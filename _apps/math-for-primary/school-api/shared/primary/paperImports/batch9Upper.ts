import {Rng,hashString} from '../../engine/random';
import {fraction,type Question} from '../generate';
import {BATCH9_UPPER_PARTS} from './batch9UpperMeta';
export {BATCH9_UPPER_PARTS} from './batch9UpperMeta';
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const ratio=(a:number,b:number)=>{const d=gcd(a,b);return `${a/d}:${b/d}`;};
/** Source-page-inspired original configurations. Each item contains complete visible givens. */
export function makeBatch9Upper(part:string,seed:number,index=0):Question{
 if(!BATCH9_UPPER_PARTS.some(p=>p.id===part))throw Error(`Unknown upper question ${part}`);
 const r=new Rng(hashString(`batch9-upper:${part}:${seed}:${index}`));
 const make=(context:string[],prompt:string,answer:string|number,hint:string,steps:string[],extra:Partial<Question>={}):Question=>({key:`batch9-upper:${part}:${seed}:${index}`,context,prompt,answer:String(answer),hint,workedSteps:steps.map(text=>({text})),explanation:steps.join(' '),...extra});
 if(part==='weighted-chart'){
  const values=Array.from({length:5},()=>r.int(2,8));if(values.join(',')==='4,8,7,5,3')values[0]=5;const total=values.reduce((a,b,i)=>a+i*b,0);
  return make(['The bar graph shows how many families have each number of children.','The labels 0 to 4 give the number of children in one family.'],'How many children are there in all?',total,'Multiply each family count by its number of children, then add.',[`${values.map((n,i)=>`${i} × ${n}`).join(' + ')} = ${total} children.`],{unit:'children',picture:{type:'bars',labels:['0','1','2','3','4'],values,scale:1}});
 }
 if(part==='annual-interest'){
  const principal=r.int(12,40)*100,rate=r.pick([2,3,4,5]),interest=principal*rate/100,total=principal+interest;
  return make([`Mina puts $${principal} in a bank for one year. The interest is ${rate}% of the starting amount for that year.`],'How much money is in the account after one year?',total.toFixed(2),'Find one year’s interest and add it to the starting amount.',[`Interest: $${principal} × ${rate}% = $${interest}.`,`Balance: $${principal} + $${interest} = $${total}.`],{unit:'dollars'});
 }
 if(part==='extra-items-cost'){
  const n=r.int(4,12),extra=r.int(2,5),priceA=r.pick([120,150,180,200]),priceB=r.pick([40,60,80,100]),total=(n+extra)*priceA+n*priceB;
  return make([`A shopper buys ${extra} more rulers than erasers. Each ruler costs $${(priceA/100).toFixed(2)} and each eraser costs $${(priceB/100).toFixed(2)}.`,`The total cost is $${(total/100).toFixed(2)}.`],'How many erasers were bought?',n,'Remove the cost of the extra rulers; then count equal ruler–eraser pairs.',[`Extra rulers cost $${(extra*priceA/100).toFixed(2)}.`,`Each equal pair costs $${((priceA+priceB)/100).toFixed(2)}.`,`($${(total/100).toFixed(2)} − $${(extra*priceA/100).toFixed(2)}) ÷ $${((priceA+priceB)/100).toFixed(2)} = ${n}.`],{unit:'erasers'});
 }
 if(part==='fixed-then-fraction'){
  const unit=r.pick([12,15,18,20,25,30]),whole=8*unit,first=4*unit;
  return make([`A shopper spent $${first} on a bag, then spent 1/4 of the remaining money on a coat.`,`After both purchases, 3/8 of the original money was left.`],'How much money did the shopper have at first?',whole.toFixed(2),'Work backwards from the fraction left to find the fraction before the second purchase.',[`The money before the coat was 3/8 ÷ 3/4 = 1/2 of the original.`,`The bag therefore cost the other 1/2. $${first} × 2 = $${whole}.`],{unit:'dollars'});
 }
 if(part==='fraction-rest-of-rest'){
  const [a,b,c,d]=r.pick([[1,3,1,4],[2,5,1,3],[1,4,2,5],[2,7,1,2]]),out=fraction((b-a)*(d-c),b*d);
  return make([`${a}/${b} of the pupils are in Group A; the rest are in Group B.`,`Of Group B, ${c}/${d} wear glasses.`],'What fraction of all pupils are in Group B and do not wear glasses?',out,'Find Group B as a fraction of all pupils, then keep the fraction without glasses.',[`Group B is ${b-a}/${b} of all pupils.`,`${b-a}/${b} × ${d-c}/${d} = ${out}.`],{requireSimplified:true});
 }
 if(part==='shared-pizzas'){
  const children=r.pick([3,4,5,6]),pizzas=r.pick(Array.from({length:9},(_,i)=>i+6).filter(n=>n%children!==0)),answer=fraction(pizzas,children);
  return make([`${pizzas} pizzas are shared equally among ${children} children.`],'How many pizzas does each child receive? Give a simplified fraction or mixed number.',answer,'Equal sharing means divide the number of pizzas by the number of children.',[`${pizzas} ÷ ${children} = ${answer} pizzas per child.`],{unit:'pizzas',requireSimplified:true});
 }
 if(part==='related-prices'){
  const [a,b]=r.pick([[3,2],[4,3],[5,2]]),unit=r.int(6,20),priceA=b*unit,priceB=a*unit,countA=r.int(4,7),countB=r.int(2,5),total=countA*priceA+countB*priceB,answer=priceA+priceB;
  return make([`${a} identical footballs cost the same as ${b} identical basketballs.`,`A club pays $${total} for ${countA} footballs and ${countB} basketballs.`],'What is the total cost of one football and one basketball?',answer.toFixed(2),'Use a common unit for both prices, then find its value from the purchase.',[`One football costs ${b} units and one basketball costs ${a} units.`,`${countA} × ${b} + ${countB} × ${a} = ${countA*b+countB*a} units = $${total}.`,`One unit is $${unit}; one of each costs $${answer}.`],{unit:'dollars'});
 }
 if(part==='quiz-penalty'){
  const n=r.int(12,20),wrong=r.int(1,4),correct=n-wrong,points=r.int(5,9),penalty=r.int(1,3),score=correct*points-wrong*penalty;
  return make([`A pupil answers all ${n} quiz questions. Each correct answer earns ${points} points; each wrong answer loses ${penalty} points.`,`The final score is ${score} points.`],'How many answers were correct?',correct,'Compare the score with the score if every answer were correct.',[`All correct would give ${n*points} points.`,`Each wrong answer changes that total by ${points+penalty} points.`,`(${n*points} − ${score}) ÷ ${points+penalty} = ${wrong} wrong, so ${correct} were correct.`],{unit:'answers'});
 }
 if(part==='average-correction'){
  const count=r.int(6,12),difference=r.pick([2,3,4]),correct=r.int(115,135),wrong=correct+count*difference,average=r.int(1400,1550)/10,badAvg=Number((average+difference).toFixed(1));
  return make([`A group has a true average height of ${average.toFixed(1)} cm. One height was recorded as ${wrong} cm instead of ${correct} cm.`,`Using the wrong height gave an average of ${badAvg.toFixed(1)} cm.`],'How many people are in the group?',count,'The total error equals the average error times the group size.',[`The total error is ${wrong} − ${correct} = ${count*difference} cm.`,`The average error is ${badAvg} − ${average} = ${difference} cm.`,`${count*difference} ÷ ${difference} = ${count}.`],{unit:'people'});
 }
 if(part==='future-age-ratio'){
  const cases:{olderRatio:number;futureRatio:number;k:number}[]=[];
  for(const olderRatio of [4,5,7])for(let futureRatio=2;futureRatio<olderRatio;futureRatio++)for(let k=3;k<=9;k++)if(olderRatio*(futureRatio-1)*k<=84)cases.push({olderRatio,futureRatio,k});
  const {olderRatio,futureRatio,k}=r.pick(cases),younger=(futureRatio-1)*k,older=olderRatio*younger,diff=older-younger,years=(olderRatio-futureRatio)*k;
  return make([`Ari is ${diff} years older than Bo. Their current ages are in the ratio ${olderRatio}:1.`],`In how many years will their ages be in the ratio ${futureRatio}:1?`,years,'The age difference stays constant; use it to find both ages at each time.',[`The current difference is ${olderRatio-1} units, so Bo is ${younger} years old.`,`For the future ratio, ${futureRatio-1} units equal ${diff}; Bo will be ${diff/(futureRatio-1)}.`,`${diff/(futureRatio-1)} − ${younger} = ${years} years.`],{unit:'years'});
 }
 if(part==='ratio-after-addition'){
  const [a,b,c,d]=r.pick([[1,2,2,3],[1,4,1,2],[2,3,3,4],[2,5,1,2]]),unit=r.int(5,20),unchanged=b*d*unit,add=(c*b-a*d)*unit;
  return make([`Lia and Noor have stickers in the ratio ${a}:${b}.`,`Lia gets ${add} more stickers. Their ratio becomes ${c}:${d}; Noor’s number stays the same.`],'How many stickers does Noor have?',unchanged,'Make Noor’s ratio units match in both ratios.',[`Use ${b*d} units for Noor: Lia changes from ${a*d} to ${c*b} units.`,`${c*b-a*d} units = ${add} stickers, so one unit = ${unit}.`,`Noor has ${b*d} × ${unit} = ${unchanged} stickers.`],{unit:'stickers'});
 }
 if(part==='percent-remainder-reverse'){
  const [second,final,after]=r.pick([[25,30,40],[20,40,50],[50,20,40]]),initial=r.int(4,12)*100,first=initial*(100-after)/100;
  return make([`A shop sells ${first} books on Monday and ${second}% of the remaining books on Tuesday.`,`After Tuesday, ${final}% of the original books remain.`],'How many books were there at first?',initial,'Work backwards from the final percentage to the percentage left after Monday.',[`After Monday: ${final}% ÷ ${100-second}% = ${after}% of the original.`,`Monday’s ${first} books are ${100-after}% of the original.`,`${first} ÷ ${100-after} × 100 = ${initial} books.`],{unit:'books'});
 }
 if(part==='linked-team-ratios'){
  const [a,b,c,d,e,f]=r.pick([[3,2,2,3,4,3],[5,3,3,4,2,3],[2,5,3,2,4,5],[4,3,3,2,5,4]]),num=a*d*e,den=b*f*c,answer=ratio(num,den),other=[ratio(den,num),ratio(num+den,den),ratio(num,num+den),ratio(num+1,den),ratio(num,den+1)];
  return make([`In Team A, girls:boys = ${a}:${b}.`,`Girls in Team A:Team B = ${c}:${d}; boys in Team A:Team B = ${e}:${f}.`],'What is the ratio of girls to boys in Team B?',answer,'Link both Team A groups to the same starting units.',[`Team B girls are proportional to ${a} × ${d}/${c}; Team B boys to ${b} × ${f}/${e}.`,`Multiply both by ${c*e} to compare: ${num}:${den} = ${answer}.`],{choices:r.shuffle([...new Set([answer,...other])].slice(0,4))});
 }
 if(part==='discount-plus-fixed'){
  const original=r.int(2,8)*100,first=r.pick([10,20,25]),extraPct=r.pick([5,10,15]),sale=original*(100-first)/100,extra=original*extraPct/100,final=original-first*original/100-extra;
  return make([`A ticket costs $${sale} after a ${first}% discount. A child receives a further $${extra} off that price.`],'What is the total percentage discount for a child?',first+extraPct,'Recover the original price before comparing the total discount with it.',[`Original price = $${sale} ÷ ${100-first}% = $${original}.`,`Child price = $${sale} − $${extra} = $${final}.`,`Total discount = $${original-final} ÷ $${original} × 100% = ${first+extraPct}%.`],{unit:'%'});
 }
 if(part==='tank-rate-fraction'){
  const a=r.pick([20,40]),b=r.pick([20,40]),h=r.pick([20,40]),[n,d]=r.pick([[1,2],[1,4],[3,4]]),capacity=a*b*h,litres=capacity*n/d/1000,rate=r.pick([1,2,5].filter(v=>litres%v===0)),minutes=litres/rate;
  return make([`An empty rectangular tank is ${a} cm long, ${b} cm wide and ${h} cm high.`,`Water flows in at ${rate} litre${rate===1?'':'s'} per minute.`],`How long does it take to fill ${n}/${d} of the tank?`,minutes,'Find the required volume, convert cubic centimetres to litres, then divide by the rate.',[`Capacity = ${a} × ${b} × ${h} = ${capacity} cm³.`,`${n}/${d} of capacity = ${litres} litres.`,`${litres} ÷ ${rate} = ${minutes} minutes.`],{unit:'minutes'});
 }
 const girls=r.int(3,5),boys=r.int(3,6),k=r.pick([1,1.5,2,2.5,3].filter(v=>Number.isInteger((girls+boys)*v))),difference=(girls+boys)*k,drawnOverall=r.int(140,160),overall=girls===3&&boys===5&&difference===12&&drawnOverall===160?159:drawnOverall,boysAvg=overall+girls*k;
 return make([`There are ${girls} girls and ${boys} boys. Their combined average height is ${overall} cm.`,`The girls’ average is ${difference} cm less than the boys’ average.`],'What is the boys’ average height?',boysAvg,'Compare the total with a group in which everyone has the boys’ average.',[`The girls account for ${girls} × ${difference} cm below that equal-height total.`,`Divide by ${girls+boys}: the boys’ average is ${girls*k} cm above the combined average.`,`${overall} + ${girls*k} = ${boysAvg} cm.`],{unit:'cm'});
}
