import {hashString,Rng} from '../engine/random';
import {solutionFrames} from '../media/solution';
import type {Track} from '../school/curriculum';
import {ACTIVITIES,type Activity} from './catalog';
import {makeQuestion,type Question} from './generate';
import {paperReasoningFamily,paperResponseForm,paperCompositionGroup,paperBlueprint} from './paperBlueprints';

/** Bump when the source schedule, seeded draws or question semantics change. */
export const PRACTICE_PAPER_VERSION=9;
export const PRACTICE_PAPER_COUNTS=[6,12,18] as const;
export type PracticePaperCount=typeof PRACTICE_PAPER_COUNTS[number];
export interface PaperRequest {level:number;track:Track;count:PracticePaperCount;topic:string;seed:number}
export interface PracticePaperTopic {id:string;title:string;activityCount:number;paperFamilyCount:number;structureCount:number;responseTypeCount:number;repeatedStructurePractice:boolean;maxCount:PracticePaperCount}
export interface PracticePaperItem {number:number;activity:Activity;question:Question}
export interface PracticePaper {version:number;code:string;request:PaperRequest;items:PracticePaperItem[];diversity:{structureCount:number;responseTypeCount:number;repeatedStructures:number}}
export interface RestoredPracticePaper {paper:PracticePaper;answers:(string|null)[];cursor:number}

const TOPIC_NAMES:Record<string,string>={WN:'Whole numbers',AS:'Adding and subtracting',MD:'Multiplying and dividing',FACT:'Factors and multiples',FRAC:'Fractions',MONEY:'Money',DEC:'Decimals',PCT:'Percentages',RATE:'Rate',RATIO:'Ratio',ALG:'Algebra',LENGTH:'Length',MEASURE:'Measurement',TIME:'Time',AREA:'Area and perimeter',VOL:'Volume',ANGLE:'Angles',LINES:'Lines',SYM:'Symmetry',SHAPE:'Shapes',SOLID:'Solid shapes',CIRCLE:'Circles',GRAPH:'Graphs',AVG:'Averages'};
const norm=(s:string)=>s.trim().replace(/\s+/g,' ');
const topicOf=(a:Activity)=>a.skillIds[0]?.split('.')[2]??a.objective.split('.')[0];
type BankSample={activity:Activity;question:Question};
type TopicBank={samples:BankSample[];families:Map<string,BankSample[]>;responseTypeCount:number;maxCount:PracticePaperCount|0};
const bankCache=new WeakMap<Activity[],Map<string,TopicBank>>();
function validPath(level:number,track:Track){return Number.isInteger(level)&&level>=1&&level<=6&&(track==='standard'||track==='foundation'&&level>=5);}
function sourcesFor(level:number,track:Track,activities:Activity[]){
 if(!validPath(level,track))return [];
 return activities.filter(a=>a.level===level&&a.track===track&&a.kind!=='daily'&&a.parameter!=='mixed');
}

/** Prove that a displayed size is constructible. Keep these deterministic samples as a fallback,
 * so a later unlucky random draw cannot make an advertised paper impossible. The observed domain
 * is capped at 18; this is not a claim that a topic has only 18 possible questions. */
function topicBank(pool:Activity[],activities:Activity[]):TopicBank{
 let cache=bankCache.get(activities);if(!cache){cache=new Map();bankCache.set(activities,cache);}
 const signature=JSON.stringify(pool.map(a=>[a.id,a.level,a.track,a.kind,a.parameter,a.canonicalPatternId,a.skillIds]));
 const known=cache.get(signature);if(known)return known;
 const samples:BankSample[]=[],seen=new Set<string>(),families=new Map<string,BankSample[]>(),profiles=new Set<string>(),forms=new Set<string>();
 // Observe reasoning variants, rather than interpreting new operands as new task types.
 // Four draws per activity are a bounded catalogue sample, not exhaustive pattern coverage.
 for(let attempt=0;attempt<96&&(attempt<4||samples.length<18);attempt++)for(const activity of pool){
  const question=makeQuestion(activity,hashString(`paper-bank-v${PRACTICE_PAPER_VERSION}:${activity.id}:${attempt}`),attempt%6),key=visibleQuestionKey(question);
  const family=paperReasoningFamily(activity,question),form=paperResponseForm(question),profile=JSON.stringify([family,activity.id,form]);
  forms.add(form);
  if(!profiles.has(profile)){profiles.add(profile);families.set(family,[...(families.get(family)??[]),{activity,question}]);}
  if(samples.length<18&&!seen.has(key)){seen.add(key);samples.push({activity,question});}
 }
 const capacity=samples.length>=18?18:samples.length>=12?12:samples.length>=6?6:0;
 const variety=families.size>=18?18:families.size>=12?12:6;
 const maxCount=Math.min(capacity,variety) as PracticePaperCount|0;
 const bank={samples,families,responseTypeCount:forms.size,maxCount};cache.set(signature,bank);return bank;
}

