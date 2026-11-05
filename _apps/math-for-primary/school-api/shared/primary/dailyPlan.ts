import type {Activity} from './catalog';
import type {Track} from '../school/curriculum';
import type {ActivityProgress} from './progress';

export const DAILY_DAYS=200;
export const DAILY_QUESTIONS=6;
export const DAILY_PLAN_VERSION=11;
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
  const picked=new Set<string>(),pickedPatterns=new Set<string>();
  const nextPaper=()=>{
   const remaining=eligible.filter(a=>!picked.has(a.id)),distinct=remaining.filter(a=>!pickedPatterns.has(a.canonicalPatternId??a.id));
   const pool=distinct.length?distinct:remaining;if(!pool.length)return undefined;
   const a=pool.reduce((best,a)=>(used.get(a.id)??0)<(used.get(best.id)??0)?a:best);
   used.set(a.id,(used.get(a.id)??0)+1);picked.add(a.id);pickedPatterns.add(a.canonicalPatternId??a.id);return a;
  };
  // Multiple activities may become available at once in a larger catalogue. Select
  // the least-practised introduced activity so none are skipped by index jumps.
  const pickedBaseline=new Set<string>();
  const nextBaseline=(pool:Activity[])=>{
   const distinct=pool.filter(a=>!pickedBaseline.has(a.id)),candidates=distinct.length?distinct:pool;
   const a=candidates.reduce((best,item)=>(used.get(item.id)??0)<(used.get(best.id)??0)?item:best);
   used.set(a.id,(used.get(a.id)??0)+1);pickedBaseline.add(a.id);return a;
  };
  const sources=Array.from({length:DAILY_QUESTIONS},(_,i)=>{
   if(i>=4){const paper=nextPaper();if(paper)return paper;}
   if(plan.review){const prior=topics.slice(0,topicIndex).flatMap(t=>t.activities);return nextBaseline([...prior,...available]);}
   return nextBaseline(available);
  });
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
