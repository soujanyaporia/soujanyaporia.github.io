import { freshSeed,hashString } from '../engine/random';
import type { Activity,GameKind } from './catalog';
import { gameSession,makeQuestion,numberValue,type Proof,type Question } from './generate';
import { newSessionId,type PrimarySession,type RepairItem,type SessionMode } from './session';
/**
 * Question identity for resumable sessions. Bump a kind's version when its generator changes the
 * questions an existing seed produces; saved sessions from the old version then restart honestly.
 * Fingerprints also catch a changed generator whose version was not bumped. Hints and explanations
 * are not fingerprinted, so wording fixes do not invalidate saved sessions.
 */
const KIND_VERSIONS:Partial<Record<GameKind,number>>={};
export const GENERATOR_VERSION=1;
export const generatorVersion=(a:Activity)=>KIND_VERSIONS[a.kind]?`${GENERATOR_VERSION}.${KIND_VERSIONS[a.kind]}`:String(GENERATOR_VERSION);
export const fingerprint=(q:Question)=>hashString(JSON.stringify([q.prompt,q.display??'',q.answer,q.choices??[],q.order??[],q.fractionBuilder??0,q.picture??null,q.unit??''])).toString(16).padStart(8,'0');
const sameContent=(q:Question)=>JSON.stringify([q.prompt,q.display,q.picture,q.answer]);
export function questionFromKey(activity:Activity,key:string):Question|null{const m=/^([A-Za-z0-9-]+):(\d+):(\d+)$/.exec(key);return m&&m[1]===activity.id?makeQuestion(activity,Number(m[2]),Number(m[3])):null;}
/** Questions sharing a strategy have the same clue once numbers are ignored. */
export const strategyOf=(q:Question)=>q.hint.replace(/\d+(\.\d+)?/g,'#');
/**
 * A fresh question testing the same idea: same activity, the same strategy where the generator
 * offers one, and never the identical question. Replaying the original is only a memory check.
 */
export function nearTransfer(activity:Activity,original:Question,seed:number,slot:number,avoid:Set<string>):Question{
 let fallback:Question|null=null;
 for(let j=0;j<400;j++){const q=makeQuestion(activity,seed,slot*1000+j),key=sameContent(q);if(key===sameContent(original)||avoid.has(key))continue;if(strategyOf(q)===strategyOf(original))return q;fallback??=q;}
 return fallback??makeQuestion(activity,seed,slot*1000);
}
export function sessionQuestions(activity:Activity,s:Pick<PrimarySession,'mode'|'seed'|'repair'>):Question[]{
 if(s.mode==='practice')return gameSession(activity,s.seed);
 const avoid=new Set<string>();
 return s.repair.map((item,i)=>{const original=questionFromKey(activity,item.key),q=original?nearTransfer(activity,original,s.seed,i,avoid):makeQuestion(activity,s.seed,i*1000);avoid.add(sameContent(q));return q;});
}
export type Compatibility={ok:true;questions:Question[]}|{ok:false;reason:'activity'|'generator'|'questions'};
/** Regenerate a saved session and prove it is the same set of questions. */
export function checkSession(activity:Activity,s:PrimarySession):Compatibility{
 if(s.activityId!==activity.id)return {ok:false,reason:'activity'};
 if(s.generator!==generatorVersion(activity))return {ok:false,reason:'generator'};
 const questions=sessionQuestions(activity,s);
 if(questions.length!==s.count||questions.some((q,i)=>s.fingerprints[i]&&s.fingerprints[i]!==fingerprint(q)))return {ok:false,reason:'questions'};
 if(s.repair.some(item=>{const o=questionFromKey(activity,item.key);return !o||(!!item.fingerprint&&item.fingerprint!==fingerprint(o));}))return {ok:false,reason:'questions'};
 return {ok:true,questions};
}
export function createSession(activity:Activity,{mode='practice',repair=[],repairOf=null,now=Date.now(),seed=freshSeed()}:{mode?:SessionMode;repair?:RepairItem[];repairOf?:string|null;now?:number;seed?:number}={}):{session:PrimarySession;questions:Question[]}{
 const questions=sessionQuestions(activity,{mode,seed,repair});
 return {questions,session:{schema:1,id:newSessionId(),activityId:activity.id,generator:generatorVersion(activity),seed,count:questions.length,fingerprints:questions.map(fingerprint),mode,repairOf,repair,cursor:0,results:[],draft:null,startedAt:now,updatedAt:now,completedAt:null,stars:null}};
}
function evaluate(p:Proof):number{if(typeof p==='number')return p;const a=evaluate(p.a),b=evaluate(p.b);switch(p.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case 'round':return Math.round(a/b+1e-8)*b;case 'floor':return Math.floor(a/b)*b;}}
const symbol={'+':'+','-':'−','*':'×','/':'÷'} as const;
const show=(n:number)=>Number(n.toFixed(6)).toLocaleString('en-SG');
/** Whole-number intermediate steps (not the final step), e.g. `5 × 12 = 60`. */
function steps(p:Proof,root=true):{text:string;value:number}[]{
 if(typeof p==='number')return [];const inner=[...steps(p.a,false),...steps(p.b,false)];
 if(root||!(p.op in symbol))return inner;const a=evaluate(p.a),b=evaluate(p.b),value=evaluate(p);
 const useful=Number.isInteger(value)&&Number.isInteger(a)&&Number.isInteger(b)&&a!==0&&b!==0&&value!==a&&value!==b;
 return useful?[...inner,{text:`${show(a)} ${symbol[p.op as keyof typeof symbol]} ${show(b)} = ${show(value)}`,value}]:inner;
}
const swapped:Record<string,{op:'+'|'-'|'*'|'/';note:string}>={
 '+':{op:'-',note:'Your answer matches taking one number away from the other. In this question the amounts are parts that join to make the whole.'},
 '-':{op:'+',note:'Your answer matches joining the two numbers. In this question one number is the whole, and we need the part that is left or missing.'},
 '*':{op:'/',note:'Your answer matches dividing. In this question equal parts or groups are put together, so the total comes from multiplying.'},
 '/':{op:'*',note:'Your answer matches multiplying. In this question a total is split into equal parts, or we find how many equal groups fit.'},
};
/**
 * A targeted note about a wrong numerical answer, only when the evidence clearly fits one pattern:
 * a place-value slip, an unfinished multi-step calculation, the inverse relationship, or an answer
 * one away. Returns null otherwise; the worked explanation is always shown as well.
 */
export function diagnose(q:Question,wrong:string):string|null{
 const value=numberValue(wrong),correct=numberValue(q.answer);
 if(q.choices||q.order||q.fractionBuilder||value===null||correct===null||Math.abs(value-correct)<1e-9)return null;
 const near=(x:number)=>Math.abs(x-value)<1e-7*Math.max(1,Math.abs(x));
 if(correct!==0)for(const k of [10,100,1000]){if(near(correct*k))return `Your answer is ${k} times too large. Check the place value of each digit.`;if(near(correct/k))return `Your answer is ${k} times too small. Check the place value of each digit.`;}
 if(q.proof!==undefined&&typeof q.proof!=='number'){
  const step=steps(q.proof).find(s=>near(s.value));if(step)return `You found one step correctly: ${step.text}. The question needs another step to finish.`;
  const swap=swapped[q.proof.op];if(swap){const other=evaluate({...q.proof,op:swap.op});if(Number.isFinite(other)&&near(other))return swap.note;}
 }
 if(Number.isInteger(correct)&&Math.abs(value-correct)===1)return 'Your answer is one away. Count again, or check the last step carefully.';
 return null;
}