/** Honest topics from the selected catalogue, including explicitly tagged prerequisite review. */
export function practicePaperTopics(level:number,track:Track,activities:Activity[]=ACTIVITIES):PracticePaperTopic[]{
 const all=sourcesFor(level,track,activities);
 if(!all.length)return [];
 const groups=new Map<string,Activity[]>();
 for(const a of all){const code=topicOf(a);groups.set(code,[...(groups.get(code)??[]),a]);}
 const describe=(id:string,title:string,pool:Activity[]):PracticePaperTopic[]=>{
  const {maxCount,families,responseTypeCount}=topicBank(pool,activities);
  return maxCount?[{id,title,activityCount:pool.length,paperFamilyCount:pool.filter(a=>a.kind==='paper').length,structureCount:families.size,responseTypeCount,repeatedStructurePractice:families.size<6,maxCount}]:[];
 };
 return [...describe('mixed','Mixed practice',all),...[...groups].flatMap(([id,pool])=>describe(id,TOPIC_NAMES[id]??id,pool))];
}

function checkedRequest(input:PaperRequest,activities:Activity[]):PaperRequest{
 if(!input||!validPath(input.level,input.track))throw new RangeError('Choose P1–P6 Standard, or P5–P6 Foundation.');
 if(!PRACTICE_PAPER_COUNTS.includes(input.count))throw new RangeError('Choose a paper with 6, 12 or 18 questions.');
 if(!Number.isInteger(input.seed)||input.seed<0||input.seed>0xffffffff)throw new RangeError('The paper seed must be a whole number from 0 to 4294967295.');
 const topic=typeof input.topic==='string'?(input.topic.toLowerCase()==='mixed'?'mixed':input.topic.toUpperCase()):'';
 const selection=practicePaperTopics(input.level,input.track,activities).find(t=>t.id===topic);
 if(!selection)throw new RangeError('This topic is not available for the selected level and course.');
 if(input.count>selection.maxCount){const pool=sourcesFor(input.level,input.track,activities).filter(a=>topic==='mixed'||topicOf(a)===topic),bank=topicBank(pool,activities);throw new PracticePaperCapacityError(bank.samples.length,bank.families.size);}
 return {level:input.level,track:input.track,count:input.count,topic,seed:input.seed};
}
function codeFor(request:PaperRequest){
 const body=`SGM${PRACTICE_PAPER_VERSION}-P${request.level}${request.track==='foundation'?'F':'S'}-${request.count}-${request.topic==='mixed'?'MIX':request.topic}-${request.seed.toString(36).toUpperCase()}`;
 return `${body}-${hashString(body).toString(36).toUpperCase()}`;
}
/** A checksum catches mistyped share codes; it is not an authentication or access-control token. */
export function serializePracticePaper(request:PaperRequest,activities:Activity[]=ACTIVITIES):string{return codeFor(checkedRequest(request,activities));}
export function parsePracticePaperCode(code:string,activities:Activity[]=ACTIVITIES):PaperRequest|null{
 if(typeof code!=='string')return null;
 const normalized=code.trim().toUpperCase(),m=/^SGM(\d+)-P([1-6])([SF])-(6|12|18)-([A-Z]+)-([0-9A-Z]{1,7})-([0-9A-Z]{1,7})$/.exec(normalized);
 if(!m||Number(m[1])!==PRACTICE_PAPER_VERSION)return null;
 try{
  const request=checkedRequest({level:Number(m[2]),track:m[3]==='F'?'foundation':'standard',count:Number(m[4]) as PracticePaperCount,topic:m[5]==='MIX'?'mixed':m[5],seed:parseInt(m[6],36)},activities);
  return codeFor(request)===normalized?request:null;
 }catch{return null;}
}

