import type {Activity} from './catalog';
import type {Track} from '../school/curriculum';
import type {ActivityProgress} from './progress';
import {makeQuestion} from './generate';
import {paperReasoningFamily,paperCompositionGroup} from './paperBlueprints';
import {hashString} from '../engine/random';

export const DAILY_DAYS=200;
export const DAILY_QUESTIONS=6;
export const DAILY_PLAN_VERSION=13;
const TOPIC_NAMES:Record<string,string>={WN:'Whole numbers',AS:'Adding and subtracting',MD:'Multiplying and dividing',FACT:'Factors and multiples',FRAC:'Fractions',MONEY:'Money',DEC:'Decimals',PCT:'Percentages',RATE:'Rate',RATIO:'Ratio',ALG:'Algebra',LENGTH:'Length',MEASURE:'Measurement',TIME:'Time',AREA:'Area and perimeter',VOL:'Volume',ANGLE:'Angles',LINES:'Lines',SYM:'Symmetry',SHAPE:'Shapes',SOLID:'Solid shapes',CIRCLE:'Circles',GRAPH:'Graphs',AVG:'Averages'};
export type DailyAddress={level:number;track:Track;day:number};
export interface DailyTopic {code:string;title:string;activities:Activity[];paper:Activity[]}
export interface DailyDay extends DailyAddress {id:string;week:number;term:number;dayOfWeek:number;review:boolean;topic:DailyTopic;topicIndex:number;topics:DailyTopic[];available:Activity[]}
export function dailyId(level:number,track:Track,day:number){return `p${level}${level>=5&&track==='foundation'?'f':'s'}-daily-${String(day).padStart(3,'0')}`;}
export function parseDailyId(id:string):DailyAddress|null{
 const match=/^p([1-6])([sf])-daily-(\d{3})$/.exec(id);if(!match)return null;
 const level=Number(match[1]),day=Number(match[3]),track:Track=match[2]==='f'?'foundation':'standard';
 return day>=1&&day<=DAILY_DAYS&&(track!=='foundation'||level>=5)?{level,track,day}:null;
}
const codeOf=(a:Activity)=>a.skillIds[0]?.split('.')[2]??a.objective.split('.')[0];
/** The existing catalogue follows curriculum topic order; no catalogue is read during module initialisation. */
export function dailyTopics(level:number,track:Track,activities:Activity[]):DailyTopic[]{
 const usable=activities.filter(a=>a.level===level&&a.track===(level<5?'standard':track)&&a.kind!=='daily'&&a.parameter!=='mixed');
 const groups=new Map<string,DailyTopic>();
 for(const a of usable.filter(a=>a.kind!=='paper')){
  const code=codeOf(a);if(!groups.has(code))groups.set(code,{code,title:TOPIC_NAMES[code]??code,activities:[],paper:[]});
  groups.get(code)!.activities.push(a);
 }
 for(const a of usable.filter(a=>a.kind==='paper')){
  const topic=groups.get(codeOf(a));if(topic){topic.paper.push(a);continue;}
  // A genuine earlier-year skill can still be useful review, without relabelling it as new coverage.
  if(!groups.has('REVIEW'))groups.set('REVIEW',{code:'REVIEW',title:'Problem-solving review',activities:[],paper:[]});
  groups.get('REVIEW')!.activities.push(a);
 }
 return [...groups.values()];
}
export function dailyPlanDay(level:number,track:Track,day:number,activities:Activity[]):DailyDay|null{
 const address=parseDailyId(dailyId(level,track,day));if(!address||address.level!==level||address.track!==track)return null;
 const topics=dailyTopics(level,track,activities);if(!topics.length)return null;
 const week=Math.floor((day-1)/5)+1,topicIndex=Math.min(topics.length-1,Math.floor((week-1)*topics.length/40)),topic=topics[topicIndex];
 const firstWeek=Math.ceil(topicIndex*40/topics.length)+1,lastWeek=Math.ceil((topicIndex+1)*40/topics.length);
 const dayOfWeek=(day-1)%5+1,teachingDays=(lastWeek-firstWeek+1)*4,through=(week-firstWeek)*4+Math.min(dayOfWeek,4);
 const introduced=Math.max(1,Math.ceil(through/teachingDays*topic.activities.length));
 return {...address,id:dailyId(level,track,day),week,term:Math.floor((day-1)/50)+1,dayOfWeek,review:dayOfWeek===5,topic,topicIndex,topics,available:topic.activities.slice(0,introduced)};
}
/** Cache by catalogue identity; each path is deterministic and independent of opening order. */
const sourcePlans=new WeakMap<Activity[],Map<string,Activity[][]>>();
type SourceProfile={families:string[];applied:boolean};
const sourceProfiles=new WeakMap<Activity,SourceProfile>();
/** Sample lazily: generate.ts imports the daily dispatcher, so never generate at module initialisation. */
function sourceProfile(activity:Activity):SourceProfile{
 const known=sourceProfiles.get(activity);if(known)return known;
 const questions=Array.from({length:4},(_,i)=>makeQuestion(activity,hashString(`daily-profile:${activity.id}:${i}`),i));
 const families=[...new Set(questions.map(q=>paperReasoningFamily(activity,q)))];
 const applied=questions.every(q=>{const group=paperCompositionGroup(activity,q);return group==='story'||group==='visual-data'||!!(q.gridDrawing||q.angleConstruction||q.structuredResponse||q.numberSentence||q.grouping);});
 const profile={families,applied};sourceProfiles.set(activity,profile);return profile;
}
function buildSourcePlan(level:number,track:Track,activities:Activity[]):Activity[][]{
 const used=new Map<string,number>(),days:Activity[][]=[];
 for(let day=1;day<=DAILY_DAYS;day++){
  const plan=dailyPlanDay(level,track,day,activities);if(!plan)return [];
  const {topic,available,topicIndex,topics}=plan;
  const introducedSkills=new Set([...topics.slice(0,topicIndex).flatMap(t=>t.activities),...available].flatMap(a=>a.skillIds));
  const readyPaper=(t:DailyTopic)=>t.paper.filter(a=>a.skillIds.every(id=>{
   if(introducedSkills.has(id)||Number(id.match(/^P(\d+)/)?.[1])<level)return true;
   const prerequisite=topics.findIndex(part=>part.code===id.split('.')[2]);
   return prerequisite>=0&&(prerequisite<topicIndex||prerequisite===topicIndex&&available.length===topic.activities.length);
  }));
  // Least-used ready tasks avoid starving larger paper pools or skills whose prerequisites
  // become available in a later topic. No task can appear before its prerequisites.
  const eligible=plan.review?topics.slice(0,topicIndex+1).flatMap(readyPaper):readyPaper(topic);
  const baseline=plan.review?[...topics.slice(0,topicIndex).flatMap(t=>t.activities),...available]:available;
  const pool=[...new Map([...baseline,...eligible].map(a=>[a.id,a])).values()];
  const picked=new Map<string,number>(),families=new Map<string,number>(),sources:Activity[]=[];
  const record=(a:Activity)=>{sources.push(a);used.set(a.id,(used.get(a.id)??0)+1);picked.set(a.id,(picked.get(a.id)??0)+1);for(const f of sourceProfile(a).families)families.set(f,(families.get(f)??0)+1);};
  // Keep one introduced task as the teaching anchor. The other five positions
  // can use ready school-paper tasks rather than four copies of the first drill.
  record(baseline.reduce((best,a)=>(used.get(a.id)??0)<(used.get(best.id)??0)?a:best));
  const appliedFamilies=new Set(pool.filter(a=>sourceProfile(a).applied).flatMap(a=>sourceProfile(a).families));
  const appliedTarget=Math.min(2,appliedFamilies.size);
  const compare=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
  while(sources.length<DAILY_QUESTIONS){
   const appliedCount=sources.filter(a=>sourceProfile(a).applied).length;
   const score=(a:Activity)=>{const profile=sourceProfile(a);return [Math.max(...profile.families.map(f=>families.get(f)??0)),picked.get(a.id)??0,Number(appliedCount<appliedTarget&&!profile.applied),used.get(a.id)??0,a.kind==='paper'?0:1];};
   const next=pool.reduce((best,a)=>compare(score(a),score(best))<0?a:best);record(next);
  }
  days.push(sources);
 }
 return days;
}
/** Six sources a day; every fifth day revisits introduced topics and less-practised paper tasks. */
export function dailySources(activity:Activity,activities:Activity[]):Activity[]{
 const address=parseDailyId(activity.id);if(!address)return [];
 let paths=sourcePlans.get(activities);if(!paths){paths=new Map();sourcePlans.set(activities,paths);}
 const key=`${address.level}:${address.track}`;
 if(!paths.has(key))paths.set(key,buildSourcePlan(address.level,address.track,activities));
 return [...(paths.get(key)![address.day-1]??[])];
}
export function sourceForDailyQuestion(activity:Activity,index:number,activities:Activity[]):Activity{
 const sources=dailySources(activity,activities);if(!sources.length)throw new Error(`Invalid daily practice: ${activity.id}`);
 return sources[((index%DAILY_QUESTIONS)+DAILY_QUESTIONS)%DAILY_QUESTIONS];
}
/** Resolve a day lazily; 1,600 virtual day activities never enter the browse catalogue. */
export function dailyActivity(id:string,activities:Activity[]):Activity|undefined{
 const address=parseDailyId(id);if(!address)return;
 const plan=dailyPlanDay(address.level,address.track,address.day,activities);if(!plan)return;
 const base:Activity={id,level:address.level,track:address.track,kind:'daily',strand:plan.topic.activities[0].strand,title:`Day ${address.day} · ${plan.review?'Review':plan.topic.title}`,objective:plan.review?'Revisit introduced ideas in six questions.':`Practise ${plan.topic.title.toLowerCase()} in six questions.`,skillIds:[],parameter:String(address.day),icon:'☀'};
 return {...base,skillIds:[...new Set(dailySources(base,activities).flatMap(a=>a.skillIds))]};
}
export function nextDailyDay(level:number,track:Track,records:Record<string,ActivityProgress>,unfinished:{activityId:string}[]=[]):number{
 const resumed=unfinished.map(s=>parseDailyId(s.activityId)).find(p=>p?.level===level&&p.track===track);
 if(resumed)return resumed.day;
 for(let day=1;day<=DAILY_DAYS;day++)if(!records[dailyId(level,track,day)]?.sessions)return day;
 return DAILY_DAYS;
}
export function firstDayForTopic(level:number,track:Track,code:string,activities:Activity[]):number{
 const topics=dailyTopics(level,track,activities),index=topics.findIndex(t=>t.code===code);
 return index<0?1:Math.ceil(index*40/topics.length)*5+1;
}
