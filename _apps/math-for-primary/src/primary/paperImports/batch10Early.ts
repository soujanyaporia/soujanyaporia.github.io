import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch10EarlyPicture,Batch10EarlySolid} from './batch10EarlyPicture';
import {BATCH10_EARLY_PARTS} from './batch10EarlyMeta';
export {BATCH10_EARLY_PARTS,type Batch10EarlyPart} from './batch10EarlyMeta';
type Step=[string,string?];
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
const names=['kite','puzzle','toy boat','board game'];
const faceCounts:Record<Batch10EarlySolid,number>={cube:6,cuboid:6,cone:1,cylinder:2,sphere:0,'square pyramid':5};
/** Original numerical variants of selected source tasks. No source-paper completeness claim. */
export function makeBatch10Early(part:string,seed:number,index=0):Question{
 if(!BATCH10_EARLY_PARTS.some(p=>p.id===part))throw Error(`Unknown batch10 early pattern ${part}`);
 const r=new Rng(hashString(`batch10-early-original-v1:${part}:${seed}:${index}`));
 const make=(prompt:string,answer:string|number,context:string[],hint:string,steps:Step[],extra:Partial<Question>={}):Question=>({key:`batch10-early-${part}:${seed}:${index}`,prompt,answer:String(answer),context,hint,workedSteps:steps.map(([text,equation])=>({text,equation})),explanation:steps.map(s=>s.filter(Boolean).join(' ')).join(' '),...extra});
 if(part==='coin-exchange'){
  const exchanges=[2,5,10,20].flatMap(note=>[10,20,50,100].map(coin=>({note,coin}))).filter(({note,coin})=>note*100/coin<=100&&!(note===2&&coin===50)),{note,coin}=r.pick(exchanges),count=note*100/coin;
  return make('How many coins will she receive?',count,[`Lina exchanges one $${note} note for ${coin===100?'$1':`${coin}-cent`} coins of the same total value.`],
   'Count equal-value coins until their total matches the note.',[['Express the note value in cents.',`$${note} = ${note*100} cents`],['Make the same value using equal coins.',`${note*100} ÷ ${coin} = ${count}`]],{unit:'coins'});
 }
 if(part==='budget-item'||part==='known-item-partner'||part==='shop-pair-total'){
  const items=r.shuffle(names);let prices:number[],answer:string,context:string[],prompt:string,hint:string,steps:Step[],extra:Partial<Question>;
  if(part==='budget-item'){
   const notes=r.pick([2,3]),value=r.pick([2,5]),budget=notes*value,cheap=r.int(1,budget-1);prices=r.shuffle([cheap,budget+r.int(1,3),budget+r.int(4,7),budget+r.int(8,11)]);answer=items[prices.indexOf(cheap)];
   prompt='Which one item can she afford?';context=[`Hana has ${notes} $${value} notes. She has no other money.`];hint='Count the money first. An affordable price cannot be greater than that amount.';
   steps=[['Count the total value of the notes.',`${notes} × $${value} = $${budget}`],['Compare every price with the money available.',`Only the ${answer} costs no more than $${budget}.`]];extra={choices:items};
  }else if(part==='known-item-partner'){
   prices=r.shuffle([r.int(3,6),r.int(8,11),r.int(13,16),r.int(18,21)]);const known=r.int(0,3),other=r.pick([0,1,2,3].filter(i=>i!==known)),total=prices[known]+prices[other];answer=items[other];
   prompt='Which other item did he buy?';context=[`Ravi buys two different items for $${total} altogether. One is the ${items[known]}.`];hint='Remove the cost of the known item, then look for the remaining price.';
   steps=[['Find the price of the other item.',`$${total} − $${prices[known]} = $${prices[other]}`],['Match that price to the catalogue.',`The ${answer} costs $${prices[other]}.`]];extra={choices:items.filter((_,i)=>i!==known)};
  }else{
   let pairs:{a:number;b:number;sum:number}[]=[];let good:{a:number;b:number;sum:number}[]=[];
   do{prices=r.shuffle([r.int(3,6),r.int(8,11),r.int(13,16),r.int(18,21)]);pairs=prices.flatMap((a,i)=>prices.slice(i+1).map((b,j)=>({a:i,b:i+j+1,sum:a+b})));good=pairs.filter(p=>pairs.filter(other=>other.sum===p.sum).length===1);}while(!good.length);
   const chosen=r.pick(good);answer=JSON.stringify([items[chosen.a],items[chosen.b]]);prompt=`Which two different items cost $${chosen.sum} altogether?`;context=[];hint='Try one item, then find how much more is needed to reach the total.';
   steps=[['Find a price to go with one item.',`$${chosen.sum} − $${prices[chosen.a]} = $${prices[chosen.b]}`],['Check the selected pair.',`The ${items[chosen.a]} and ${items[chosen.b]} cost $${chosen.sum} altogether.`]];extra={structuredResponse:{kind:'named-pair',options:items}};
  }
  context.push(...items.map((item,i)=>`${item}: $${prices[i]}`));return make(prompt,answer,context,hint,steps,extra);
 }
 if(part==='graph-equal-pair'||part==='graph-extreme'){
  const labels=r.shuffle(['Asha','Ben','Chloe','Dan']),equal=part==='graph-equal-pair',base=r.int(2,5),values=equal?r.shuffle([base,base,base+1,base+3]):r.shuffle([base-1,base,base+2,base+3]);
  const picture:Question['picture']={type:'bars',labels,values,scale:1,pictures:true};
  if(equal){const selected=labels.filter((_,i)=>values[i]===base);return make('Which two children read the same number of books?',JSON.stringify(selected),['The picture graph shows books read. Each symbol represents 1 book.'],
   'Compare the symbol counts in every row.',[['Count the symbols for each child.',`${labels.map((label,i)=>`${label}: ${values[i]}`).join('; ')}`],['Find the two matching counts.',`${selected.join(' and ')} each read ${base} books.`]],{picture,structuredResponse:{kind:'named-pair',options:labels}});}
  const most=r.chance(.5),target=most?Math.max(...values):Math.min(...values),answer=labels[values.indexOf(target)];
  return make(`Who read the ${most?'most':'fewest'} books?`,answer,['The picture graph shows books read. Each symbol represents 1 book.'],
   `Compare all the symbol counts. Find the ${most?'largest':'smallest'} count.`,[['Count each row of symbols.',labels.map((label,i)=>`${label}: ${values[i]}`).join('; ')],['Match the requested count to its row label.',`${answer} read ${target} books, the ${most?'most':'fewest'}.`]],{picture,choices:labels});
 }
 if(part==='am-pm'){
  const period=r.pick(['morning','afternoon','evening'] as const),hour=period==='morning'?r.int(6,11):period==='afternoon'?r.int(1,5):r.int(6,9),minute=r.pick(['05','15','25','35','45','55']),answer=period==='morning'?'am':'pm';
  return make('Choose am or pm to complete the time.',answer,[`It is ${hour}:${minute} in the ${period}.`,`${hour}:${minute} ___`],
   'am is after midnight and before noon. pm is from noon until midnight.',[[`The stated part of the day is ${period}.`],[`Use ${answer} for this part of the day.`,`${hour}:${minute} ${answer}`]],{choices:['am','pm']});
 }
 if(part==='reverse-ordinal'){
  const count=r.int(8,10),right=r.int(2,count-2),left=count-right+1;
  return make(`The ${ordinal(right)} triangle from the right is in which position from the left?`,left,['Write the position number. Count the triangles in the row.'],
   'Count from the other end to the same triangle. Include that triangle in the count.',[['Count the triangles in the whole row.',`${count} triangles`],['Remove the triangles on its right, then count its position from the left.',`${count} − ${right} + 1 = ${left}`]],{picture:{type:'pattern',items:Array(count).fill('▲')}});
 }
 if(part==='distant-pattern'){
  const cycle=r.shuffle(['●','○','▲','□']),target=r.int(12,24),answer=cycle[(target-1)%4],inside=(target-1)%4+1;
  return make(`Which shape is in position ${target}?`,answer,['The shapes continue in the same repeating pattern. Read from left to right.'],
   'Find the repeating group. Count forward in complete groups of that size.',[['The four shapes form one repeating group.',cycle.join(' ')],['Find the position within its repeating group.',`Position ${target} has the same shape as position ${inside}: ${answer}`]],{picture:{type:'pattern',items:[...cycle,...cycle,'…']},choices:r.shuffle(cycle)});
 }
 if(part==='ticket-saving'){
  const adults=r.int(9,15),child=r.int(4,8),saving=r.int(1,child-1),bundle=adults+child-saving,families=r.pick([2,3]),separate=families*(adults+child),packages=families*bundle,totalSaving=separate-packages;
  return make('How much less do they pay by buying family packages?',totalSaving,[`${families} adults and ${families} children are going to a show.`,`Adult ticket: $${adults}. Child ticket: $${child}.`,`One family package covers 1 adult and 1 child and costs $${bundle}. They buy enough packages for everyone.`],
   'Compare the cost of separate tickets with the cost of the family packages.',[['Find the cost of all separate tickets.',`${families} × $${adults} + ${families} × $${child} = $${separate}`],['Find the cost using packages.',`${families} × $${bundle} = $${packages}`],['Compare the two costs.',`$${separate} − $${packages} = $${totalSaving}`]],{unit:'dollars'});
 }
 if(part==='solid-face-order'){
  const shapes=r.shuffle(r.pick([['cuboid','cylinder','square pyramid'],['cube','cylinder','cone'],['sphere','cone','cuboid']] as const)),objects=shapes.map((shape,i)=>({label:String.fromCharCode(65+i),shape})),ordered=[...objects].sort((a,b)=>faceCounts[a.shape]-faceCounts[b.shape]),answer=ordered.map(o=>o.label).join(','),picture:Batch10EarlyPicture={type:'batch10-early',layout:'solid-order',objects};
  return make('Arrange the objects from the fewest flat faces to the most flat faces.',answer,['Count all flat faces, including faces at the back and underneath. Curved surfaces are not flat faces.'],
   'Identify each solid and count its flat faces. Compare those counts.',[['Count every flat face.',objects.map(o=>`Object ${o.label}: ${faceCounts[o.shape]}`).join('; ')],['Arrange the object labels by increasing face count.',ordered.map(o=>o.label).join(' → ')]],{picture,order:r.shuffle(objects.map(o=>o.label))});
 }
 if(part==='solid-property'){
  const flat=r.int(0,2),answer=['sphere','cone','cylinder'][flat];
  return make('Which solid fits this description?',answer,[`It has 1 curved surface and ${flat} flat ${flat===1?'face':'faces'}. It can roll on its curved surface.`],
   'Check both the curved surface and the number of flat faces.',[['The curved surface rules out a cube and a cuboid.'],[`A ${answer} has ${flat} flat ${flat===1?'face':'faces'} and one curved surface.`,answer]],{choices:r.shuffle(['cone','cube','cylinder','sphere'])});
 }
 if(part==='undo-sale-double'){
  const sold=r.int(2,5),left=r.int(4,10),original=sold+left,total=2*original;
  return make('How many hamsters were in the shop?',total,[`At first, a pet shop had twice as many hamsters as rabbits.`,`${sold} rabbits were sold and ${left} rabbits were left. No hamsters were sold.`],
   'Recover the original rabbit count before using the twice-as-many clue.',[['Put back the rabbits that were sold.',`${left} + ${sold} = ${original}`],['Use the original comparison.',`2 × ${original} = ${total}`]],{unit:'hamsters'});
 }
 if(part==='double-share-total'){
  const small=r.int(4,15),total=small*3;
  return make('How much money does Amir receive?',small,[`Amir and Priya share $${total}. Priya receives twice as much money as Amir. All the money is shared.`],
   'Amir has one equal part. Priya has two of those same parts.',[['Find the total number of equal parts.','1 + 2 = 3'],['Find the value of Amir’s one part.',`$${total} ÷ 3 = $${small}`]],{unit:'dollars'});
 }
 if(part==='length-estimate'){
  const pencil=r.chance(.5),value=pencil?r.pick([16,18,20]):r.pick([25,28,30]),object=pencil?'a new standard writing pencil':'an ordinary adult shoe',answer=`${value} cm`,choices=r.shuffle([answer,`${value} m`,`${value*10} cm`,`${pencil?2:3} cm`]);
  return make(`Which is the most likely length of ${object}?`,answer,[],
   'Think about the size of the object. Check both the number and its unit.',[['A metre is much longer than a centimetre.','100 cm = 1 m'],[`An ordinary ${pencil?'new pencil':'adult shoe'} is measured in tens of centimetres, rather than a few centimetres or many metres.`,answer]],{choices});
 }
 if(part==='share-includes-owner'){
  const friends=r.int(3,9),people=friends+1;
  return make('What fraction of the whole cake does each person receive?',`1/${people}`,[`Mira shares one cake equally between herself and ${friends} friends. They share the whole cake.`],
   'Count Mira as well as every friend. Each person receives one equal part.',[['Count everyone who receives a share.',`${friends} + 1 = ${people}`],['Write one part out of all the equal parts.',`1/${people}`]]);
 }
 throw Error(`Unhandled batch10 early pattern ${part}`);
}
