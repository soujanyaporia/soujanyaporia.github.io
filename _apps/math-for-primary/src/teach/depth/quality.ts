import type {Lesson,Stage} from '../model';
import {referenceLesson} from './referenceLessons';
import {fraction,removal,triangle} from './items';
import {addIndependenceCheck} from './independence';

type Reflection=Extract<Stage,{kind:'reflect'}>;
const authored:Record<string,Omit<Reflection,'kind'|'title'>>={
 'p1s-as-07':{text:'Tell someone how taking away and putting back belong together. Use our seventeen counters.',tool:removal(17,3),prompts:['How many were here at the start?','What do the crosses mean?','How can you check the number that stays?'],explanation:['Seventeen counters were here at the start. Three crosses show the counters taken away.','Fourteen blue counters stay: 17 − 3 = 14.','Put the three back: 14 + 3 = 17. We have rebuilt the starting group.'],transfer:'If we took away four instead of three, would more or fewer stay? Say why before counting.'},
 'p2s-frac-01':{text:'Explain to a friend why this blue share is two fifths, not two thirds.',tool:fraction(2,5),prompts:['Point to the whole strip.','Which parts does the bottom number count?','Which parts does the top number count?'],explanation:['The whole strip includes the blue and white parts. All five parts have the same size.','The bottom number is five because it counts every equal part.','Two parts are blue, so the top is two. The blue share is 2/5. Three counts only the white parts.'],transfer:'If the two blue parts were in different positions, would the fraction change? Explain using the whole and the chosen parts.'},
 'p5s-area-02':{text:'Explain why the triangle with base eight and perpendicular height five has area twenty, not forty.',tool:triangle(8,5),prompts:['Where are the base and the perpendicular height?','What shape do two matching triangles make here?','Why do we halve the product?'],explanation:['The base is eight and the perpendicular height is five. The height meets the base at a right angle.','Two matching triangles fill an 8-by-5 rectangle. The rectangle covers forty square units.','Each triangle covers half that rectangle, so one covers twenty square units.'],transfer:'If the perpendicular height doubled while the base stayed the same, what would happen to the area? Explain using the matching rectangle.'}
};
/** Ground the explanation prompt in this lesson's actual worked example, not a topic slogan. */
function reflectionFor(lesson:Lesson):Reflection|null{
 if(authored[lesson.id])return {kind:'reflect',title:'Teach it back',...authored[lesson.id]};
 const worked=lesson.stages.find((s):s is Extract<Stage,{kind:'worked'}>=>s.kind==='worked');
 if(!worked)return null;
 const simple=lesson.level<=2;
 return {kind:'reflect',title:'Teach it back',text:`Look back at our worked question: ${worked.problem}`,tool:worked.tool??worked.steps[0]?.tool,
  prompts:simple?['Point to what we started with. What does each part of the picture mean?','Tell someone what you did first, and why.','How can you check your answer?']:['Identify what is known and what the question asks you to find.','Explain the first step using the meaning of the picture or quantities. Why is that step allowed?','Explain a check that connects your result to the original question.'],
  explanation:worked.steps.map(s=>[s.text,s.math].filter(Boolean).join(' ')),
  transfer:'In the next example, name what has changed. Decide which part of your explanation still works.'};
}
export function improveTeachingQuality(original:Lesson):Lesson{
 const lesson=referenceLesson(original),stages=[...lesson.stages];
 if(!stages.some(s=>s.kind==='reflect')){
  const reflection=reflectionFor(lesson);
  if(reflection){
   const index=stages.findIndex(s=>s.kind==='practice'&&s.mode==='independent');
   const fallback=stages.findIndex(s=>s.kind==='mastery');
   stages.splice(index>=0?index:fallback>=0?fallback:stages.length-1,0,reflection);
  }
 }
 // A changed sequence cannot resume by the old stage number. Earned progress events are untouched.
 return addIndependenceCheck({...lesson,revision:`${lesson.revision?.startsWith('depth-')?'depth':'catalogue-depth'}-2026-09-19-v5`,stages});
}
