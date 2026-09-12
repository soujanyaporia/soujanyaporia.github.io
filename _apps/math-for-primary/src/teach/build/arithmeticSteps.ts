import {joinCounters,numberLine} from '../../engine/explain/visuals';
import {OP_SYMBOL} from '../../engine/equation';
import {explainFact} from '../../engine/explain/strategies';
import type {Fact,Step,VisualSpec,WorkLine} from '../../engine/types';
import type {RevealStep} from '../model';

export function equationText(line:WorkLine):string{
 return line.tokens.map(t=>t.t==='op'?OP_SYMBOL[t.v]:t.t==='blank'?String(t.v??'?'):String(t.v)).join(' ');
}

/** Keep the equations belonging to this step, including the intermediate and inverse ones. */
export function arithmeticFrames(steps:Step[],fallback:VisualSpec,takeAway?:{start:number;removed:number}):RevealStep[]{
 return steps.map((s,i)=>{
  const newWork=s.work.slice(i?steps[i-1].work.length:0);
  let visual=s.visual??fallback;
  // Removing objects must keep their positions stable; the parts are not extra sets.
  if(takeAway&&visual.type==='counters'){
   const groups=visual.groups;
   if(groups.length&&groups.every(g=>!g.ghost&&g.color===groups[0].color))visual={...visual,groups:[{count:groups.reduce((n,g)=>n+g.count,0),color:groups[0].color,crossed:groups.reduce((n,g)=>n+(g.crossed??0),0)}]};
  }
  const checking=!!takeAway&&newWork.some(w=>w.tone==='check');
  let caption:string|undefined;
  if(takeAway&&visual.type==='bond')caption=`This small number bond splits the ${takeAway.removed} we are taking away. The starting amount is still ${takeAway.start}.`;
  if(checking&&takeAway){
   visual=takeAway.start<=20?joinCounters(takeAway.start-takeAway.removed,takeAway.removed):numberLine(takeAway.start-takeAway.removed,takeAway.removed);
   caption=takeAway.start<=20?`Blue counters stayed. Orange counters are the ${takeAway.removed} we put back. Together they restore our starting ${takeAway.start}.`:`Adding back ${takeAway.removed} should bring us to our starting ${takeAway.start}.`;
  }
  return {text:checking?`Put back what we took away. ${s.say}`:s.say,caption,tool:{kind:'foundation-visual',visual},math:newWork.length?newWork.map(equationText).join(' · '):undefined};
 });
}

export function arithmeticWorked(fact:Fact,prompt:string):RevealStep[]{
 const explanation=explainFact(fact,{prefer:['make-ten','take-away','count-on']});
 const fallback:VisualSpec={type:'counters',groups:[{count:fact.a,color:'blue'}]};
 const frames=arithmeticFrames(explanation.steps,fallback,fact.op==='-'?{start:fact.a,removed:fact.b}:undefined);
 const answerIndex=explanation.steps.findIndex(s=>s.reveal);
 const insert=answerIndex<0?frames.length:answerIndex;
 frames.splice(insert,0,{text:'Use the picture and the steps we have just followed to finish this question.',tool:frames[Math.max(0,insert-1)].tool,ask:{prompt,answer:String(fact.c)}});
 return frames;
}
