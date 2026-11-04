import {Rng,hashString} from '../engine/random';
import type {Activity} from './catalog';
import type {Picture,Proof,Question} from './generate';
import type {PaperPicture} from './paperPicture';
import {PAPER_PATTERNS} from './paperCatalog';
import {makeP3PaperQuestion} from './paperP3';

type Step=NonNullable<Question['workedSteps']>[number];
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const fmt=(value:number)=>Number(value.toFixed(6)).toString();
const dollars=(value:number)=>`$${value.toFixed(2)}`;
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards'],caption?:string):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items,caption});

/** A mixed set visits all six families, independently of the order questions are opened. */
export function paperParameter(activity:Activity,seed:number,index=0):string{
 if(activity.parameter&&activity.parameter!=='mixed')return activity.parameter;
 const patterns=PAPER_PATTERNS.filter(p=>p.level===activity.level);
 if(!patterns.length)throw new Error(`No paper practice for P${activity.level}`);
 const offset=hashString(`${activity.id}:${seed}:paper-mix-v1`)%patterns.length;
 return patterns[((offset+index)%patterns.length+patterns.length)%patterns.length].parameter;
}

/** Fresh illustrations and wording, based on mathematical structures observed in school papers. */
export function makePaperQuestion(activity:Activity,seed:number,index=0):Question{
 const parameter=paperParameter(activity,seed,index);
 if(parameter.startsWith('p3-'))return makeP3PaperQuestion({...activity,parameter},seed,index);
 const r=new Rng(hashString(`${activity.id}:${seed}:${index}:${parameter}:paper-v1`));
 const make=(prompt:string,answer:number|string,picture:Picture,hint:string,steps:Step[],proof:Proof,extra:Partial<Question>={}):Question=>({
  key:`${activity.id}:${seed}:${index}`,prompt,answer:typeof answer==='number'?fmt(answer):answer,picture,hint,workedSteps:steps,
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),proof,...extra,
 });
 const choices=(answer:number,wrong:number[])=>r.shuffle([...new Set([answer,...wrong])].slice(0,4)).map(fmt);
 switch(parameter){
  case 'p1-count':{
   const n=r.int(3,12),picture=cards('The picnic basket',[{label:'Apples',value:'Count them',icon:'fruit',count:n}]);
   return make('How many apples can you see?',n,picture,'Touch each apple once as you count.',[
    {text:'Start with one apple. Point to each apple in turn.',picture},
    {text:'Say one number for each apple.',equation:Array.from({length:n},(_,i)=>i+1).join(', '),picture},
    {text:'The last number tells us how many apples there are.',equation:`${n} apples`,picture},
   ],n,index%2===0?{choices:choices(n,[n-1,n+1,n+2])}:{});
  }
  case 'p1-more':{
   const a=r.int(5,12),b=r.int(2,a-1),picture=cards('Two picnic plates',[
    {label:'Lina',value:'Apples',icon:'fruit',count:a},{label:'Noor',value:'Apples',icon:'fruit',count:b},
   ]);
   return make('How many more apples does Lina have?',a-b,picture,'Match one of Lina’s apples with each of Noor’s apples.',[
    {text:'Count Lina’s apples, then Noor’s apples.',equation:`Lina: ${a}. Noor: ${b}.`,picture},
    {text:'Match the same number on both plates. Lina’s unmatched apples are the difference.',equation:`${a} − ${b} = ${a-b}`,picture},
    {text:`Lina has ${a-b} more apples. Add that difference to Noor’s plate to check.`,equation:`${b} + ${a-b} = ${a}`,picture},
   ],op('-',a,b),{unit:'apples'});
  }
  case 'p1-missing':{
   const visible=r.int(3,9),hidden=r.int(2,9),total=visible+hidden;
   const picture:PaperPicture={type:'paper',layout:'bars',heading:'Apples for the picnic',totalLabel:`${total} apples altogether`,rows:[
    {label:'Two parts',parts:[{size:1,label:`On the plate: ${visible}`,tone:'blue'},{size:1,label:'In the bag: ?',tone:'orange'}]},
   ],caption:'Diagram not to scale.'};
   const revealed=cards('The whole and its parts',[{label:'On the plate',value:String(visible),icon:'fruit',count:visible},{label:'Inside the bag',value:String(hidden),icon:'fruit',count:hidden}]);
   return make('How many apples are in the bag?',hidden,picture,'The plate and bag together make the whole. Take away the part we know.',[
    {text:'The whole is all the apples on the plate and in the bag.',equation:`${visible} + ? = ${total}`,picture},
    {text:'Take away the apples already on the plate.',equation:`${total} − ${visible} = ${hidden}`,picture:revealed},
    {text:'Join the two parts again to check.',equation:`${visible} + ${hidden} = ${total}`,picture:revealed},
   ],op('-',total,visible),{unit:'apples'});
  }
  case 'p1-join':{
   const first=r.int(3,7),second=10-first,third=r.int(2,8),parts=r.shuffle([first,second,third]);
   const picture:Picture={type:'parts',parts};
   const firstIndex=parts.indexOf(first),secondIndex=parts.findIndex((n,i)=>n===second&&i!==firstIndex);
   const joined:Picture={type:'parts',parts,joined:[firstIndex,secondIndex],reveal:true};
   return make('How many picnic treats are there altogether?',10+third,picture,'Look for two groups that make ten. Then add the group left over.',[
    {text:'There are three groups. We need all three.',equation:parts.join(' + '),picture},
    {text:'Join these two groups to make ten.',equation:`${first} + ${second} = 10`,picture:joined},
    {text:'Add the third group to ten.',equation:`10 + ${third} = ${10+third}`,picture:{type:'parts',parts,joined:[0,1,2],reveal:true}},
   ],op('+',op('+',parts[0],parts[1]),parts[2]),{unit:'treats'});
  }
  case 'p1-left':{
   const total=r.int(5,12),removed=r.int(1,total-2),picture=cards('Snack time',[
    {label:'Crossed apples were eaten',value:'How many are left?',icon:'fruit',count:total,removed},
   ]);
   const after=cards('Apples left',[{label:'Not crossed out',value:String(total-removed),icon:'fruit',count:total-removed}]);
   return make('How many apples are left?',total-removed,picture,'Count only the apples that are not crossed out.',[
    {text:'Count all the apples, including the crossed-out ones.',equation:`Started with ${total}`,picture},
    {text:'The crossed-out apples were eaten. Take them away.',equation:`${total} − ${removed} = ${total-removed}`,picture:after},
    {text:'Check by counting the apples that remain.',equation:`${total-removed} apples left`,picture:after},
   ],op('-',total,removed),{unit:'apples'});
  }
  case 'p1-groups':{
   const groups=r.int(2,5),each=r.int(2,5),total=groups*each;
   const picture=cards('Equal picnic baskets',Array.from({length:groups},(_,i)=>({label:`Basket ${i+1}`,value:'Apples',icon:'fruit' as const,count:each})));
   return make('How many apples are in all the baskets?',total,picture,'Each basket has the same number. Count one basket, then add the equal groups.',[
    {text:'Count the apples in one basket.',equation:`${each} apples in each basket`,picture},
    {text:'Add one equal group for every basket.',equation:`${Array(groups).fill(each).join(' + ')} = ${total}`,picture},
    {text:'We can write repeated addition as multiplication.',equation:`${groups} × ${each} = ${total}`,picture},
   ],op('*',groups,each),{unit:'apples'});
  }
  case 'p2-groups':{
   const groups=r.int(3,9),each=r.pick([2,3,4,5,10]),total=groups*each;
   const picture=cards('Books for the class',[{label:'Equal bags',value:String(groups),icon:'bag'},{label:'Books in each bag',value:String(each),icon:'book',count:each}]);
   return make('How many books are packed altogether?',total,picture,'Multiply the number of bags by the books in each bag.',[
    {text:'Every bag contains the same number of books.',equation:`${each} books per bag`,picture},
    {text:'Count that group once for each bag.',equation:`${groups} × ${each} = ${total}`,picture},
    {text:'Check by sharing the total back into the bags.',equation:`${total} ÷ ${groups} = ${each}`,picture},
   ],op('*',groups,each),{unit:'books',...(index%2===0?{choices:choices(total,[groups+each,total-each,total+each])}:{})});
  }
  case 'p2-share':{
   const children=r.pick([2,3,4,5,10]),each=r.int(2,9),total=children*each;
   const picture=cards('Share equally',[{label:'Apples altogether',value:String(total),icon:'fruit'},{label:'Children',value:String(children),icon:'child',count:children}]);
   return make('How many apples does each child receive?',each,picture,'Share the whole equally. Each child must get the same number.',[
    {text:'Find the whole and the number of equal shares.',equation:`${total} apples for ${children} children`,picture},
    {text:'Divide to find one child’s share.',equation:`${total} ÷ ${children} = ${each}`,picture},
    {text:'Put all the equal shares back together to check.',equation:`${children} × ${each} = ${total}`,picture},
   ],op('/',total,children),{unit:'apples'});
  }
  case 'p2-before':{
   const boxes=r.int(3,9),each=r.pick([3,4,5,10]),total=boxes*each,added=r.int(2,Math.min(12,total-3));
   const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Packing pencils',points:[
    {label:'Started with ?',icon:'pencil'},{label:`${boxes} full boxes`,icon:'box'},
   ],gaps:[`${added} pencils added`],caption:`Each box holds ${each} pencils. No pencils are left over.`};
   return make('How many pencils were there at the start?',total-added,picture,'Find the packed total first. Undo the pencils that were added.',[
    {text:'Find how many pencils are in all the boxes.',equation:`${boxes} × ${each} = ${total}`,picture},
    {text:'Some pencils arrived later. Subtract those to find the starting amount.',equation:`${total} − ${added} = ${total-added}`,picture},
    {text:'Check by adding the delivery back.',equation:`${total-added} + ${added} = ${total}`,picture},
   ],op('-',op('*',boxes,each),added),{unit:'pencils'});
  }
  case 'p2-fraction':{
   const d=r.pick([4,5,6,8,10,12]),a=r.int(1,d-2),b=r.int(1,d-a-1),answer=`${a+b}/${d}`;
   const picture=cards('Parts of one ribbon',[{label:'Blue part',value:`${a}/${d}`,icon:'ribbon'},{label:'Orange part',value:`${b}/${d}`,icon:'ribbon'}],'The two parts do not overlap. Both fractions refer to the same whole ribbon.');
   return make('What fraction of the ribbon is coloured altogether?',answer,picture,'The parts are the same size. Add their counts and keep the denominator.',[
    {text:'Both fractions count equal parts of the same whole.',equation:`Each part is 1/${d}`,picture},
    {text:'Add the number of coloured parts.',equation:`${a} + ${b} = ${a+b}`,picture},
    {text:'The whole still has the same number of equal parts.',equation:`${a}/${d} + ${b}/${d} = ${a+b}/${d}`,picture:{type:'fraction',parts:d,filled:a+b}},
   ],op('+',op('/',a,d),op('/',b,d)));
  }
  case 'p2-shade':{
   const d=r.pick([4,5,6,8,10,12]),shaded=r.int(1,d-2),target=r.int(shaded+1,d-1),picture:Picture={type:'fraction',parts:d,filled:shaded};
   return make(`How many more parts must be shaded to show ${target}/${d}?`,target-shaded,picture,'Count the shaded parts now. Compare that count with the numerator of the goal.',[
    {text:'The denominator tells us how many equal parts make the whole.',equation:`${d} equal parts`,picture},
    {text:'Count how many parts are already shaded.',equation:`${shaded} parts shaded`,picture},
    {text:'Subtract the shaded count from the target count.',equation:`${target} − ${shaded} = ${target-shaded}`,picture:{type:'fraction',parts:d,filled:target}},
   ],op('-',target,shaded),{unit:'parts'});
  }
  case 'p2-bottles':{
   const each=r.pick([2,3,4,5]),bottles=r.int(3,9),volume=each*bottles;
   const picture=cards('Refill station',[{label:'Water in the tank',value:`${volume} litres`,icon:'water'},{label:'Each bottle holds',value:`${each} litres`,icon:'water'}],'Fill every bottle completely.');
   return make('How many bottles can be filled?',bottles,picture,'Count how many equal bottlefuls fit into the tank’s water.',[
    {text:'Each full bottle uses the same volume.',equation:`${each} litres per bottle`,picture},
    {text:'Divide the water by the volume of one bottle.',equation:`${volume} ÷ ${each} = ${bottles}`,picture},
    {text:'Check that all the filled bottles use exactly the water available.',equation:`${bottles} × ${each} = ${volume} litres`,picture},
   ],op('/',volume,each),{unit:'bottles'});
  }
  case 'p4-round':{
   const place=r.pick([10,100,1000]),n=r.int(12,89)*place+r.int(1,place-1),low=Math.floor(n/place)*place,answer=Math.round(n/place)*place;
   const picture=cards('Visitors this month',[{label:'Exact attendance',value:n.toLocaleString('en-SG'),icon:'ticket'},{label:'Round to nearest',value:place.toLocaleString('en-SG'),icon:'number'}]);
   return make('What is the rounded attendance?',answer,picture,'Find the two neighbouring multiples. Choose the nearer one; halfway rounds up.',[
    {text:'Place the number between neighbouring multiples.',equation:`${low} < ${n} < ${low+place}`,picture},
    {text:'Compare with the halfway point.',equation:`Halfway = ${low+place/2}`,picture},
    {text:n<low+place/2?'The count is below halfway, so round down.':'The count is halfway or higher, so round up.',equation:`${n} → ${answer}`,picture},
   ],{op:'round',a:n,b:place},index%2===0?{choices:choices(answer,[low,low+place,answer+place,Math.max(0,answer-place)])}:{});
  }
  case 'p4-decimal':{
   const whole=r.int(1,8),d=r.pick([2,4,5,10,20,25,50]),n=r.int(1,d-1),answer=whole+n/d;
   const picture=cards('Ribbon length',[{label:'Whole metres',value:String(whole),icon:'ribbon'},{label:'Extra metre',value:`${n}/${d}`,icon:'ribbon'}]);
   return make('Write the total length as a decimal.',answer,picture,'Change the fractional part to hundredths, then add the whole metres.',[
    {text:'Make an equivalent fraction with denominator 100.',equation:`${n}/${d} = ${n*(100/d)}/100`,picture},
    {text:'Write the hundredths as a decimal.',equation:`${n*(100/d)}/100 = ${(n/d).toFixed(2)}`,picture},
    {text:'Include the whole metres.',equation:`${whole} + ${(n/d).toFixed(2)} = ${fmt(answer)}`,picture},
   ],op('+',whole,op('/',n,d)),{unit:'m'});
  }
  case 'p4-share':{
   const albums=r.int(3,9),each=r.int(21,126),reserved=r.int(15,96),total=albums*each+reserved;
   const picture=cards('Organise the stamp collection',[{label:'All stamps',value:String(total),icon:'ticket'},{label:'Keep aside',value:String(reserved),icon:'ticket'},{label:'Equal albums',value:String(albums),icon:'book'}]);
   return make('How many stamps go in each album?',each,picture,'The stamps kept aside are not shared. Subtract them before dividing.',[
    {text:'Remove the stamps reserved for later.',equation:`${total} − ${reserved} = ${total-reserved}`,picture},
    {text:'Share the remaining stamps equally among the albums.',equation:`${total-reserved} ÷ ${albums} = ${each}`,picture},
    {text:'Check the albums and reserved stamps make the original total.',equation:`${albums} × ${each} + ${reserved} = ${total}`,picture},
   ],op('/',op('-',total,reserved),albums),{unit:'stamps'});
  }
  case 'p4-factor':{
   const common=r.pick([2,3,4,5,6,7,8]),a=common*r.int(3,10),b=common*r.int(3,10);
   const wrong=r.shuffle(Array.from({length:19},(_,i)=>i+2).filter(n=>a%n!==0||b%n!==0)).slice(0,3);
   const picture=cards('Equal packs with nothing left',[{label:'Blue stickers',value:String(a),icon:'ticket'},{label:'Green stickers',value:String(b),icon:'ticket'}],'Pack each colour separately. Every pack must have the same number of stickers.');
   return make('Which number of stickers per pack works for both colours?',common,picture,'A common factor divides both totals without a remainder.',[
    {text:'Test whether the selected pack size divides the blue total exactly.',equation:`${a} ÷ ${common} = ${a/common}`,picture},
    {text:'Test the green total with the same pack size.',equation:`${b} ÷ ${common} = ${b/common}`,picture},
    {text:'Both divisions have no remainder, so this pack size works for both colours.',equation:`${common} is a common factor`,picture},
   ],common,{choices:r.shuffle([common,...wrong]).map(String)});
  }
  case 'p4-perimeter':{
   const a=r.int(10,24),b=r.int(5,9),cut=r.int(2,b-2),answer=2*(a+b),picture:Picture={type:'area',a,b,cut};
   return make('What is the perimeter of this corner-cut garden?',answer,picture,'Trace the boundary. The corner cut removes two lengths and adds two equal lengths.',[
    {text:'Add the horizontal edges, including the edge inside the cut.',equation:`${a} + ${a-cut} + ${cut} = ${2*a} cm`,picture},
    {text:'Add the vertical edges, including the edge inside the cut.',equation:`${b} + ${b-cut} + ${cut} = ${2*b} cm`,picture},
    {text:'Join the horizontal and vertical distances.',equation:`${2*a} + ${2*b} = ${answer} cm`,picture},
   ],op('*',2,op('+',a,b)),{unit:'cm'});
  }
  case 'p4-freebie':{
   const paid=r.int(2,4),offers=r.int(3,12),price=r.int(2,8),total=(paid+1)*offers,cost=paid*offers*price;
   const picture=cards('Book-fair offer',[{label:'Pay for',value:`${paid} books`,icon:'book'},{label:'Get free',value:'1 book',icon:'book'},{label:'Each paid book',value:dollars(price),icon:'coin'},{label:'Books taken home',value:String(total),icon:'bag'}],'The offer repeats for every complete paid group.');
   return make('How much was paid for these books?',cost,picture,'One complete offer includes paid books and a free book. Count offers before calculating the cost.',[
    {text:'Include the free book when counting books per offer.',equation:`${paid} + 1 = ${paid+1} books`,picture},
    {text:'Count the complete offers.',equation:`${total} ÷ ${paid+1} = ${offers}`,picture},
    {text:'Only the paid books cost money.',equation:`${offers} × ${paid} × ${dollars(price)} = ${dollars(cost)}`,picture},
   ],op('*',op('*',op('/',total,paid+1),paid),price),{unit:'dollars'});
  }
  case 'p5-convert':{
   const kg=r.int(2,8),grams=r.int(11,99)*10,answer=kg+grams/1000;
   const picture=cards('Weigh the parcel',[{label:'Whole kilograms',value:String(kg),icon:'box'},{label:'Extra grams',value:String(grams),icon:'number'}]);
   return make('What is the parcel’s mass in kilograms?',answer,picture,'One kilogram is 1000 grams. Convert the extra grams before adding.',[
    {text:'Convert the smaller unit to kilograms.',equation:`${grams} ÷ 1000 = ${fmt(grams/1000)} kg`,picture},
    {text:'Add the whole kilograms.',equation:`${kg} + ${fmt(grams/1000)} = ${fmt(answer)} kg`,picture},
    {text:'Check by converting the complete mass back to grams.',equation:`${fmt(answer)} × 1000 = ${kg*1000+grams} g`,picture},
   ],op('+',kg,op('/',grams,1000)),{unit:'kg'});
  }
  case 'p5-percent':{
   const parts=r.pick([4,5,10,20,25]),filled=r.int(1,parts-1),answer=filled/parts*100,picture:Picture={type:'fraction',parts,filled};
   return make('What percentage of the mosaic is shaded?',answer,picture,'Count shaded and total parts. Express the fraction as parts out of 100.',[
    {text:'Count the shaded parts and all the equal parts.',equation:`${filled} out of ${parts}`,picture},
    {text:'Scale the fraction so the whole has 100 parts.',equation:`${filled}/${parts} = ${filled*(100/parts)}/100`,picture},
    {text:'A number out of 100 is the percentage.',equation:`${fmt(answer)}%`,picture},
   ],op('*',op('/',filled,parts),100),{unit:'%',...(index%2===0?{choices:choices(answer,[filled,parts,100-answer,answer+5])}:{})});
  }
  case 'p5-equivalent':{
   const d=r.int(3,9),n=r.int(1,d-1),k=r.int(2,5),missingDenominator=index%2===1,answer=(missingDenominator?d:n)*k;
   const picture=cards('Keep the fraction equal',[
    {label:'First fraction',value:`${n}/${d}`,icon:'ribbon'},
    {label:'Equivalent fraction',value:missingDenominator?`${n*k}/?`:`?/${d*k}`,icon:'ribbon'},
   ]);
   return make('What number replaces the question mark?',answer,picture,'Numerator and denominator must be multiplied by the same number.',[
    {text:'Use the pair of known terms to find the multiplier.',equation:missingDenominator?`${n*k} ÷ ${n} = ${k}`:`${d*k} ÷ ${d} = ${k}`,picture},
    {text:'Apply that multiplier to the other term.',equation:`${missingDenominator?d:n} × ${k} = ${answer}`,picture},
    {text:'Check that both terms changed by the same factor.',equation:`${n}/${d} = ${n*k}/${d*k}`,picture},
   ],op('*',missingDenominator?d:n,k));
  }
  case 'p5-triangle':{
   const base=r.int(4,14)*2,height=r.int(3,14),answer=base*height/2;
   const picture:Picture={type:'shape',shape:'triangle',labels:[`${base} cm`,`${height} cm`]};
   return make('What is the area of this triangle?',answer,picture,'Use the marked perpendicular height, not a sloping side.',[
    {text:'Match the base to its perpendicular height.',equation:`Base = ${base} cm; height = ${height} cm`,picture},
    {text:'A rectangle with this base and height has twice the triangle’s area.',equation:`${base} × ${height} = ${base*height} cm²`,picture},
    {text:'Take half of that area.',equation:`${base*height} ÷ 2 = ${answer} cm²`,picture},
   ],op('/',op('*',base,height),2),{unit:'cm²'});
  }
  case 'p5-water':{
   const a=r.int(2,6)*10,b=r.int(2,5)*10,c=r.int(2,5)*10,d=r.pick([2,4,5]),n=r.int(1,d-1);
   const capacity=a*b*c,answer=capacity*(d-n)/d,picture:Picture={type:'solid',shape:'cuboid',a,b,c};
   const remaining:PaperPicture={type:'paper',layout:'bars',heading:'The tank’s capacity',rows:[{label:'Whole tank',parts:[
    {size:n,label:`Filled: ${n}/${d}`,tone:'blue'},{size:d-n,label:`Empty: ${d-n}/${d}`,tone:'orange'},
   ]}]};
   return make('How much more water fills the tank completely?',answer,picture,'Find the full capacity, then find the fraction that is still empty.',[
    {text:'Multiply the three dimensions to find full capacity.',equation:`${a} × ${b} × ${c} = ${capacity} cm³`,picture},
    {text:'The unfilled fraction is what remains of one whole.',equation:`1 − ${n}/${d} = ${d-n}/${d}`,picture:remaining},
    {text:'Find that fraction of the capacity. One cubic centimetre holds one millilitre.',equation:`${capacity} ÷ ${d} × ${d-n} = ${answer} ml`,picture:remaining},
   ],op('*',op('/',op('*',op('*',a,b),c),d),op('-',d,n)),{unit:'ml',display:`Tank filled: ${n}/${d} of its capacity`});
  }
  case 'p5-bundles':{
   const first=r.int(2,5),extra=r.int(2,6),second=first+extra,bag=r.int(4,15),price=r.int(2,8),costA=bag+first*price,costB=bag+second*price;
   const picture=cards('Two purchases at the same shop',[
    {label:`1 bag + ${first} pencils`,value:dollars(costA),icon:'bag'},
    {label:`1 bag + ${second} pencils`,value:dollars(costB),icon:'bag'},
   ],'All bags have the same price. All pencils have the same price.');
   const difference=cards('Only the extra pencils differ',[{label:'Extra pencils',value:String(extra),icon:'pencil'},{label:'Extra cost',value:dollars(costB-costA),icon:'coin'}]);
   return make('What is the price of one pencil?',price,picture,'Both purchases include the same bag. The difference pays only for extra pencils.',[
    {text:'Compare the number of pencils in the two purchases.',equation:`${second} − ${first} = ${extra}`,picture},
    {text:'Subtract the costs. The equal bag cost cancels.',equation:`${dollars(costB)} − ${dollars(costA)} = ${dollars(costB-costA)}`,picture:difference},
    {text:'Share the extra cost equally among the extra pencils.',equation:`${dollars(costB-costA)} ÷ ${extra} = ${dollars(price)}`,picture:difference},
   ],op('/',op('-',costB,costA),op('-',second,first)),{unit:'dollars'});
  }
  case 'p6-ratio':{
   const a=r.int(2,5),b=r.int(3,7),unit=r.int(6,25),total=(a+b)*unit;
   const picture:PaperPicture={type:'paper',layout:'bars',heading:`Lina : Noor = ${a} : ${b}`,totalLabel:`${total} beads altogether`,rows:[
    {label:'Lina',parts:Array.from({length:a},()=>({size:1,label:'?',tone:'blue' as const}))},
    {label:'Noor',parts:Array.from({length:b},()=>({size:1,label:'?',tone:'green' as const}))},
   ],caption:'Every small box represents one equal ratio part.'};
   return make('How many beads does Noor receive?',b*unit,picture,'Count all the ratio parts. Find one part, then Noor’s parts.',[
    {text:'Add the two numbers in the ratio.',equation:`${a} + ${b} = ${a+b} parts`,picture},
    {text:'Share the total among all equal ratio parts.',equation:`${total} ÷ ${a+b} = ${unit}`,picture},
    {text:'Noor receives this many equal parts.',equation:`${b} × ${unit} = ${b*unit}`,picture},
   ],op('*',op('/',total,op('+',a,b)),b),{unit:'beads'});
  }
  case 'p6-change':{
   const old=r.int(2,15)*20,pct=r.pick([5,10,15,20,25,30,40,50]),increase=r.chance(.5),now=old*(100+(increase?pct:-pct))/100;
   const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Shop price',points:[
    {label:`Before: ${dollars(old)}`,icon:'ticket'},{label:`After: ${dollars(now)}`,icon:'ticket'},
   ],gaps:[increase?'Price increased':'Price decreased']};
   return make(`What is the percentage ${increase?'increase':'decrease'}?`,pct,picture,'Compare the change with the original price, not the new price.',[
    {text:'Find the amount of the change.',equation:`${dollars(Math.max(old,now))} − ${dollars(Math.min(old,now))} = ${dollars(Math.abs(now-old))}`,picture},
    {text:'Divide that change by the original amount.',equation:`${fmt(Math.abs(now-old))} ÷ ${old} = ${fmt(pct/100)}`,picture},
    {text:'Express the fraction of the original as a percentage.',equation:`${fmt(pct/100)} × 100 = ${pct}%`,picture},
   ],op('*',op('/',op('-',Math.max(old,now),Math.min(old,now)),old),100),{unit:'%'});
  }
  case 'p6-algebra':{
   const multiplier=r.int(3,9),bonus=r.int(4,18),x=r.int(3,12),answer=multiplier*x+bonus;
   const picture:PaperPicture={type:'paper',layout:'timeline',heading:`Expression: ${multiplier}x + ${bonus}`,points:[
    {label:`x = ${x}`,icon:'number'},{label:'Multiply',icon:'number'},{label:'Add',icon:'number'},
   ],gaps:[`× ${multiplier}`,`+ ${bonus}`]};
   return make('What value comes out of the expression machine?',answer,picture,'Replace x with its value. Complete multiplication before addition.',[
    {text:'Substitute the given value for x.',equation:`${multiplier} × ${x} + ${bonus}`,picture},
    {text:'Multiply before adding.',equation:`${multiplier} × ${x} = ${multiplier*x}`,picture},
    {text:'Add the remaining term.',equation:`${multiplier*x} + ${bonus} = ${answer}`,picture},
   ],op('+',op('*',multiplier,x),bonus),index%2===0?{choices:choices(answer,[(multiplier+bonus)*x,multiplier+x+bonus,multiplier*x-bonus])}:{});
  }
  case 'p6-average':{
   const average=r.int(15,40),a=average-r.int(2,7),b=average+r.int(2,7),c=average-r.int(1,5),answer=4*average-a-b-c;
   const picture=cards('Pages read over four days',[
    {label:'Monday',value:String(a),icon:'book'},{label:'Tuesday',value:String(b),icon:'book'},
    {label:'Wednesday',value:String(c),icon:'book'},{label:'Thursday',value:'?',icon:'book'},
   ],`Average: ${average} pages per day over all four days.`);
   return make('How many pages were read on Thursday?',answer,picture,'An average gives the equal share. Multiply by all four days to recover the total.',[
    {text:'Find the total number of pages for all four days.',equation:`${average} × 4 = ${average*4}`,picture},
    {text:'Add the three known daily counts.',equation:`${a} + ${b} + ${c} = ${a+b+c}`,picture},
    {text:'The missing day is the remainder of the total.',equation:`${average*4} − ${a+b+c} = ${answer}`,picture},
   ],op('-',op('*',average,4),op('+',op('+',a,b),c)),{unit:'pages'});
  }
  case 'p6-charge':{
   const block=r.pick([10,15,20,30]),whole=r.int(1,5),extra=whole*block+(index%3===0?0:r.int(1,block-1));
   const minutes=60+extra,first=r.int(3,8),rate=r.int(1,4),blocks=Math.ceil(extra/block),answer=first+blocks*rate;
   const picture=cards('Play-space ticket',[{label:'First 60 minutes',value:dollars(first),icon:'ticket'},
    {label:`Each extra ${block} minutes or part`,value:dollars(rate),icon:'coin'},
    {label:'Time spent',value:`${minutes} minutes`,icon:'clock'},
   ],'After the first hour, every started block is charged in full.');
   return make('What is the total ticket charge?',answer,picture,'Remove the first hour. Any incomplete extra block still costs one full block.',[
    {text:'Find the time beyond the first hour.',equation:`${minutes} − 60 = ${extra} minutes`,picture},
    {text:extra%block?'There is a partial final block, so include one more block.':'The extra time is an exact number of blocks.',equation:extra%block?`${extra} ÷ ${block} = ${whole} remainder ${extra%block}; ${blocks} blocks charged`:`${extra} ÷ ${block} = ${blocks} blocks`,picture},
    {text:'Add the first-hour charge to the extra-block charges.',equation:`${dollars(first)} + ${blocks} × ${dollars(rate)} = ${dollars(answer)}`,picture},
   ],op('+',first,op('*',op('/',{op:'floor',a:op('+',op('-',minutes,60),block-1),b:block},block),rate)),{unit:'dollars'});
  }
  case 'p6-redistribute':{
   const before=r.int(6,12),removed=r.int(1,3),after=before-removed,unit=r.int(3,9),each=after*unit,total=before*each,newEach=before*unit,answer=newEach-each;
   const picture:PaperPicture={type:'paper',layout:'timeline',heading:'Repack the beads equally',points:[
    {label:`${before} boxes, ${each} beads each`,icon:'box'},{label:`${removed} boxes removed`,icon:'box'},{label:'Repack into the remaining boxes',icon:'box'},
   ],gaps:['Keep every bead','Share equally'],caption:'Only empty boxes are removed. No beads are lost or added.'};
   return make('How many extra beads does each remaining box hold?',answer,picture,'The total stays the same. Find the new equal share, then compare it with the old share.',[
    {text:'Recover the number of beads, which does not change.',equation:`${before} × ${each} = ${total}`,picture},
    {text:'Count the boxes still available.',equation:`${before} − ${removed} = ${after}`,picture},
    {text:'Share the unchanged total among those boxes.',equation:`${total} ÷ ${after} = ${newEach}`,picture},
    {text:'Compare the new amount in each box with the old amount.',equation:`${newEach} − ${each} = ${answer}`,picture},
   ],op('-',op('/',op('*',before,each),op('-',before,removed)),each),{unit:'beads'});
  }
  default:throw new Error(`Unknown paper practice: ${parameter}`);
 }
}