/** Ignore shuffled distractors and invisible answers: neither makes a repeated question fresh. */
export function visibleQuestionKey(q:Question):string{
 const visible:unknown[]=[norm(q.prompt),norm(q.display??''),q.picture??null,q.order?[...q.order].sort():null,q.fractionBuilder??null,norm(q.unit??'')];
 if(q.context?.length)visible.push(q.context.map(norm));
 if(q.numberSentence)visible.push({...q.numberSentence,numbers:[...q.numberSentence.numbers].sort((a,b)=>a-b)});
 if(q.answerFormat)visible.push(q.answerFormat);
 if(q.grouping)visible.push(q.grouping);
 if(q.structuredResponse){const spec=q.structuredResponse;visible.push(spec.kind==='fraction-pair'||spec.kind==='named-pair'?{...spec,options:[...spec.options].sort()}:spec);}
 if(q.angleConstruction)visible.push(q.angleConstruction);
 if(q.requireMixed)visible.push('mixed-number');
 return JSON.stringify(visible);
}
const resumeFingerprint=(q:Question)=>hashString(JSON.stringify([visibleQuestionKey(q),q.answer,q.choices?[...q.choices].sort():null,q.order??null,q.requireSimplified??false,q.requireImproper??false])).toString(16).padStart(8,'0');

/** Rank whole reasoning families before their operand/response variants. This makes a family
 * with twenty arithmetic configurations compete once, rather than twenty times, for a slot. */
function rankedFamilies(items:PracticePaperItem[],order:Map<string,BankSample[]>,request:PaperRequest):[string,BankSample[]][]{
 const used=new Map<string,number>(),strands=new Map<string,number>(),topics=new Map<string,number>(),groups=new Map<string,number>(),activities=new Map<string,number>();
 for(const {activity:a,question:q} of items){
  for(const [map,key] of [[used,paperReasoningFamily(a,q)],[strands,a.strand],[topics,topicOf(a)],[groups,paperCompositionGroup(a,q)],[activities,a.id]] as const)map.set(key,(map.get(key)??0)+1);
 }
 const preferredGroup=paperBlueprint(request.level)?.preferredForms[items.length%4];
 const availableTopics=new Set([...order.values()].flatMap(profiles=>profiles.map(({activity})=>topicOf(activity)))),topicLimit=Math.ceil(request.count/Math.min(availableTopics.size,6));
 const last=items.at(-1),lastFamily=last&&paperReasoningFamily(last.activity,last.question),lastForm=last&&paperResponseForm(last.question),lastGroup=last&&paperCompositionGroup(last.activity,last.question);
 const compare=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
 const profileScore=({activity:a,question:q}:BankSample)=>[Number(paperResponseForm(q)===lastForm),a.kind==='paper'?0:1,activities.get(a.id)??0];
 const ranked=[...order].map(([family,profiles])=>[family,[...profiles].sort((a,b)=>compare(profileScore(a),profileScore(b)))] as [string,BankSample[]]);
 const familyScore=([family,profiles]:[string,BankSample[]])=>{
  const {activity:a,question:q}=profiles[0],group=paperCompositionGroup(a,q);
  return [used.get(family)??0,Number(family===lastFamily),Number((topics.get(topicOf(a))??0)>=topicLimit),Number(topicOf(a)===(last&&topicOf(last.activity))),topics.get(topicOf(a))??0,Number(a.strand===last?.activity.strand),strands.get(a.strand)??0,Number(group!==preferredGroup),Number(group===lastGroup),groups.get(group)??0,Number(paperResponseForm(q)===lastForm),a.kind==='paper'?0:1];
 };
 // Stable sorting retains the seed-shuffled family tie order.
 return ranked.sort((a,b)=>compare(familyScore(a),familyScore(b)));
}

export class PracticePaperCapacityError extends Error {
 readonly available:number;
 readonly structureCount?:number;
 constructor(available:number,structureCount?:number){super(structureCount===undefined?`This topic produced only ${available} different questions. Choose a shorter paper or Mixed practice.`:`This topic has ${structureCount} task structure${structureCount===1?'':'s'}. Choose a shorter paper or Mixed practice for more variety.`);this.name='PracticePaperCapacityError';this.available=available;this.structureCount=structureCount;}
}

