import type {Item,Lesson,Stage} from '../../model';
import {CURRICULUM_SKILLS} from '../../../school/curriculum';
import {planFor} from '../../build/plan';
import {teachingFocus} from './focus';

/** Keep the broad lessons' authored activities, while making example changes and recovery explicit. */
export function deepenAuthored(lesson:Lesson):Lesson{
 const skill=CURRICULUM_SKILLS.find(s=>s.id===lesson.skillIds[0]);if(!skill)return lesson;
 const p=planFor(skill),focus=teachingFocus(p);
 const enhance=(item:Item):Item=>{
  const simpler=item.simpler??{key:`support-${item.key}`,prompt:focus.question,answer:focus.answer,choices:[focus.answer,focus.error],exact:true,tool:item.tool,requiresModel:!!item.tool,hints:[focus.look],steps:[focus.look,focus.why],check:focus.why,wrong:{[focus.error]:focus.why}};
  return {...item,simpler,requiresModel:item.requiresModel||item.facet==='visual'||item.facet==='unfamiliar',another:item.another?.length?item.another:[{title:'Read the meaning of the model',steps:[focus.look,...item.hints.slice(0,1)],tool:item.tool}]};
 };
 const stages=lesson.stages.map((s):Stage=>{
  if(s.kind==='worked')return {...s,title:s.title,flow:{phase:'together',label:'Bring the idea to this question',transition:`${focus.look} We will use that relationship with the question below. Read its own values before starting.`}};
  if(s.kind==='explain')return {...s,flow:{phase:'watch',label:'See why the relationship works',transition:`${focus.look} The picture example below has its own stated quantities; keep those quantities together through its steps.`}};
  if(s.kind==='hook')return {...s,next:`${focus.look} Follow the next activity to investigate that relationship.`};
  if(s.kind==='readiness'||s.kind==='reason')return {...s,items:s.items.map(enhance)};
  if(s.kind==='practice'||s.kind==='apply')return {...s,gen:(seed,i)=>enhance(s.gen(seed,i))};
  if(s.kind==='mastery')return {...s,gens:s.gens.map(g=>({...g,gen:(seed,i)=>enhance({...g.gen(seed,i),facet:g.facet})}))};
  return s;
 });
 return {...lesson,revision:'catalogue-depth-2026-09-12-v1',stages};
}
