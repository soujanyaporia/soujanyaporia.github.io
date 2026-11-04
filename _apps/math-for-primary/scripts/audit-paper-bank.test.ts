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
import {solve as solveCorpus} from '../src/primary/corpusPaperQuestions.test';
import {adaptedPattern} from '../src/primary/paperImports/catalog';
import {solveP1Imported} from '../src/primary/paperImports/p1HenryPark2025.test';
import {solveP2Imported} from '../src/primary/paperImports/p2HenryPark2025.test';
import {solveP4Imported} from '../src/primary/paperImports/p4Nanyang2025.test';
import {solveP5Imported} from '../src/primary/paperImports/p5MahaBodhi2025.test';
import {solveP6Imported} from '../src/primary/paperImports/p6Catholic2025.test';
import {solveP3Imported} from '../src/primary/paperImports/p3Raffles2025.test';
import {solveBatch2Early} from '../src/primary/paperImports/batch2Early.test';
import {solveBatch2Upper} from '../src/primary/paperImports/batch2Upper.test';
import {solveBatch2Rounding} from '../src/primary/paperImports/batch2Reuse.test';
import {solveBatch3Upper} from '../src/primary/paperImports/batch3Upper.test';
import {solveBatch3Early} from '../src/primary/paperImports/batch3Early.test';
import {solveBatch4Early} from '../src/primary/paperImports/batch4Early.test';
import {solveBatch4Middle} from '../src/primary/paperImports/batch4Middle.test';
import {solveBatch4Upper} from '../src/primary/paperImports/batch4Upper.test';
import {CORPUS_PATTERNS} from '../src/primary/corpusPaperCatalog';

