import {Rng,hashString} from '../engine/random';
import type {Activity} from './catalog';
import type {Picture,Proof,Question} from './generate';
import type {PaperPicture} from './paperPicture';

export type CorpusPicture=
 |{type:'corpus';layout:'fraction-rows';rows:{label:string;parts:number;filled:number}[]}
 |{type:'corpus';layout:'rectangular-frame';outerWidth:number;outerHeight:number;border:number;unit:'m';showInner?:boolean}
 |{type:'corpus';layout:'equilateral-line';givenAngle:number;revealTriangle?:boolean;revealCombined?:boolean};
export type CorpusQuestion=Omit<Question,'picture'|'workedSteps'>&{picture:Picture|CorpusPicture;workedSteps:{text:string;equation?:string;picture?:Picture|CorpusPicture}[]};
type Step=CorpusQuestion['workedSteps'][number];
const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});
const cards=(heading:string,items:Extract<PaperPicture,{layout:'cards'}>['cards']):PaperPicture=>({type:'paper',layout:'cards',heading,cards:items});

/** Isolated until its renderer and catalogue metadata are explicitly integrated. */
export function makeCorpusPaperQuestion(activity:Activity,seed:number,index=0):CorpusQuestion{
 const r=new Rng(hashString(`${activity.id}:${seed}:${index}:corpus-v1`));
 const make=(prompt:string,answer:string|number,context:string[],picture:Picture|CorpusPicture,hint:string,workedSteps:Step[],proof:Proof,extra:Partial<CorpusQuestion>={}):CorpusQuestion=>({
  key:`${activity.id}:${seed}:${index}`,prompt,answer:String(answer),context,picture,hint,workedSteps,proof,
  explanation:workedSteps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),...extra,
 });
 switch(activity.parameter){
  case 'p1-pattern-gap':{
   const step=r.pick([1,2,5,10]),start=r.int(1,99-step*5),missing=r.pick([2,3]),values=Array.from({length:6},(_,i)=>start+i*step),answer=values[missing];
   const picture:Picture={type:'pattern',items:values.map((n,i)=>i===missing?'?':String(n))};
   const solved:Picture={type:'pattern',items:values.map(String)};
   return make('What number belongs on the missing stepping stone?',answer,['The same number is added at every step.'],picture,'Compare the first two stones. Use the same jump to fill the gap.',[
    {text:'Find the size of one jump.',equation:`${values[1]} − ${values[0]} = ${step}`,picture},
    {text:'Add that jump to the stone just before the gap.',equation:`${values[missing-1]} + ${step} = ${answer}`,picture:solved},
    {text:'Check that the next jump reaches the following stone.',equation:`${answer} + ${step} = ${values[missing+1]}`,picture:solved},
   ],op('+',values[missing-1],op('-',values[1],values[0])));
  }
  case 'p2-unit-ribbons':{
   const denominators=r.shuffle([2,3,4,5,6,8,10,12]).slice(0,4),greatest=index%2===0,target=greatest?Math.min(...denominators):Math.max(...denominators);
   const picture:CorpusPicture={type:'corpus',layout:'fraction-rows',rows:denominators.map((parts,i)=>({label:String.fromCharCode(65+i),parts,filled:1}))};
   const ordered=[...denominators].sort((a,b)=>a-b);
   return make(`Which unit fraction is the ${greatest?'greatest':'smallest'}?`,`1/${target}`,['All four ribbons are the same length. One equal part of each ribbon is shaded.'],picture,'When the whole is the same size, more equal pieces make each piece smaller.',[
    {text:'Each fraction counts one part of an equally long ribbon.',equation:denominators.map(d=>`1/${d}`).join(', '),picture},
    {text:'Fewer equal parts make a larger piece. More parts make a smaller piece.',equation:ordered.map(d=>`1/${d}`).join(' > '),picture},
    {text:greatest?'Choose the fraction with the fewest equal parts.':'Choose the fraction with the most equal parts.',equation:`1/${target} is the ${greatest?'greatest':'smallest'}`,picture},
   ],op('/',1,target),{choices:r.shuffle(denominators.map(d=>`1/${d}`))});
  }
  case 'p3-juice-left':{
   const glasses=r.int(3,8),each=r.int(2,7)*50,litres=Math.ceil(glasses*each/1000)+r.int(1,2),initial=litres*1000,used=glasses*each,answer=initial-used;
   const picture=cards('Pour the picnic drinks',[{label:'Juice at the start',value:`${litres} litres`,icon:'water'},{label:'Glasses filled',value:String(glasses),icon:'number'},{label:'In each glass',value:`${each} ml`,icon:'number'}]);
   return make('How much juice is left in the jug?',answer,['Each glass receives the same amount. No juice is spilled.'],picture,'Use millilitres for every quantity. Work out the total poured before subtracting.',[
    {text:'Convert the starting volume to millilitres.',equation:`${litres} × 1000 = ${initial} ml`,picture},
    {text:'Find the total poured into all the glasses.',equation:`${glasses} × ${each} = ${used} ml`,picture},
    {text:'Subtract the poured volume from the starting volume.',equation:`${initial} − ${used} = ${answer} ml`,picture},
    {text:'Check the poured volume and the remainder make the starting volume.',equation:`${used} + ${answer} = ${initial} ml`,picture},
   ],op('-',op('*',litres,1000),op('*',glasses,each)),{unit:'ml'});
  }
  case 'p4-path-area':{
   const outerWidth=r.int(20,40),outerHeight=r.int(12,24),border=r.int(1,3),innerWidth=outerWidth-2*border,innerHeight=outerHeight-2*border;
   const answer=outerWidth*outerHeight-innerWidth*innerHeight,picture:CorpusPicture={type:'corpus',layout:'rectangular-frame',outerWidth,outerHeight,border,unit:'m'};
   return make('What is the area of the path?',answer,['The path is inside the rectangular plot. It has the same width along all four sides.'],picture,'The path takes space on both sides of each dimension. Find the inner lawn, then subtract its area.',[
    {text:'Remove the path width from both ends of the length.',equation:`${outerWidth} − ${border} − ${border} = ${innerWidth} m`,picture:{...picture,showInner:true}},
    {text:'Remove the path width from both ends of the width.',equation:`${outerHeight} − ${border} − ${border} = ${innerHeight} m`,picture:{...picture,showInner:true}},
    {text:'Find the areas of the whole plot and inner lawn.',equation:`Plot: ${outerWidth} × ${outerHeight} = ${outerWidth*outerHeight}; lawn: ${innerWidth} × ${innerHeight} = ${innerWidth*innerHeight}`,picture:{...picture,showInner:true}},
    {text:'Only the space outside the lawn is path.',equation:`${outerWidth*outerHeight} − ${innerWidth*innerHeight} = ${answer} m²`,picture},
   ],op('-',op('*',outerWidth,outerHeight),op('*',op('-',outerWidth,op('*',2,border)),op('-',outerHeight,op('*',2,border)))),{unit:'m²'});
  }
  case 'p5-giftbags':{
   const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
   const bags=r.int(2,9),pencilsEach=r.int(2,10),stickersEach=r.pick([2,3,4,5,6,7,8,9,10].filter(n=>gcd(n,pencilsEach)===1));
   const pencils=bags*pencilsEach,stickers=bags*stickersEach,divisors=(n:number)=>Array.from({length:n},(_,i)=>i+1).filter(k=>n%k===0);
   const pencilFactors=divisors(pencils),stickerFactors=divisors(stickers),common=pencilFactors.filter(k=>stickers%k===0);
   const picture=cards('Pack all the stationery',[{label:'Pencils available',value:String(pencils),icon:'pencil'},{label:'Stickers available',value:String(stickers),icon:'ticket'},{label:'Every bag',value:'The same contents',icon:'bag'}]);
   return make('What is the greatest number of identical gift bags?',bags,['Every bag must contain the same number of each item. Use every pencil and sticker, with none left over.'],picture,'The bag count must divide both totals exactly. Look for the greatest common factor.',[
    {text:'Find bag counts that share all the pencils with none left over.',equation:`Factors of ${pencils}: ${pencilFactors.join(', ')}`,picture},
    {text:'Find bag counts that also share all the stickers.',equation:`Factors of ${stickers}: ${stickerFactors.join(', ')}`,picture},
    {text:'Choose the greatest count that appears in both lists.',equation:`Common factors: ${common.join(', ')}; greatest = ${bags}`,picture},
    {text:`Each bag contains ${pencilsEach} pencils and ${stickersEach} stickers. Every item is used.`,equation:`${bags} × ${pencilsEach} = ${pencils}; ${bags} × ${stickersEach} = ${stickers}`,picture},
   ],bags,{unit:'bags'});
  }
  case 'p6-equilateral-line':{
   const givenAngle=r.int(4,14)*5,answer=120-givenAngle,picture:CorpusPicture={type:'corpus',layout:'equilateral-line',givenAngle};
   return make('Find angle BOL.',answer,['L, O and R lie on a straight line. Triangle OAB is equilateral.'],picture,'Every angle in an equilateral triangle is 60°. Add the two angles on the right first.',[
    {text:'The angle inside the equilateral triangle is 60 degrees.',equation:'Angle AOB = 60°',picture:{...picture,revealTriangle:true}},
    {text:'Join the triangle angle to the given angle on the right.',equation:`Angle BOR = 60° + ${givenAngle}° = ${60+givenAngle}°`,picture:{...picture,revealTriangle:true,revealCombined:true}},
    {text:'The angles above the straight line add to 180 degrees.',equation:`180° − ${60+givenAngle}° = ${answer}°`,picture:{...picture,revealTriangle:true}},
    {text:'Check that all three angles above the line make a straight angle.',equation:`${answer}° + 60° + ${givenAngle}° = 180°`,picture:{...picture,revealTriangle:true}},
   ],op('-',180,op('+',60,givenAngle)),{unit:'degrees'});
  }
  default:throw new Error(`Unknown corpus question family: ${activity.parameter}`);
 }
}
