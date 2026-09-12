import { Rng } from '../../engine/random';
import { rngFor } from '../gen';
import type { Facet,Gen,Item,Lesson,Rep,Stage,Tool } from '../model';
import type { PlanEntry } from './plan';
/**
 * Shared parts for building lessons from the teaching plan. Families supply the mathematics — the
 * models, the misconceptions and the questions — and this file supplies the lesson shape, so every
 * generated lesson still runs the full teaching cycle the exemplar lessons run.
 */
export type Why={question:string;answer:string;tool?:Tool};
export type RevealStep={text:string;math?:string;tool?:Tool;ask?:{prompt:string;answer:string;choices?:string[]}};
export type Booster={text:string;math?:string;tool?:Tool};
export type Row={text:string;math?:string;tool?:Tool};
export type Option={text:string;correct:boolean;reply:string};
/** An item with its required teaching parts. Clues and worked steps are never optional. */
export function item(o:{key:string;prompt:string;answer:string;hints:string[];steps:string[];
 display?:string;unit?:string;choices?:string[];exact?:boolean;facet?:Facet;rep?:Rep;tool?:Tool;
 another?:{title:string;steps:string[];tool?:Tool}[];simpler?:Item;wrong?:Record<string,string>;check?:string}):Item{
 return o as Item;
}
/** A generator whose questions are stable for a (seed, index) pair. */
export function gen(id:string,salt:string,make:(r:Rng,key:string)=>Item):Gen{
 return (seed,i)=>make(rngFor(id,seed,i,salt),`${salt}-${i}`);
}
export const readiness=(items:Item[],booster:Booster[],text?:string):Stage=>
 ({kind:'readiness',title:'Warm up your maths brain',text,items,booster});
export const hook=(title:string,text:string,tool?:Tool):Stage=>({kind:'hook',title,text,tool});
export const explore=(o:{title:string;text:string;tool:Tool;goal:(t:Tool)=>boolean;goalHint:string;success:string}):Stage=>
 ({kind:'explore',...o});
export const notice=(title:string,text:string,options:Option[],tool?:Tool):Stage=>
 ({kind:'notice',title,text,tool,options});
export const connect=(title:string,rows:Row[],text?:string):Stage=>({kind:'connect',title,text,rows});
export const explain=(o:{title:string;text:string;math?:string;tool?:Tool;why?:Why}):Stage=>({kind:'explain',...o});
export const worked=(problem:string,steps:RevealStep[],tool?:Tool,title='Worked example'):Stage=>
 ({kind:'worked',title,problem,tool,steps});
export const guided=(g:Gen,count=4,text?:string):Stage=>
 ({kind:'practice',mode:'guided',title:'Try it with help',text,gen:g,count});
export const solo=(g:Gen,count=4,text?:string):Stage=>
 ({kind:'practice',mode:'independent',title:'Try it on your own',text,gen:g,count});
export const apply=(g:Gen,count=2,text?:string):Stage=>({kind:'apply',title:'Use it in a story',text,gen:g,count});
export const reason=(items:Item[],text?:string):Stage=>({kind:'reason',title:'Maths detective',text,items});
export const mastery=(gens:{facet:Facet;gen:Gen}[]):Stage=>({kind:'mastery',title:'Show what you know',gens});
export const discovery=(title:string,text:string,math?:string,tool?:Tool):Stage=>({kind:'discovery',title,text,math,tool});
export interface Parts {
 /** Extra objectives after the syllabus objective the lesson is built for. */
 objectives?:string[];
 canDo:string[];representations:Rep[];misconceptions:{name:string;fix:string}[];grows?:string[];stages:Stage[];
}
/** Assemble a lesson from its plan entry, so the lesson and the lightweight index cannot disagree. */
export function makeLesson(p:PlanEntry,parts:Parts):Lesson{
 return {
  id:p.id,level:p.level,track:p.track,world:p.world,title:p.title,minutes:p.minutes,
  skillIds:p.skillIds,activityId:p.activityId,
  objectives:[p.objective,...(parts.objectives??[])],
  canDo:parts.canDo,prerequisites:p.prerequisites,
  representations:parts.representations,misconceptions:parts.misconceptions,grows:parts.grows,
  stages:parts.stages,
 };
}
/** A lesson builder for one topic code. */
export type Family=(p:PlanEntry)=>Lesson;
