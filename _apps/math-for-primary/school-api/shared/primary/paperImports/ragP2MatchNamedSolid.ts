import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch10EarlyPicture,Batch10EarlySolid} from './batch10EarlyPicture';

export const RAG_PATTERN = {
 id:'p2-rag-match-named-solid',
 level:2,
 title:'Find the named solid',
 objective:'Choose, from several pictured solids, the one that matches a given solid name.',
 skillIds:['P2.S.SHAPE.02'],
 canonicalPatternId:'p2-match-named-solid-to-pictured-object',
};

const features:Record<string,string>={
 sphere:'A sphere is round all over and has no flat face.',
 cone:'A cone has one flat circular face and a pointed top.',
 cylinder:'A cylinder has two flat circular faces and a curved side.',
 cube:'A cube has six flat square faces of the same size.',
 cuboid:'A cuboid is a box shape with six flat rectangular faces.',
};

/** Original variants: 3 or 4 labelled solids, with the requested solid chosen from seed and index. */
export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
 const box:Batch10EarlySolid=r.chance(.5)?'cube':'cuboid';
 const pool:Batch10EarlySolid[]=['cone','cylinder','sphere',box];
 const count=r.pick([3,4]);
 const shapes=r.shuffle(pool).slice(0,count);
 const objects=shapes.map((shape,i)=>({label:String.fromCharCode(65+i),shape}));
 const target=r.pick(objects);
 const picture:Batch10EarlyPicture={type:'batch10-early',layout:'solid-order',objects};
 const labels=objects.map(o=>o.label);
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  prompt:`Which object is a ${target.shape}?`,
  context:['Look at the labelled solids. Choose the letter of the matching object.'],
  answer:target.label,
  choices:labels,
  picture,
  hint:'Think about the flat faces and curved surfaces of the named solid. Look for the same features in the pictures.',
  explanation:`${features[target.shape]} Object ${target.label} has these features, so it is the ${target.shape}.`,
  workedSteps:[
   {text:`Remember what a ${target.shape} looks like.`,equation:features[target.shape]},
   {text:'Compare each pictured object with these features.'},
   {text:`Choose the object that matches.`,equation:`Object ${target.label}`},
  ],
 };
}
