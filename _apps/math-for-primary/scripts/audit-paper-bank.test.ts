import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {ACTIVITIES} from '../src/primary/catalog';
import {PAPER_PATTERNS} from '../src/primary/paperCatalog';
import {makePaperQuestion} from '../src/primary/paperQuestions';
import {correctAnswer,numberValue} from '../src/primary/generate';
import {hashString} from '../src/engine/random';
import {proofValue} from '../src/media/solution';
import {visibleQuestionKey} from '../src/primary/practicePaper';
import {solve as solveGeneral} from '../src/primary/paperQuestions.test';
import {solve as solveP3} from '../src/primary/paperP3.test';

type Stats={parameter:string;level:number;sampleCount:number;unique:Set<string>;answerMin:number;answerMax:number;maxPromptWords:number;units:Set<string>;mcq:number;shortAnswer:number;failureCount:number};
it('independently audits 50,000 generated rich-family samples',()=>{
 const total=50000,started=new Date().toISOString(),seen=new Set<string>(),failures:unknown[]=[];
 const stats:Stats[]=PAPER_PATTERNS.map(p=>({parameter:p.parameter,level:p.level,sampleCount:0,unique:new Set(),answerMin:Infinity,answerMax:-Infinity,maxPromptWords:0,units:new Set(),mcq:0,shortAnswer:0,failureCount:0}));
 for(let draw=0;draw<total;draw++){
  const which=draw%PAPER_PATTERNS.length,p=PAPER_PATTERNS[which],s=stats[which],sample=Math.floor(draw/PAPER_PATTERNS.length),index=sample%6;
  const seed=hashString(`paper-50k-audit-v1:${sample}:${p.parameter}`),activity=ACTIVITIES.find(a=>a.kind==='paper'&&a.parameter===p.parameter)!;
  const q=makePaperQuestion(activity,seed,index),answer=numberValue(q.answer),key=visibleQuestionKey(q);
  s.sampleCount++;s.unique.add(key);seen.add(key);s.answerMin=Math.min(s.answerMin,answer??Infinity);s.answerMax=Math.max(s.answerMax,answer??-Infinity);s.units.add(q.unit??'none');s.maxPromptWords=Math.max(s.maxPromptWords,q.prompt.trim().split(/\s+/).length);if(q.choices)s.mcq++;else s.shortAnswer++;
  try{
   const expected=p.level===3?solveP3(q,p.parameter):solveGeneral(q,p.parameter);
   expect(answer).not.toBeNull();expect(Number.isFinite(answer)).toBe(true);expect(answer!).toBeCloseTo(expected,7);expect(answer!).toBeCloseTo(proofValue(q.proof!),7);
   expect(correctAnswer(q,q.answer)).toBe(true);expect(correctAnswer(q,String(answer!+1))).toBe(false);
   expect(q.picture).toBeDefined();expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);expect(q.prompt.trim().split(/\s+/).length).toBeLessThanOrEqual(18);
   if(q.choices){expect(new Set(q.choices).size).toBe(q.choices.length);expect(q.choices.filter(c=>correctAnswer(q,c))).toHaveLength(1);}
   expect(JSON.stringify(makePaperQuestion(activity,seed,index))).toBe(JSON.stringify(q));
   if(q.picture?.type==='paper'&&q.picture.layout==='cards')for(const c of q.picture.cards)if(c.count!==undefined){expect(Number.isInteger(c.count)).toBe(true);expect(c.count).toBeGreaterThan(0);expect(c.count).toBeLessThanOrEqual(12);expect(c.removed??0).toBeLessThan(c.count);}
   if(p.level===1)expect(answer!).toBeLessThanOrEqual(p.parameter==='p1-groups'?40:20);
  }catch(error){s.failureCount++;if(failures.length<30)failures.push({draw,parameter:p.parameter,seed,index,message:String(error)});}
 }
 const report={schema:1,startedAt:started,finishedAt:new Date().toISOString(),samples:total,richFamilies:PAPER_PATTERNS.length,uniqueVisibleQuestions:seen.size,duplicateSamples:total-seen.size,failureCount:stats.reduce((sum,s)=>sum+s.failureCount,0),visibleIdentity:'Normalized prompt, essential context, display, original picture model, sorted order tiles, fraction builder and unit; excludes answers, distractor order, hints, solutions and generated keys.',sampling:'Round-robin all 36 families. Sample ordinal floor(draw/36), index=ordinal%6, seed=FNV1a(paper-50k-audit-v1:ordinal:parameter). Uses actual catalogue IDs.',scope:'Independent visible-givens solvers, separate proof evaluation, accepted/rejected answers, deterministic regeneration, choice uniqueness, required diagram and steps, prompt length and P1 bounds. Not 50,000 authored questions, teacher review, exhaustive syllabus coverage or UI testing.',families:stats.map(({unique,units,...s})=>({...s,uniqueVisibleQuestions:unique.size,duplicateSamples:s.sampleCount-unique.size,units:[...units].sort()})),failures};
 mkdirSync('.generated',{recursive:true});
 writeFileSync('.generated/50k-paper-audit.json',JSON.stringify(report,null,2)+'\n');
 expect(report.samples).toBe(50000);expect(report.failureCount,JSON.stringify(failures)).toBe(0);expect(report.richFamilies).toBe(36);
},60000);
