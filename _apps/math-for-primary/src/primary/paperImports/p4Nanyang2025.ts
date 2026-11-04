import {Rng,hashString} from '../../engine/random';
import type {Picture,Question,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';
import type {P4NanyangPicture} from './p4NanyangPicture';
import {NANYANG_2025_PARTS} from './p4Nanyang2025Meta';
export {NANYANG_2025_PARTS,type NanyangPart} from './p4Nanyang2025Meta';

/**
 * Complete original adaptation of Nanyang P4 2025 WA2: 9 numbered questions,
 * 12 response units (13 physical blanks; Q6a asks for a pair of bag labels).
 * All 8 source pages visually reviewed; private provenance is in
 * .generated/paper-imports/p4-nanyang-2025-review.json. No source text or scans shipped.
 * Source Q5 key has a wrong intermediate: 954/9 is 106, not 105. Final424 is correct.
 */
export type NanyangQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:Picture|P4NanyangPicture;workedSteps:{text:string;equation?:string;picture?:Picture|P4NanyangPicture}[]};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const f=(n:number,d:number)=>{const k=gcd(n,d);return d/k===1?String(n/k):`${n/k}/${d/k}`;};
const mixed=(n:number,d:number)=>n<d?f(n,d):n%d?`${Math.floor(n/d)} ${f(n%d,d)}`:String(n/d);
const calc=(op:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op,a,b});
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});
type Rat=[number,number];
const proper:Rat[]=[];for(let d=2;d<=12;d++)for(let n=1;n<d;n++)if(gcd(n,d)===1)proper.push([n,d]);
const bagFractions=proper.filter(([n,d])=>!['1/4','3/5','5/8'].includes(f(n,d)));
// Preserve the non-related denominator subtraction and positive A > C > B ordering.
// Initial denominators <=12; a common-denominator result can be larger (the source uses20).
const ropeVariants:{a:Rat;gap:Rat;next:Rat}[]=[];
for(const a of proper)for(const gap of proper){
 const lcm=a[1]*gap[1]/gcd(a[1],gap[1]),b=a[0]/a[1]-gap[0]/gap[1];
 if(lcm>24||a[1]%gap[1]===0||gap[1]%a[1]===0||b<=0||['9/10','3/4'].includes(f(...a))||['9/10','3/4'].includes(f(...gap)))continue;
 for(const next of proper)if(lcm%next[1]===0&&next[0]/next[1]<gap[0]/gap[1]&&!['9/10','3/4','1/2'].includes(f(...next)))ropeVariants.push({a,gap,next});
}

