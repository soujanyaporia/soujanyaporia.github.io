import {useState} from 'react';
import type {Tool} from '../teach/model';
import {playSound} from '../lib/sound';
import {useProgress} from '../state/ProgressContext';
export function quickCheck(t?:Tool):{prompt:string;answer:number;choices:number[];why:string}|null{
 let answer:number,wrong:number[],prompt:string,why:string;
 if(t?.kind==='join-parts'){answer=t.parts.reduce((a,b)=>a+b,0);wrong=[t.parts[0]+t.parts[1],answer+t.parts.at(-1)!];prompt='How many counters are there altogether?';why=`${t.parts.join(' + ')} = ${answer}. We used every group once.`;}
 else if(t?.kind==='scene'&&t.scene==='bundle-ten'){answer=32;wrong=[23,30];prompt='Three tens and two ones make…';why='Three tens make 30, and two more make 32.';}
 else if(t?.kind==='scene'&&t.scene==='place'){const [n,d=0]=t.values;answer=n/10**d;wrong=d?[answer*10,answer/10]:[Number(String(n).split('').reverse().join('')),n+10];prompt='What number did we build?';why=`The value of each column adds up to ${answer}.`;}
 else if(t?.kind==='array'){answer=t.rows*t.cols;wrong=[t.rows+t.cols,answer+t.rows];prompt='How many objects are in this array?';why=`${t.rows} rows of ${t.cols} make ${answer}.`;}
 else if(t?.kind==='groups'){answer=t.groups*t.size;wrong=[t.groups+t.size,answer+t.size];prompt='How many objects are in all the groups?';why=`${t.groups} groups of ${t.size} make ${answer}.`;}
 else if(t?.kind==='counters'){answer=t.count;wrong=[answer-1,answer+1];prompt='How many counters are there?';why=`There are ${answer} counters. Each one counts once.`;}
 else if(t?.kind==='take-away'){answer=t.start-new Set(t.removed).size;wrong=[t.start,new Set(t.removed).size];prompt='How many counters are left?';why=`${t.start} − ${new Set(t.removed).size} = ${answer}.`;}
 else if(t?.kind==='bond'){answer=t.whole;wrong=[...t.parts];prompt='What is the whole?';why=`The two parts, ${t.parts[0]} and ${t.parts[1]}, make ${answer}.`;}
 else if(t?.kind==='line'){answer=t.start+t.jumps.reduce((a,b)=>a+b,0);wrong=[t.start,answer+(t.step??1)];prompt='Where do the jumps finish?';why=`Start at ${t.start} and follow every jump to ${answer}.`;}
 else if(t?.kind==='share'){answer=t.mode==='share'?t.total/t.people:t.total/(t.size??1);wrong=[t.total,answer+1];prompt=t.mode==='share'?'How many does each person receive?':'How many equal groups can we make?';why=`${t.total} ÷ ${t.mode==='share'?t.people:t.size??1} = ${answer}.`;}
 else if(t?.kind==='percent'){answer=t.whole*t.percent/100;wrong=[t.percent,t.whole-answer];prompt=`What is ${t.percent}% of ${t.whole}?`;why=`${t.whole} ÷ 100 × ${t.percent} = ${answer}.`;}
 else if(t?.kind==='ratio'&&t.unitValue!==null){answer=t.units.reduce((a,b)=>a+b,0)*t.unitValue;wrong=[t.unitValue,t.units.reduce((a,b)=>a+b,0)];prompt='What is the total value of all the bars?';why=`There are ${t.units.reduce((a,b)=>a+b,0)} equal units, each worth ${t.unitValue}.`;}
 else if(t?.kind==='balance'){answer=t.xValue;wrong=[answer+1,answer-1];prompt=`What value does ${t.letter??'x'} stand for?`;why=`Putting ${answer} in each box keeps both sides equal.`;}
 else if(t?.kind==='scene'){
  const [a=3,b=4,c=2,d=3]=t.values;
  switch(t.scene){
   case 'regroup':answer=a+b;prompt='What is the total after regrouping?';why=`Exchanging ten ones for one ten keeps the total ${a+b}.`;break;
   case 'area':answer=a*b;prompt='How many square units cover the rectangle?';why=`${a} × ${b} = ${answer} square units.`;break;
   case 'triangle':answer=a*b/2;prompt=`What is the triangle’s area in square ${t.lengthUnit??'units'}?`;why=`It is half of the matching rectangle: ${a} × ${b} ÷ 2 = ${answer}.`;break;
   case 'triangle-angles':answer=180-a-b;prompt='What is the missing angle in degrees?';why=`The three angles add to 180°. So 180 − ${a} − ${b} = ${answer}.`;break;
   case 'angles':answer=180-a;prompt='What is the missing angle in degrees?';why=`The angles on a straight line add to 180°. So 180 − ${a} = ${answer}.`;break;
   case 'average':answer=(a+b+c)/3;prompt='What is the average of the three groups?';why=`Share the total ${a+b+c} equally between three groups.`;break;
   case 'scale':answer=a*b;prompt='What value does the arrow point to?';why=`There are ${b} intervals of ${a}: ${b} × ${a} = ${answer}.`;break;
   case 'timeline':answer=b+c;prompt='How many minutes pass in all?';why=`Add the two jumps: ${b} + ${c} = ${answer} minutes.`;break;
   case 'money':answer=t.values.reduce((s,n)=>s+n,0);prompt=`What is the total in ${t.phase>=3?'dollars':'cents'}?`;why=`Add the values of the ${t.phase>=3?'notes':'coins'} to get ${answer}.`;break;
   case 'ratio':answer=(a+b)*c;prompt='What is the total value of both bars?';why=`${a+b} equal units, each worth ${c}, make ${answer}.`;break;
   case 'fraction':answer=t.phase===1?b*d:b;prompt='How many equal parts is the top strip divided into?';why=`Count every part in the top strip, shaded and unshaded: ${answer}.`;break;
   case 'fraction-product':answer=b*d;prompt='How many equal pieces make the whole rectangle?';why=`${b} rows of ${d} pieces make ${answer} equal pieces.`;break;
   case 'shape-join':answer=2;prompt='How many matching triangles make the rectangle?';why='Two matching triangles fit together to make one complete rectangle.';break;
   case 'circle':answer=2*a;prompt='If the radius is '+a+', what is the diameter?';why=`Two radii span the circle: ${a} + ${a} = ${answer}.`;break;
   default:return null;
  }
  wrong=[answer-1,answer+1];
 }
 else return null;
 if(!Number.isFinite(answer))return null;
 answer=Number(answer.toFixed(4));wrong=wrong.map(n=>Number(n.toFixed(4)));
 const alternatives=[...new Set(wrong.filter(n=>n>=0&&n!==answer))];for(let n=1;alternatives.length<2;n++)if(answer+n!==answer&&!alternatives.includes(answer+n))alternatives.push(answer+n);
 return {prompt,answer,choices:[alternatives[0],answer,alternatives[1]].sort((a,b)=>a-b),why};
}
export function CinemaCheck({tool}:{tool?:Tool}){
 const q=quickCheck(tool),{progress}=useProgress(),[picked,setPicked]=useState<number|null>(null);if(!q)return null;
 const correct=picked===q.answer;
 return <section className={`cinema-check ${correct?'is-correct':''}`}><div><span className="cinema-kicker">A LITTLE DISCOVERY</span><h2>{q.prompt}</h2></div><div className="cinema-check-choices">{q.choices.map(n=><button key={n} disabled={correct} aria-pressed={picked===n} onClick={()=>{setPicked(n);playSound(n===q.answer?'correct':'retry',progress.settings.sound);}}>{Number(n.toFixed(4))}</button>)}</div><p role="status">{correct?`Yes! ${q.why}`:picked!==null?'Have another look at the picture. You can try again.':'Take a look, then choose. There’s no hurry.'}</p></section>;
}
