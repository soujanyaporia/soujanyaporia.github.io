import {Rng,hashString} from '../../engine/random';
import type {Question,Proof} from '../generate';
import type {PaperPicture} from '../paperPicture';

export const RAG_PATTERN={
 id:'p2-rag-regroup-fixed-total',
 level:2,
 title:'Regroup a fixed total',
 objective:'Multiply equal groups to find the total, then divide by a new group size to find how many new groups can be made.',
 skillIds:['P2.S.MD.01','P2.S.MD.02'],
 canonicalPatternId:'p2-regroup-fixed-total-group-count',
};

interface Template{
 lines:(g:number,s:number,k:number)=>string[];
 prompt:string;
 unit:string;
 labels:[string,string,string];
 heading:string;
 choice:boolean;
}

const templates:Template[]=[
 {lines:(g,s,k)=>[`Mei has ${g} packs of beads.`,`Each pack has ${s} beads.`,`She puts ${k} beads on each bracelet and uses every bead.`],prompt:'How many bracelets can Mei make?',unit:'bracelets',labels:['Packs of beads','Beads in each pack','Beads on each bracelet'],heading:'Bracelet beads',choice:true},
 {lines:(g,s,k)=>[`Raj has ${g} boxes of crayons.`,`Each box has ${s} crayons.`,`He puts ${k} crayons in each pouch and uses all of them.`],prompt:'How many pouches does Raj fill?',unit:'pouches',labels:['Boxes of crayons','Crayons in each box','Crayons in each pouch'],heading:'Crayon pouches',choice:false},
 {lines:(g,s,k)=>[`Aisha has ${g} trays of muffins.`,`Each tray has ${s} muffins.`,`She packs ${k} muffins in each bag and uses every muffin.`],prompt:'How many bags does Aisha pack?',unit:'bags',labels:['Trays of muffins','Muffins on each tray','Muffins in each bag'],heading:'Muffin bags',choice:true},
 {lines:(g,s,k)=>[`Ben has ${g} bags of marbles.`,`Each bag has ${s} marbles.`,`He puts ${k} marbles into each jar and uses all of them.`],prompt:'How many jars can Ben fill?',unit:'jars',labels:['Bags of marbles','Marbles in each bag','Marbles in each jar'],heading:'Marble jars',choice:false},
];

// Every combination: new group size divides the total exactly, differs from the old size, and gives at least two groups.
const combos:[number,number,number][]=[];
for(const g of [2,3,4,5])for(const s of [2,3,4,5,6,7,8,9,10])for(const k of [2,3,4,5,10]){
 const total=g*s;
 if(total%k===0&&k!==s&&total/k>=2)combos.push([g,s,k]);
}

const op=(symbol:'+'|'-'|'*'|'/',a:Proof,b:Proof):Proof=>({op:symbol,a,b});

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`p2-rag-regroup-fixed-total:${seed}:${index}`));
 const variant=(Math.abs(Math.trunc(seed))+Math.abs(Math.trunc(index)))%templates.length,t=templates[variant];
 const [g,s,k]=r.pick(combos),total=g*s,answer=total/k;
 const picture:PaperPicture={type:'paper',layout:'cards',heading:t.heading,cards:[g,s,k].map((n,i)=>({label:t.labels[i],value:String(n),icon:'number' as const}))};
 const steps:[string,string][]=[
 ['Find how many there are altogether.',`${g} × ${s} = ${total}`],
 [`Share the total into groups of ${k}.`,`${total} ÷ ${k} = ${answer}`],
 ['Check by multiplying back.',`${answer} × ${k} = ${total}`],
 ];
 const base:Question={
  key:`p2-rag-regroup-fixed-total:${seed}:${index}`,
  prompt:t.prompt,
  context:t.lines(g,s,k),
  answer:String(answer),
  unit:t.unit,
  hint:'Find the total first. Then see how many groups of the new size fit.',
  explanation:steps.map(([text,equation])=>`${text} ${equation}.`).join(' '),
  picture,
  workedSteps:steps.map(([text,equation])=>({text,equation,picture})),
  proof:op('/',op('*',g,s),k),
 };
 if(!t.choice)return base;
 const wrong=[...new Set([total,g,s,answer+1,answer-1,answer+2,total-k].filter(n=>n>0&&n!==answer))].slice(0,3);
 return {...base,choices:r.shuffle([answer,...wrong].map(String))};
}
