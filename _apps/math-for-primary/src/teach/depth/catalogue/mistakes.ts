import {fmt} from '../../gen';
import {words} from '../../build/families/wn';
import type {Example} from '../../build/sequence';
import type {PlanEntry} from '../../build/plan';
import {factsOf,graphData,nums,type Facts} from './facts';
/**
 * The wrong answers children actually give, computed from the question's own numbers, each with an
 * explanation of the thinking that produces it. A generic rule such as “the sum of the two numbers”
 * is only used where that really is a common mistake for the situation; everything is checked for
 * plausibility before a learner sees it (see `plausible` in questions.ts).
 */
export interface Mistake {answer:string;why:string}
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const ones=(n:number)=>String(Math.round(n)).split('').reverse().map(Number);
/** Place-value parts of a whole number, largest first, without empty columns: 570 → [500, 70]. */
export const placeParts=(n:number)=>String(n).split('').map((d,j,s)=>Number(d)*10**(s.length-j-1)).filter(Boolean);
/** 47 + 38 with the exchange dropped: each column keeps only its ones digit. */
const noExchangeSum=(a:number,b:number)=>{const A=ones(a),B=ones(b);let out=0;for(let i=0;i<Math.max(A.length,B.length);i++)out+=(((A[i]??0)+(B[i]??0))%10)*10**i;return out;};
const needsExchange=(a:number,b:number)=>{const A=ones(a),B=ones(b);return A.some((x,i)=>x+(B[i]??0)>=10);};
/** 52 − 27 computed as 35: in each column the smaller digit is taken from the larger. */
const smallerFromLarger=(a:number,b:number)=>{const A=ones(a),B=ones(b);let out=0;for(let i=0;i<A.length;i++)out+=Math.abs(A[i]-(B[i]??0))*10**i;return out;};
const needsRegroup=(a:number,b:number)=>{const A=ones(a),B=ones(b);return A.some((x,i)=>x<(B[i]??0));};
const decimals=(x:number)=>{const s=fmt(x);return s.includes('.')?s.split('.')[1].length:0;};
/** 5.4 read at the scale of 3.47 becomes 5.04: the tenths digit slides into the hundredths place. */
const misread=(x:number,places:number)=>{const [w,f='']=fmt(x).split('.');return Number(w)+Number(f)/10**places;};
const pad=(n:number)=>String(n).padStart(2,'0');
/** A time written like the question's answer: “10:15 am” or “10:15”. */
const clockLike=(answer:string,h:number,m:number,half?:'am'|'pm')=>/am|pm/.test(answer)?`${h%12||12}:${pad(m)} ${half??(h%24<12?'am':'pm')}`:`${pad(h%24)}:${pad(m)}`;
const UNIT_FACTOR:Record<string,[string,number]>={km:['m',1000],m:['cm',100],kg:['g',1000],litres:['ml',1000]};
const SMALLER:Record<string,string>={m:'km',cm:'m',g:'kg',ml:'litres'};
const SOLID:Record<string,string>={cube:'six equal square faces','cuboid':'six rectangular faces in matching pairs','cone':'one circular base and a curved surface meeting at a point','cylinder':'two circular ends joined by a curved surface','sphere':'one curved surface and no edges','triangular prism':'two triangular ends joined by three rectangles','square pyramid':'a square base and four triangles meeting at a point'};
const SHAPE:Record<string,string>={rectangle:'four straight sides and four right-angle corners',square:'four equal sides and four right-angle corners',triangle:'three straight sides',circle:'one curved edge all the way round',semicircle:'one curved edge and one straight edge',"quarter-circle":'one curved edge and two straight edges meeting at a right angle'};
const PROPERTY:Record<string,string>={
 'Exactly three right angles':'If three angles of a four-sided shape are right angles, the fourth is too: the angles add up to 360°.',
 'All sides curved':'Squares and rectangles have straight sides.',
 'Opposite sides of different lengths':'Opposite sides of a rectangle are equal in length.',
 'Exactly three sides':'A shape with three sides is a triangle. This shape has four sides.',
 'No parallel sides':'This shape has at least one pair of parallel sides.',
 'Every angle must be a right angle':'Its angles do not have to be right angles.',
};
const UNIT_KIND:Record<string,string>={m:'length',g:'mass',kg:'mass',litres:'liquid volume'};
export function mistakesFor(p:PlanEntry,e:Example,f:Facts=factsOf(p,e)):Mistake[]{
 const v=f.v,ans=Number(e.answer),out:Mistake[]=[];
 const add=(answer:number|string,why:string)=>{out.push({answer:typeof answer==='number'?fmt(answer):answer,why});};
 const options=(explain:(o:string)=>string|null|undefined)=>{for(const o of e.choices??[]){if(o===e.answer)continue;const why=explain(o);if(why)out.push({answer:o,why});}};
 switch(f.kind){
  case 'place':{const P={ones:1,tens:10,hundreds:100,thousands:1000,'ten thousands':10000,'hundred thousands':100000,millions:1000000,'ten millions':10000000}[f.s.column]??1,d=Math.floor(v.n/P)%10;
   if(P>1)add(d,`That is just the digit. It sits in the ${f.s.column} column, so it stands for ${d} ${f.s.column}.`);
   if(P>1)add(d*P/10,`That is its value one column to the right. Check which column the ${d} is in.`);
   add(d*P*10,`That is its value one column to the left. Check which column the ${d} is in.`);
   for(const [name,Q] of Object.entries({ones:1,tens:10,hundreds:100,thousands:1000}))if(Q!==P&&Q<=v.n){const digit=Math.floor(v.n/Q)%10;if(digit&&digit*Q!==d*P){add(digit*Q,`That is the value of the ${name} digit. The question asks about the ${f.s.column} column.`);break;}}
   break;}
  case 'numeral':{const s=String(v.n),bare=s.replace(/0/g,'');if(bare&&bare!==s)add(Number(bare),'Zeros hold empty columns open. Without them, the other digits slide into the wrong places.');
   if(v.n>=1000&&v.n%1000){const top=Math.floor(v.n/1000);add(Number(`${top*1000}${v.n%1000}`),`That writes “${words(top)} thousand” as ${top*1000} and puts ${v.n%1000} after it. The ${v.n%1000} fills the last columns of ${top*1000} instead.`);}break;}
  case 'words':{const n=v.n,near:[number,string][]=[[n+1,'one more'],[n-1,'one less'],[Math.max(1,n-10),'ten less']];
   options(o=>{const hit=near.find(([k])=>words(k)===o);return hit?`Read that one back: it names ${hit[0].toLocaleString('en-SG')}, which is ${hit[1]} than ${n.toLocaleString('en-SG')}.`:null;});break;}
  case 'ordinal':{const NAMES=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];options(o=>{const k=NAMES.indexOf(o)+1;return k?`“${o}” names position ${k}. Count from the front to position ${v.pos}.`:null;});break;}
  case 'odd-even':{const d=v.n%10;options(()=>`Look at the ones digit, ${d}. Every ten pairs up exactly, so only the ones digit decides.`);break;}
  case 'round':{const lo=Math.floor(v.x/v.unit)*v.unit,hi=lo+v.unit;add(ans===lo?hi:lo,`That is the other neighbour. ${fmt(v.x)} is between ${lo} and ${hi}; compare it with the halfway point, ${lo+v.unit/2}.`);
   if(v.unit>=100)add(Math.round(v.x/(v.unit/10))*(v.unit/10),`That rounds to the nearest ${v.unit/10}, not the nearest ${v.unit}.`);break;}
  case 'pattern':{if(v.step!==1)add(v.last+1,`The numbers go up by ${v.step} each time, not by 1.`);add(v.last+2*v.step,`That skips a number. Add ${v.step} once.`);break;}
  case 'compare':options(o=>e.answer==='='?'The two numbers are equal, so neither is larger.':o==='='?'The two numbers are not equal. Find the first place, from the left, where their digits differ.':'That points the wrong way. The open side of the sign faces the larger number.');break;
  case 'order':{const sorted=f.s.list.split(', ').map(Number).sort((x,y)=>x-y);options(o=>o===[...sorted].reverse().join(', ')?'That lists the largest first. Increasing order starts with the smallest.':'Compare from the largest place first to find the smallest number, then the next.');break;}
  case 'lcm':{const {a,b}=v,big=Math.max(a,b),small=Math.min(a,b);if(a*b!==ans)add(a*b,`${a*b} is a common multiple of ${a} and ${b}, but not the smallest. Check the smaller multiples of ${big} first.`);if(big%small)add(big,`${big} is a multiple of ${big}, but not of ${small}.`);add(small,`${small} is a multiple of ${small}, but not of ${big}.`);break;}
  case 'nth-multiple':add(v.a*(v.count-1),`That is one multiple too few. Count ${v.count} lots of ${v.a}.`);add(v.a+v.count,`That adds. This multiple of ${v.a} is ${v.count} × ${v.a}.`);break;
  case 'gcf':{const {x,y}=v,small=Math.min(x,y),big=Math.max(x,y);if(ans>1)add(1,`1 divides every number, but ${x} and ${y} share a larger factor.`);if(big%small)add(small,`${small} does not divide ${big} exactly, so it is not a common factor.`);for(let d=ans-1;d>1;d--)if(ans%d===0){add(d,`${d} divides both numbers, but it is not the greatest common factor.`);break;}break;}
  case 'factor-choice':options(o=>`${v.n} ÷ ${o} leaves a remainder, so ${o} is not a factor of ${v.n}.`);break;
  case 'order-ops':add((v.a+v.b)*v.c,'That adds first. Multiplication is done before addition unless brackets say otherwise.');add(v.a+v.b+v.c,`That adds all three numbers. ${v.b} × ${v.c} means ${v.b} groups of ${v.c}.`);break;
  case 'remainder':{const q=Math.floor(v.total/v.b);add(q,'That is the number of full groups. The remainder is what is left over after those groups are made.');if(ans+v.b<v.total)add(ans+v.b,`${ans+v.b} is still enough to make another group of ${v.b}. Keep making groups.`);break;}
  case 'add3':add(v.a+v.b,`That joins only two of the parts. Add the third part, ${v.c}, too.`);add(v.b+v.c,`That leaves out the first part, ${v.a}.`);break;
  case 'bond-whole':add(v.a,`That is one part. The whole is both parts together.`);if(v.a!==v.b)add(Math.abs(v.a-v.b),'That is the difference between the parts. The whole joins both parts.');break;
  case 'bond-part':add(v.whole+v.part,`That adds. The whole is already ${v.whole}; find the part that makes it with ${v.part}.`);add(v.part,'That is the part we were given. Find the other part.');add(v.whole,'That is the whole. The missing part is smaller than the whole.');break;
  case 'add':{const {a,b}=v;if(a===ans||b===ans)break;
   if(p.level<=2&&Math.max(a,b)<=20){add(a,`That is only the first part. Join ${fmt(b)} to it as well.`);add(b,'That is only the second part. Join both parts.');}
   if(Number.isInteger(a)&&Number.isInteger(b)&&Math.max(a,b)>=10&&needsExchange(a,b))add(noExchangeSum(a,b),'One column made ten or more. Exchange ten of them for one in the next column instead of dropping it.');
   {const small=Math.min(a,b),big=Math.max(a,b);if(p.level<=2&&small<=10&&ans>1)add(ans-1,`Count on from ${big}: say the next number for each of the ${small}. Do not count ${big} again.`);}break;}
  case 'sub':{const {a,b}=v;
   add(a+b,`That adds. We are taking ${fmt(b)} away, so the answer is smaller than ${fmt(a)}.`);
   if(b!==ans)add(b,'That is the part taken away. The question asks what is left.');
   if(Number.isInteger(a)&&Number.isInteger(b)&&a>=10&&needsRegroup(a,b))add(smallerFromLarger(a,b),'In one column the top digit was smaller, so the smaller digit was taken from the larger. Exchange one from the next column first.');
   if(p.level<=2&&b<=10)add(ans+1,`Count back ${b} from ${a}: the first jump lands on ${a-1}. Do not count ${a} itself.`);break;}
  case 'mul':{const {a,b}=v;if(a===ans||b===ans)break;
   add(a+b,`That adds. ${fmt(a)} × ${fmt(b)} means ${fmt(b)} groups of ${fmt(a)}, not the two numbers put together.`);
   if(Number.isInteger(a)&&Number.isInteger(b)){const big=Math.max(a,b),small=Math.min(a,b),parts=placeParts(big);
    if(parts.length>1&&small<10)add(parts[0]*small+(big-parts[0]),`Only the ${parts[0]} was multiplied. Every part of ${big} — ${parts.join(' and ')} — is multiplied by ${small}.`);
    if(big>=10&&big%10===0&&small<10)add(big/10*small,`${big} is ${big/10} tens, so ${big/10} × ${small} counts tens. The answer is ten times that.`);
    if(small>=11&&small<=99){const t=Math.floor(small/10),o=small%10;add(big*o+big*t,`In the second row the ${t} stands for ${t} tens: multiply ${big} by ${t*10}, not by ${t}.`);}
    if(big<=12&&small>=2)add(big*(small-1),`That is one group too few. Count ${small} groups of ${big}.`);}
   break;}
  case 'div':{const {a,b}=v;if(b===1)break;
   if(a-b>0&&a-b!==ans)add(a-b,`That takes ${fmt(b)} away once. Division splits all of ${fmt(a)} into equal groups.`);
   if(b!==ans)add(b,`${fmt(b)} is the number we divide by, not the answer.`);
   const q=String(ans);if(Number.isInteger(ans)&&/0/.test(q.slice(1)))add(Number(q[0]+q.slice(1).replace(/0/g,'')),'A zero is missing: when a place divides to nothing, write 0 in that place.');
   if(a<=100)add(a*b,`That multiplies. Splitting ${fmt(a)} into equal groups gives a smaller number than ${fmt(a)}.`);break;}
  case 'frac-dec':{const {n,d}=v;add(`${n}.${d}`,`The fraction bar means divide: ${n} ÷ ${d}. It does not mean the digits ${n} and ${d} joined by a point.`);if(decimals(d/n)<=2)add(fmt(d/n),`That divides ${d} by ${n}. The fraction means ${n} ÷ ${d}.`);break;}
  case 'frac-compare':{const {n1,d1,n2,d2}=v;options(o=>e.answer==='='?`${n1}/${d1} and ${n2}/${d2} name the same amount, so neither is larger.`:o==='='?`${n1}/${d1} and ${n2}/${d2} are not equal. Rename them with the same denominator and compare.`:d1===d2?`Both fractions use ${d1} equal parts, so compare the numerators ${n1} and ${n2}.`:n1===1&&n2===1?'More equal parts make each part smaller, so the fraction with the larger denominator is the smaller fraction.':`That points the wrong way. Rename both with denominator ${d1*d2}: ${n1*d2}/${d1*d2} and ${n2*d1}/${d1*d2}.`);break;}
  case 'frac-missing':{const {n,d,given}=v,bottom=f.s.missing==='bottom';add(bottom?d+(given-n):n+(given-d),'Equivalent fractions multiply the top and the bottom by the same number. Adding the same amount to both changes the share.');add(bottom?d:n,`Only one number was changed. To keep the same share, the ${bottom?'bottom':'top'} must be multiplied by the same number as the ${bottom?'top':'bottom'}.`);break;}
  case 'frac-simplify':{const {a,b}=v,g=gcd(a,b);for(let k=2;k<g;k++)if(g%k===0){add(`${a/k}/${b/k}`,`That is equivalent, but ${a/k} and ${b/k} still share a common factor. Keep dividing, or divide by ${g} in one step.`);break;}add(`${a}/${b}`,'That is the same fraction as before. Divide the top and the bottom by a common factor.');break;}
  case 'frac-rename':{const {n,d,b}=v,wrong=n+(b-d);if(wrong>0)add(`${wrong}/${b}`,`Multiply the top by the same number as the bottom. ${d} became ${b} by × ${b/d}, so the top is ${n} × ${b/d}.`);break;}
  case 'to-mixed':{const {total,d}=v,w=Math.floor(total/d),r=total%d;if(r&&r!==w)add(`${r} ${w}/${d}`,`The whole number counts complete groups of ${d}; the part left over goes on top of the fraction.`);break;}
  case 'to-improper':{const {w,n,d}=v;add(`${w+n}/${d}`,`Each whole is ${d} parts, so ${w} wholes are ${w} × ${d} parts. Then add the ${n} extra parts.`);if(w*n!==w*d+n)add(`${w*n}/${d}`,'Multiply the whole number by the denominator, not by the numerator.');break;}
  case 'frac-add':case 'frac-sub':{const {w1,n1,d1,w2,n2,d2}=v,plus=f.kind==='frac-add';
   if(w1||w2){const L=d1*d2/gcd(d1,d2),A=n1*L/d1,B=n2*L/d2;if(!plus&&A<B&&w1-w2>=1)add(`${w1-w2} ${B-A}/${L}`,`The first fraction is smaller, so exchange one whole for ${L}/${L} before subtracting. Do not take the smaller part from the larger.`);if(plus&&d1!==d2)add(`${w1+w2} ${n1+n2}/${d1+d2}`,'Add the wholes, then the fractions, but rename the fractions to a common denominator first.');break;}
   if(!plus&&d1===d2&&n1>n2)add(n1-n2,`Keep the denominator. The parts are still the same size, 1/${d1} each, so subtract only the numbers of parts.`);
   if(d1!==d2){if(plus)add(`${n1+n2}/${d1+d2}`,'Adding the denominators changes the size of the parts. Rename to a common denominator, then add the numerators only.');
    else if(n1>n2&&d1>d2)add(`${n1-n2}/${d1-d2}`,'Subtracting the denominators changes the size of the parts. Rename to a common denominator first.');
    if(plus||n1>n2)add(`${plus?n1+n2:n1-n2}/${Math.max(d1,d2)}`,'The parts are different sizes. Rename them so the denominators match before joining or removing them.');}
   else if(plus)add(`${n1+n2}/${d1+d2}`,`The parts are all the same size, so the denominator stays ${d1}. Add only the numerators.`);break;}
  case 'frac-of':{const {a,d,whole}=v;if(a>1)add(whole/d,`That is 1/${d} of ${whole}. Take ${a} of those equal parts.`);const flip=whole*d/a;if(Number.isInteger(flip))add(flip,'Divide by the denominator and multiply by the numerator, not the other way round.');add(a*whole,`That multiplies by ${a} but never divides by ${d}. Find one ${d}th of ${whole} first.`);break;}
  case 'frac-times':{const L=f.s.left.match(/^(\d+)\/(\d+)$/),R=f.s.right.match(/^(\d+)\/(\d+)$/),k=/^\d+$/.test(f.s.right)?Number(f.s.right):null;
   if(L&&k){add(`${+L[1]*k}/${+L[2]*k}`,`Multiplying the top and the bottom by ${k} makes an equivalent fraction, not ${k} times as much. Multiply only the numerator.`);add(`${L[1]}/${+L[2]*k}`,`Multiplying the bottom makes each part ${k} times smaller. To make ${k} times as much, multiply the number of parts: the top.`);}
   {const Mx=f.s.left.match(/^(\d+) (\d+)\/(\d+)$/);if(Mx&&k)add(`${+Mx[1]*k} ${Mx[2]}/${Mx[3]}`,`Only the whole number was multiplied. The fraction part, ${Mx[2]}/${Mx[3]}, must be multiplied by ${k} too.`);}
   if(L&&R){add(`${+L[1]+ +R[1]}/${+L[2]+ +R[2]}`,'That adds the tops and the bottoms. To multiply fractions, multiply the numerators and multiply the denominators.');add(`${+L[1]*+R[2]}/${+L[2]*+R[1]}`,'That multiplies across the diagonals, which belongs to dividing. To multiply, multiply top by top and bottom by bottom.');}break;}
  case 'frac-div':{const {w1,n1,d1,w2,n2,d2}=v;if(w1||w2)break;
   if(d2===1){add(`${n1*n2}/${d1}`,`That multiplies by ${n2}. Sharing into ${n2} equal parts makes each part smaller.`);}
   else{add(`${n1*n2}/${d1*d2}`,`That multiplies. Division asks how many ${n2}/${d2}s fit into ${n1}/${d1}.`);add(`${d1*n2}/${n1*d2}`,'That turns the first fraction upside down. Keep the first fraction and use the reciprocal of the second.');}break;}
  case 'frac-share':{const {w,d}=v;if(w!==d)add(`${d}/${w}`,`The cakes are being shared, so the cakes go on top: ${w} ÷ ${d} is ${w}/${d}.`);if(w>1)add(`1/${d}`,'That is one piece from one cake. Each child gets a piece from every cake.');break;}
  case 'frac-name':{const {n,d}=v;add(`${d}/${n}`,'The numbers are swapped. The top counts the shaded parts; the bottom counts all the equal parts.');if(d-n!==n){add(`${n}/${d-n}`,'The bottom counts every equal part, shaded and unshaded, not just the unshaded ones.');add(`${d-n}/${d}`,'That counts the unshaded parts. The question asks about the shaded part.');}break;}
  case 'money-count':{add(v.pieces,`That counts how many ${f.s.unit==='dollars'?'notes':'coins'} there are. Add the value printed on each one.`);const values=nums(e.prompt.split(':')[1]??'');if(values.length>1)add(Math.max(...values),`That is only the ${f.s.unit==='dollars'?'largest note':'largest coin'}. Add the value of every one.`);break;}
  case 'money-count2':add(fmt(v.cents/100),`That is only the coins. Include the $${v.dollars} as well.`);add(v.dollars,'That is only the notes. Add the coins too.');add(v.dollars+v.cents,'The coins are cents, not dollars: 100 cents make $1.');break;
  case 'money-add':add(v.a,`That is only the first amount. Add $${v.b.toFixed(2)} too.`);add(Math.abs(v.a-v.b),'That finds the difference. The question joins the two amounts.');break;
  case 'money-sub':add(v.a+v.b,`That adds. Taking $${v.b.toFixed(2)} away leaves less than $${v.a.toFixed(2)}.`);add(v.b,'That is the amount taken away, not what is left.');break;
  case 'to-cents':add(fmt(v.dollars*10),'One dollar is 100 cents, not 10. Multiply the dollars by 100.');add(fmt(v.dollars*1000),'One dollar is 100 cents. Multiply by 100, not 1000.');break;
  case 'to-dollars':add(fmt(v.cents/10),'One dollar is 100 cents, so divide by 100, not 10.');add(v.cents,'That is still in cents. Divide by 100 to change cents into dollars.');break;
  case 'rate-per':add(v.total*v.count,`That multiplies. The $${v.total} is shared equally between ${v.count} notebooks.`);add(v.total+v.count,'Adding the number of notebooks to the cost mixes two different kinds of amount.');if(v.total-v.count>0)add(v.total-v.count,'That subtracts the number of notebooks from the cost. Share the cost equally instead.');break;
  case 'rate-total':add(v.rate+v.count,`That adds. ${v.count} notebooks at $${v.rate} each cost ${v.count} lots of $${v.rate}.`);break;
  case 'rate-count':add(v.total-v.rate,`That is the money left after buying one notebook. Count how many $${v.rate} amounts fit into $${v.total}.`);add(v.total*v.rate,`That multiplies. Each notebook uses $${v.rate}, so fewer than ${v.total} can be bought.`);break;
  case 'pct-of':{const {pct,whole}=v;if(pct!==ans)add(pct,`That is the percentage, not the amount. ${pct}% means ${pct} out of every 100.`);add(whole-pct,`That subtracts the percentage number from the whole. Find ${pct} hundredths of ${whole} instead.`);add(whole-ans,`That is the rest of the whole: the other ${100-pct}%.`);add(whole*pct,'Percent means out of 100, so divide by 100 as well.');break;}
  case 'pct-original':{const {pct,part}=v,again=part*pct/100;if(Number.isInteger(again))add(again,`That takes ${pct}% of the part again. The part is only ${pct}% of the whole, so build it up to 100%.`);if(Number.isInteger(part/pct))add(part/pct,'That is the value of 1%. The whole is 100%.');break;}
  case 'pct-change':{const {from,to}=v,change=Math.abs(to-from),vsNew=change/to*100,ratio=to/from*100;if(Number.isInteger(vsNew))add(vsNew,`Percentage change compares the change with the original amount, ${from}, not with the new amount.`);add(change,`That is the change in amount. Divide it by the original ${from}, then multiply by 100.`);if(Number.isInteger(ratio))add(ratio,'That is the new amount as a percentage of the original. The change is its difference from 100%.');break;}
  case 'discount':{const {base,rate}=v,off=base*rate/100;add(off,'That is the discount itself. Take it off the original price.');add(base+off,'A discount is taken away from the price, not added.');add(base-rate,`That takes away the percentage number. Find ${rate}% of $${base} first.`);break;}
  case 'gst':{const {base,rate}=v,tax=base*rate/100;add(tax,'That is the GST alone. Add it to the pre-tax price.');add(base-tax,'GST is added to the price, not taken away.');add(base+rate,`That adds the percentage number. Find ${rate}% of $${base} first.`);break;}
  case 'interest':{const {base,rate}=v;add(base+base*rate/100,'That is the total after one year. The question asks for the interest only.');add(base*rate,`Percent means out of 100: find ${rate} hundredths of $${base}.`);break;}
  case 'pct-fraction':{const {pct}=v;if(gcd(pct,100)>1)add(`${pct}/100`,'That is the right amount, but not in simplest form. Divide the top and the bottom by a common factor.');add(`${pct}/10`,'Percent means out of 100, not out of 10.');break;}
  case 'pct-read':add(100-v.pct,'That counts the unshaded squares. The percentage shaded counts the shaded squares out of 100.');if(v.pct%10===0)add(v.pct/10,'That counts full rows. Each row is 10 squares, so count the squares.');break;
  case 'ratio-share':{const {total,first,terms,sum}=v;if(Number.isInteger(total/terms))add(total/terms,`That shares ${total} equally between ${terms} people. A ratio share counts units: there are ${sum} units altogether, so one unit is ${total} ÷ ${sum}.`);
   if(first!==ans)add(first,'That is how many units the first share has, not how many counters. Find the value of one unit first.');
   if(first>1&&Number.isInteger(total/first))add(total/first,`Dividing by the first ratio number ignores the other shares. Divide by all ${sum} units.`);
   if(first>1)add(total/sum,`That is one unit. The first share has ${first} units.`);break;}
  case 'ratio-missing':add(v.b+(v.scaled-v.a),`Ratios scale by multiplying, not by adding the same amount. ${v.a} became ${v.scaled} by × ${v.scaled/v.a}.`);add(v.scaled*v.b,`Multiply ${v.b} by the scale factor, ${v.scaled/v.a}, not by ${v.scaled}.`);break;
  case 'ratio-fraction':add(`${v.first}/${v.second}`,`That compares red with blue. A fraction of all the counters uses every unit, ${v.sum}, as the denominator.`);if(v.second!==v.first)add(`${v.second}/${v.sum}`,'That is the fraction that is blue. Count the red units.');break;
  case 'ratio-simplify':{const t=f.s.terms.split(':').map(Number),g=t.reduce(gcd);for(let k=2;k<g;k++)if(g%k===0){add(t.map(x=>x/k).join(':'),`That is simpler, but the numbers still share a common factor. Divide every term by ${g}.`);break;}
   const top=t.indexOf(Math.max(...t));if(g>1)add(t.map((x,i)=>i===top?x/g:x).join(':'),'Divide every term by the same number, not just one of them.');break;}
  case 'ratio-write':{const reversed=e.answer.split(':').reverse().join(':');if(reversed!==e.answer)add(reversed,'The order must follow the words: red first, then blue.');break;}
  case 'alg-expr':options(o=>o===`${v.a} + x + ${v.b}`?`${v.a} packets of x stickers is ${v.a} × x, written ${v.a}x, not ${v.a} + x.`:o===`${v.a+v.b}x`?`Only the packets contain x stickers. The ${v.b} loose stickers are not multiplied by x.`:o===`${v.a}x - ${v.b}`?'The loose stickers are added to the packets, not taken away.':null);break;
  case 'alg-simplify':options(o=>o===`${v.a*v.b}x`?`Like terms add their counts: ${v.a}x + ${v.b}x is ${v.a} + ${v.b} lots of x.`:o===`${v.a+v.b} + x`?`x is the unit being counted, so it stays with the number: ${v.a+v.b} lots of x.`:o===`${v.a+v.b}x²`?`Adding like terms does not square x. ${v.a} x's and ${v.b} x's make ${v.a+v.b} x's.`:null);break;
  case 'alg-sub':add(Number(`${v.a}${v.x}`)+v.b,`${v.a}x means ${v.a} × x. It does not mean the digits ${v.a} and ${v.x} side by side.`);add(v.a+v.x+v.b,`${v.a}x means ${v.a} × ${v.x}, not ${v.a} + ${v.x}.`);break;
  case 'alg-solve':add(v.c-v.b,`That is the value of ${v.a}x. Divide by ${v.a} to find one x.`);if(Number.isInteger((v.c+v.b)/v.a))add((v.c+v.b)/v.a,`To undo + ${v.b}, subtract ${v.b} from both sides. Do not add it.`);break;
  case 'dec-place':{const digit=Number(f.s.text.split('.')[1]?.[v.places-1]??0);if(digit){add(digit,`That is the digit. In the ${f.s.place} place it is worth ${digit} ${f.s.place}.`);if(v.places>1)add(fmt(digit/10**(v.places-1)),'That is its value one place to the left. Name the column first.');if(v.places<3)add(fmt(digit/10**(v.places+1)),'That is its value one place to the right. Name the column first.');}break;}
  case 'dec-to-frac':{const t=f.s.text,dp=(t.split('.')[1]??'').length,num=Math.round(v.x*10**dp);if(dp===2)add(`${num}/10`,`Two decimal places means hundredths: ${t} is ${num} hundredths.`);if(dp===1)add(`${num}/100`,`One decimal place means tenths: ${t} is ${num} tenths.`);break;}
  case 'dec-round':case 'dec-quotient':{const x=f.kind==='dec-round'?v.x:v.a/v.b,places=v.places,p10=10**places;
   add((Math.floor(x*p10)/p10).toFixed(places),'Look at the next digit: when it is 5 or more, the last kept digit goes up.');
   if(places>0)add((Math.round(x*p10/10)/(p10/10)).toFixed(places-1),`Round to ${places} decimal place${places===1?'':'s'}, not ${places-1}.`);
   add((Math.round(x*p10*10)/(p10*10)).toFixed(places+1),`Round to exactly ${places} decimal place${places===1?'':'s'}.`);break;}
  case 'dec-add':case 'dec-sub':{const {a,b}=v,da=decimals(a),db=decimals(b),plus=f.kind==='dec-add';
   if(da!==db){const L=Math.max(da,db),A=da<L?misread(a,L):a,B=db<L?misread(b,L):b;add(fmt(plus?A+B:A-B),'The digits after the point were lined up from the right. Line up the decimal points so tenths meet tenths.');}
   if(da===db&&da>=1&&da<=2){const s=10**da,A=Math.round(a*s),B=Math.round(b*s);if(plus&&needsExchange(A,B))add(fmt(noExchangeSum(A,B)/s),'One column made ten or more. Exchange ten of that place for one of the next place instead of dropping it.');if(!plus&&A>=B&&needsRegroup(A,B))add(fmt(smallerFromLarger(A,B)/s),'In one column the top digit was smaller, so the smaller digit was taken from the larger. Exchange one from the next place first.');}
   if(!plus)add(fmt(a+b),'That adds. Taking away leaves less than the starting amount.');break;}
  case 'dec-mul':case 'dec-div':{const {a,b}=v,times=f.kind==='dec-mul';
   if([10,100,1000].includes(b)){const k=Math.log10(b),move=times?'left':'right';add(fmt(times?a/b:a*b),`${times?'Multiplying':'Dividing'} by ${b} makes the number ${times?'larger':'smaller'}, so the digits move to the ${move}.`);if(k>1)add(fmt(times?a*b/10:a/b*10),`${times?'×':'÷'} ${b} moves every digit ${k} places to the ${move}, not ${k-1}.`);add(fmt(times?a*b*10:a/b/10),`${times?'×':'÷'} ${b} moves every digit ${k} place${k>1?'s':''} to the ${move}, not ${k+1}.`);}
   else if(Number.isInteger(b)){add(fmt(ans/10),`Check the size: ${fmt(a)} ${times?'×':'÷'} ${b} is about ${fmt(Math.round(times?a*b:a/b))}.`);add(fmt(ans*10),`Check the size: ${fmt(a)} ${times?'×':'÷'} ${b} is about ${fmt(Math.round(times?a*b:a/b))}.`);}break;}
  case 'measure-diff':add(v.a+v.b,'That adds. The difference is how much more one measures than the other.');add(Math.max(v.a,v.b),'That is the larger measurement. The difference is how much more it is than the other.');break;
  case 'conv':{const m=f.s.text.match(/^([\d.]+) (km|m|cm|kg|g|litres|ml)(?: ([\d.]+) (km|m|cm|kg|g|litres|ml))?$/);if(!m)break;
   const [,x,u1,y]=m;if(UNIT_FACTOR[u1]&&!/ /.test(f.s.to)){const [small,F]=UNIT_FACTOR[u1];if(y!==undefined){add(Number(x)*F/10+Number(y),`1 ${u1} is ${F} ${small}, not ${F/10}.`);add(Number(x)+Number(y),`Change the ${u1} into ${small} before adding the ${y} ${small}.`);}else{add(fmt(Number(x)*F/10),`1 ${u1} is ${F} ${small}, not ${F/10}.`);add(fmt(Number(x)*10),`1 ${u1} is ${F} ${small}, so multiply by ${F}, not by 10.`);}}
   else if(SMALLER[u1]){const big=SMALLER[u1],F=UNIT_FACTOR[big][1];if(/ /.test(f.s.to)){const total=Number(x),w=Math.floor(total/F),r=total%F;options(o=>o===`${w} ${big} ${r/10} ${u1}`?`The ${r} ${u1} left over stay as they are. Only whole ${big} are regrouped.`:o===`${w+1} ${big} ${r} ${u1}`?`That is one ${big} too many. ${total} ${u1} contains ${w} whole ${big}.`:null);}else add(fmt(Number(x)/(F/10)),`${F} ${u1} make 1 ${big}, not ${F/10}.`);}break;}
  case 'vol-conv':add(v.litres*100,'1 litre is 1000 cubic centimetres, not 100.');add(v.litres,'1 litre is 1000 cubic centimetres, not 1.');break;
  case 'time-sec':add(v.m*100+v.s,'A minute has 60 seconds, not 100.');add(v.m+v.s,'Change the minutes into seconds before adding.');break;
  case 'hm-to-min':add(v.h*100+v.m,'An hour has 60 minutes, not 100.');add(v.h+v.m,'Change the hours into minutes before adding.');break;
  case 'min-to-hm':options(o=>{const m=o.match(/(\d+) h (\d+) min/);if(!m)return null;const mins=Number(m[1])*60+Number(m[2]);return mins>v.total?`${o} is ${mins} minutes: ${mins-v.total} too many.`:`${o} is ${mins} minutes: ${v.total-mins} too few.`;});break;
  case 'end-time':{const t=/:/.test(f.s.start)?f.s.start.match(/(\d{1,2}):(\d{2})/):null;if(!t)break;const h=Number(t[1]),m=Number(t[2]),half=/pm/.test(f.s.start)?'pm':/am/.test(f.s.start)?'am':undefined;
   if(m+v.duration>=60&&m+v.duration<100)add(/am|pm/.test(e.answer)?`${h}:${m+v.duration} ${half??''}`.trim():`${pad(h)}:${m+v.duration}`,`There are only 60 minutes in an hour. ${m+v.duration} minutes past ${h} is ${Math.floor((m+v.duration)/60)} hour and ${(m+v.duration)%60} minutes past it.`);
   if(half==='am'&&/pm/.test(e.answer))add(e.answer.replace('pm','am'),'After 12 noon the time is pm, not am.');break;}
  case 'start-time':{const t=f.s.end.match(/(\d{1,2}):(\d{2})/);if(!t)break;const h=Number(t[1]),m=Number(t[2]),naive=h*100+m-v.duration,half=/pm/.test(f.s.end)?'pm':/am/.test(f.s.end)?'am':undefined;
   if(v.duration>m&&naive>0&&naive%100<60)add(clockLike(e.answer,Math.floor(naive/100),naive%100,half),'An hour has 60 minutes, not 100. Go back to the hour first, then the rest of the minutes.');break;}
  case 'time-24':{const {h,m}=v;if(v.pm)add(`${pad(h)}:${pad(m)}`,`Afternoon hours add 12: ${h} pm is ${h+12} in 24-hour time.`);else{add(`${h+12}:${pad(m)}`,'Morning hours stay the same in 24-hour time. Only afternoon hours add 12.');if(h<10)add(`${h}:${pad(m)}`,'Write the hour with two digits in 24-hour time, such as 09.');}break;}
  case 'duration':{const hhmm=(t:number)=>Math.floor(t/60)%24*100+t%60,naive=hhmm(v.end)-hhmm(v.start);if(naive>0&&naive!==ans)add(naive,'An hour has 60 minutes, not 100. Count on to the next hour first, then add the rest.');break;}
  case 'clock':options(o=>{const [oh,om]=o.split(/[: ]/),[ah,am]=e.answer.split(/[: ]/);return oh!==ah?'The short hand has not reached the next hour yet. Read the hour it has just passed.':om!==am?'Count the minutes in fives from the 12 to the long hand.':null;});break;
  case 'length':add(v.n+1,'Count the spaces between the marks, not the marks themselves.');if(v.n>1)add(v.n-1,'The ruler starts at 0. Count the spaces from the 0 mark, not from the 1.');break;
  case 'area-tri':add(v.b*v.h,'That is the whole rectangle. The triangle covers half of it.');add(v.b+v.h,'Adding the base and the height does not measure the surface.');break;
  case 'area-house':add(v.a*v.b+v.base*v.h,`The roof is a triangle: its area is half of ${v.base} × ${v.h}.`);add(v.a*v.b,'Include the triangular roof as well.');break;
  case 'perim-house':add(v.bottom+v.wall+v.slope,'There are two walls and two roof slopes. Count each of them.');add(2*v.bottom+2*v.wall+2*v.slope,'The line under the roof is inside the figure, so it is not part of the perimeter.');break;
  case 'square-side':if(Number.isInteger(v.area/4))add(v.area/4,'That divides the area by 4, as if it were a perimeter. The side times itself makes the area.');if(Number.isInteger(v.area/2))add(v.area/2,'Area is side × side, not side × 2.');break;
  case 'len-from-perim':add(v.perim-v.w,`The perimeter includes both lengths and both widths. Halve it first: ${v.perim/2} is one length and one width.`);if(Number.isInteger(v.perim/v.w))add(v.perim/v.w,'Dividing the perimeter by the width does not give the length. Half the perimeter is length + width.');add(v.perim/2,'Half the perimeter is length and width together. Take the width away.');break;
  case 'len-from-area':add(v.area-v.w,'Area is length × width, so divide by the width.');break;
  case 'rect-area':add(2*(v.a+v.b),'That is the perimeter, the distance around. Area counts the squares inside.');add(v.a+v.b,'Adding two sides does not count the squares covering the rectangle.');break;
  case 'rect-perim':add(v.a*v.b,'That is the area. The perimeter adds all four sides.');add(v.a+v.b,'That is only two of the sides. Add all four.');break;
  case 'L-area':add(v.a*v.b,`Take away the ${v.c} cm square that was removed.`);add(v.a*v.b-v.c,`The corner is ${v.c} cm by ${v.c} cm, so it covers ${v.c} × ${v.c} squares.`);break;
  case 'L-perim':add(2*(v.a+v.b)-2*v.c,'Cutting the corner removes two edges but adds two new edges of the same lengths, so the perimeter stays the same.');add(v.a*v.b-v.c*v.c,'That is the area of the L-shape. Perimeter is the distance around it.');break;
  case 'cube-root':if(Number.isInteger(Math.sqrt(v.v)))add(Math.sqrt(v.v),'That number times itself makes the volume, but a cube’s edge is used three times: edge × edge × edge.');if(Number.isInteger(v.v/3))add(v.v/3,'Dividing by 3 does not undo multiplying an edge three times. Find the number that, used three times, multiplies to make the volume.');break;
  case 'square-root':if(Number.isInteger(v.area/2))add(v.area/2,'The edge times itself makes the area, not the edge times 2.');break;
  case 'vol-base':add(v.v-v.h,'Divide the volume by the height to find the base area.');break;
  case 'vol-height':if(Number.isInteger(v.v/v.a))add(v.v/v.a,`Divide by the whole base area, ${v.a} × ${v.b}, not by one side.`);add(v.v-v.a*v.b,'Divide the volume by the base area; do not subtract it.');break;
  case 'vol-layers':add(v.layers+v.each,`Each of the ${v.layers} layers has ${v.each} cubes. Multiply.`);break;
  case 'vol-box':add(v.a*v.b,`That is one layer. Multiply by the ${v.c} layers.`);add(v.a+v.b+v.c,'Adding the edges does not count the cubes.');break;
  case 'circle':{const {r,part}=v,pi=22/7;if(v.perimeter){if(part>1)add(fmt(2*pi*r/part),'Include the straight edges as well as the curved edge.');add(fmt(2*pi*2*r/part+(part===1?0:2*r)),'The curved length is 2 × π × radius. Use the radius, not the diameter.');}
   else{add(fmt(pi*(2*r)**2/part),'Use the radius in π × r × r, not the diameter.');add(fmt(2*pi*r/part),'That is the length of the curved edge. Area is π × r × r.');}break;}
  case 'circle-composite':{const {w,h,r}=v,pi=22/7;if(v.perimeter)add(fmt(2*h+w+pi*r+w),'The semicircle’s diameter is shared with the rectangle, so it is inside the figure and not part of the perimeter.');else add(fmt(w*h+pi*r*r),'The top is a semicircle: take half of π × r × r.');break;}
  case 'angle-straight':add(360-v.k,'Angles on a straight line make 180°, not 360°.');add(v.k,'That is the angle you were given. Find the one that completes the straight line.');break;
  case 'angle-point':add(180-v.k,'Angles around a point make a full turn: 360°.');add(v.k,'That is the angle you were given. Find the one that completes the full turn.');break;
  case 'angle-opposite':add(180-v.k,'That is the angle next to it on the straight line. Vertically opposite angles are equal.');add(360-v.k,'Vertically opposite angles do not make a full turn together. They are equal.');break;
  case 'tri-third':add(300-v.k,'The angles in a triangle add up to 180°, not 360°.');add(180-v.k,'Subtract both known angles, including the 60°.');break;
  case 'isosceles':add(180-v.k,'That is both base angles together. Share it equally between them.');add(v.k,'The equal angles are the base angles. The vertex angle is the different one.');break;
  case 'para-angle':add(v.k,'Next-door angles in a parallelogram add up to 180°. Opposite angles are the equal ones.');break;
  case 'corner-split':add(180-v.k,'A square corner is 90°, not 180°.');add(v.k,'That is the part you were given. Find the part that completes the square corner.');break;
  case 'protractor':add(180-v.deg,'That reads the other scale. Start from the 0° on the first ray and count up.');if(v.deg<180)add(v.deg+10,'That is the neighbouring mark. Follow the ray all the way to the scale.');break;
  case 'mirror':add(2*v.d,'The reflected point is the same distance on the other side, not twice as far.');break;
  case 'sym-count':if(f.s.shape==='rectangle')add(4,'Folding a rectangle along a diagonal does not match the halves, so the diagonals are not lines of symmetry.');if(f.s.shape==='square')add(2,'A square also folds exactly along both diagonals.');if(f.s.shape==='equilateral triangle')add(1,'Every corner-to-opposite-side line works, not just the upright one.');break;
  case 'compose':add(f.s.target==='a semicircle'?4:2,f.s.target==='a semicircle'?'Four quarter-circles make a whole circle. A semicircle is half of that.':'Two quarter-circles make only a semicircle. A whole circle needs four.');break;
  case 'table-missing':add(v.total,'That is the total. Subtract the known entries from it.');add(v.total-ans,'That is the sum of the entries you know. Take it away from the total to find the missing one.');break;
  case 'graph-read':{const g=graphData(e.tool),i=g?g.labels.indexOf(f.s.label):-1;if(g&&g.scale>1&&i>=0)add(g.values[i]/g.scale,`That counts the symbols or grid lines. Each one stands for ${g.scale}.`);break;}
  case 'graph-total':{const g=graphData(e.tool);if(g&&g.scale>1)add(ans/g.scale,`That counts the symbols or grid lines. Each one stands for ${g.scale}.`);if(g)add(g.values.length,'That counts the categories. Add the value of every category.');break;}
  case 'pie-count':{const g=graphData(e.tool),i=g?g.labels.indexOf(f.s.label):-1;if(g&&i>=0){add(v.total-g.values[i],`That is everyone else. Read the slice for ${f.s.label} only.`);add(Math.round(v.total/g.values.length),`The slices are not all the same size. Read the size of the ${f.s.label} slice.`);}break;}
  case 'graph-diff':{const g=graphData(e.tool),i=g?g.labels.indexOf(f.s.x):-1,j=g?g.labels.indexOf(f.s.y):-1;if(g&&i>=0&&j>=0){add(g.values[i]+g.values[j],'That adds them. The difference is how much more one is than the other.');if(g.scale>1)add(ans/g.scale,`Each symbol or interval stands for ${g.scale}. Multiply the count by ${g.scale}.`);}break;}
  case 'graph-range':{const g=graphData(e.tool);if(g){add(Math.max(...g.values)+Math.min(...g.values),'That adds the greatest and least values. The difference is found by subtracting.');add(Math.max(...g.values),'That is the greatest value. Subtract the least value from it.');}break;}
  case 'graph-max':{const g=graphData(e.tool);if(g)options(o=>{const i=g.labels.indexOf(o);return i>=0?`${o} has ${g.values[i]}, which is not the greatest. Compare every category.`:null;});break;}
  case 'lines':options(o=>o==='parallel'?'Parallel lines never meet and stay the same distance apart. These lines meet at a right angle.':o==='perpendicular'?'Perpendicular lines meet at a right angle. These lines stay the same distance apart and never meet.':'Check the marks: equal spacing means parallel, and a square corner means perpendicular.');break;
  case 'angle-notation':options(o=>`${o} is at the end of a ray. The vertex is the middle letter, where the two rays meet.`);break;
  case 'right-angle':{const actual=e.answer==='a right angle'?'matches a square corner exactly':e.answer.startsWith('smaller')?'is narrower than a square corner':'is wider than a square corner';options(o=>o==='a right angle'?`A right angle matches a square corner exactly, but this opening ${actual.replace('is ','is ')}.`:o.startsWith('smaller')?`Place a square corner on it: this opening ${actual}, so it is not smaller.`:`Place a square corner on it: this opening ${actual}, so it is not greater.`);break;}
  case 'net':case 'solid-name':options(o=>SOLID[o]?`A ${o} has ${SOLID[o]}. Count the faces in the picture again.`:null);break;
  case 'shape-name':options(o=>SHAPE[o]?`A ${o} has ${SHAPE[o]}. Look again at the sides and corners.`:null);break;
  case 'shape-pattern':options(()=>'Find the repeating unit, the part that starts again, then continue from where it left off.');break;
  case 'rect-property':case 'quad-property':options(o=>PROPERTY[o]);break;
  case 'height-choice':options(o=>o==='Any sloping side'?'A sloping side does not meet the base at a right angle.':o==='The longest side'?'Length does not decide it. The height meets the base line at 90°.':o==='The perimeter'?'The perimeter is the distance around the triangle, not a height.':null);break;
  case 'unit-choice':options(o=>UNIT_KIND[o]&&UNIT_KIND[o]===UNIT_KIND[e.answer]?`${o} and ${e.answer} both measure ${UNIT_KIND[o]}, but ${o==='g'?'grams suit light things':'that unit is the wrong size here'}.`:UNIT_KIND[o]?`${o} measures ${UNIT_KIND[o]}. The ${f.s.what} is a different kind of amount.`:null);break;
  case 'copy':options(o=>o.startsWith('Change')?'Changing some distances would stretch the figure out of shape.':o.startsWith('Copy only')?'Many different figures have the same number of corners.':null);break;
 }
 return out;
}
