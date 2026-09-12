import {describe,it,expect} from 'vitest';
import {activityById} from '../primary/catalog';
import {CURRICULUM_SKILLS} from '../school/curriculum';
import {FAMILIES} from './build';
import {FAMILY_CODES} from './build/plan';
import {LESSONS,lessonById} from './catalog';
import {LESSON_INDEX} from './index';
import {isCorrect} from './gen';
import {WORLDS,type Item,type Lesson,type Stage,type Tool} from './model';
import {masteryStars} from './progress';
import {barWidths,equalRows,expandedForm,linePosition,percentOf,pileLeft,placeValue,sideWeight,stripParts} from './tools/geometry';
import {goalReachable,movesFor} from './tools/moves';
const SEEDS=[1,7,23,101,999,4242];
/** Every manipulative state a lesson shows must be arithmetically consistent with what it claims. */
function checkTool(t:Tool,where:string){
 switch(t.kind){
  case 'take-away':expect(t.start).toBeGreaterThan(0);expect(new Set(t.removed).size).toBe(t.removed.length);expect(t.removed.every(n=>Number.isInteger(n)&&n>=0&&n<t.start)).toBe(true);break;
  case 'triangle-pair':expect(t.base).toBeGreaterThan(0);expect(t.height).toBeGreaterThan(0);break;
  case 'fraction-pieces':expect(t.widths.every(n=>n>0)).toBe(true);expect(new Set(t.selected).size).toBe(t.selected.length);expect(t.selected.every(n=>Number.isInteger(n)&&n>=0&&n<t.widths.length)).toBe(true);break;
  case 'focus':checkTool(t.source,where+' focused model');break;
  case 'scene':expect(t.values.every(Number.isFinite),where).toBe(true);expect(t.phase,where).toBeGreaterThanOrEqual(0);break;
  case 'bond':expect(t.parts[0]+t.parts[1],`${where}: bond parts must make the whole`).toBe(t.whole);expect(t.parts.every(p=>p>=0)).toBe(true);break;
  case 'bar':{const known=t.parts.reduce<number>((s,p)=>s+(p??0),0);if(t.whole!==null&&!t.parts.includes(null))expect(known,`${where}: bar parts must make the whole`).toBeCloseTo(t.whole,8);if(t.whole!==null)expect(known,`${where}: bar parts cannot exceed the whole`).toBeLessThanOrEqual(t.whole+1e-8);break;}
  case 'line':{let at=t.start;for(const j of t.jumps)at+=j;expect(t.start,`${where}: line start inside range`).toBeGreaterThanOrEqual(t.min);expect(at,`${where}: jumps stay inside the line`).toBeGreaterThanOrEqual(t.min);expect(at,`${where}: jumps stay inside the line`).toBeLessThanOrEqual(t.max);if(t.mark!=null){expect(t.mark).toBeGreaterThanOrEqual(t.min);expect(t.mark).toBeLessThanOrEqual(t.max);}expect(t.max).toBeGreaterThan(t.min);break;}
  case 'groups':expect(t.groups,`${where}: groups`).toBeGreaterThanOrEqual(0);expect(t.size,`${where}: group size`).toBeGreaterThanOrEqual(0);expect(t.groups*t.size).toBeLessThanOrEqual(120);break;
  case 'array':expect(t.rows*t.cols,`${where}: array size`).toBeLessThanOrEqual(120);expect(t.rows).toBeGreaterThan(0);expect(t.cols).toBeGreaterThan(0);break;
  case 'share':expect(pileLeft(t),`${where}: shared counters cannot exceed the total`).toBeGreaterThanOrEqual(0);if(t.mode==='share')expect(t.given.length).toBeGreaterThan(0);if(t.mode==='group'&&t.size)expect(t.given.every(g=>g===0||g===t.size),`${where}: groups are equal`).toBe(true);break;
  case 'fractions':expect(t.shaded.length,`${where}: one shaded count per row`).toBe(t.denominators.length);t.denominators.forEach((d,i)=>{expect(d).toBeGreaterThan(0);expect(t.shaded[i]).toBeGreaterThanOrEqual(0);expect(t.shaded[i],`${where}: cannot shade more parts than exist`).toBeLessThanOrEqual(d);});break;
  case 'place':expect(t.digits.every(d=>d>=0&&d<=9),`${where}: digits are 0-9`).toBe(true);expect(t.digits.length).toBeLessThanOrEqual(3);break;
  case 'hundred':expect(t.shaded).toBeGreaterThanOrEqual(0);expect(t.shaded).toBeLessThanOrEqual(100);break;
  case 'percent':expect(t.percent).toBeGreaterThanOrEqual(0);expect(t.percent).toBeLessThanOrEqual(100);expect(t.whole).toBeGreaterThan(0);break;
  case 'ratio':expect(t.units.length,`${where}: one unit count per name`).toBe(t.names.length);expect(t.units.every(u=>u>0)).toBe(true);break;
  case 'balance':expect(t.left.x+t.left.n,`${where}: something on the left`).toBeGreaterThan(0);expect(t.xValue).toBeGreaterThan(0);break;
  case 'counters':expect(t.count).toBeGreaterThanOrEqual(0);expect(t.count).toBeLessThanOrEqual(t.frame??10);break;
 }
}
function checkItem(item:Item,lesson:Lesson,where:string){
 expect(item.key,`${where}: key`).toMatch(/^[a-z0-9-]+$/i);
 expect(item.prompt.length,`${where}: prompt`).toBeGreaterThan(8);
 expect(item.answer.trim().length,`${where}: answer`).toBeGreaterThan(0);
 expect(item.answer,`${where}: answer is a real value`).not.toMatch(/NaN|Infinity|undefined|null/);
 expect(isCorrect(item,item.answer),`${where}: its own answer must be accepted`).toBe(true);
 expect(item.hints.length,`${where}: at least one clue`).toBeGreaterThan(0);
 expect(item.hints.every(h=>h.trim().length>4),`${where}: clues have content`).toBe(true);
 expect(item.steps.length,`${where}: worked steps`).toBeGreaterThan(0);
 if(item.choices){expect(new Set(item.choices).size,`${where}: choices are distinct`).toBe(item.choices.length);expect(item.choices).toContain(item.answer);expect(item.choices.filter(c=>isCorrect(item,c)).length,`${where}: exactly one correct choice`).toBe(1);expect(item.choices.length).toBeGreaterThanOrEqual(2);}
 else if(lesson.level<=4&&!item.answer.includes('/')&&!item.answer.includes(':')){const n=Number(item.answer);if(Number.isFinite(n))expect(n,`${where}: no negative answers in P1–P4`).toBeGreaterThanOrEqual(0);}
 for(const [wrong,text] of Object.entries(item.wrong??{})){expect(isCorrect(item,wrong),`${where}: “${wrong}” is listed as a mistake but is accepted as correct`).toBe(false);expect(text.length).toBeGreaterThan(10);}
 if(item.tool)checkTool(item.tool,`${where} tool`);
 if(item.simpler)checkItem(item.simpler,lesson,`${where} simpler`);
 for(const way of item.another??[]){expect(way.steps.length).toBeGreaterThan(0);if(way.tool)checkTool(way.tool,`${where} another-way tool`);}
}
function stageItemsFor(stage:Stage,seed:number,index:number):Item[]{
 switch(stage.kind){
  case 'readiness':case 'reason':return stage.items;
  case 'practice':case 'apply':return Array.from({length:stage.count},(_,i)=>stage.gen(seed+index*1009,i));
  case 'mastery':return stage.gens.map((g,i)=>({...g.gen(seed+index*1009,i),facet:g.facet}));
  default:return [];
 }
}
describe('Learn lessons',()=>{
 it('describe curated curriculum objectives, prerequisites and a practice activity',()=>{
  expect(LESSONS.length).toBeGreaterThan(0);
  expect(new Set(LESSONS.map(l=>l.id)).size).toBe(LESSONS.length);
  for(const l of LESSONS){
   expect(l.id,'lesson id is safe for progress records').toMatch(/^[a-z0-9-]{3,60}$/);
   expect(`learn.${l.id}`).toMatch(/^[-a-z0-9.]{1,80}$/);
   expect(l.level,l.id).toBeGreaterThanOrEqual(1);expect(l.level).toBeLessThanOrEqual(6);
   expect(WORLDS[l.world],`${l.id}: world`).toBeDefined();
   expect(l.minutes,`${l.id}: length`).toBeGreaterThanOrEqual(3);expect(l.minutes).toBeLessThanOrEqual(20);
   expect(activityById(l.activityId),`${l.id}: practice activity ${l.activityId}`).toBeDefined();
   expect(l.skillIds.length,`${l.id}: objectives`).toBeGreaterThan(0);
   for(const s of l.skillIds)expect(CURRICULUM_SKILLS.find(c=>c.id===s),`${l.id}: unknown objective ${s}`).toBeDefined();
   for(const p of l.prerequisites)expect(!!lessonById(p)||!!CURRICULUM_SKILLS.find(c=>c.id===p),`${l.id}: unknown prerequisite ${p}`).toBe(true);
   expect(l.objectives.length).toBeGreaterThan(0);expect(l.canDo.length).toBeGreaterThan(0);
   expect(l.misconceptions.length,`${l.id}: known misconceptions`).toBeGreaterThan(0);
   const kinds=l.stages.map(s=>s.kind);
   expect(kinds.some(k=>k==='explore'||k==='notice'),`${l.id}: an interactive model or reasoning activity`).toBe(true);
   for(const needed of ['readiness','explain','worked','practice','apply','reason','mastery','discovery'])expect(kinds,`${l.id} is missing a ${needed} stage`).toContain(needed);
   const mastery=l.stages.find(s=>s.kind==='mastery')as Extract<Stage,{kind:'mastery'}>;
   expect(new Set(mastery.gens.map(g=>g.facet)).size,`${l.id}: mastery must cover different facets`).toBeGreaterThanOrEqual(5);
  }
 });
 it('matches the lightweight index used by the home and curriculum screens',()=>{
  expect(LESSON_INDEX.map(l=>l.id).sort()).toEqual(LESSONS.map(l=>l.id).sort());
  for(const meta of LESSON_INDEX){const l=lessonById(meta.id)!;expect([meta.title,meta.level,meta.track,meta.world,meta.minutes,meta.activityId,meta.skillIds]).toEqual([l.title,l.level,l.track,l.world,l.minutes,l.activityId,l.skillIds]);expect(l.objectives).toContain(meta.objective);}
 });
 it('builds a lesson for every topic code the plan advertises',()=>{
  expect(Object.keys(FAMILIES).sort()).toEqual([...FAMILY_CODES].sort());
  for(const code of FAMILY_CODES)expect(typeof FAMILIES[code],`no builder registered for ${code}`).toBe('function');
 });
 it('generates valid, solvable, deterministic questions for every stage and seed',()=>{
  for(const lesson of LESSONS)for(const seed of SEEDS)lesson.stages.forEach((stage,index)=>{
   const items=stageItemsFor(stage,seed,index);
   expect(new Set(items.map(i=>i.key)).size,`${lesson.id} stage ${index}: item keys must be unique`).toBe(items.length);
   items.forEach(item=>checkItem(item,lesson,`${lesson.id} stage ${index} ${item.key}`));
   if(stage.kind==='practice'||stage.kind==='apply')expect(stageItemsFor(stage,seed,index).map(i=>i.answer),`${lesson.id} stage ${index}: same seed, same questions`).toEqual(items.map(i=>i.answer));
  });
 },30000);
 it('teaches before it asks: explore goals start unmet and every step is answerable',()=>{
  for(const lesson of LESSONS)lesson.stages.forEach((stage,index)=>{
   const where=`${lesson.id} stage ${index}`;
   if(stage.kind==='explore'){
    expect(stage.goal(stage.tool),`${where}: the explore goal is already met, so there is nothing to do`).toBe(false);
    checkTool(stage.tool,where);
    expect(movesFor(stage.tool).length,`${where}: “${stage.title}” uses a display-only model, so the pupil has nothing to press`).toBeGreaterThan(0);
    expect(goalReachable(stage.tool,stage.goal),`${where}: “${stage.title}” cannot be reached with the controls this model offers`).toBe(true);
   }
   if(stage.kind==='notice')expect(stage.options.filter(o=>o.correct).length,`${where}: exactly one true option`).toBe(1);
   if(stage.kind==='worked'){expect(stage.steps.length).toBeGreaterThan(2);for(const s of stage.steps){if(s.tool)checkTool(s.tool,where);if(s.ask){expect(s.ask.answer.trim().length).toBeGreaterThan(0);if(s.ask.choices)expect(s.ask.choices).toContain(s.ask.answer);}}}
   if(stage.kind==='connect'){expect(stage.rows.length).toBeGreaterThan(1);for(const r of stage.rows)if(r.tool)checkTool(r.tool,where);}
   if(stage.kind==='explain'&&stage.tool)checkTool(stage.tool,where);
   if(stage.kind==='explain'&&stage.frames){expect(stage.frames.length,where).toBeGreaterThanOrEqual(3);for(const frame of [...stage.frames,...(stage.alternatives??[]).flatMap(a=>a.frames)]){expect(frame.text.length,where).toBeGreaterThan(5);expect(frame.tool,where+' needs a visible model').toBeDefined();if(frame.tool)checkTool(frame.tool,where+' visual step');}}
   if(stage.kind==='explain'&&stage.why?.tool)checkTool(stage.why.tool,where);
   if(stage.kind==='hook'&&stage.tool)checkTool(stage.tool,where);
   if(stage.kind==='discovery'&&stage.tool)checkTool(stage.tool,where);
   if(stage.kind==='readiness')for(const b of stage.booster)if(b.tool)checkTool(b.tool,where);
  });
 });
 it('never teaches a keyword rule for choosing an operation',()=>{
  const banned=/(altogether|more|fewer|less|each|left)\s+(always\s+)?means\s+(add|subtract|multiply|divide|plus|minus)/i;
  for(const lesson of LESSONS){const text=JSON.stringify(lesson.stages);expect(banned.test(text),`${lesson.id} contains a keyword rule`).toBe(false);}
 });
});
describe('mastery and manipulative arithmetic',()=>{
 it('awards three stars only for full, mostly unaided success',()=>{
  const facets=['direct','visual','reverse','missing','word','unfamiliar','reasoning'] as const;
  const all=(correct:boolean,firstTry:boolean)=>facets.map(f=>({facet:f,correct,firstTry}));
  expect(masteryStars(all(true,true))).toBe(3);
  expect(masteryStars(all(true,true).map((r,i)=>i<2?{...r,firstTry:false}:r))).toBe(2);
  expect(masteryStars(all(true,true).map((r,i)=>i<1?{...r,firstTry:false}:r))).toBe(3);
  expect(masteryStars(all(true,true).map((r,i)=>i<2?{...r,correct:false,firstTry:false}:r))).toBe(2);
  expect(masteryStars(all(true,true).map((r,i)=>i<3?{...r,correct:false,firstTry:false}:r))).toBe(1);
  expect(masteryStars([])).toBe(1);
 });
 it('draws parts, positions and totals faithfully',()=>{
  const parts=stripParts(600,8);expect(parts).toHaveLength(8);expect(parts[0].width).toBeCloseTo(75);expect(parts[7].x).toBeCloseTo(525);
  expect(new Set(stripParts(300,7).map(p=>p.width.toFixed(6))).size,'equal parts must be equal').toBe(1);
  expect(linePosition(5,0,10,0,200)).toBeCloseTo(100);expect(linePosition(0.75,0,1,20,120)).toBeCloseTo(95);
  expect(barWidths([3,5],8,100)).toEqual([37.5,62.5]);
  expect(barWidths([3,null],8,100)[1]).toBeCloseTo(62.5);
  expect(placeValue([4,3,7],0)).toBeCloseTo(0.437);expect(placeValue([5],2)).toBeCloseTo(2.5);
  expect(expandedForm([4,3,7])).toBe('4 tenths + 3 hundredths + 7 thousandths');
  expect(expandedForm([0,1],3)).toBe('3 ones + 1 hundredth');
  expect(percentOf(80,25)).toBe(20);expect(percentOf(45,10)).toBe(4.5);
  expect(sideWeight({x:2,n:3},4)).toBe(11);
  expect(equalRows({kind:'fractions',denominators:[2,4,8],shaded:[1,2,4]})).toEqual([[0,1],[0,2],[1,2]]);
  expect(equalRows({kind:'fractions',denominators:[2,3],shaded:[1,1]})).toEqual([]);
 });
});
