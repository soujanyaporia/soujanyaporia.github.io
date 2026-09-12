import {visualGuide} from './guides';
import type {Rng} from '../../engine/random';
import {choicesOf,rngFor} from '../gen';
import type {Gen,Item,Lesson,Tool,Stage,Rep} from '../model';
import {makeLesson} from './kit';
import type {PlanEntry} from './plan';
export type Evidence={op:'+'|'-'|'*'|'/'|'round';a:number;b:number};
export interface Example {
 prompt:string;answer:string;display?:string;unit?:string;choices?:string[];exact?:boolean;
 steps:string[];hint:string;tool:Tool;
 /** A meaningful application of the same relationship, with the same answer. */
 context:string;
 /** Correct reasoning, a plausible misconception, and a reverse/checking relationship. */
 why:string;error:string;check:string;
 evidence?:Evidence;
}
export interface TopicSpec {
 concept:string; vocabulary:string[]; misconception:string;
 explore:Extract<Stage,{kind:'explore'}>;
 example:(r:Rng,variant:number)=>Example;
 /** Practical construction uses the app model and a pencil-and-paper counterpart. */
 practical?:string[];
}
export function lessonExample(p:PlanEntry,spec:TopicSpec,seed:number,index:number):Example{const r=rngFor(p.id,seed,index,'syllabus-v1');return spec.example(r,index+r.int(0,119));}
export function sequence(p:PlanEntry,spec:TopicSpec):Lesson{
 const sample=lessonExample(p,spec,217,0),guide=visualGuide(p);
 const itemFor=(mode:'direct'|'visual'|'word'|'reverse'|'reasoning'):Gen=>(seed,index)=>{
  const r=rngFor(p.id,seed,index,mode),e=spec.example(r,index+r.int(0,119)),key=`${mode}-${index}`;
  const base:Item={key,prompt:mode==='word'?e.context:e.prompt,display:e.display,answer:e.answer,unit:e.unit,choices:e.choices,exact:e.exact,facet:mode,rep:mode==='word'?'story':e.tool.kind==='fractions'?'fraction-wall':e.tool.kind==='bar'?'bar-model':'symbols',tool:e.tool,hints:[e.hint,...e.steps.slice(0,-1)],steps:e.steps,check:e.check};
  if(mode==='reverse')return {...base,unit:undefined,display:undefined,prompt:`Check this result: ${e.prompt} Answer: ${e.answer}${e.unit?' '+e.unit:''}. Which relationship checks it?`,answer:e.check,choices:choicesOf(r,e.check,[e.error,'Changing one given quantity keeps this answer unchanged.']),exact:true,steps:[e.why,e.check],hints:['Work back to the given quantities. Check the units as well as the number.']};
  if(mode==='reasoning')return {...base,unit:undefined,display:undefined,prompt:`A learner is solving this: ${e.prompt} Which explanation is sound?`,answer:e.why,choices:choicesOf(r,e.why,[e.error,'The diagram alone decides the answer, whatever its labels say.']),exact:true,steps:[e.why,...e.steps],hints:[e.hint]};
  return base;
 };
 const warm=itemFor('direct')(23,0),guided=itemFor('direct'),visual=itemFor('visual'),word=itemFor('word'),reverse=itemFor('reverse'),why=itemFor('reasoning');
 const reps:Rep[]=['symbols','story'];if(sample.tool.kind==='fractions')reps.push('fraction-wall');else if(sample.tool.kind==='bar')reps.push('bar-model');else if(sample.tool.kind==='table')reps.push('table');else reps.push('diagram');
 const result=makeLesson(p,{
  canDo:[p.objective,`explain ${spec.vocabulary.slice(0,2).join(' and ')} using an example`,'check an answer against the quantities and units given'],
  representations:reps,misconceptions:[{name:'A tempting shortcut',fix:spec.misconception}],
  stages:[
   {kind:'readiness',title:'What do you already notice?',text:p.track==='foundation'?'Try one small step. A model and clues are always available.':'Try this first. It is fine to open a clue.',items:[warm],booster:[{text:guide.frames[0].text,tool:guide.frames[0].tool},{text:spec.misconception,tool:sample.tool}]},
   {kind:'hook',title:guide.title,text:guide.frames[0].text,tool:guide.frames[0].tool},
   spec.explore,
   {kind:'explain',title:guide.title,text:guide.frames[0].text,frames:guide.frames,alternatives:guide.alternatives,why:{question:'What did the picture help us see?',answer:guide.frames.at(-1)!.text}},
   {kind:'worked',title:'Think through an example',problem:sample.prompt+(sample.display?' '+sample.display:''),tool:sample.tool,steps:[{text:sample.hint},...sample.steps.map(text=>({text})),{text:'Check the result against the original information.',math:sample.check}]},
   ...(spec.practical?[{kind:'connect' as const,title:'Try a construction',text:'Use the model, then make your own drawing on paper. Compare the features; a teacher or adult can check your drawing.',rows:spec.practical.map(text=>({text}))}]:[]),
   {kind:'practice',mode:'guided',title:'Build your confidence',text:p.track==='foundation'?'Use the model. Say what one part represents before calculating.':'Open a clue whenever it helps.',gen:guided,count:p.track==='foundation'?5:3},
   {kind:'practice',mode:'independent',title:'Try another example',gen:visual,count:3},
   {kind:'apply',title:'Use the idea',gen:word,count:2},
   {kind:'reason',title:'Explain and check',items:[why(371,0),reverse(571,1)]},
   {kind:'mastery',title:'Check what I know',gens:[{facet:'direct',gen:guided},{facet:'visual',gen:visual},{facet:'reverse',gen:reverse},{facet:'word',gen:word},{facet:'reasoning',gen:why}]},
   {kind:'discovery',title:'Look what you can explain',text:guide.frames.at(-1)!.text,math:guide.frames.at(-1)!.math,tool:guide.frames.at(-1)!.tool}
  ]
 });
 const readiness=result.stages.shift()!;const explore=result.stages.splice(1,1)[0];result.stages.splice(2,0,explore,readiness);
 result.revision='visual-2026-09-12';
 return result;
}
export const table=(headers:string[],rows:(string|number)[][],caption:string):Tool=>({kind:'table',headers,rows:rows.map(r=>r.map(String)),caption});
export const diagram=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
export function exploreGeometry(mode:Extract<Tool,{kind:'geometry'}>['mode'],a:number,b=3,text='Change the model to match the target.'):TopicSpec['explore']{
 return {kind:'explore',title:'Make it, then notice',text,tool:{kind:'geometry',mode,a:a-1,b},goal:t=>t.kind==='geometry'&&t.a===a&&t.b===b,goalHint:`Set the first value to ${a}${['angle','clock','ruler'].includes(mode)?'':` and the second to ${b}`}.`,success:'Your construction matches. Look at what changed and what stayed the same.'};
}
export const exploreFraction=(n=2,d=5):TopicSpec['explore']=>({kind:'explore',title:'Build a fraction',text:`Shade ${n} of the ${d} equal parts. Each part must be the same size.`,tool:{kind:'fractions',denominators:[d],shaded:[0]},goal:t=>t.kind==='fractions'&&t.shaded[0]===n,goalHint:`Tap the ${n}th part to shade ${n} parts.`,success:`The denominator counts all ${d} equal parts. The numerator counts the ${n} selected parts.`});
export const exploreArray=(rows=3,cols=4):TopicSpec['explore']=>({kind:'explore',title:'Build an array',text:`Make ${rows} rows with ${cols} in each row.`,tool:{kind:'array',rows:rows-1,cols},goal:t=>t.kind==='array'&&t.rows===rows&&t.cols===cols,goalHint:`Set rows to ${rows} and columns to ${cols}.`,success:`${rows} equal rows of ${cols} contain ${rows*cols} objects.`});
