import {groupingReady,type GroupingSpec} from './groupingAnswer';
export type SentenceOperation='+'|'-'|'*'|'/';
export interface NumberSentenceSpec {numbers:number[];operation:SentenceOperation;missingResult?:boolean;chooseOperation?:boolean;freeEntry?:boolean}
export const operationSymbol=(operation:SentenceOperation|'?')=>operation==='-'?'−':operation==='*'?'×':operation==='/'?'÷':operation;
export const operationName=(operation:SentenceOperation)=>({'+':'addition','-':'subtraction','*':'multiplication','/':'division'}[operation]);
export const operationFamily=(operation:SentenceOperation):SentenceOperation[]=>operation==='+'||operation==='-'?['+','-']:['*','/'];
export interface AnswerFormat {answer:string;grouping?:GroupingSpec;answerFormat?:'number-words'|'pi';numberSentence?:NumberSentenceSpec}
export const normaliseNumberWords=(value:string)=>value.toLowerCase().trim().replace(/\band\b/g,' ').replace(/[-\s]+/g,' ').trim();
export function parseSentence(value:string):{slots:(number|null)[];operation:SentenceOperation|'?'}{
 const m=value.trim().replace(/−/g,'-').replace(/[×x]/g,'*').replace(/÷/g,'/').match(/^(\d+|\?)\s*([+?*/-])\s*(\d+|\?)\s*=\s*(\d+|\?)$/);
 return m?{slots:[m[1],m[3],m[4]].map(v=>v==='?'?null:Number(v)),operation:m[2] as SentenceOperation|'?'}:{slots:[null,null,null],operation:'?'};
}
export function sentenceSlots(value:string,operation:SentenceOperation):(number|null)[]{const parsed=parseSentence(value);return parsed.operation===operation?parsed.slots:[null,null,null];}
export const sentenceValue=(slots:(number|null)[],operation:SentenceOperation|'?')=>`${slots[0]??'?'} ${operation} ${slots[1]??'?'} = ${slots[2]??'?'}`;
export function validNumberSentence(spec:NumberSentenceSpec,value:string):boolean{
 const slots=sentenceSlots(value,spec.operation);
 if(spec.numbers.length<(spec.missingResult?2:3)||slots.some(n=>n===null||!Number.isSafeInteger(n)||n<0))return false;
 const values=slots as number[],available=[...spec.numbers];
 for(const n of spec.missingResult?values.slice(0,2):values){const at=available.indexOf(n);if(at<0)return false;available.splice(at,1);}
 switch(spec.operation){case '+':return values[0]+values[1]===values[2];case '-':return values[0]-values[1]===values[2];case '*':return values[0]*values[1]===values[2];case '/':return values[1]!==0&&values[0]/values[1]===values[2];}
}
export const responseReady=(q:AnswerFormat,value:string)=>q.grouping?groupingReady(q.grouping,value):q.numberSentence?parseSentence(value).operation!=='?'&&parseSentence(value).slots.every(n=>n!==null):!!value.trim();
export const numberEntry=(q:AnswerFormat)=>!q.grouping&&!q.numberSentence&&!q.answerFormat&&/^-?\d+(?:[.,\d]*|(?:\s+\d+)?\/\d+)$/.test(q.answer.trim());
export const answerInputMode=(q:AnswerFormat):'text'|'decimal'=>numberEntry(q)&&!q.answer.includes('/')?'decimal':'text';
export const answerLimit=(q:AnswerFormat)=>Math.min(200,Math.max(40,q.answer.length+30));

/** A coefficient of pi remains exact; no decimal approximation or expression evaluation. */
export function piCoefficient(value:string):number|null{
 const text=value.toLowerCase().replace(/\s+/g,'');
 const m=/^([+-]?(?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)?)\*?(?:π|pi)$/.exec(text);if(!m)return null;
 const coefficient=m[1]===''||m[1]==='+'?'1':m[1]==='-'?'-1':m[1],parts=coefficient.split('/').map(Number);
 const result=parts.length===2?(parts[1]===0?NaN:parts[0]/parts[1]):parts[0];return Number.isFinite(result)?result:null;
}
