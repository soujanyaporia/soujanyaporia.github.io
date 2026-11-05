import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {makeBatch8Angles,type Batch8AnglesQuestion} from './batch8Angles';
import {BATCH8_ANGLES_PARTS} from './batch8AnglesMeta';
import {Batch8AnglesDiagram} from './Batch8AnglesDiagram';
import {Batch8AngleConstruction} from './Batch8AngleConstruction';
import {constructionSweep,type AnglePoint,type AngleConstructionSpec} from './batch8AnglesPicture';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
const measured=(v:AnglePoint,a:AnglePoint,b:AnglePoint)=>{const ax=a.x-v.x,ay=a.y-v.y,bx=b.x-v.x,by=b.y-v.y;return Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by)))))*180/Math.PI;};
/** Solve from labels, visible endpoints and printed givens, not steps/answer. */
export function solveBatch8Angles(q:Batch8AnglesQuestion):string|number{
 const m=q.picture;
 if(m.layout==='notation'){const i=m.markedVertex;return `${m.points[(i+3)%4].label}${m.points[i].label}${m.points[(i+1)%4].label}`;}
 if(m.layout==='square-corner')return 90-m.nearHorizontal-m.nearVertical;
 if(m.layout==='dots'){const target=q.prompt.includes('right angle')?90:Number(q.prompt.match(/(\d+)°/)![1]),matches=m.dots.filter(p=>Math.abs(measured(m.vertex,m.base,p)-target)<1e-6);if(matches.length!==1)throw Error('Endpoint ambiguous');return matches[0].label;}
 if(q.angleConstruction)return Number(q.prompt.match(/(\d+)°/)![1]);
 return Math.round(measured(m.vertex,m.ends[0],m.ends[1]));
}
describe('Distinct P4 source-derived angle formats',()=>{
 it('has7 tasks covering notation,measurement and construction with valid skills',()=>{
  expect(BATCH8_ANGLES_PARTS).toHaveLength(7);expect(new Set(BATCH8_ANGLES_PARTS.map(p=>p.canonicalPatternId)).size).toBe(7);for(const p of BATCH8_ANGLES_PARTS)for(const skill of p.skillIds)expect(CURRICULUM_SKILLS.some(s=>s.id===skill),skill).toBe(true);
 });
 it('solves280 original variants from visible geometry without P5 angle-sum rules',()=>{
  for(const p of BATCH8_ANGLES_PARTS)for(let seed=0;seed<40;seed++){
   const q=makeBatch8Angles(p.id,seed),answer=String(solveBatch8Angles(q));expect(correctAnswer(q as Question,answer),`${p.id}:${seed}`).toBe(true);expect(correctAnswer(q as Question,'999999')).toBe(false);expect(q).toEqual(makeBatch8Angles(p.id,seed));expect(q.prompt.split(/\s+/).length).toBeLessThanOrEqual(35);expect(q.explanation).not.toMatch(/triangle.*180|straight line.*180|full turn|vertically opposite/i);expect(q.workedSteps!.length).toBeGreaterThan(0);
   if(q.choices){expect(new Set(q.choices).size).toBe(q.choices.length);expect(q.choices.filter(v=>correctAnswer(q as Question,v))).toHaveLength(1);}
   if(q.picture.layout==='rays')for(const point of [q.picture.vertex,...q.picture.ends]){expect(point.x).toBeGreaterThan(15);expect(point.x).toBeLessThan(485);expect(point.y).toBeGreaterThan(15);expect(point.y).toBeLessThan(335);}
  }
 });
 it('renders all formats without printing hidden correct measurements',()=>{
  for(const p of BATCH8_ANGLES_PARTS){const q=makeBatch8Angles(p.id,12),html=renderToStaticMarkup(createElement(Batch8AnglesDiagram,{model:q.picture}));expect(html).not.toMatch(/NaN|undefined|Infinity/);expect(html).toContain('role="img"');
   if(['protractor-scales','measure-oblique','join-target','construct-ray'].includes(p.id)){expect(html).toContain('data-protractor="dual-scale"');expect(html).toContain('>0</text>');expect(html).toContain('>180</text>');}
   if(p.id==='measure-oblique'){expect(q.picture.layout).toBe('rays');if(q.picture.layout==='rays'){expect(q.picture.closeShape).toBe(true);expect(q.picture.protractorRotation).not.toBe(0);}}
   expect(JSON.stringify(q.picture)).not.toMatch(/answer|correctOption|targetIndex/);
  }
 });
 it('maps pointer coordinates to swept degrees for both directions and rotated baselines',()=>{
  for(const baseline of [0,20,160,180])for(const turn of [0,35,75,125,180]){
   const direction:1|-1=baseline>90?-1:1,spec:AngleConstructionSpec={baseline,direction,vertexLabel:'D',baseLabel:'C',endLabel:'E'},absolute=(baseline+direction*turn)*Math.PI/180,x=250+160*Math.cos(absolute),y=240-160*Math.sin(absolute);
   expect(constructionSweep(spec,x,y),`${baseline}/${turn}`).toBe(turn);expect(constructionSweep(spec,250,240)).toBeNull();const other=(baseline-direction*45)*Math.PI/180;expect(constructionSweep(spec,250+160*Math.cos(other),240-160*Math.sin(other))).toBeNull();
  }
 });
 it('draws the actual chosen ray, preserves numeric drafts and supplies keyboard controls',()=>{
  const q=makeBatch8Angles('construct-ray',12),spec=q.angleConstruction!;expect(spec).not.toHaveProperty('target');expect(spec).not.toHaveProperty('answer');
  const blank=renderToStaticMarkup(createElement(Batch8AngleConstruction,{spec,value:'',onChange:()=>{}})),drawn=renderToStaticMarkup(createElement(Batch8AngleConstruction,{spec,value:q.answer,onChange:()=>{}}));
  expect(blank).not.toContain('data-constructed-ray');expect(drawn).toContain('data-constructed-ray="true"');expect(drawn).toContain('type="number"');expect(drawn).toContain('min-height:44px');expect(drawn).toContain('>E</text>');expect(drawn).not.toMatch(/NaN|undefined/);
  const restored=JSON.parse(JSON.stringify({value:q.answer}));expect(correctAnswer(q as Question,restored.value)).toBe(true);expect(()=>makeBatch8Angles('missing',1)).toThrow();
 });
 it('shows a correctly labelled final construction in the worked solution only',()=>{
  for(let seed=0;seed<20;seed++){
   const q=makeBatch8Angles('construct-ray',seed),given=q.picture,solution=q.workedSteps!.at(-1)!.picture;
   if(given.layout!=='rays'||solution?.type!=='batch8-angles'||solution.layout!=='rays')throw Error('Missing final ray drawing');
   expect(given.ends).toHaveLength(1);expect(given.ends[0].label).toBe('C');expect(solution.ends.map(p=>p.label)).toEqual(['C','E']);expect(measured(solution.vertex,solution.ends[0],solution.ends[1])).toBeCloseTo(Number(q.answer),8);
   const html=renderToStaticMarkup(createElement(Batch8AnglesDiagram,{model:solution}));expect(html).toContain('>E</text>');expect(html).not.toMatch(/NaN|undefined/);
  }
 });
});
