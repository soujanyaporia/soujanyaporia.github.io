import type {Picture,Proof,Question} from '../primary/generate';
export interface SolutionFrame {label:string;text:string;narration?:string;equation?:string;model?:Picture;counting?:{total:number;lit:number};}
export function proofValue(p:Proof):number{if(typeof p==='number')return p;const a=proofValue(p.a),b=proofValue(p.b);switch(p.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case 'round':return Math.round(a/b+1e-8)*b;case 'floor':return Math.floor(a/b)*b;}}
const show=(n:number)=>Number(n.toFixed(6)).toLocaleString('en-SG');
function calculationFrames(p:Proof):SolutionFrame[]{
 if(typeof p==='number')return [];const a=proofValue(p.a),b=proofValue(p.b),answer=proofValue(p),inner=[...calculationFrames(p.a),...calculationFrames(p.b)];
 const symbol={'+':'+','-':'−','*':'×','/':'÷'};
 if(p.op==='round')return [...inner,{label:'Round carefully',text:`Round ${show(a)} to the nearest ${show(b)}.`,equation:`${show(a)} ≈ ${show(answer)}`}];
 if(p.op==='floor')return [...inner,{label:'Find complete groups',text:`Find the largest multiple of ${show(b)} that does not exceed ${show(a)}.`,equation:`${show(answer)}`}];
 return [...inner,{label:inner.length?'Build on that result':'Do the calculation',text:p.op==='+'?'Combine the parts to find the whole.':p.op==='-'?'Subtract to find the difference or the part left.':p.op==='*'?'Multiply the two quantities.':'Divide to find one equal share or the number of groups.',equation:`${show(a)} ${symbol[p.op]} ${show(b)} = ${show(answer)}`}];
}
export function solutionFrames(q:Question):SolutionFrame[]{
 if(q.workedSteps?.length)return q.workedSteps.map((step,i)=>({label:i===0?'Find the idea':i===q.workedSteps!.length-1?'Check it':'One step at a time',text:step.text,equation:step.equation,model:step.picture??q.picture}));
 if(q.picture?.type==='parts'){
  const parts=q.picture.parts,[a,b,c]=parts,total=a+b+c;
  const frame=(label:string,text:string,joined:number[],equation?:string):SolutionFrame=>({label,text,narration:text,model:{type:'parts',parts,joined,reveal:true},equation});
  return [frame('Find all three groups',`We have ${a} blue counters, ${b} green counters and ${c} orange counters. Let’s join them.`,[]),frame('Join the first two groups',`${a} and ${b} make ${a+b}. The ${c} orange counters are still waiting.`,[0,1],`${a} + ${b} = ${a+b}`),frame('Add the last group',`Now add the ${c} orange counters to our ${a+b}. That makes ${total}.`,[0,1,2],`${a+b} + ${c} = ${total}`),frame('Check every group',`All three groups are together. We used each group once, so ${a} plus ${b} plus ${c} equals ${total}.`,[0,1,2],`${a} + ${b} + ${c} = ${total}`)];
 }

 if(q.picture?.type==='counters'&&!q.picture.group&&q.prompt.includes('fireflies')){const total=q.picture.count;return [{label:'Let’s count together',text:'Follow the glow. Count each firefly just once.',narration:"Let's count the fireflies together. Follow the glow, and count each firefly just once.",counting:{total,lit:0}},...Array.from({length:total},(_,i)=>({label:'Count with me',text:`${i+1}`,narration:`${i+1}${i===total-1?'.':','}`,counting:{total,lit:i+1}})),{label:'We found them all!',text:`We counted ${total} fireflies. The last number tells us how many there are.`,narration:`So, there are ${total} fireflies altogether. The last number we said tells us how many there are. Now it's your turn to try!`,equation:`${total} fireflies`,counting:{total,lit:total}}];}
 const initial:SolutionFrame={label:'Read the question',text:q.prompt,equation:q.display,model:q.picture};
 const strategy:SolutionFrame={label:'Choose the idea',text:q.hint,model:q.picture??(q.fractionBuilder?{type:'fraction',parts:q.fractionBuilder,filled:0}:undefined)};
 const maths=q.proof!==undefined?calculationFrames(q.proof):[];
 const final:SolutionFrame={label:'Put it together',text:q.explanation,equation:`${q.order?q.answer.split(',').join(' → '):q.answer}${q.unit?' '+q.unit:''}`,model:q.picture??(q.fractionBuilder?{type:'fraction',parts:q.fractionBuilder,filled:Number(q.answer.split('/')[0])}:undefined)};
 return [initial,strategy,...maths,final];
}

export const solutionNarration=(f:SolutionFrame)=>f.narration??(f.equation&&!f.text.includes(f.equation)?`${f.text} That gives us ${f.equation}.`:f.text);
