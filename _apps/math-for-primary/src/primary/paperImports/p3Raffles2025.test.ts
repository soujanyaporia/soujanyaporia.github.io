import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeP3Raffles2025,RAFFLES_2025_PARTS,type RafflesQuestion} from './p3Raffles2025';
import {P3RafflesDiagram} from './P3RafflesDiagram';
import type {Point} from './p3RafflesPicture';
import {correctAnswer,numberValue} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

const numbers=(s:string)=>s.match(/\d+(?:\.\d+)?/g)?.map(Number)??[];
const n=(s:string)=>numbers(s)[0];
const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);
const rational=(a:number,b:number)=>{const factor=gcd(a,b);return b/factor===1?String(a/factor):`${a/factor}/${b/factor}`;};
function gridArea(points:Point[]){
 // Independent of the generator's shoelace formula: sum horizontal one-unit strips.
 let area=0;const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 for(let y=minY+.5;y<maxY;y++){
  const cuts:number[]=[];
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))cuts.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
  cuts.sort((a,b)=>a-b);for(let i=0;i<cuts.length;i+=2)area+=cuts[i+1]-cuts[i];
 }
 return area;
}
function minutes(label:string){const m=label.match(/(\d+):(\d+) (am|pm)/);if(!m)throw Error(`No visible clock time: ${label}`);return Number(m[1])%12*60+Number(m[2])+(m[3]==='pm'?720:0);}
function clock(value:number){return `${Math.floor(value/60)%12||12}:${String(value%60).padStart(2,'0')} ${value<720?'am':'pm'}`;}
function nameFor(value:number){
 const units=['zero','one','two','three','four','five','six','seven','eight','nine'],special=['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],decades=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
 const digits=String(value).padStart(4,'0').split('').map(Number),parts:string[]=[];
 if(digits[0])parts.push(units[digits[0]],'thousand');
 if(digits[1])parts.push(units[digits[1]],'hundred');
 const tail=digits[2]*10+digits[3];if(tail&&parts.length)parts.push('and');
 if(tail>=20)parts.push(decades[digits[2]]+(digits[3]?'-'+units[digits[3]]:''));else if(tail>=10)parts.push(special[tail-10]);else if(tail)parts.push(units[tail]);
 return parts.join(' ');
}
const diagram=(q:RafflesQuestion)=>{if(q.picture.type!=='raffles-p3')throw Error('Expected original diagram');return q.picture;};
const cards=(q:RafflesQuestion)=>{if(q.picture.type!=='paper'||q.picture.layout!=='cards')throw Error('Expected givens cards');return q.picture.cards;};

/** Public audit helper: reconstructs the answer only from prompt, context, display and visible model givens. */
export function solveP3Imported(q:RafflesQuestion,part:string):string|number{
 const group=part.replace(/[a-f]$/,'');
 switch(group){
  case '1':return Math.floor(n(cards(q)[0].value)/10)%10;
  case '2':{const [a,b]=numbers(q.display!);return rational(a,b);}
  case '3':{const g=n(cards(q)[0].value);return `${Math.floor(g/1000)} kg ${g%1000} g`;}
  case '4':return n(cards(q)[0].value)*60;
  case '5':{
   const m=diagram(q);if(m.layout!=='angle-polygon')throw Error('Missing polygon');
   const acute=m.angles.filter(a=>{const p=m.points[a.vertex],prev=m.points[(a.vertex+m.points.length-1)%m.points.length],next=m.points[(a.vertex+1)%m.points.length],v=[prev[0]-p[0],prev[1]-p[1]],w=[next[0]-p[0],next[1]-p[1]];return v[0]*w[0]+v[1]*w[1]>0;});
   if(acute.length!==1)throw Error('Angle selection is not unique');return acute[0].label;
  }
  case '6':{if(q.picture.type!=='pattern')throw Error('Missing sequence');const a=q.picture.items.map(Number);return a[3]-(a[1]-a[2]);}
  case '7':{const [first,second]=cards(q),[top,bottom]=numbers(first.value),scaled=n(second.value);return bottom*scaled/top;}
  case '8':{
   const values=cards(q),[payment,change]=numbers(q.context![0]),cost=Math.round((payment-change)*100),matches:string[]=[];
   for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)if(Math.round((n(values[i].value)+n(values[j].value))*100)===cost)matches.push(`${values[i].label} and ${values[j].label}`);
   if(matches.length!==1)throw Error('Purchase pair is not unique');return matches[0];
  }
  case '9':{const [start,count,each]=cards(q).map(c=>n(c.value));return start-count*each;}
  case '10':{
   const m=diagram(q);if(m.layout!=='polygons')throw Error('Missing grid shapes');const matches:string[]=[];
   m.shapes.forEach((a,i)=>m.shapes.slice(i+1).forEach(b=>{if(gridArea(a.points)===gridArea(b.points))matches.push(`${a.label} and ${b.label}`);}));
   if(matches.length!==1)throw Error('Equal-area pair is not unique');return matches[0];
  }
  case '11':return nameFor(n(cards(q)[0].value));
  case '12':{const [part,total]=numbers(q.display!);return total-part;}
  case '13':{const m=diagram(q);if(m.layout!=='fraction-line')throw Error('Missing line');return rational(m.position,m.parts);}
  case '14':{const [a,b,c,d]=numbers(q.display!);return rational(a*d+b*c,b*d);}
  case '15':{if(q.picture.type!=='paper'||q.picture.layout!=='timeline')throw Error('Missing route');return n(q.picture.gaps[0])+n(q.picture.gaps[1]);}
  case '16':{
   const m=diagram(q);if(m.layout!=='parallel-lines')throw Error('Missing lines');const ref=m.segments.find(s=>s.label===m.reference)!,dx=ref.to[0]-ref.from[0],dy=ref.to[1]-ref.from[1];
   const matches=m.segments.filter(s=>s.label!==m.reference&&(s.to[0]-s.from[0])*dy===(s.to[1]-s.from[1])*dx);if(matches.length!==1)throw Error('Parallel line is not unique');return matches[0].label;
  }
  case '17':{const [b,d]=cards(q).map(c=>n(c.value));return b-d;}
  case '18':{const [a,b]=numbers(q.display!);return a%b;}
  case '19':{
   const m=diagram(q);if(m.layout!=='rectangles')throw Error('Missing rectangles');const [p,r]=m.rectangles,sub=part.at(-1);
   if(sub==='a')return p.width*p.height;if(sub==='b')return p.width*2+p.height*2;if(sub==='c')return r.width*r.height;if(sub==='d')return r.width*2+r.height*2;
   const sameArea=p.width*p.height===r.width*r.height,samePerimeter=p.width+p.height===r.width+r.height;
   if(sameArea===samePerimeter)throw Error('Comparison is ambiguous');return sub==='e'?(sameArea?'area':'perimeter'):(sameArea?'perimeter':'area');
  }
  case '20':{const [jug,bottle,times]=cards(q).map(c=>n(c.value));return bottle-jug/times;}
  case '21':{const [first,less,total]=cards(q).map(c=>n(c.value));return part==='21a'?first-less:total-first-(first-less);}
  case '22':{
   const [single,bundle]=cards(q),unit=n(single.value),price=n(bundle.value),size=n(bundle.label),count=n(q.prompt);
   // Enumerate every valid exact purchase; do not assume the generator's greedy method.
   return Math.min(...Array.from({length:Math.floor(count/size)+1},(_,packs)=>packs*price+(count-packs*size)*unit));
  }
  case '23':{
   if(q.picture.type!=='paper'||q.picture.layout!=='timeline')throw Error('Missing timeline');
   if(part==='23a')return minutes(q.picture.points[2].label)-minutes(q.picture.points[0].label)-n(q.picture.gaps[0]);
   return clock(minutes(q.picture.points[1].label)-n(q.picture.gaps[0]));
  }
  case '24':{
   const m=diagram(q);if(m.layout!=='grouped-bars')throw Error('Missing chart');const [a,b]=m.series.map(s=>s.values),sub=part.at(-1);
   if(sub==='a'){const difference=n(q.prompt),matches=m.days.filter((_,i)=>a[i]-b[i]===difference);if(matches.length!==1)throw Error('Chart day is ambiguous');return matches[0];}
   if(sub==='b'){const days=m.days.map((day,i)=>({day,i,at:q.prompt.indexOf(day)})).filter(d=>d.at>=0).sort((a,b)=>a.at-b.at);return b[days[1].i]-b[days[0].i];}
   if(sub==='c'){const day=m.days.findIndex(d=>q.prompt.includes(d));return a[day]+b[day];}
   return a.reduce((sum,v)=>sum+v,0);
  }
  case '25':{
   if(part==='25a'){const [total,boxes]=cards(q).map(c=>n(c.value));return total/boxes;}
   if(q.picture.type!=='paper'||q.picture.layout!=='bars')throw Error('Missing units model');const total=n(q.picture.totalLabel!),times=n(q.context![0]),extra=n(q.context![1]);return (total-extra)/(times+2);
  }
  default:throw Error('No independent solver');
 }
}

