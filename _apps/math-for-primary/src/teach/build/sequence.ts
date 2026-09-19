import {questionModel} from '../tools/questionModel';
import {investigation,topicExplore} from '../depth/catalogue/investigations';
import {lessonActivity} from '../depth/catalogue/activities';
import {prerequisite} from '../depth/catalogue/prerequisites';
import {teachingFocus} from '../depth/catalogue/focus';
import {modelFor} from '../depth/catalogue/questions';
import {mistakesFor} from '../depth/catalogue/mistakes';
import {plausible} from '../depth/catalogue/assess';
import {itemFactory} from '../depth/catalogue/assess';
import {arithmeticWorked} from './arithmeticSteps';
import {annotateSteps,friendly} from './teachingNotes';
import {visualGuide} from './guides';
import type {Rng} from '../../engine/random';
import {rngFor} from '../gen';
import type {Lesson,Tool,Stage,Rep,RevealStep} from '../model';
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
/** Carry question-specific support into the pauses inside a worked example. */
export function coachWorked(p:PlanEntry,sample:Example,steps:RevealStep[]):RevealStep[]{
 const wrong=Object.fromEntries(mistakesFor(p,sample).filter(m=>plausible(sample,m)).map(m=>[m.answer,m.why]));
 return steps.map(step=>{
  if(!step.ask)return step;
  const same=step.ask.prompt===sample.prompt&&step.ask.answer===sample.answer;
  return {...step,ask:{...(same?{wrong,unit:sample.unit,exact:sample.exact}:{}),...step.ask,hint:step.ask.hint??(same?sample.hint:step.caption??step.text)}};
 });
}
export function sequence(p:PlanEntry,spec:TopicSpec):Lesson{
 const rawSample=spec.anchor??lessonExample(p,spec,217,0),sample={...rawSample,tool:modelFor(p,rawSample)},guide=visualGuide(p),focus=teachingFocus(p);
 const activeModel=investigation(p,guide)??topicExplore(p,spec.explore)??lessonActivity(p);
 const pictureExample=spec.anchor?.prompt??guide.setup!,takeaway=guide.frames.at(-1)!.text;
 const fact=sample.evidence;
 const linkedWorked=spec.worked??(p.code==='AS'&&fact&&(fact.op==='+'||fact.op==='-')&&Math.max(fact.a,fact.b,Number(sample.answer))<=100?arithmeticWorked({a:fact.a,b:fact.b,c:Number(sample.answer),op:fact.op},sample.prompt):undefined);
 const items=itemFactory(p,spec,focus),guided=items.gen('direct',p.track==='foundation'),visual=items.gen('visual'),word=items.gen('word'),reverse=items.gen('reverse'),why=items.gen('reasoning');
 const noticeOptions=[{text:focus.error,correct:false,reply:focus.why},{text:focus.answer,correct:true,reply:focus.why}];if(rngFor(p.id,0,0,'notice').chance(.5))noticeOptions.reverse();
 const reps:Rep[]=['symbols','story'];if(sample.tool.kind==='fractions')reps.push('fraction-wall');else if(sample.tool.kind==='bar')reps.push('bar-model');else if(sample.tool.kind==='table')reps.push('table');else reps.push('diagram');
 const result=makeLesson(p,{
  canDo:[p.objective,focus.goal,'check the answer against the original quantities and units'],
  representations:reps,misconceptions:[{name:'A tempting shortcut',fix:spec.misconception}],
  stages:[
   prerequisite(p),
   {kind:'hook',title:'Meet our picture example',text:pictureExample,tool:spec.anchor?.tool??guide.frames[0].tool,caption:guide.frames[0].caption??guide.frames[0].text,next:'Before following the explanation, think about the relationship we will look for in this picture.',flow:{phase:'watch',label:'First, meet the example',transition:'We will follow this picture step by step before trying a question with help.'}},
   {kind:'notice',actionLabel:'Think about the picture',title:'What should we look for?',text:focus.question,tool:guide.frames[0].tool,options:noticeOptions,flow:{phase:'watch',label:'Give the picture a purpose',transition:focus.look}},
   {kind:'explain',title:guide.title,text:guide.frames[0].text,example:pictureExample,method:guide.method,flow:{phase:'watch',label:'Watch the same example',transition:guide.method?.intro??focus.look},frames:annotateSteps(guide.frames.map((f,i)=>i===0?{...f,because:f.because??focus.why}:f)),alternatives:guide.alternatives?.map(a=>({...a,frames:annotateSteps(a.frames)})),why:{question:'What did the picture help us see?',answer:guide.frames.at(-1)!.text}},
   ...(activeModel?[activeModel]:[]),
   {kind:'worked',title:spec.anchor?'Let’s solve our question together':'A new example, together',flow:{phase:'together',label:spec.anchor?'Back to our question':'Use the idea with a new example',transition:spec.anchor?'Keep the same counters. This time, you will finish the answer.':'The picture example is complete. We are changing the example now; read the new question below before starting.',carry:takeaway},problem:sample.prompt+(sample.display?' '+sample.display:''),tool:sample.tool,steps:coachWorked(p,sample,annotateSteps(linkedWorked??[{text:focus.look,tool:questionModel(sample.tool),because:friendly(sample.why)},{text:sample.hint,tool:questionModel(sample.tool),ask:{prompt:sample.prompt,answer:sample.answer,choices:sample.choices}},...sample.steps.map(text=>({text:friendly(text),tool:sample.tool})),{text:'Check the result against the question we started with.',tool:sample.tool,math:sample.check,because:`We found ${sample.answer}${sample.unit?' '+sample.unit:''}. ${friendly(sample.why)}`}]))},
   ...(spec.practical?[{kind:'connect' as const,title:'Try a construction',text:'Use the model, then make your own drawing on paper. Compare the features; a teacher or adult can check your drawing.',rows:spec.practical.map(text=>({text}))}]:[]),
   {kind:'practice',mode:'guided',title:'Build your confidence',text:p.track==='foundation'?'Use the model. Say what one part represents before calculating.':'Open a clue whenever it helps.',gen:guided,count:p.track==='foundation'?5:3},
   {kind:'practice',mode:'independent',title:'Try another example',gen:visual,count:3},
   {kind:'apply',title:'Use the idea',gen:word,count:2},
   {kind:'reason',title:'Explain and check',items:[why(371,0),reverse(571,1)]},
   {kind:'mastery',title:'Check what I know',gens:items.facets.map(facet=>({facet,gen:items.gen(facet)}))},
   {kind:'discovery',title:'What we learned',text:`${sample.prompt} We found ${sample.answer}${sample.unit?' '+sample.unit:''}. ${friendly(sample.why)}`,math:sample.check,tool:linkedWorked?.at(-1)?.tool??sample.tool,caption:linkedWorked?.at(-1)?.caption}
  ]
 });

 result.mission={goal:spec.learningGoal??p.objective,question:sample.prompt,pictureExample,connection:spec.connection??focus.look};
 result.revision='catalogue-depth-2026-09-19-v4';
 return result;
}
export const table=(headers:string[],rows:(string|number)[][],caption:string):Tool=>({kind:'table',headers,rows:rows.map(r=>r.map(String)),caption});
export const diagram=(picture:Extract<Tool,{kind:'diagram'}>['picture'],caption:string):Tool=>({kind:'diagram',picture,caption});
export function exploreGeometry(mode:Extract<Tool,{kind:'geometry'}>['mode'],a:number,b=3,text='Change the model to match the target.'):TopicSpec['explore']{
 return {kind:'explore',title:'Make it, then notice',text,tool:{kind:'geometry',mode,a:a-(mode==='clock'?5:1),b},goal:t=>t.kind==='geometry'&&t.a===a&&t.b===b,goalHint:mode==='clock'?`Set Hour to ${Math.floor(a/60)%12||12}, Minute to ${a%60}, and choose ${a>=720?'pm':'am'}.`:`Set the first value to ${a}${['angle','ruler'].includes(mode)?'':` and the second to ${b}`}.`,success:'Your construction matches. Look at what changed and what stayed the same.'};
}
export const exploreFraction=(n=2,d=5):TopicSpec['explore']=>({kind:'explore',title:'Build a fraction',text:`Shade ${n} of the ${d} equal parts. Each part must be the same size.`,tool:{kind:'fractions',denominators:[d],shaded:[0]},goal:t=>t.kind==='fractions'&&t.shaded[0]===n,goalHint:`Tap the ${n}th part to shade ${n} parts.`,success:`The denominator counts all ${d} equal parts. The numerator counts the ${n} selected parts.`});
export const exploreArray=(rows=3,cols=4):TopicSpec['explore']=>({kind:'explore',title:'Build an array',text:`Make ${rows} rows with ${cols} in each row.`,tool:{kind:'array',rows:rows-1,cols},goal:t=>t.kind==='array'&&t.rows===rows&&t.cols===cols,goalHint:`Set rows to ${rows} and columns to ${cols}.`,success:`${rows} equal rows of ${cols} contain ${rows*cols} objects.`});
