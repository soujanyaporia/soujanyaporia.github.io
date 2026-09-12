import type {Lesson,Stage,StageFlow} from './model';

/** Name the learner's task at each boundary; never silently reuse a previous question. */
export function stageFlow(stage:Stage,index:number,lesson:Lesson):StageFlow{
 if(stage.flow)return stage.flow;
 switch(stage.kind){
 case 'hook':return {phase:'watch',label:'Meet the situation',transition:'Read the situation and look at the model. We will explore what it means next.'};
 case 'explain':return {phase:'watch',label:'Watch a picture example',transition:'Here is a picture example for this idea. Read its starting situation below, then follow the changes one step at a time.'};
 case 'worked':return {phase:'together',label:'Work through an example',transition:'Now read this question carefully. We will work through its own numbers and picture together.'};
 case 'explore':return {phase:'together',label:'Make the idea yourself',transition:'Now you control the model. Read the target below, make the change, then check it.'};
 case 'notice':return {phase:'together',label:'Explain what happened',transition:'Look at the question and model below. Choose the explanation that fits them.'};
 case 'connect':return {phase:'together',label:'Connect the picture to the maths',transition:'Follow how the objects, picture and number sentence express the same relationship.'};
 case 'readiness':return index===0?{phase:'watch',label:'A short warm-up',transition:`Before we learn “${lesson.title}”, try these familiar ideas. Clues are available.`}:{phase:'try',label:'Your first new question',transition:'You have seen the idea explained. Now use it on a new question; the picture and clues are here to help.'};
 case 'practice':return stage.mode==='guided'?{phase:'try',label:'Practise with help',transition:'Each question is a fresh example. Read the question, use its picture or values, and explain your steps before checking.'}:{phase:'try',label:'Try it yourself',transition:'Now try new examples with less help. You can still open a picture or clue if you need one.'};
 case 'apply':return {phase:'try',label:'Use the idea in a story',transition:'Now the maths appears in a situation. Work out what each value represents and what the question asks you to find.'};
 case 'reason':return {phase:'check',label:'Explain and check',transition:'These questions ask why an answer makes sense or how to check it. Read the example in each question; its values may change.'};
 case 'mastery':return {phase:'check',label:'Show what you understand',transition:'Try a short mix of questions about this idea. You will calculate, read a model, explain and check. Help is still available.'};
 case 'discovery':return {phase:'check',label:'Look back at the idea',transition:'Return to the example below and connect its answer to the idea you have practised.'};
 }
}

export function withLessonFlow(lesson:Lesson):Lesson{
 return {...lesson,revision:'connected-flow-2026-09-12',stages:lesson.stages.map((s,i)=>({...s,flow:stageFlow(s,i,lesson)}))};
}

export function nextStageLabel(stage?:Stage):string{
 if(!stage)return 'Finish lesson';
 const labels:Record<Stage['kind'],string>={hook:'Meet the example',explain:'See how it works',worked:'Work it out together',notice:'Explain the idea',explore:'Try the model',connect:'Connect the ideas',readiness:'Try a question',practice:stage.kind==='practice'&&stage.mode==='independent'?'Try on your own':'Practise with help',apply:'Try a story',reason:'Explain and check',mastery:'Check what I know',discovery:'See what I learned'};
 return `${labels[stage.kind]} →`;
}

export function questionPurpose(item:{facet?:string},stage:Stage):string{
 if(item.facet==='reasoning')return 'Choose the reason that explains this example.';
 if(item.facet==='reverse')return 'Check this example by working back to its starting information.';
 if(stage.kind==='apply'||item.facet==='word')return 'Read the story. What do you need to find?';
 if(item.facet==='missing')return 'Find what the missing value represents before calculating.';
 return '';
}
