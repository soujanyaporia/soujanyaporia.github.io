import {questionModel} from '../tools/questionModel';
import {investigation} from '../depth/catalogue/investigations';
import {prerequisite} from '../depth/catalogue/prerequisites';
import {teachingFocus} from '../depth/catalogue/focus';
import {modelFor,visualQuestion,supportFor} from '../depth/catalogue/questions';
import {arithmeticWorked} from './arithmeticSteps';
import {annotateSteps,friendly} from './teachingNotes';
import {visualGuide} from './guides';
import type {Rng} from '../../engine/random';
import {choicesOf,rngFor} from '../gen';
import type {Gen,Item,Lesson,Tool,Stage,Rep,RevealStep} from '../model';
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
 anchor?:Example;worked?:RevealStep[];learningGoal?:string;connection?:string;
 concept:string; vocabulary:string[]; misconception:string;
 explore:Extract<Stage,{kind:'explore'}>;
 example:(r:Rng,variant:number)=>Example;
 /** Practical construction uses the app model and a pencil-and-paper counterpart. */
 practical?:string[];
}
export function lessonExample(p:PlanEntry,spec:TopicSpec,seed:number,index:number):Example{const r=rngFor(p.id,seed,index,'syllabus-v1');return spec.example(r,index+r.int(0,119));}
export function sequence(p:PlanEntry,spec:TopicSpec):Lesson{
 const rawSample=spec.anchor??lessonExample(p,spec,217,0),sample={...rawSample,tool:modelFor(p,rawSample)},guide=visualGuide(p),focus=teachingFocus(p);
 const activeModel=investigation(p,guide);
 const pictureExample=spec.anchor?.prompt??guide.setup!,takeaway=guide.frames.at(-1)!.text;
 const fact=sample.evidence;
 const linkedWorked=spec.worked??(p.code==='AS'&&fact&&(fact.op==='+'||fact.op==='-')&&Math.max(fact.a,fact.b,Number(sample.answer))<=100?arithmeticWorked({a:fact.a,b:fact.b,c:Number(sample.answer),op:fact.op},sample.prompt):undefined);
 const itemFor=(mode:'direct'|'visual'|'word'|'reverse'|'reasoning'):Gen=>(seed,index)=>{
  const r=rngFor(p.id,seed,index,mode),raw=spec.example(r,index+r.int(0,119)),e={...raw,tool:modelFor(p,raw)},key=`${mode}-${index}`,reading=visualQuestion(p,e,e.tool);
  const base:Item={key,prompt:mode==='word'?e.context:mode==='visual'?reading.prompt:e.prompt,display:e.display,answer:e.answer,unit:e.unit,choices:e.choices,exact:e.exact,facet:mode,rep:mode==='word'?'story':e.tool.kind==='fractions'?'fraction-wall':e.tool.kind==='bar'?'bar-model':'symbols',tool:mode==='visual'?reading.tool:e.tool,requiresModel:mode==='visual'||['GRAPH','LINES','SOLID','SHAPE','ANGLE','LENGTH','SYM'].includes(p.code)&&!/[0-9]/.test(e.prompt),hints:[e.hint,...e.steps.slice(0,-1)],steps:e.steps,check:e.check};
  if(mode==='reverse')return supportFor(p,e,{...base,unit:undefined,display:undefined,prompt:`Check this result: ${e.prompt} Answer: ${e.answer}${e.unit?' '+e.unit:''}. How can we check this answer?`,answer:e.check,choices:choicesOf(r,e.check,[friendly(e.error)]),exact:true,steps:[e.why,e.check],hints:['Work back to the given quantities. Check the units as well as the number.']},focus);
  if(mode==='reasoning')return supportFor(p,e,{...base,unit:undefined,display:undefined,prompt:`A learner is solving this: ${e.prompt} Which explanation helps us solve it?`,answer:friendly(e.why),choices:choicesOf(r,friendly(e.why),[friendly(e.error)]),exact:true,steps:[e.why,...e.steps],hints:[e.hint]},focus);
  return supportFor(p,e,base,focus);
 };
 const guided=itemFor('direct'),visual=itemFor('visual'),word=itemFor('word'),reverse=itemFor('reverse'),why=itemFor('reasoning');
 const reps:Rep[]=['symbols','story'];if(sample.tool.kind==='fractions')reps.push('fraction-wall');else if(sample.tool.kind==='bar')reps.push('bar-model');else if(sample.tool.kind==='table')reps.push('table');else reps.push('diagram');
 const result=makeLesson(p,{
  canDo:[p.objective,focus.goal,'check the answer against the original quantities and units'],
  representations:reps,misconceptions:[{name:'A tempting shortcut',fix:spec.misconception}],
  stages:[
   prerequisite(p),
   {kind:'hook',title:'Meet our picture example',text:pictureExample,tool:spec.anchor?.tool??guide.frames[0].tool,caption:guide.frames[0].caption??guide.frames[0].text,next:'Before following the explanation, think about the relationship we will look for in this picture.',flow:{phase:'watch',label:'First, meet the example',transition:'We will follow this picture step by step before trying a question with help.'}},
   {kind:'notice',actionLabel:'Think about the picture',title:'What should we look for?',text:focus.question,tool:guide.frames[0].tool,options:[{text:focus.error,correct:false,reply:focus.why},{text:focus.answer,correct:true,reply:focus.why}],flow:{phase:'watch',label:'Give the picture a purpose',transition:focus.look}},
   {kind:'explain',title:guide.title,text:guide.frames[0].text,example:pictureExample,method:guide.method,flow:{phase:'watch',label:'Watch the same example',transition:guide.method?.intro??focus.look},frames:annotateSteps(guide.frames.map((f,i)=>i===0?{...f,because:f.because??focus.why}:f)),alternatives:guide.alternatives?.map(a=>({...a,frames:annotateSteps(a.frames)})),why:{question:'What did the picture help us see?',answer:guide.frames.at(-1)!.text}},
   ...(activeModel?[activeModel]:[]),
   {kind:'worked',title:spec.anchor?'Let’s solve our question together':'A new example, together',flow:{phase:'together',label:spec.anchor?'Back to our question':'Use the idea with a new example',transition:spec.anchor?'Keep the same counters. This time, you will finish the answer.':'The picture example is complete. We are changing the example now; read the new question below before starting.',carry:takeaway},problem:sample.prompt+(sample.display?' '+sample.display:''),tool:sample.tool,steps:annotateSteps(linkedWorked??[{text:focus.look,tool:questionModel(sample.tool),because:friendly(sample.why)},{text:sample.hint,tool:questionModel(sample.tool),ask:{prompt:sample.prompt,answer:sample.answer,choices:sample.choices}},...sample.steps.map(text=>({text:friendly(text),tool:sample.tool})),{text:'Check the result against the question we started with.',tool:sample.tool,math:sample.check,because:`We found ${sample.answer}${sample.unit?' '+sample.unit:''}. ${friendly(sample.why)}`}])},
   ...(spec.practical?[{kind:'connect' as const,title:'Try a construction',text:'Use the model, then make your own drawing on paper. Compare the features; a teacher or adult can check your drawing.',rows:spec.practical.map(text=>({text}))}]:[]),
   {kind:'practice',mode:'guided',title:'Build your confidence',text:p.track==='foundation'?'Use the model. Say what one part represents before calculating.':'Open a clue whenever it helps.',gen:guided,count:p.track==='foundation'?5:3},
   {kind:'practice',mode:'independent',title:'Try another example',gen:visual,count:3},
   {kind:'apply',title:'Use the idea',gen:word,count:2},
   {kind:'reason',title:'Explain and check',items:[why(371,0),reverse(571,1)]},
   {kind:'mastery',title:'Check what I know',gens:[{facet:'direct',gen:guided},{facet:'visual',gen:visual},{facet:'reverse',gen:reverse},{facet:'word',gen:word},{facet:'reasoning',gen:why}]},
   {kind:'discovery',title:'What we learned',text:`${sample.prompt} We found ${sample.answer}${sample.unit?' '+sample.unit:''}. ${friendly(sample.why)}`,math:sample.check,tool:linkedWorked?.at(-1)?.tool??sample.tool,caption:linkedWorked?.at(-1)?.caption}
  ]
 });

 result.mission={goal:spec.learningGoal??p.objective,question:sample.prompt,pictureExample,connection:spec.connection??focus.look};
 result.revision='catalogue-depth-2026-09-12-v1';
 return result;
}
export const table=(headers:string[],rows:(string|number)[][],caption:string):Tool=>({kind:'table',headers,rows:rows.map(r=>r.map(String)),caption});
export const diagram=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
export function exploreGeometry(mode:Extract<Tool,{kind:'geometry'}>['mode'],a:number,b=3,text='Change the model to match the target.'):TopicSpec['explore']{
 return {kind:'explore',title:'Make it, then notice',text,tool:{kind:'geometry',mode,a:a-(mode==='clock'?5:1),b},goal:t=>t.kind==='geometry'&&t.a===a&&t.b===b,goalHint:mode==='clock'?`Set Hour to ${Math.floor(a/60)%12||12}, Minute to ${a%60}, and choose ${a>=720?'pm':'am'}.`:`Set the first value to ${a}${['angle','ruler'].includes(mode)?'':` and the second to ${b}`}.`,success:'Your construction matches. Look at what changed and what stayed the same.'};
}
export const exploreFraction=(n=2,d=5):TopicSpec['explore']=>({kind:'explore',title:'Build a fraction',text:`Shade ${n} of the ${d} equal parts. Each part must be the same size.`,tool:{kind:'fractions',denominators:[d],shaded:[0]},goal:t=>t.kind==='fractions'&&t.shaded[0]===n,goalHint:`Tap the ${n}th part to shade ${n} parts.`,success:`The denominator counts all ${d} equal parts. The numerator counts the ${n} selected parts.`});
export const exploreArray=(rows=3,cols=4):TopicSpec['explore']=>({kind:'explore',title:'Build an array',text:`Make ${rows} rows with ${cols} in each row.`,tool:{kind:'array',rows:rows-1,cols},goal:t=>t.kind==='array'&&t.rows===rows&&t.cols===cols,goalHint:`Set rows to ${rows} and columns to ${cols}.`,success:`${rows} equal rows of ${cols} contain ${rows*cols} objects.`});
