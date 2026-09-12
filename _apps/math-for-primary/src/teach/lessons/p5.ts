import type { Gen,Lesson } from '../model';
import { choicesOf,fmt,rngFor,simplest } from '../gen';
/**
 * P5 exemplar: percentage as parts per hundred, then a percentage of a quantity through the
 * percentage bar (MOE p. 41). Discount contexts only; tax rates change, so no rate is hard-coded.
 */
const A='p5-percent-meaning',B='p5-percent-of-quantity';
const FRIENDLY:[number,number][]=[[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,10],[3,10],[7,10],[9,10],[1,20],[3,20],[1,25],[7,25],[13,25],[9,50]];
const grid=(n:number):{kind:'hundred';shaded:number}=>({kind:'hundred',shaded:n});
function gridPercent(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),n=r.int(5,95);
 return {key:`${salt}-${i}`,prompt:'The whole square is 100%. What percentage is shaded?',answer:String(n),unit:'%',facet:'visual',rep:'hundred-grid',tool:grid(n),
  hints:['The square has 100 equal parts.','Percent means “out of 100”.',`${n} parts out of 100.`],steps:[`${n} of the 100 squares are shaded.`,`${n} out of 100 is ${n}%.`],check:`${n}% = ${n}/100 = ${fmt(n/100)} ✓`};
};}
function fractionToPercent(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(FRIENDLY),k=100/d,pct=n*k;
 return {key:`${salt}-${i}`,prompt:'Write this fraction as a percentage.',display:`${n}/${d}`,answer:String(pct),unit:'%',facet:'direct',rep:'hundred-grid',tool:grid(pct),
  hints:[`Percent means out of 100, so make an equivalent fraction with denominator 100.`,`${d} × ${k} = 100, so multiply the top by ${k} too.`,`${n} × ${k}`],
  steps:[`${d} × ${k} = 100.`,`${n} × ${k} = ${pct}, so ${n}/${d} = ${pct}/100.`,`That is ${pct}%.`],
  another:[{title:'Through the decimal',steps:[`${n} ÷ ${d} = ${fmt(n/d)}.`,`${fmt(n/d)} × 100 = ${pct}%.`]}],
  wrong:{...(n!==pct?{[String(n)]:`${n} is the numerator, not the percentage. Change the fraction to hundredths first.`}:{})},
  check:`${pct}/100 = ${n}/${d} ✓`};
};}
function percentToFraction(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),pct=r.pick([10,20,25,40,50,60,75,80]),answer=simplest(pct,100);
 return {key:`${salt}-${i}`,prompt:`Write ${pct}% as a fraction in its simplest form.`,answer,exact:true,facet:'reverse',rep:'hundred-grid',tool:grid(pct),
  hints:[`${pct}% means ${pct} out of 100.`,`Write ${pct}/100, then simplify.`],steps:[`${pct}% = ${pct}/100.`,`Divide top and bottom by their common factor.`,`${pct}/100 = ${answer}`],check:`${answer} of the grid is ${pct} squares ✓`};
};}
function decimalPercent(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),pct=r.int(1,99),toPercent=r.chance(.5);
 return {key:`${salt}-${i}`,prompt:toPercent?`Write ${fmt(pct/100)} as a percentage.`:`Write ${pct}% as a decimal.`,answer:toPercent?String(pct):fmt(pct/100),unit:toPercent?'%':'',facet:'missing',rep:'hundred-grid',tool:grid(pct),
  hints:['A percentage is hundredths.',toPercent?`${fmt(pct/100)} = ${pct} hundredths.`:`${pct}% = ${pct} hundredths.`],
  steps:[`${pct} hundredths = ${pct}/100 = ${fmt(pct/100)} = ${pct}%.`],check:`${pct}% and ${fmt(pct/100)} shade the same ${pct} squares ✓`};
};}
function percentStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(FRIENDLY.filter(f=>[4,5,10,20,25,50].includes(f[1]))),pct=n*(100/d),total=d*r.int(1,4);
 return {key:`${salt}-${i}`,prompt:`${n} out of every ${d} pupils in a school walk to school. What percentage of the pupils walk?`,answer:String(pct),unit:'%',facet:'word',rep:'story',tool:grid(pct),
  hints:['Percent compares with 100.',`${d} × ${100/d} = 100.`,`${n} × ${100/d}`],steps:[`${n}/${d} = ${pct}/100.`,`So ${pct}% walk to school.`],check:`${pct}% of ${total} pupils is ${total*pct/100} pupils ✓`};
};}
function decimalPercentMistake(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),tenths=r.int(2,9),answer=`0.${tenths} is ${tenths*10} hundredths, so it is ${tenths*10}%`;
 return {key:`${salt}-${i}`,prompt:`Ravi says 0.${tenths} is the same as ${tenths}%. What would you tell Ravi?`,answer,choices:choicesOf(r,answer,['Ravi is right','A decimal cannot be written as a percentage',`0.${tenths} is ${tenths}/100`]),facet:'reasoning',rep:'hundred-grid',tool:grid(tenths*10),
  hints:['How many hundredths is 0.'+tenths+'?'],steps:[`0.${tenths} = ${tenths}/10 = ${tenths*10}/100.`,`So it is ${tenths*10}%, not ${tenths}%.`]};
};}
const BAR=(whole:number,percent:number,unit='$'):{kind:'percent';whole:number;percent:number;unit:string;step:number}=>({kind:'percent',whole,percent,unit,step:10});
function percentOfQuantity(id:string,salt:string,friendly=false):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),whole=r.int(2,20)*(friendly?10:5),pct=r.pick(friendly?[10,20,50]:[5,15,25,30,40,60,75]),answer=whole*pct/100;
 return {key:`${salt}-${i}`,prompt:`Find ${pct}% of ${whole}.`,answer:fmt(answer),facet:'direct',rep:'percent-bar',tool:BAR(whole,pct,''),
  hints:[`100% is the whole amount, ${whole}.`,`10% of ${whole} is ${fmt(whole/10)}.`,`${pct}% is ${pct/10} lots of 10%${pct%10?', plus half of a ten per cent step':''}.`,`${whole} ÷ 100 × ${pct}`],
  steps:[`1% of ${whole} is ${fmt(whole/100)}.`,`${pct}% is ${pct} × ${fmt(whole/100)}.`,`That is ${fmt(answer)}.`],
  another:[{title:'Use 10%',steps:[`10% of ${whole} = ${fmt(whole/10)}.`,`${pct}% = ${fmt(pct/10)} × ${fmt(whole/10)} = ${fmt(answer)}.`],tool:BAR(whole,pct,'')},{title:'Use a fraction',steps:[`${pct}% = ${simplest(pct,100)}.`,`${simplest(pct,100)} of ${whole} = ${fmt(answer)}.`]}],
  wrong:{...(pct!==answer?{[String(pct)]:`${pct} is the percentage, not the amount. We need ${pct}% of ${whole}.`}:{})},
  check:`${fmt(answer)} out of ${whole} is ${pct}% ✓`};
};}
function discountStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),price=r.int(4,20)*10,pct=r.pick([10,20,25,50]),off=price*pct/100,sale=price-off,askSale=r.chance(.5);
 return {key:`${salt}-${i}`,prompt:askSale?`A bag costs $${price}. In a sale it is ${pct}% off. What is the sale price?`:`A bag costs $${price}. In a sale it is ${pct}% off. How much money is taken off?`,answer:fmt(askSale?sale:off),unit:'dollars',facet:'word',rep:'percent-bar',tool:BAR(price,pct),
  hints:[`The full price is 100%: $${price}.`,`${pct}% of $${price} is the discount.`,askSale?'The sale price is what is left: 100% − '+pct+'% = '+(100-pct)+'%.':`$${price} ÷ 100 × ${pct}`],
  steps:[`10% of $${price} = $${fmt(price/10)}.`,`${pct}% = $${fmt(off)} off.`,askSale?`Sale price = $${price} − $${fmt(off)} = $${fmt(sale)}.`:`The discount is $${fmt(off)}.`],
  check:askSale?`$${fmt(sale)} + $${fmt(off)} = $${price} ✓`:`$${fmt(off)} is ${pct}% of $${price} ✓`};
};}
function tenPercentStep(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),whole=r.int(3,30)*10;
 return {key:`${salt}-${i}`,prompt:`What is 10% of ${whole}?`,answer:fmt(whole/10),facet:'missing',rep:'percent-bar',tool:BAR(whole,10,''),
  hints:['10% is one tenth of the whole.',`${whole} ÷ 10`],steps:[`10% = 10/100 = 1/10.`,`${whole} ÷ 10 = ${fmt(whole/10)}.`],check:`10 × ${fmt(whole/10)} = ${whole}, the whole ✓`};
};}
function halfOffTwice(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),price=r.int(4,12)*20,answer=`No: the second 50% is taken off the reduced price, leaving $${fmt(price/4)}`;
 return {key:`${salt}-${i}`,prompt:`A shop takes 50% off a $${price} coat, then 50% off the new price. Is the coat free?`,answer,choices:choicesOf(r,answer,['Yes: 50% + 50% = 100%',`No: the coat costs $${fmt(price/2)}`,'Only if the shop says so']),facet:'reasoning',rep:'percent-bar',tool:BAR(price,50),
  hints:['What is the whole for the second discount?'],steps:[`First: 50% of $${price} = $${fmt(price/2)}, so the price becomes $${fmt(price/2)}.`,`Second: 50% of $${fmt(price/2)} = $${fmt(price/4)} off.`,`The coat costs $${fmt(price/4)}, not nothing. The whole changed.`]};
};}
function barRead(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),whole=r.int(4,20)*10,pct=r.pick([20,30,40,60,70,80]);
 return {key:`${salt}-${i}`,prompt:`The bar shows ${whole} as 100%. What is ${pct}% of it?`,answer:fmt(whole*pct/100),facet:'visual',rep:'percent-bar',tool:BAR(whole,pct,''),
  hints:['Each block on the bar is 10%.',`One block is ${fmt(whole/10)}.`],steps:[`${pct}% is ${pct/10} blocks.`,`${pct/10} × ${fmt(whole/10)} = ${fmt(whole*pct/100)}.`],check:`${fmt(whole*pct/100)} out of ${whole} is ${pct}% ✓`};
};}
export const P5_LESSONS:Lesson[]=[{
 id:A,level:5,track:'standard',world:'ratio-realm',title:'Percentage means per hundred',minutes:12,skillIds:['P5.S.PCT.01','P5.S.PCT.02'],activityId:'p5s-percent-n10',
 objectives:['Read a percentage as a number of parts per hundred','Convert between percentages, fractions and decimals','Compare quantities fairly using percentages'],
 canDo:['say what 35% means on a hundred grid','change 3/5 into 60%','change 45% into 0.45 and 9/20','explain why 0.4 is 40%, not 4%'],
 prerequisites:['P4.S.DEC.03','P3.S.FRAC.01'],representations:['hundred-grid','fraction-wall','symbols','story'],
 misconceptions:[{name:'Reading the digits of a decimal as the percentage',fix:'0.4 is 4 tenths, which is 40 hundredths, so it is 40%.'},{name:'Comparing fractions with different wholes directly',fix:'18/25 and 72/100 can only be compared once both are written over the same whole; percentages make that whole 100 every time.'}],
 grows:['P4: hundredths as decimals','P5: 3/5 = 0.6 = 60%','P6: percentage increase, decrease and the original amount','Later: interest, statistics and proportion'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'What fraction of the hundred grid is shaded?',answer:'25/100',exact:true,choices:['25/100','25/10','4/100'],hints:['Count the shaded squares out of 100.'],steps:['25 squares out of 100.'],tool:grid(25)},
   {key:'warm-2',prompt:'Find the missing numerator.',display:'1/4 = □/100',answer:'25',hints:['4 × 25 = 100, so multiply the top by 25 as well.'],steps:['4 × 25 = 100.','1 × 25 = 25.'],tool:{kind:'fractions',denominators:[4],shaded:[1]}}],
   booster:[{text:'Equivalent fractions: multiply the top and bottom by the same number.',tool:{kind:'fractions',denominators:[2,4,10],shaded:[1,2,5]}},{text:'A hundred grid has 100 equal parts, so each square is one hundredth.',tool:grid(1)}]},
  {kind:'hook',title:'Which score is better?',text:'Mei scored 18 out of 25 in one test. Ben scored 72 out of 100 in another. The tests are different sizes, so who did better? Comparing is hard until both are out of the same number.',tool:grid(72)},
  {kind:'explore',title:'Shade a percentage',text:'Shade 35 squares of the hundred grid. Watch the fraction, the decimal and the percentage underneath.',tool:grid(0),goal:t=>t.kind==='hundred'&&t.shaded===35,goalHint:'You need exactly 35 of the 100 squares shaded.',success:'35 squares out of 100 is 35/100, 0.35 and 35%: three names for one amount.'},
  {kind:'notice',title:'What do you notice?',text:'The grid shows 35 shaded squares.',tool:grid(35),options:[
   {text:'Per cent means “out of 100”, so 35 shaded squares is 35%',correct:true,reply:'Yes. Percentages always compare with a whole of 100.'},
   {text:'35% means 35 out of 35',correct:false,reply:'The whole is always 100 for a percentage: 35 out of 100.'},
   {text:'35% is the same as 3.5',correct:false,reply:'35% is 35 hundredths, which is 0.35.'}]},
  {kind:'connect',title:'One amount, three names',rows:[
   {text:'Half the grid shaded: 50 of the 100 squares.',tool:grid(50)},
   {text:'As a fraction: 50/100, which simplifies to 1/2.',math:'50/100 = 1/2'},
   {text:'As a decimal: 50 hundredths.',math:'50/100 = 0.5'},
   {text:'As a percentage: per hundred.',math:'1/2 = 0.5 = 50%'}]},
  {kind:'explain',title:'Making the whole 100',text:'A percentage rewrites any part-of-a-whole so that the whole is 100. To change a fraction, find the equivalent fraction with denominator 100. Then Mei’s 18/25 becomes 72/100, and the two test scores can be compared fairly.',math:'18/25 = 72/100 = 72%',tool:grid(72),
   why:{question:'Why is 100 so useful?',answer:'Any two amounts can be compared once they share a whole. One hundred works well because it fits our place-value system: hundredths are already the second decimal place, so a percentage, a decimal and a fraction are the same information written three ways.',tool:grid(18)}},
  {kind:'worked',title:'Worked example',problem:'Write 3/5 as a percentage.',steps:[
   {text:'We need an equivalent fraction with 100 parts.',ask:{prompt:'5 × ? = 100',answer:'20'}},
   {text:'Multiply the top by the same number.',math:'3 × 20 = 60',tool:grid(60)},
   {text:'So 3/5 = 60/100.',math:'3/5 = 60/100'},
   {text:'Sixty hundredths is 60%.',math:'3/5 = 0.6 = 60%'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:fractionToPercent(A,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:decimalPercent(A,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:percentStory(A,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[decimalPercentMistake(A,'detective')(0,0),{key:'compare-scores',prompt:'Mei scored 18/25 and Ben scored 72/100. Who did better?',answer:'They did equally well: 18/25 is 72%',choices:['They did equally well: 18/25 is 72%','Ben, because 72 is bigger than 18','Mei, because 25 is a smaller test'],facet:'reasoning',rep:'hundred-grid',tool:grid(72),hints:['Change 18/25 into hundredths.'],steps:['25 × 4 = 100 and 18 × 4 = 72.','18/25 = 72/100 = 72%.','Both scored 72%.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:fractionToPercent(A,'m-direct')},{facet:'visual',gen:gridPercent(A,'m-visual')},{facet:'reverse',gen:percentToFraction(A,'m-reverse')},
   {facet:'missing',gen:decimalPercent(A,'m-missing')},{facet:'word',gen:percentStory(A,'m-word')},{facet:'unfamiliar',gen:barRead(A,'m-bar')},{facet:'reasoning',gen:decimalPercentMistake(A,'m-reason')}]},
  {kind:'discovery',title:'You discovered: three names, one amount',text:'A fraction, a decimal and a percentage can all describe the same part of a whole. Percentages simply fix the whole at 100 so that any two amounts can be compared.',math:'3/5 = 0.6 = 60%',tool:grid(60)},
 ]},{
 id:B,level:5,track:'standard',world:'ratio-realm',title:'A percentage of a quantity',minutes:12,skillIds:['P5.S.PCT.03','P5.S.PCT.04'],activityId:'p5s-percent-quantity-n11',
 objectives:['Find a percentage of a quantity','Use 10% and 1% as stepping stones','Solve discount problems and check the whole being used'],
 canDo:['find 25% of 80 with a bar or by using 10%','work out a discount and a sale price','say which amount is the whole in a percentage question'],
 prerequisites:[A],representations:['percent-bar','hundred-grid','bar-model','story'],
 misconceptions:[{name:'Using the percentage as the answer',fix:'25% of 80 is not 25. The percentage tells you how much of the whole to take: 25% of 80 is 20.'},{name:'Adding percentages of different wholes',fix:'50% off, then 50% off again, is not 100% off: the second discount is taken from the reduced price.'}],
 grows:['P5: 25% of $80','P6: percentage increase and decrease, and finding the original','Later: interest and proportional reasoning'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'What is 10% of 60?',answer:'6',hints:['10% is one tenth.'],steps:['60 ÷ 10 = 6.'],tool:BAR(60,10,'')},
   {key:'warm-2',prompt:'Write 25% as a fraction in its simplest form.',answer:'1/4',exact:true,hints:['25/100 simplifies.'],steps:['25/100 = 1/4.'],tool:grid(25)}],
   booster:[{text:'10% is one tenth of the whole: divide by 10.',tool:BAR(50,10,'')},{text:'1% is one hundredth: divide by 100.',tool:grid(1)}]},
  {kind:'hook',title:'The sale rail',text:'A jacket costs $80. The sign says 25% off. How much comes off the price, and what will you pay?',tool:BAR(80,25)},
  {kind:'explore',title:'Set the bar',text:'The whole bar is the $80 jacket: that is 100%. Move the bar to 25% and read the value.',tool:BAR(80,0),goal:t=>t.kind==='percent'&&t.percent===25,goalHint:'Step the bar up until it shows 25%.',success:'25% of $80 is $20. That is the money taken off; you would pay $60.'},
  {kind:'notice',title:'Which amount is the whole?',text:'In “25% off $80”, the percentage is taken from one particular amount.',tool:BAR(80,25),options:[
   {text:'The whole is $80, the original price',correct:true,reply:'Yes. Always check what counts as 100% before calculating.'},
   {text:'The whole is $25',correct:false,reply:'25 is the percentage, not an amount of money.'},
   {text:'The whole is the sale price',correct:false,reply:'The discount is worked out from the original price, then taken off it.'}]},
  {kind:'connect',title:'Stepping stones',rows:[
   {text:'100% is the whole amount: $80.',tool:BAR(80,100)},
   {text:'10% is one tenth: $8.',tool:BAR(80,10),math:'80 ÷ 10 = 8'},
   {text:'20% is two of those steps: $16.',tool:BAR(80,20)},
   {text:'5% is half a step: $4. So 25% = $16 + $4 = $20.',math:'25% of 80 = 20'}]},
  {kind:'explain',title:'Two reliable methods',text:'Either find 1% by dividing by 100 and multiply by the percentage, or build the answer from 10% and 5% steps. Both work because a percentage is a fraction of the whole.',math:'25% of 80 = 80 ÷ 100 × 25 = 20',tool:BAR(80,25,''),
   why:{question:'Why does dividing by 100 work?',answer:'Per cent means per hundred, so 1% is the whole cut into 100 equal parts. Once you know one part, any number of parts is just multiplication. 80 ÷ 100 = 0.8, and 25 × 0.8 = 20.',tool:grid(25)}},
  {kind:'worked',title:'Worked example',problem:'15% of 60',steps:[
   {text:'Start with 10%.',math:'10% of 60 = 6',ask:{prompt:'What is 10% of 60?',answer:'6'}},
   {text:'5% is half of 10%.',math:'5% of 60 = 3'},
   {text:'Add the steps.',math:'15% = 10% + 5% = 6 + 3',ask:{prompt:'What is 15% of 60?',answer:'9'}},
   {text:'So 15% of 60 is 9.',tool:BAR(60,20,'')},
   {text:'Check with 1%: 60 ÷ 100 = 0.6, and 15 × 0.6 = 9.',math:'15% of 60 = 9 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:percentOfQuantity(B,'guided',true),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:percentOfQuantity(B,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:discountStory(B,'story'),count:3},
  {kind:'reason',title:'Maths detective',items:[halfOffTwice(B,'detective')(0,0),{key:'which-whole',prompt:'A $50 shirt has 20% off. Ali works out 20% of $40 by mistake. Why is that wrong?',answer:'The discount is worked out from the original $50',choices:['The discount is worked out from the original $50','20% cannot be found for $50','He should have used 40%'],facet:'reasoning',rep:'percent-bar',tool:BAR(50,20),hints:['Which amount is 100%?'],steps:['The original price is the whole: $50.','20% of $50 = $10, so the shirt costs $40.','$40 is the answer, not the starting point.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:percentOfQuantity(B,'m-direct')},{facet:'visual',gen:barRead(B,'m-visual')},{facet:'reverse',gen:percentToFraction(B,'m-reverse')},
   {facet:'missing',gen:tenPercentStep(B,'m-missing')},{facet:'word',gen:discountStory(B,'m-word')},{facet:'unfamiliar',gen:gridPercent(B,'m-grid')},{facet:'reasoning',gen:halfOffTwice(B,'m-reason')}]},
  {kind:'discovery',title:'You discovered: 10% is your friend',text:'Divide by 10 to get 10%, halve it for 5%, and build any percentage from those steps. Always check which amount counts as 100%.',math:'10% of 80 = 8 · 5% = 4 · 25% = 20',tool:BAR(80,25)},
 ]}];
