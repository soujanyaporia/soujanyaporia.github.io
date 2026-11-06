import {Rng,hashString} from '../../engine/random';
import type {Picture,Question} from '../generate';

export const RAG_PATTERN={
 id:'p2-rag-category-reference',
 level:2,
 title:'Match a category to a reference',
 objective:'Read a picture graph key, double, halve or add a stated amount to a reference count, then name the matching category.',
 skillIds:['P2.S.GRAPH.01','P2.S.MD.01','P2.S.MD.02'],
 canonicalPatternId:'p2-match-category-to-reference-count',
} as const;

type Variant='twice'|'half'|'more';
const VARIANTS:Variant[]=['twice','half','more'];
const NAMES=['Amy','Betty','Cathy','Daniel','Emily','Farid','Grace','Hana','Ivan','Jun'];
const THEMES=[
 {noun:'stickers',verb:'collected',title:'Stickers collected'},
 {noun:'shells',verb:'found',title:'Shells found'},
 {noun:'books',verb:'read',title:'Books read'},
 {noun:'cups of juice',verb:'drank',title:'Cups of juice drunk'},
];

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p2-category-reference:${seed}:${index}`));
 const variant=VARIANTS[(Math.abs(Math.trunc(seed))+index)%VARIANTS.length];
 const theme=r.pick(THEMES),scale=r.pick([2,3,4,5,10]);
 const n=r.pick([3,4,5]);
 let reference:number,target:number,amount=0;
 if(variant==='twice'){reference=r.int(1,4);target=reference*2;}
 else if(variant==='half'){target=r.int(1,4);reference=target*2;}
 else{const extra=r.int(1,3);reference=r.int(1,5);target=reference+extra;amount=extra*scale;}
 const others=r.shuffle(Array.from({length:8},(_,i)=>i+1).filter(c=>c!==reference&&c!==target)).slice(0,n-2);
 const entries=r.shuffle([{count:reference,role:'reference'},{count:target,role:'target'},...others.map(count=>({count,role:'other'}))]);
 const names=r.shuffle(NAMES).slice(0,n);
 const labels=names,counts=entries.map(e=>e.count);
 const refName=names[entries.findIndex(e=>e.role==='reference')],answer=names[entries.findIndex(e=>e.role==='target')];
 const refTotal=reference*scale,targetTotal=target*scale;
 const picture:Picture={type:'bars',labels,values:counts.map(c=>c*scale),scale,pictures:true};
 const prompt=variant==='twice'?`Who ${theme.verb} twice as many ${theme.noun} as ${refName}?`
  :variant==='half'?`Who ${theme.verb} half as many ${theme.noun} as ${refName}?`
  :`Who ${theme.verb} ${amount} more ${theme.noun} than ${refName}?`;
 const operation=variant==='twice'?`${refTotal} × 2 = ${targetTotal}`:variant==='half'?`${refTotal} ÷ 2 = ${targetTotal}`:`${refTotal} + ${amount} = ${targetTotal}`;
 const operationText=variant==='twice'?'Double the reference amount.':variant==='half'?'Halve the reference amount.':'Add the stated amount to the reference amount.';
 const steps=[
  {text:`Use the key to find how many ${theme.noun} ${refName} has.`,equation:`${reference} × ${scale} = ${refTotal}`,picture},
  {text:operationText,equation:operation,picture},
  {text:`Find the child whose row shows ${targetTotal} ${theme.noun}.`,equation:`${answer}: ${target} × ${scale} = ${targetTotal}`,picture},
 ];
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  prompt,
  context:[`The picture graph shows the number of ${theme.noun} for ${n} children.`,`Each symbol stands for ${scale} ${theme.noun}.`],
  answer,
  choices:[...labels],
  picture,
  hint:'Use the key to turn the symbols into a number first. Then work out the amount you are looking for.',
  explanation:steps.map(s=>`${s.text} ${s.equation}.`).join(' '),
  workedSteps:steps,
 };
}