/** No storage, clock or random global: a code always regenerates the same paper in this version. */
export function generatePracticePaper(input:PaperRequest,activities:Activity[]=ACTIVITIES):PracticePaper{
 const request=checkedRequest(input,activities),code=codeFor(request);
 const pool=sourcesFor(request.level,request.track,activities).filter(a=>request.topic==='mixed'||topicOf(a)===request.topic);
 const bank=topicBank(pool,activities),seen=new Set<string>(),items:PracticePaperItem[]=[],r=new Rng(hashString(`${code}:families`));
 const familyOrder=new Map(r.shuffle([...bank.families]).map(([family,profiles])=>[family,r.shuffle(profiles)]));
 const item=(activity:Activity,q:Question,slot:number):PracticePaperItem=>{
  const workedSteps=q.workedSteps??solutionFrames(q).map(f=>({text:f.text,equation:f.equation,picture:f.model??q.picture}));
  return {number:slot+1,activity,question:{...q,key:`paper:${code}:${slot}`,sourceActivityId:activity.id,workedSteps}};
 };
 for(let slot=0;slot<request.count;slot++){
  let selected:PracticePaperItem|undefined;
  for(const [family,profiles] of rankedFamilies(items,familyOrder,request)){
   const tried=new Set<string>();
   for(const {activity} of profiles){
    if(tried.has(activity.id))continue;tried.add(activity.id);
    for(let attempt=0;attempt<64;attempt++){
     const drawSeed=hashString(`${code}:${slot}:${activity.id}:${attempt}`),q=makeQuestion(activity,drawSeed,slot),key=visibleQuestionKey(q);
     if(paperReasoningFamily(activity,q)!==family||seen.has(key))continue;
     seen.add(key);selected=item(activity,q,slot);break;
    }
    if(selected)break;
   }
   if(!selected){
    const reserve=[...profiles,...bank.samples].find(sample=>paperReasoningFamily(sample.activity,sample.question)===family&&!seen.has(visibleQuestionKey(sample.question)));
    if(reserve){seen.add(visibleQuestionKey(reserve.question));selected=item(reserve.activity,reserve.question,slot);}
   }
   if(selected)break;
  }
  if(!selected)throw new PracticePaperCapacityError(items.length);
  items.push(selected);
 }
 const structures=new Set(items.map(({activity,question})=>paperReasoningFamily(activity,question))),forms=new Set(items.map(({question})=>paperResponseForm(question)));
 return {version:PRACTICE_PAPER_VERSION,code,request,items,diversity:{structureCount:structures.size,responseTypeCount:forms.size,repeatedStructures:items.length-structures.size}};
}

/** Save answers separately from the seed/code; the full paper is reproducible and never stores score claims. */
export function serializePaperResume(paper:PracticePaper,answers:(string|null)[],cursor:number):string{
 if(paper.version!==PRACTICE_PAPER_VERSION||paper.code!==codeFor(paper.request)||paper.items.length!==paper.request.count)throw new RangeError('Invalid paper snapshot.');
 if(answers.length!==paper.items.length||answers.some(a=>a!==null&&typeof a!=='string'))throw new RangeError('Save one answer or null for each question.');
 if(!Number.isInteger(cursor)||cursor<0||cursor>paper.items.length)throw new RangeError('Invalid paper position.');
 return JSON.stringify({version:PRACTICE_PAPER_VERSION,code:paper.code,answers,cursor,fingerprints:paper.items.map(item=>resumeFingerprint(item.question))});
}
/** Reject malformed data or changed generated questions rather than attaching saved answers to another paper. */
export function restorePaperResume(serialized:string,activities:Activity[]=ACTIVITIES):RestoredPracticePaper|null{
 try{
  const saved:unknown=JSON.parse(serialized);
  if(!saved||typeof saved!=='object')return null;
  const s=saved as Record<string,unknown>;
  if(s.version!==PRACTICE_PAPER_VERSION||typeof s.code!=='string'||!Array.isArray(s.answers)||!Array.isArray(s.fingerprints)||!Number.isInteger(s.cursor))return null;
  const request=parsePracticePaperCode(s.code,activities);if(!request)return null;
  const count=request.count,cursor=s.cursor as number;
  if(s.answers.length!==count||s.fingerprints.length!==count||cursor<0||cursor>count||s.answers.some(a=>a!==null&&typeof a!=='string'))return null;
  const paper=generatePracticePaper(request,activities),fingerprints=s.fingerprints as unknown[];
  if(paper.items.some((item,i)=>fingerprints[i]!==resumeFingerprint(item.question)))return null;
  return {paper,answers:s.answers as (string|null)[],cursor};
 }catch{return null;}
}
