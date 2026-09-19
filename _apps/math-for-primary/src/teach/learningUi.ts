import {feedbackFor} from './gen';
import {WORLDS,type Lesson,type RevealStep,type Stage} from './model';
import type {Item} from './model';
import type {ItemWork} from './progress';

/** Offer the next smaller action rather than another unexplained incorrect-answer loop. */
export function supportRecommendation(item:Item,work:ItemWork,hasExample:boolean):{kind:'steps'|'smaller'|'example';label:string;text:string}{
 if(work.teach===0)return {kind:'steps',label:'Show me how to start',text:'We can work through the first step together. Your answer will stay saved.'};
 if(item.simpler)return {kind:'smaller',label:'Try a smaller question',text:'Practise the building block first, then bring it back to this question.'};
 if(hasExample)return {kind:'example',label:'Revisit the worked example',text:'Follow the earlier solution again, then choose the matching step for your question.'};
 return {kind:'steps',label:'Return to the explanation',text:'Read each step with its picture, then try your answer again.'};
}

export const TOPIC_NAMES:Record<Lesson['world'],string>={
 'number-kingdom':'Whole numbers','operation-station':'Operations','fraction-forest':'Fractions',
 'decimal-depths':'Decimals','measurement-metro':'Measurement & time','geometry-galaxy':'Geometry',
 'data-city':'Data & graphs','ratio-realm':'Ratio, rate & percentage','algebra-academy':'Algebra',
};
export function matchesLesson(lesson:Lesson,query:string){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const text=[lesson.title,...lesson.objectives,lesson.mission?.pictureExample,TOPIC_NAMES[lesson.world],WORLDS[lesson.world].blurb].join(' ').toLocaleLowerCase();
 return words.every(word=>text.includes(word));
}
export function lessonPreview(lesson:Lesson){
 return lesson.mission?.pictureExample??lesson.canDo.find(s=>s.toLowerCase()!==lesson.title.toLowerCase())??WORLDS[lesson.world].blurb;
}
/** Phase labels describe the present task, without suggesting that an earlier example is still active. */
export function lessonPhase(stage:Stage):'Warm up'|'Understand'|'Try it'|'Check & remember'{
 if(stage.kind==='readiness')return 'Warm up';
 if(['mastery','reason','discovery'].includes(stage.kind))return 'Check & remember';
 if(['practice','apply','worked','reflect'].includes(stage.kind))return 'Try it';
 return 'Understand';
}
/** Read only what is visible. An unrevealed equation must not be spoken over a pupil's turn. */
export function workedSpeech(problem:string,step:RevealStep,waiting:boolean){
 return [problem,step.text,step.because,waiting?step.ask?.prompt:step.math].filter(Boolean).join('. ');
}
export function workedFeedback(step:RevealStep,answer:string){
 if(!step.ask)return '';
 const specific=feedbackFor({key:'worked',prompt:step.ask.prompt,answer:step.ask.answer,wrong:step.ask.wrong,hints:[],steps:[]},answer);
 return specific??step.ask.hint??'Not quite yet. Look at this step again, or open a clue below. Your answer is still here to change.';
}
export function answerFormat(answer:string):{inputMode:'text'|'decimal';placeholder:string;hint?:string}{
 if(answer.includes('/'))return {inputMode:'text',placeholder:'e.g. 2/3',hint:answer.includes(' ')?'Use a space for a mixed number, such as 1 2/3.':'Use / between the top and bottom numbers, such as 2/3.'};
 if(answer.includes(':'))return {inputMode:'text',placeholder:'e.g. 2:30',hint:'Use a colon between hours and minutes. Include am or pm if the question asks for it.'};
 if(/[a-z]/i.test(answer))return {inputMode:'text',placeholder:'Type your answer'};
 return {inputMode:'decimal',placeholder:'Type a number'};
}
