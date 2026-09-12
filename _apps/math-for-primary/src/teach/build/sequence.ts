import {annotateSteps,friendly} from './teachingNotes';
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
  if(mode==='reverse')return {...base,unit:undefined,display:undefined,prompt:`Check this result: ${e.prompt} Answer: ${e.answer}${e.unit?' '+e.unit:''}. How can we check this answer?`,answer:e.check,choices:choicesOf(r,e.check,[friendly(e.error)]),exact:true,steps:[e.why,e.check],hints:['Work back to the given quantities. Check the units as well as the number.']};
  if(mode==='reasoning')return {...base,unit:undefined,display:undefined,prompt:`A learner is solving this: ${e.prompt} Which explanation helps us solve it?`,answer:friendly(e.why),choices:choicesOf(r,friendly(e.why),[friendly(e.error)]),exact:true,steps:[e.why,...e.steps],hints:[e.hint]};
  return base;
 };
 const warm=itemFor('direct')(23,0),guided=itemFor('direct'),visual=itemFor('visual'),word=itemFor('word'),reverse=itemFor('reverse'),why=itemFor('reasoning');
 const reps:Rep[]=['symbols','story'];if(sample.tool.kind==='fractions')reps.push('fraction-wall');else if(sample.tool.kind==='bar')reps.push('bar-model');else if(sample.tool.kind==='table')reps.push('table');else reps.push('diagram');
 const result=makeLesson(p,{
  canDo:[p.objective,'use the picture to explain each step','check my answer using the starting information'],
  representations:reps,misconceptions:[{name:'A tempting shortcut',fix:spec.misconception}],
  stages:[
   {kind:'readiness',title:'Try the idea with help',text:'Use what we just learned to try a new example. Open a clue whenever you need one.',items:[warm],booster:[{text:guide.frames[0].text,tool:guide.frames[0].tool},{text:spec.misconception,tool:sample.tool}]},
   {kind:'hook',title:'Our question today',text:sample.prompt,tool:sample.tool},
   {kind:'notice',title:'Be the maths detective',text:`Think about the example we just solved. ${sample.prompt} Which idea helps us solve it?`,tool:sample.tool,options:[{text:friendly(sample.error),correct:false,reply:`Let's look again. ${friendly(sample.why)} ${sample.hint}`},{text:friendly(sample.why),correct:true,reply:`Yes. ${friendly(sample.check)}`}]},
   {kind:'explain',title:guide.title,text:guide.frames[0].text,frames:annotateSteps(guide.frames),alternatives:guide.alternatives?.map(a=>({...a,frames:annotateSteps(a.frames)})),why:{question:'What did the picture help us see?',answer:guide.frames.at(-1)!.text}},
   {kind:'worked',title:'Let’s solve our question together',problem:sample.prompt+(sample.display?' '+sample.display:''),tool:sample.tool,steps:annotateSteps([{text:sample.hint,tool:sample.tool,because:friendly(sample.why)},...sample.steps.map(text=>({text:friendly(text),tool:sample.tool})),{text:'Now you finish the explanation. Use the picture and the steps above.',tool:sample.tool,ask:{prompt:sample.prompt,answer:sample.answer,choices:sample.choices}},{text:'Does our answer fit the starting information?',tool:sample.tool,math:sample.check,because:`We found ${sample.answer}${sample.unit?' '+sample.unit:''}. ${friendly(sample.why)}`}])},
   ...(spec.practical?[{kind:'connect' as const,title:'Try a construction',text:'Use the model, then make your own drawing on paper. Compare the features; a teacher or adult can check your drawing.',rows:spec.practical.map(text=>({text}))}]:[]),
   {kind:'practice',mode:'guided',title:'Build your confidence',text:p.track==='foundation'?'Use the model. Say what one part represents before calculating.':'Open a clue whenever it helps.',gen:guided,count:p.track==='foundation'?5:3},
   {kind:'practice',mode:'independent',title:'Try another example',gen:visual,count:3},
   {kind:'apply',title:'Use the idea',gen:word,count:2},
   {kind:'reason',title:'Explain and check',items:[why(371,0),reverse(571,1)]},
   {kind:'mastery',title:'Check what I know',gens:[{facet:'direct',gen:guided},{facet:'visual',gen:visual},{facet:'reverse',gen:reverse},{facet:'word',gen:word},{facet:'reasoning',gen:why}]},
   {kind:'discovery',title:'Bring the idea back to our question',text:`${sample.prompt} We found ${sample.answer}${sample.unit?' '+sample.unit:''}. ${friendly(sample.why)}`,math:sample.check,tool:sample.tool}
  ]
 });
 const readiness=result.stages.shift()!;const detective=result.stages.splice(1,1)[0];result.stages.splice(3,0,detective,readiness);
 result.mission={goal:p.objective,question:sample.prompt,connection:`First we will build the idea with a picture: ${guide.title.toLowerCase()}. Then we will use that idea to solve our question together.`};
 result.revision='coached-2026-09-12';
 return result;
}
export const table=(headers:string[],rows:(string|number)[][],caption:string):Tool=>({kind:'table',headers,rows:rows.map(r=>r.map(String)),caption});
export const diagram=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
export function exploreGeometry(mode:Extract<Tool,{kind:'geometry'}>['mode'],a:number,b=3,text='Change the model to match the target.'):TopicSpec['explore']{
 return {kind:'explore',title:'Make it, then notice',text,tool:{kind:'geometry',mode,a:a-(mode==='clock'?5:1),b},goal:t=>t.kind==='geometry'&&t.a===a&&t.b===b,goalHint:mode==='clock'?`Set Hour to ${Math.floor(a/60)%12||12}, Minute to ${a%60}, and choose ${a>=720?'pm':'am'}.`:`Set the first value to ${a}${['angle','ruler'].includes(mode)?'':` and the second to ${b}`}.`,success:'Your construction matches. Look at what changed and what stayed the same.'};
}
export const exploreFraction=(n=2,d=5):TopicSpec['explore']=>({kind:'explore',title:'Build a fraction',text:`Shade ${n} of the ${d} equal parts. Each part must be the same size.`,tool:{kind:'fractions',denominators:[d],shaded:[0]},goal:t=>t.kind==='fractions'&&t.shaded[0]===n,goalHint:`Tap the ${n}th part to shade ${n} parts.`,success:`The denominator counts all ${d} equal parts. The numerator counts the ${n} selected parts.`});
export const exploreArray=(rows=3,cols=4):TopicSpec['explore']=>({kind:'explore',title:'Build an array',text:`Make ${rows} rows with ${cols} in each row.`,tool:{kind:'array',rows:rows-1,cols},goal:t=>t.kind==='array'&&t.rows===rows&&t.cols===cols,goalHint:`Set rows to ${rows} and columns to ${cols}.`,success:`${rows} equal rows of ${cols} contain ${rows*cols} objects.`});
