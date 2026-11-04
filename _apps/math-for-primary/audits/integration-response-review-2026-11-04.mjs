/** Read-only integration audit. Solver evidence lives in the separate source-paper ledger. */
import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const results={reviewedAt:new Date().toISOString(),scope:'Finite integration/response/resume checks; these are not independent mathematical solvers or a browser touch review.',counts:{paperTasks:0,generatedResponseChecks:0,dailyDays:0,dailyQuestions:0,paperResumes:0,groupingPrintAndFeedbackChecks:0},failures:[],notes:[]};
function check(ok,kind,detail){if(!ok)results.failures.push({kind,detail});}
try{
 const load=p=>server.ssrLoadModule('/src/primary/'+p);
 const [{ACTIVITIES,activityById},{makeQuestion,correctAnswer},{paperAnswerStatus,createPaperAttempt,restorePaperAttempt,updatePaperAnswer,movePaperQuestion},{blankDraft,draftReady,draftAnswer,usableDraft},{createSession,checkSession,fingerprint},{validateSession},{dailyId,dailySources,dailyTopics,dailyPlanDay},{generatePracticePaper,visibleQuestionKey},{numberEntry}]=await Promise.all(['catalog.ts','generate.ts','paperAttempt.ts','sessionDraft.ts','sessionQuestions.ts','session.ts','dailyPlan.ts','practicePaper.ts','answerFormat.ts'].map(load));
 const tasks=ACTIVITIES.filter(a=>a.kind==='paper'&&a.parameter!=='mixed');results.counts.paperTasks=tasks.length;
 const [{GroupingObjects},{shownAnswer}]=await Promise.all([load('GroupingBuilder.tsx'),load('answerDisplay.ts')]);
 function response(q,label){
  check(correctAnswer(q,q.answer),'canonical-response-rejected',label);
  check(paperAnswerStatus(q,q.answer)==='complete','canonical-paper-response-incomplete',label);
  const d={...blankDraft(0,'practice'),value:q.answer,picks:q.order?q.answer.split(','):[],shaded:q.fractionBuilder?Array.from({length:Number(q.answer.split('/')[0])},(_,i)=>i):[]};
  const restored=usableDraft(q,JSON.parse(JSON.stringify(d)));
  check(draftReady(q,restored)&&correctAnswer(q,draftAnswer(q,restored)),'draft-roundtrip',label);
  check(paperAnswerStatus(q,'')==='blank','blank-counted-answered',label);
  if(q.choices){check(q.choices.filter(x=>correctAnswer(q,x)).length===1,'ambiguous-choice',label);check(new Set(q.choices).size===q.choices.length,'duplicate-choice',label);}
  if(q.order)check(new Set(q.order).size===q.order.length,'touch-order-duplicate-token',label);
  if(q.numberSentence?.missingResult){const n=q.numberSentence.numbers;check(n.length===2,'story-result-card-leak',label);check(!q.numberSentence.freeEntry,'unexpected-story-result-entry',label);}
  if(q.answerFormat==='number-words')check(!numberEntry(q),'word-answer-numeric-keyboard',label);
  if(q.grouping){const html=renderToStaticMarkup(createElement(GroupingObjects,{spec:q.grouping}));check((html.match(/<svg/g)??[]).length===q.grouping.total,'print-grouping-object-count',label);check(!html.includes('<button')&&!html.includes(q.answer),'print-grouping-answer-leak',label);check(!shownAnswer(q,q.answer).includes('['),'raw-grouping-json-feedback',label);results.counts.groupingPrintAndFeedbackChecks++;}
  check(q.answer.length<=200,'saved-answer-length',label);
 }
 for(const a of tasks)for(let seed=0;seed<100;seed++){
  const q=makeQuestion(a,seed,seed%6);response(q,`${a.id}:${seed}`);results.counts.generatedResponseChecks++;
  if(seed===0){const {session,questions}=createSession(a,{seed,now:1});const q0=questions[0],draft={...blankDraft(0,'practice'),value:q0.answer,picks:q0.order?q0.answer.split(','):[],shaded:q0.fractionBuilder?Array.from({length:Number(q0.answer.split('/')[0])},(_,i)=>i):[],at:1};const saved=JSON.parse(JSON.stringify({...session,draft}));check(!!validateSession(saved,1)&&checkSession(a,saved).ok,'activity-session-roundtrip',a.id);check(fingerprint({...q,hint:'Reworded clue',explanation:'Reworded solution'})===fingerprint(q),'cosmetic-edit-invalidates-session',a.id);}
 }
 const paths=[[1,'standard'],[2,'standard'],[3,'standard'],[4,'standard'],[5,'standard'],[6,'standard'],[5,'foundation'],[6,'foundation']];
 for(const [level,track] of paths){
  const encountered=new Set(),topics=dailyTopics(level,track,ACTIVITIES);
  for(let day=1;day<=200;day++){
   const a=activityById(dailyId(level,track,day)),plan=dailyPlanDay(level,track,day,ACTIVITIES),sources=dailySources(a,ACTIVITIES);results.counts.dailyDays++;
   check(sources.length===6,'daily-length',a.id);
   const active=new Set([...topics.slice(0,plan.topicIndex).flatMap(t=>t.activities),...plan.available].map(t=>t.id));
   for(let i=0;i<6;i++){const source=sources[i],q=makeQuestion(a,813,i);encountered.add(source.id);response(q,`${a.id}:${i}`);results.counts.dailyQuestions++;check(q.sourceActivityId===source.id,'daily-source-mismatch',`${a.id}:${i}`);if(source.kind!=='paper')check(active.has(source.id),'daily-baseline-before-introduction',`${a.id}:${source.id}`);}
  }
  for(const a of ACTIVITIES.filter(a=>a.level===level&&a.track===track&&a.kind!=='daily'&&a.parameter!=='mixed'))check(encountered.has(a.id),'activity-starved-from-year-path',a.id);
  for(let seed=0;seed<12;seed++)for(const count of [6,12,18]){
   const paper=generatePracticePaper({level,track,seed,count,topic:'mixed'});let saved=createPaperAttempt(paper);
   for(let i=0;i<paper.items.length;i++){saved=movePaperQuestion(saved,i);saved=updatePaperAnswer(saved,paper.items[i].question.answer);}
   const restored=restorePaperAttempt(JSON.stringify(saved));check(!!restored,'paper-resume-failed',paper.code);if(restored)check(JSON.stringify(restored.saved)===JSON.stringify(saved),'paper-answer-roundtrip',paper.code);
   check(new Set(paper.items.map(x=>visibleQuestionKey(x.question))).size===count,'visible-repeat-in-paper',paper.code);results.counts.paperResumes++;
  }
 }
 results.notes.push('All complete paper response controls were exercised via their public core; no browser click/touch claim is made.','A separate regression corrected session fingerprint omission of requireSimplified/requireImproper.','106 task configurations at initial integration are not 106 unique mathematical strategies; new P2/P4 integrations can change this denominator.');
}finally{await server.close();}
const path=resolve('audits/integration-response-review-2026-11-04.json');await writeFile(path,JSON.stringify(results,null,2)+'\n');process.stdout.write(JSON.stringify({path,...results.counts,failures:results.failures.length,firstFailures:results.failures.slice(0,8)})+'\n');process.exitCode=results.failures.length?1:0;