type Stats={parameter:string;level:number;sampleCount:number;unique:Set<string>;answerMin:number;answerMax:number;maxPromptWords:number;units:Set<string>;mcq:number;shortAnswer:number;failureCount:number};
it('independently audits 50,000 generated rich-family samples',()=>{
 const total=50000,started=new Date().toISOString(),seen=new Set<string>(),failures:unknown[]=[];
 const stats:Stats[]=PAPER_PATTERNS.map(p=>({parameter:p.parameter,level:p.level,sampleCount:0,unique:new Set(),answerMin:Infinity,answerMax:-Infinity,maxPromptWords:0,units:new Set(),mcq:0,shortAnswer:0,failureCount:0}));
 for(let draw=0;draw<total;draw++){
  const which=draw%PAPER_PATTERNS.length,p=PAPER_PATTERNS[which],s=stats[which],sample=Math.floor(draw/PAPER_PATTERNS.length),index=sample%6;
  const seed=hashString(`paper-50k-audit-v1:${sample}:${p.parameter}`),activity=ACTIVITIES.find(a=>a.kind==='paper'&&a.parameter===p.parameter)!;
  const q=makePaperQuestion(activity,seed,index),answer=q.order||q.numberSentence||q.answerFormat||q.grouping?null:numberValue(q.answer),key=visibleQuestionKey(q);
  s.sampleCount++;s.unique.add(key);seen.add(key);s.answerMin=Math.min(s.answerMin,answer??Infinity);s.answerMax=Math.max(s.answerMax,answer??-Infinity);s.units.add(q.unit??'none');s.maxPromptWords=Math.max(s.maxPromptWords,q.prompt.trim().split(/\s+/).length);if(q.choices)s.mcq++;else s.shortAnswer++;
  try{
   const adapted=adaptedPattern(p.parameter);
   const expected=p.parameter.startsWith('b4e-')?solveBatch4Early(q as Parameters<typeof solveBatch4Early>[0]):p.parameter.startsWith('b4m-')?solveBatch4Middle(q,p.parameter.slice(4) as Parameters<typeof solveBatch4Middle>[1]):p.parameter.startsWith('b4u-')?solveBatch4Upper(q,p.parameter.slice(4) as Parameters<typeof solveBatch4Upper>[1]):p.parameter.startsWith('b3e-')?solveBatch3Early(q as Parameters<typeof solveBatch3Early>[0]):p.parameter.startsWith('b3u-')?solveBatch3Upper(q,p.parameter.slice(4) as Parameters<typeof solveBatch3Upper>[1]):p.parameter.startsWith('b2e-')?solveBatch2Early(q as Parameters<typeof solveBatch2Early>[0]):p.parameter.startsWith('b2u-')?solveBatch2Upper(q as Parameters<typeof solveBatch2Upper>[0],p.parameter.slice(4) as Parameters<typeof solveBatch2Upper>[1]):p.parameter.startsWith('b2r-')?solveBatch2Rounding(q):adapted?(p.level===1?solveP1Imported(q,p.parameter):p.level===2?solveP2Imported(q,p.parameter):p.level===4?solveP4Imported(q,adapted.sourceParts[0]):p.level===5?solveP5Imported(q as Parameters<typeof solveP5Imported>[0],adapted.sourceParts[0]):p.level===6?solveP6Imported(q,p.parameter):solveP3Imported(q,adapted.sourceParts[0])):CORPUS_PATTERNS.some(c=>c.parameter===p.parameter)?solveCorpus(q,p.parameter):p.level===3?solveP3(q,p.parameter):solveGeneral(q,p.parameter);
   if(typeof expected==='number'&&answer!==null)expect(answer).toBeCloseTo(expected,7);else expect(correctAnswer(q,String(expected))).toBe(true);
   if(answer!==null&&!q.numberSentence){expect(Number.isFinite(answer)).toBe(true);if(typeof expected==='number')expect(answer).toBeCloseTo(expected,7);if(q.proof!==undefined)expect(answer).toBeCloseTo(proofValue(q.proof),7);expect(correctAnswer(q,String(answer+1))).toBe(false);}
   expect(correctAnswer(q,q.answer)).toBe(true);expect(correctAnswer(q,'__incorrect__')).toBe(false);
   expect(!!q.picture||!!q.display||/\d/.test([q.prompt,...(q.context??[])].join(' '))).toBe(true);expect(q.workedSteps!.length).toBeGreaterThanOrEqual(adapted?1:3);expect(q.prompt.trim().split(/\s+/).length).toBeLessThanOrEqual(adapted?35:18);
   if(q.choices){expect(new Set(q.choices).size).toBe(q.choices.length);expect(q.choices.filter(c=>correctAnswer(q,c))).toHaveLength(1);}
   expect(JSON.stringify(makePaperQuestion(activity,seed,index))).toBe(JSON.stringify(q));
   if(q.picture?.type==='paper'&&q.picture.layout==='cards')for(const c of q.picture.cards)if(c.count!==undefined){expect(Number.isInteger(c.count)).toBe(true);expect(c.count).toBeGreaterThan(0);expect(c.count).toBeLessThanOrEqual(adapted?100:12);expect(c.removed??0).toBeLessThan(c.count);}
   if(p.level===1&&answer!==null)expect(answer).toBeLessThanOrEqual(adapted||p.parameter==='p1-pattern-gap'?100:p.parameter==='p1-groups'?40:20);
  }catch(error){s.failureCount++;if(failures.length<30)failures.push({draw,parameter:p.parameter,seed,index,message:String(error)});}
 }
 const report={schema:1,startedAt:started,finishedAt:new Date().toISOString(),samples:total,taskConfigurations:PAPER_PATTERNS.length,uniqueVisibleQuestions:seen.size,duplicateSamples:total-seen.size,failureCount:stats.reduce((sum,s)=>sum+s.failureCount,0),visibleIdentity:'Normalized prompt, essential context, display, original picture model, sorted order tiles, fraction builder, number-sentence card pool, answer format and unit; excludes answers, distractor order, hints, solutions and generated keys.',sampling:`Round-robin all ${PAPER_PATTERNS.length} task configurations. Sample ordinal floor(draw/${PAPER_PATTERNS.length}), index=ordinal%6, seed=FNV1a(paper-50k-audit-v1:ordinal:parameter). Uses actual catalogue IDs.`,scope:'Independent visible-givens solvers, separate proof evaluation for numeric answers, accepted/rejected answers, deterministic regeneration, choice uniqueness, visible givens and steps, prompt length and P1 bounds. Not 50,000 authored questions, teacher review, exhaustive syllabus coverage or UI testing.',families:stats.map(({unique,units,...s})=>({...s,uniqueVisibleQuestions:unique.size,duplicateSamples:s.sampleCount-unique.size,units:[...units].sort()})),failures};
 mkdirSync('.generated',{recursive:true});
 writeFileSync('.generated/50k-paper-audit.json',JSON.stringify(report,null,2)+'\n');
 expect(report.samples).toBe(50000);expect(report.failureCount,JSON.stringify(failures)).toBe(0);expect(report.taskConfigurations).toBe(PAPER_PATTERNS.length);
},60000);
