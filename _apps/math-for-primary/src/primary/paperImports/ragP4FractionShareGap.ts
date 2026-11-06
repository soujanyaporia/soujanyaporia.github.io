import {Rng,hashString} from '../../engine/random';
import type {Proof,Question} from '../generate';

export const RAG_PATTERN={id:'rag-p4-fraction-share-gap',level:4,title:'Find a count from the gap between two shares',objective:'Turn a count gap between two groups into a gap between fractions of the same whole, then find one group or the whole.',skillIds:['P4.S.FRAC.03','P4.S.FRAC.04','P4.S.MD.03'],canonicalPatternId:'p4-fraction-share-gap-to-count'};

type Frac=[number,number];
type Group={name:string;parts:number};
type Step={text:string;equation?:string};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a*b/gcd(a,b);
const fr=(n:number,d:number)=>{const k=gcd(n,d);return d/k===1?String(n/k):`${n/k}/${d/k}`;};
const calc=(op:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op,a,b});

const scenes=[
 {things:'stickers',groups:['star stickers','heart stickers','moon stickers']},
 {things:'balloons',groups:['red balloons','blue balloons','yellow balloons']},
 {things:'library books',groups:['story books','comic books','puzzle books']},
 {things:'tickets',groups:['adult tickets','child tickets','student tickets']},
 {things:'plants',groups:['cactus plants','fern plants','herb plants']},
 {things:'shells',groups:['white shells','spotted shells','striped shells']},
];

const proper:Frac[]=[];
for(let d=2;d<=12;d++)for(let n=1;n<d;n++)if(gcd(n,d)===1)proper.push([n,d]);

// Two stated fractions with positive, different shares and a positive rest, over a small common denominator.
const three:{a:Frac;b:Frac;L:number;s:[number,number,number]}[]=[];
for(const a of proper)for(const b of proper){
 const L=lcm(a[1],b[1]);if(L>24)continue;
 const sa=a[0]*L/a[1],sb=b[0]*L/b[1],sr=L-sa-sb;
 if(sr<1||sa===sb)continue;
 three.push({a,b,L,s:[sa,sb,sr]});
}
// One stated fraction that is not one half, so the two groups differ in size.
const two=proper.filter(([n,d])=>2*n!==d);

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p4-fraction-share-gap:${seed}:${index}`));
 const variant=((Math.trunc(seed)+index)%4+4)%4,threeGroups=variant%2===0,askWhole=variant>=2;
 const scene=r.pick(scenes),units=r.int(3,40),names=r.shuffle(scene.groups),things=scene.things;
 const steps:Step[]=[];
 let groups:Group[],L:number,pair:Group[],share:string,other:Group|null=null;
 if(threeGroups){
  const o=r.pick(three),[sa,sb,sr]=o.s;L=o.L;
  groups=[{name:names[0],parts:sa},{name:names[1],parts:sb},{name:names[2],parts:sr}];
  const i=r.pick([0,1].filter(k=>groups[2].parts!==groups[k].parts));
  pair=[groups[2],groups[i]];other=groups[1-i];
  share=`${fr(o.a[0],o.a[1])} of the ${things} were ${names[0]}, ${fr(o.b[0],o.b[1])} of the ${things} were ${names[1]} and the rest were ${names[2]}.`;
  steps.push({text:'Take the two stated fractions away from one whole to find the share that is left.',equation:`1 − ${fr(o.a[0],o.a[1])} − ${fr(o.b[0],o.b[1])} = ${fr(sr,L)}`});
 }else{
  const [n,d]=r.pick(two);L=d;
  groups=[{name:names[0],parts:n},{name:names[1],parts:d-n}];pair=groups;
  share=`${fr(n,d)} of the ${things} were ${names[0]}. The rest were ${names[1]}.`;
  steps.push({text:'Take the stated fraction away from one whole to find the share that is left.',equation:`1 − ${fr(n,d)} = ${fr(d-n,d)}`});
 }
 const [big,small]=pair[0].parts>pair[1].parts?[pair[0],pair[1]]:[pair[1],pair[0]];
 const gapParts=big.parts-small.parts,gap=gapParts*units,whole=L*units;
 const target=askWhole?null:(other??big);
 const answer=target?target.parts*units:whole;
 steps.push({text:`Use ${L} equal parts for the whole. The gap between ${big.name} and ${small.name} is ${gapParts} of these parts.`,equation:`${big.parts}/${L} − ${small.parts}/${L} = ${gapParts}/${L}`});
 steps.push({text:`${gap} ${things} stand for ${gapParts} part${gapParts===1?'':'s'}, so find the number in one part.`,equation:`${gap} ÷ ${gapParts} = ${units}`});
 steps.push(target?{text:`${target.name} are ${target.parts} of the ${L} parts.`,equation:`${units} × ${target.parts} = ${answer}`}:{text:`All ${L} equal parts make the whole.`,equation:`${units} × ${L} = ${answer}`});
 return {
  key:`rag-p4-fraction-share-gap:${seed}:${index}`,
  prompt:target?`How many ${target.name} were there?`:`How many ${things} were there altogether?`,
  context:[`A class sorted some ${things} into ${threeGroups?'three':'two'} groups.`,share,`There were ${gap} more ${big.name} than ${small.name}.`],
  answer:String(answer),
  unit:target?target.name:things,
  hint:'Find the missing share first. The gap in the counts matches the gap in the fractions, so work out how many are in one equal part.',
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
  workedSteps:steps,
  proof:calc('*',calc('/',gap,gapParts),target?target.parts:L),
 };
}
