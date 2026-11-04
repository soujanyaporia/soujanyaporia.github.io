import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';

// Exercises the public generation, answer-entry and saved-paper contracts together.
// Mathematical answers are checked separately by audit-paper-bank.test.ts.
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {ACTIVITIES}=await server.ssrLoadModule('/src/primary/catalog.ts');
 const {makeQuestion,correctAnswer}=await server.ssrLoadModule('/src/primary/generate.ts');
 const {dailyActivity,dailyId}=await server.ssrLoadModule('/src/primary/dailyPlan.ts');
 const {generatePracticePaper}=await server.ssrLoadModule('/src/primary/practicePaper.ts');
 const {createPaperAttempt,restorePaperAttempt,paperAnswerStatus,updatePaperAnswer,movePaperQuestion,markPaperAttempt,paperMarks}=await server.ssrLoadModule('/src/primary/paperAttempt.ts');
 const paperTasks=ACTIVITIES.filter(a=>a.kind==='paper'&&a.parameter!=='mixed');
 const paths=[[1,'standard'],[2,'standard'],[3,'standard'],[4,'standard'],[5,'standard'],[6,'standard'],[5,'foundation'],[6,'foundation']];
 let generatedResponseChecks=0,dailyDays=0,dailyQuestions=0,paperResumes=0;
 const failures=[];
 const check=(where,fn)=>{try{fn();}catch(error){failures.push({where,message:String(error)});}};
 const response=(q,where)=>check(where,()=>{
  assert.equal(paperAnswerStatus(q,q.answer),'complete');
  assert.equal(correctAnswer(q,q.answer),true);
  if(q.choices)assert.ok(q.choices.includes(q.answer),'Canonical choice must exactly match its visible button value');
  assert.equal(paperAnswerStatus(q,''),'blank');
 });
 for(const a of paperTasks)for(let seed=0;seed<100;seed++){
  response(makeQuestion(a,seed,seed%6),`${a.id}/${seed}`);generatedResponseChecks++;
 }
 for(const [level,track] of paths)for(let day=1;day<=200;day++){
  const a=dailyActivity(dailyId(level,track,day),ACTIVITIES);
  assert.ok(a,`Missing P${level} ${track} day ${day}`);dailyDays++;
  for(let i=0;i<6;i++){response(makeQuestion(a,0,i),`${a.id}/${i}`);dailyQuestions++;}
 }
 for(const [level,track] of paths)for(const count of [6,12,18])for(let seed=0;seed<12;seed++){
  const paper=generatePracticePaper({level,track,count,topic:'mixed',seed});
  check(paper.code,()=>{
   let draft=createPaperAttempt(paper);
   paper.items.forEach(({question:q},i)=>{draft=movePaperQuestion(draft,i);draft=updatePaperAnswer(draft,q.answer);});
   const restored=restorePaperAttempt(JSON.stringify(draft));assert.ok(restored);
   assert.deepEqual(restored.saved,draft);assert.equal(paperMarks(restored.paper,restored.saved.answers).correct,count);
   const marked=restorePaperAttempt(JSON.stringify(markPaperAttempt(draft)));assert.ok(marked?.saved.marked);
   assert.equal(paperMarks(marked.paper,marked.saved.answers).correct,count);
  });paperResumes++;
 }
 const report={generatedAt:new Date().toISOString(),scope:'Response readiness, deterministic daily generation and actual generated-paper draft/marked save and restore; mathematical independence and browser interaction are separate checks.',paperTasks:paperTasks.length,generatedResponseChecks,dailyDays,dailyQuestions,paperResumes,failures:failures.length,firstFailures:failures.slice(0,30)};
 await mkdir('.generated',{recursive:true});await writeFile('.generated/paper-integration-audit.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));assert.equal(failures.length,0);
}finally{await server.close();}