describe('Complete original P3 Raffles adaptation',()=>{
 it('accounts for all 25 source questions and all 37 answer fields with valid objective references',()=>{
  expect(RAFFLES_2025_PARTS).toHaveLength(37);expect(new Set(RAFFLES_2025_PARTS.map(p=>p.id))).toHaveLength(37);
  expect([...new Set(RAFFLES_2025_PARTS.map(p=>Number.parseInt(p.id)))].sort((a,b)=>a-b)).toEqual(Array.from({length:25},(_,i)=>i+1));
  expect(RAFFLES_2025_PARTS.filter(p=>p.id.startsWith('19')).map(p=>p.id)).toEqual(['19a','19b','19c','19d','19e','19f']);
  for(const p of RAFFLES_2025_PARTS){expect(p.canonicalPatternId).toBeTruthy();for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),`${p.id}: ${skill}`).toBe(true);}
 });
 it('independently solves 11100 numeric and nonnumeric examples from visible givens',()=>{
  for(const part of RAFFLES_2025_PARTS)for(let seed=0;seed<100;seed++)for(let index=0;index<3;index++){
   const q=makeP3Raffles2025(part.id,seed,index),answer=solveP3Imported(q,part.id),a=numberValue(String(answer)),b=numberValue(q.answer),where=`${part.id}/${seed}/${index}`;
   expect(a!==null&&b!==null?Math.abs(a-b)<1e-9:String(answer)===q.answer,where).toBe(true);
   expect(q.workedSteps.length,where).toBeGreaterThan(0);expect(q.key).toBe(`p3-raffles-${part.id}:${seed}:${index}`);
   const {picture,workedSteps,...plain}=q;expect(correctAnswer(plain,String(answer)),where).toBe(true);
   if(q.choices){expect(new Set(q.choices).size,where).toBe(q.choices.length);expect(q.choices.filter(c=>correctAnswer(plain,c)),where).toHaveLength(1);}
  }
 });
 it('keeps multipart givens consistent and supplies every part with its own complete context',()=>{
  for(let seed=0;seed<30;seed++){
   const parts=RAFFLES_2025_PARTS.filter(p=>p.id.startsWith('19')).map(p=>makeP3Raffles2025(p.id,seed));expect(parts.every(q=>JSON.stringify(q.picture)===JSON.stringify(parts[0].picture))).toBe(true);
   for(const prefix of ['22','24']){const qs=RAFFLES_2025_PARTS.filter(p=>p.id.startsWith(prefix)).map(p=>makeP3Raffles2025(p.id,seed));expect(qs.every(q=>JSON.stringify(q.picture)===JSON.stringify(qs[0].picture))).toBe(true);}
   const a=makeP3Raffles2025('21a',seed),b=makeP3Raffles2025('21b',seed);expect(cards(b).slice(0,2)).toEqual(cards(a));
   expect(makeP3Raffles2025('25b',seed).context).toHaveLength(2);
  }
 });
 it('uses new variable givens instead of replaying source quantities',()=>{
  for(let seed=0;seed<100;seed++){
   expect(n(cards(makeP3Raffles2025('1',seed))[0].value)).not.toBe(7685);
   expect(makeP3Raffles2025('2',seed).display).not.toBe('6/12');
   expect(n(cards(makeP3Raffles2025('3',seed))[0].value)).not.toBe(3320);
   expect(n(cards(makeP3Raffles2025('4',seed))[0].value)).not.toBe(2);
   expect(cards(makeP3Raffles2025('9',seed)).map(c=>n(c.value))).not.toContain(1500);
   expect(n(cards(makeP3Raffles2025('11',seed))[0].value)).not.toBe(3649);
   const [first,total]=numbers(makeP3Raffles2025('12',seed).display!);expect(first).not.toBe(2615);expect(total).not.toBe(8510);
   const [larger,diff]=cards(makeP3Raffles2025('17',seed)).map(c=>n(c.value));expect(larger).not.toBe(3569);expect(diff).not.toBe(2635);
   expect(cards(makeP3Raffles2025('25a',seed)).map(c=>n(c.value))).not.toContain(112);
  }
 });
 it('corrects the source movie-duration key instead of trusting its printed answer',()=>{
  const visibleArrival=15*60+15,visibleWait=25,visibleEnd=18*60;
  expect(visibleEnd-(visibleArrival+visibleWait)).toBe(140);
  expect(visibleEnd-(visibleArrival+visibleWait)).not.toBe(2*60+30);
  for(let seed=0;seed<100;seed++)expect(Number(makeP3Raffles2025('23a',seed).answer)).toBe(solveP3Imported(makeP3Raffles2025('23a',seed),'23a'));
 });
 it('renders all custom diagram layouts with complete, measurable givens',()=>{
  const layouts=new Set<string>();
  for(const id of ['5','10','13','16','19a','24a'])for(let seed=0;seed<12;seed++){
   const m=diagram(makeP3Raffles2025(id,seed));layouts.add(m.layout);const html=renderToStaticMarkup(createElement(P3RafflesDiagram,{model:m}));
   expect(html).toContain('role="img"');expect(html).toContain('aria-label=');expect(html).not.toMatch(/NaN|Infinity|undefined/);
   if(m.layout==='angle-polygon'){
    const orientation=m.points.reduce((sum,p,i)=>{const next=m.points[(i+1)%m.points.length];return sum+p[0]*next[1]-p[1]*next[0];},0);
    for(const a of m.angles){const p=m.points[a.vertex],prev=m.points[(a.vertex+m.points.length-1)%m.points.length],next=m.points[(a.vertex+1)%m.points.length],turn=(p[0]-prev[0])*(next[1]-p[1])-(p[1]-prev[1])*(next[0]-p[0]);expect(turn*orientation).toBeGreaterThan(0);}
   }
   if(m.layout==='fraction-line'){
    const ticks=[...html.matchAll(/data-fraction-tick="(\d+)" x1="([\d.]+)"/g)];expect(ticks).toHaveLength(m.parts+1);
    ticks.forEach(t=>expect(Number(t[2])).toBeCloseTo(28+384*Number(t[1])/m.parts));
   }
   if(m.layout==='polygons'){
    const polygons=[...html.matchAll(/<polygon data-grid-polygon="([A-Z])"[^>]* points="([^"]+)"/g)];expect(polygons).toHaveLength(4);
    for(const polygon of polygons){const drawn=polygon[2].split(' ').map(p=>p.split(',').map(Number) as Point),model=m.shapes.find(s=>s.label===polygon[1])!,area=Math.abs(drawn.reduce((sum,p,i)=>{const next=drawn[(i+1)%drawn.length];return sum+p[0]*next[1]-p[1]*next[0];},0))/2;expect(area/(23*23)).toBeCloseTo(gridArea(model.points));}
   }
   if(m.layout==='parallel-lines')expect(html.match(/data-segment=/g)).toHaveLength(4);
   if(m.layout==='rectangles'){
    const shapes=[...html.matchAll(/<rect data-rectangle="([A-Z])"[^>]* width="([\d.]+)" height="([\d.]+)"/g)];expect(shapes).toHaveLength(2);
    for(const shape of shapes){const rectangle=m.rectangles.find(r=>r.label===shape[1])!;expect(Number(shape[2])/Number(shape[3])).toBeCloseTo(rectangle.width/rectangle.height);}
   }
   if(m.layout==='grouped-bars'){
    const bars=[...html.matchAll(/<rect data-bar-series="(\d+)" data-bar-day="(\d+)" data-value="(\d+)"[^>]* y="([\d.]+)"[^>]* height="([\d.]+)"/g)],maximum=Math.max(...[...html.matchAll(/class="raffles-axis"[^>]*>(\d+)<\/text>/g)].map(t=>Number(t[1])));
    expect(bars).toHaveLength(8);
    for(const bar of bars){const actual=m.series[Number(bar[1])].values[Number(bar[2])];expect(Number(bar[3])).toBe(actual);expect(Number(bar[5])).toBeCloseTo(actual/maximum*230);expect(Number(bar[4])+Number(bar[5])).toBeCloseTo(280);}
   }
  }
  expect(layouts.size).toBe(6);
 });
 it('keeps equivalent and related-fraction diagrams within denominator 12',()=>{
  for(let seed=0;seed<200;seed++){
   const simplified=makeP3Raffles2025('2',seed);expect(numbers(simplified.display!)[1]).toBeLessThanOrEqual(12);
   const missing=makeP3Raffles2025('7',seed);expect(Number(missing.answer)).toBeLessThanOrEqual(12);
   const addition=makeP3Raffles2025('14',seed),[a,b,c,d]=numbers(addition.display!);expect(Math.max(b,d)).toBeLessThanOrEqual(12);expect(a/b+c/d).toBeLessThanOrEqual(1);
  }
 });
 it('varies correct graph days, numerical differences and underlying bar values',()=>{
  const days=new Set<string>(),differences=new Set<string>(),graphs=new Set<string>();
  for(let seed=0;seed<100;seed++){const day=makeP3Raffles2025('24a',seed);days.add(day.answer);graphs.add(JSON.stringify(day.picture));differences.add(makeP3Raffles2025('24b',seed).answer);}
  expect(days.size).toBe(4);expect(differences.size).toBeGreaterThan(8);expect(graphs.size).toBeGreaterThan(90);
  expect(new Set(Array.from({length:100},(_,seed)=>makeP3Raffles2025('16',seed).answer)).size).toBe(3);
  for(const part of ['4','7'])expect(new Set(Array.from({length:200},(_,seed)=>JSON.stringify(makeP3Raffles2025(part,seed).picture))).size).toBeGreaterThanOrEqual(8);
 });
 it('rejects missing part IDs rather than silently returning another question',()=>{
  expect(()=>makeP3Raffles2025('26',1)).toThrow();expect(()=>makeP3Raffles2025('19',1)).toThrow();
 });
});
