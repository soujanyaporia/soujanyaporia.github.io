import {ACTIVITIES,type Activity} from '../primary/catalog';
import {makeQuestion,type Question} from '../primary/generate';
import {paperCompositionGroup,paperReasoningFamily} from '../primary/paperBlueprints';
import {adaptedPattern} from '../primary/paperImports/catalog';
import {Rng,hashString} from '../engine/random';
import type {LessonMeta} from './handIndex';
type Scope=Pick<LessonMeta,'id'|'level'|'track'|'skillIds'>;
/** Extend a completed lesson using its own skills and earlier-grade prerequisites. */
export function lessonApplication(lesson:Scope,seed:number,index=0):{activity:Activity;question:Question}|undefined{
 const pool=ACTIVITIES.filter(a=>a.kind==='paper'&&a.parameter!=='mixed'&&a.level===lesson.level&&(lesson.track==='both'||a.track===lesson.track)&&adaptedPattern(a.parameter??'')&&a.skillIds.some(id=>lesson.skillIds.includes(id))&&a.skillIds.every(id=>lesson.skillIds.includes(id)||Number(id.match(/^P(\d+)/)?.[1])<lesson.level));
 const seen=new Set<string>(),examples:{activity:Activity;question:Question}[]=[];
 for(const activity of new Rng(hashString(`${lesson.id}:${seed}`)).shuffle(pool)){
  const question=makeQuestion(activity,hashString(`${lesson.id}:${seed}:${activity.id}`),0),family=paperReasoningFamily(activity,question);
  if(paperCompositionGroup(activity,question)==='computation'||seen.has(family))continue;
  seen.add(family);examples.push({activity,question});
 }
 if(!examples.length)return undefined;
 const selected=examples[index%examples.length];
 return index<examples.length?selected:{activity:selected.activity,question:makeQuestion(selected.activity,hashString(`${lesson.id}:${seed}:${index}:${selected.activity.id}`),index%6)};
}
