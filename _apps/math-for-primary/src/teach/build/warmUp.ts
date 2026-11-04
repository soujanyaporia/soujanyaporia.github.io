import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {modelFor} from '../depth/catalogue/questions';
import type {Item,Lesson,Stage} from '../model';
import {dataSpec} from './families/data';
import {fractionSpec} from './families/fractions';
import {measureSpec} from './families/measure';
import {arithmeticSpec,numberSpec} from './families/numbers';
import {proportionSpec} from './families/proportion';
import {spaceSpec} from './families/space';
import {planFor,type PlanEntry} from './plan';
import {lessonExample,type Example,type TopicSpec} from './sequence';

/**
 * The warm-up asks about this lesson's own building block: the objective the syllabus map records as
 * its prerequisite, generated from that objective's own topic. A P6 lesson on circles therefore opens
 * with an earlier circle idea rather than a P1 counting question. Where an objective has no built
 * prerequisite — the first objective of a topic in P1 — `prerequisites.ts` supplies the general
 * starting point instead.
 */
const SPEC:Record<string,(p:PlanEntry)=>TopicSpec>={
 WN:p=>/order of operations|brackets|multiply and divide by/.test(p.objective.toLowerCase())?arithmeticSpec(p):numberSpec(p),
 AS:arithmeticSpec,MD:arithmeticSpec,FACT:arithmeticSpec,FRAC:fractionSpec,
 DEC:p=>/measurement|measurements/.test(p.objective)?measureSpec(p):proportionSpec(p),
 MONEY:proportionSpec,PCT:proportionSpec,RATE:proportionSpec,RATIO:proportionSpec,ALG:proportionSpec,
 LENGTH:measureSpec,MEASURE:measureSpec,TIME:measureSpec,AREA:measureSpec,VOL:measureSpec,
 ANGLE:spaceSpec,LINES:spaceSpec,SYM:spaceSpec,SHAPE:spaceSpec,SOLID:spaceSpec,CIRCLE:spaceSpec,GRAPH:dataSpec,
};
/** A warm-up should be the gentlest form of the earlier idea, so the lesson itself carries the new load. */
const weight=(e:Example)=>{
 const ns=(e.prompt.match(/\d+(?:\.\d+)?/g)??[]).map(Number);
 return [Math.max(0,...ns),ns.reduce((s,n)=>s+n,0),e.prompt.length] as const;
};
const lighter=(a:Example,b:Example)=>{const x=weight(a),y=weight(b);return x[0]!==y[0]?x[0]-y[0]:x[1]!==y[1]?x[1]-y[1]:x[2]-y[2];};
/** Lower-case an objective so it can be read inside a sentence, keeping names and units as written. */
const inSentence=(title:string)=>title.replace(/^[A-Z](?=[a-z])/,c=>c.toLowerCase());

export function warmUpItem(p:PlanEntry):{item:Item;link:string;code:string;size:number}|undefined{
 const skill=CURRICULUM_SKILLS.find(s=>s.id===p.skill.prerequisites[0]);
 if(!skill)return undefined;
 const earlier=planFor(skill),make=SPEC[earlier.code];
 if(!make)return undefined;
 const spec=make(earlier);
 // One variant family, several seeds: the lightest numbers of the set, chosen deterministically.
 let best:Example|undefined;
 for(let k=0;k<6;k++){
  const candidate=lessonExample(earlier,spec,311+k*29,0);
  if(!candidate.answer.trim()||!Number.isFinite(candidate.prompt.length))continue;
  if(!best||lighter(candidate,best)<0)best=candidate;
 }
 if(!best)return undefined;
 const e=best,tool=modelFor(earlier,e);
 const item:Item={
  key:`building-block-${earlier.id}`,
  prompt:e.prompt+(e.display?' '+e.display:''),answer:e.answer,unit:e.unit,choices:e.choices,exact:e.exact,
  tool,requiresModel:true,
  hints:[e.hint,...(e.steps.length>1?[e.steps[0]]:[])].filter(h=>h&&h.trim().length>4),
  steps:[...e.steps],check:e.check,
 };
 if(!item.hints.length)item.hints=[e.steps[0]??`Work through ${inSentence(earlier.title)} one step at a time.`];
 const when=earlier.level<p.level?`In Primary ${earlier.level} you learned to`:'Earlier you learned to';
 return {item,link:`${when} ${inSentence(earlier.title)}. This lesson builds on that, so here is one question on it first.`,code:earlier.code,size:weight(e)[0]};
}
/** The largest number the lesson itself works with, so a warm-up is never the harder question. */
function lessonSize(lesson:Lesson):number{
 const guided=lesson.stages.find(s=>s.kind==='practice');
 if(guided?.kind!=='practice')return Infinity;
 let most=0;
 for(let seed=0;seed<3;seed++)for(let k=0;k<3;k++)for(const n of guided.gen(23+seed*101,k).prompt.match(/\d+(?:\.\d+)?/g)??[])most=Math.max(most,Number(n));
 return most||Infinity;
}
/** Where a bigger number does mean harder arithmetic; elsewhere magnitude says nothing about difficulty. */
const SIZED=new Set(['WN','AS','MD','FACT']);
/** Replace the general starting point with this lesson's own prerequisite, where the map records one. */
export function withPrerequisiteWarmUp(lesson:Lesson,p:PlanEntry):Lesson{
 const made=warmUpItem(p);
 if(!made)return lesson;
 const {item,link,code,size}=made;
 // Syllabus order is not difficulty order: a mental-method objective follows the written one it
 // simplifies. Keep the general starting point rather than opening with the harder question.
 if(SIZED.has(code)&&code===p.code&&size>lessonSize(lesson)*2)return lesson;
 return {...lesson,stages:lesson.stages.map((s):Stage=>s.kind!=='readiness'?s:({
  ...s,title:'The idea this lesson builds on',text:link,items:[item],
  booster:[{text:item.hints[0],tool:item.tool},...(item.check?[{text:item.check}]:[])],
  flow:{phase:'watch',label:'Check the earlier idea',transition:link},
 }))};
}