export function makeP4Nanyang2025(part:string,seed:number,index=0):NanyangQuestion{
 if(!NANYANG_2025_PARTS.some(p=>p.id===part))throw Error(`Unknown P4 Nanyang part: ${part}`);
 const group=part==='2'||part==='3'?'table':part.replace(/[ab]$/,''),r=new Rng(hashString(`p4-nanyang-original-v1:${group}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,picture:NanyangQuestion['picture'],hint:string,steps:NanyangQuestion['workedSteps'],extra:Partial<NanyangQuestion>={}):NanyangQuestion=>({key:`p4-nanyang-${part}:${seed}:${index}`,prompt,answer:String(answer),picture,hint,workedSteps:steps,explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra});
 const choices=(answer:number|string,others:(number|string)[])=>r.shuffle([...new Set([String(answer),...others.map(String)])].slice(0,4));
 if(group==='1'){
  const [n,d]=r.pick<Rat>([[1,2],[2,3],[1,4],[3,4],[2,5],[3,5],[1,6],[5,6]]),factor=r.pick([2,3].filter(k=>d*k<=12&&d*k>=6)),total=d*factor,shaded=n*factor;
  const wrong=r.shuffle(Array.from({length:total-1},(_,i)=>i+1).filter(k=>k!==shaded)).slice(0,3);
  const shuffled=r.shuffle([shaded,...wrong]),sets=shuffled.map((count,i)=>({label:'WXYZ'[i],total,shadedIndices:r.shuffle(Array.from({length:total},(_,j)=>j)).slice(0,count)})),answer=sets.find(s=>s.shadedIndices.length===shaded)!.label;
  return make(`Which set has ${f(n,d)} of its tiles shaded?`,answer,{type:'nanyang-p4',layout:'fraction-sets',sets},'Count every tile in a set, then count its shaded tiles.',[{text:`Each set has ${total} separate tiles. Find ${f(n,d)} of that number.`,equation:`${total} ÷ ${d} × ${n} = ${shaded}`},{text:`Set ${answer} has ${shaded} shaded tiles.`,equation:`${shaded}/${total} = ${f(n,d)}`}],{choices:r.shuffle(sets.map(s=>s.label))});
 }
 if(group==='table'){
  const sat=[r.int(31,68)*10+3,r.int(24,52)*10+7,r.int(41,79)*10+1],unit=r.int(11,24)*10+5,factor=r.pick([3,4]),other=r.int(35,64)*10+9,sunday=[factor*unit,other,unit];
  const total=(vs:number[])=>vs.reduce((a,b)=>a+b,0),picture:P4NanyangPicture={type:'nanyang-p4',layout:'table',caption:'Items sold at a craft fair',columns:['Badges','Cards','Stickers','Total'],rows:[{label:'Friday',values:[null,sat[1],sat[2],total(sat)]},{label:'Saturday',values:[null,other,null,total(sunday)]}]};
  if(part==='2')return make('How many badges were sold on Friday?',sat[0],picture,'Use the Friday row. Subtract both known item counts from its total.',[{text:'Combine the cards and stickers.',equation:`${sat[1]} + ${sat[2]} = ${sat[1]+sat[2]}`},{text:'The rest of Friday’s total is badges.',equation:`${total(sat)} − ${sat[1]+sat[2]} = ${sat[0]}`}],{choices:choices(sat[0],[sat[0]+sat[1],sat[0]+sat[2],sat[1]+sat[2]]),unit:'badges',proof:calc('-',total(sat),calc('+',sat[1],sat[2]))});
  const count=factor+1;return make('How many stickers were sold on Saturday?',unit,picture,'Remove the cards first. Share the remaining items into equal badge and sticker units.',[{text:'Find the badges and stickers together.',equation:`${total(sunday)} − ${other} = ${count*unit}`},{text:`Badges use ${factor} equal units and stickers use 1 unit.`,equation:`${factor} + 1 = ${count} units`},{text:'One unit is the sticker count.',equation:`${count*unit} ÷ ${count} = ${unit}`}],{context:[`On Saturday, ${factor} times as many badges as stickers were sold.`],choices:choices(unit,[factor*unit,count*unit,unit+other]),unit:'stickers',proof:calc('/',calc('-',total(sunday),other),count)});
 }
 if(group==='4'){
  const labels=['May','Jun','Jul','Aug'],scale=r.pick([4,5,6]),values=r.shuffle([2,3,4,5,6,7,8].map(v=>v*scale).filter(v=>![14,36,20,48].includes(v))).slice(0,4),pair=r.shuffle([0,1,2,3]).slice(0,2).sort((a,b)=>a-b),answer=Math.abs(values[pair[0]]-values[pair[1]]);
  return make(`What is the difference between the numbers of bookmarks sold in ${labels[pair[0]]} and ${labels[pair[1]]}?`,answer,{type:'nanyang-p4',layout:'line-graph',title:'Bookmarks sold each month',labels,values,scale},'Read the two points using the vertical scale. Subtract the smaller value from the larger.',[{text:`Each horizontal grid interval represents ${scale} bookmarks.`,equation:`${labels[pair[0]]}: ${values[pair[0]]}; ${labels[pair[1]]}: ${values[pair[1]]}`},{text:'Find the difference.',equation:`${Math.max(values[pair[0]],values[pair[1]])} − ${Math.min(values[pair[0]],values[pair[1]])} = ${answer}`}],{unit:'bookmarks',proof:calc('-',Math.max(values[pair[0]],values[pair[1]]),Math.min(values[pair[0]],values[pair[1]]))});
 }
 if(group==='5'){
  const [n,d]=r.pick<Rat>([[2,5],[3,7],[5,8],[7,10],[5,12],[4,9]]),unit=r.pick(Array.from({length:79},(_,i)=>i+41).filter(u=>u*d!==954)),amount=unit*d,answer=unit*(d-n);
  return make('How much money remains?',answer,cards('Buy art materials',[{label:'Money at first',value:`$${amount}`,icon:'coin'},{label:'Fraction spent',value:f(n,d),icon:'pencil'}]),'Find the fraction left, then find that part of the starting money.',[{text:'Subtract the spent fraction from one whole.',equation:`1 − ${f(n,d)} = ${f(d-n,d)}`},{text:'Find one equal part of the money.',equation:`$${amount} ÷ ${d} = $${unit}`},{text:'Find the parts left.',equation:`$${unit} × ${d-n} = $${answer}`}],{unit:'dollars',proof:calc('*',calc('/',amount,d),d-n)});
 }
 if(group==='6'){
  let fractions:Rat[],pairs:number[][];
  do{fractions=r.shuffle(bagFractions).slice(0,3);pairs=[[0,1],[0,2],[1,2]].filter(([a,b])=>fractions[a][0]/fractions[a][1]+fractions[b][0]/fractions[b][1]>1+1e-9);}while(pairs.length!==1);
  const labels=['P','Q','R'],picture=cards('Three empty bags',fractions.map(([n,d],i)=>({label:`Bag ${labels[i]}`,value:`${f(n,d)} kg`,icon:'bag'})));
  if(part==='6a'){
   const pair=pairs[0],answer=pair.map(i=>labels[i]).join(' and '),equations=[[0,1],[0,2],[1,2]].map(([a,b])=>{const [an,ad]=fractions[a],[bn,bd]=fractions[b],sum=an*bd+bn*ad,den=ad*bd;return `Bags ${labels[a]} and ${labels[b]}: ${f(an,ad)} + ${f(bn,bd)} = ${mixed(sum,den)} kg ${sum>den?'>':'≤'} 1 kg`;});
   return make('Which two empty bags together have a mass greater than 1 kg?',answer,picture,'Compare the sum of each pair with one whole kilogram.',equations.map(equation=>({text:'Add a pair of masses using a common denominator.',equation})),{choices:r.shuffle(['P and Q','P and R','Q and R'])});
  }
  const sorted=fractions.map(([n,d],i)=>({value:n/d,i})).sort((a,b)=>a.value-b.value),chosen=sorted[1].i,[n,d]=fractions[chosen],whole=r.pick([2,4,5]),answer=mixed(whole*d-n,d);
  return make('What is the mass of the tablet?',answer,picture,'The total includes both the empty bag and the tablet.',[{text:'Remove the empty bag’s mass from the combined mass.',equation:`${whole} − ${f(n,d)} = ${mixed(whole*d-n,d)} kg`},{text:'Check that the two masses make the stated total.',equation:`${answer} + ${f(n,d)} = ${whole} kg`}],{context:[`A tablet is placed in Bag ${labels[chosen]}. The bag and tablet together have a mass of ${whole} kg.`],unit:'kg',proof:calc('-',whole,calc('/',n,d))});
 }
 if(group==='7'){
  let a:number,d:number,b:number,small:number,top:number;
  do{d=r.pick([6,8,10,12]);small=d/2;a=r.int(Math.ceil(d*.6),d-1);b=r.int(1,small-1);top=2*a-2*b;}while(gcd(a,d)!==1||gcd(b,small)!==1||top<=d||top>=2*d||(a===7&&d===10&&b===1));
  const answer=mixed(top,d),first=f(a,d),difference=f(b,small),second=f(a-2*b,d);
  return make('How many litres do Mina and Dev drink altogether? Give a mixed number.',answer,cards('Water after sports',[{label:'Mina drinks',value:`${first} ℓ`,icon:'water'},{label:'Mina drinks more than Dev',value:`${difference} ℓ`}]),'Find Dev’s amount first. Then add both children’s amounts.',[{text:'Dev drinks less, so subtract the difference.',equation:`${first} − ${difference} = ${second} ℓ`},{text:'Combine both amounts.',equation:`${first} + ${second} = ${f(top,d)} ℓ`},{text:'Separate the complete litre and the part left.',equation:`${f(top,d)} = ${answer} ℓ`}],{unit:'litres',requireMixed:true,proof:calc('+',calc('/',a,d),calc('-',calc('/',a,d),calc('/',b,small)))});
 }
 if(group==='8'){
  const {a,gap,next}=r.pick(ropeVariants),lcm=a[1]*gap[1]/gcd(a[1],gap[1]),at=a[0]*lcm/a[1],gt=gap[0]*lcm/gap[1],bt=at-gt,ct=bt+next[0]*lcm/next[1];
  const picture=cards('Three craft cords',[{label:'Cord J · longest',value:`${f(...a)} m`,icon:'ribbon'},{label:'J is longer than K by',value:`${f(...gap)} m`},...(part==='8b'?[{label:'K · shortest',value:`L is ${f(...next)} m longer`}]:[])]);
  const steps=[{text:'K is shorter than J. Subtract their difference.',equation:`${f(...a)} − ${f(...gap)} = ${at}/${lcm} − ${gt}/${lcm} = ${f(bt,lcm)} m`}];
  if(part==='8a')return make('What is the length of Cord K? Give the simplest fraction.',f(bt,lcm),picture,'Use equal-sized fraction parts before subtracting.',steps,{unit:'m',requireSimplified:true,proof:calc('-',calc('/',a[0],a[1]),calc('/',gap[0],gap[1]))});
  return make('What is the length of Cord L?',f(ct,lcm),picture,'Find Cord K first. Cord L is longer than K, so add the second difference.',[...steps,{text:'Add the difference between K and L.',equation:`${f(bt,lcm)} + ${f(...next)} = ${f(ct,lcm)} m`},{text:'Check the order: J is longest and K is shortest.',equation:`${f(bt,lcm)} < ${f(ct,lcm)} < ${f(...a)}`}],{unit:'m',proof:calc('+',calc('-',calc('/',a[0],a[1]),calc('/',gap[0],gap[1])),calc('/',next[0],next[1]))});
 }
 const denominator=r.pick([8,9,10,11,12]),first=r.pick([3,4]),rest=r.pick([1,2].filter(v=>denominator-first-v>v)),second=denominator-first-rest,unit=r.pick([35,45,55,65,75,85,95,105].filter(u=>u*denominator!==840)),difference=(second-rest)*unit;
 const picture=cards('School fair crafts',[{label:'Paper fans',value:f(first,denominator),icon:'ribbon'},{label:'Bookmarks',value:f(second,denominator),icon:'book'},{label:'Badges',value:'the rest',icon:'ticket'}]);
 const remaining=f(rest,denominator),diffFrac=f(second-rest,denominator),whole=unit*denominator,answer=part==='9a'?first*unit:whole;
 const bars:PaperPicture={type:'paper',layout:'bars',heading:'Use equal units',caption:'Every box represents the same number of crafts.',rows:[{label:'Fans',parts:Array.from({length:first},()=>({size:1,label:'?'}))},{label:'Bookmarks',parts:Array.from({length:second},()=>({size:1,label:'?'}))},{label:'Badges',parts:Array.from({length:rest},()=>({size:1,label:'?'}))}]};
 return make(part==='9a'?'How many paper fans are there?':'How many crafts are there altogether?',answer,picture,'Find the fraction for badges. Use the difference to find one equal unit.',[{text:'Find the fraction that is badges.',equation:`1 − ${f(first,denominator)} − ${f(second,denominator)} = ${remaining}`},{text:'Compare bookmarks with badges.',equation:`${f(second,denominator)} − ${remaining} = ${diffFrac}`,picture:bars},{text:`${second-rest} equal units represent ${difference} crafts.`,equation:`${difference} ÷ ${second-rest} = ${unit}`},{text:part==='9a'?`Paper fans use ${first} equal units.`:`The whole uses ${denominator} equal units.`,equation:`${unit} × ${part==='9a'?first:denominator} = ${answer}`}],{context:['The fractions shown are parts of all the crafts.',`There are ${difference} more bookmarks than badges.`],unit:part==='9a'?'paper fans':'crafts',proof:calc('*',calc('/',difference,second-rest),part==='9a'?first:denominator)});
}
