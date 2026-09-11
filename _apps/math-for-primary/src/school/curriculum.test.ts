import { describe,it,expect } from 'vitest';
import { CURRICULUM_SKILLS, curriculumPath } from './curriculum';
import { lessonById, LESSONS } from '../content/lessons';
describe('MOE curriculum catalog',()=>{
 it('has unique versioned objectives across every standard and foundation year',()=>{expect(new Set(CURRICULUM_SKILLS.map(s=>s.id)).size).toBe(CURRICULUM_SKILLS.length);for(let y=1;y<=6;y++)expect(curriculumPath(y,'standard').length).toBeGreaterThan(5);for(const y of [5,6])expect(curriculumPath(y,'foundation').length).toBeGreaterThan(5);});
 it('has a resolvable acyclic prerequisite graph',()=>{const done=new Set<string>();function visit(id:string,stack=new Set<string>()){if(done.has(id))return;expect(stack.has(id),id).toBe(false);const s=CURRICULUM_SKILLS.find(x=>x.id===id);expect(s,id).toBeDefined();const path=new Set(stack).add(id);s!.prerequisites.forEach(p=>visit(p,path));done.add(id);}CURRICULUM_SKILLS.forEach(s=>visit(s.id));});
 it('maps all existing lessons without claiming unavailable content',()=>{const links=CURRICULUM_SKILLS.flatMap(s=>s.lessonIds);for(const id of links)expect(lessonById(id)).toBeDefined();for(const l of LESSONS)expect(links).toContain(l.id);expect(CURRICULUM_SKILLS.filter(s=>s.status==='available').every(s=>s.lessonIds.length>0||s.activityIds.length>0)).toBe(true);expect(curriculumPath(6,'foundation').some(s=>['RATIO','ALG','CIRCLE'].includes(s.subtopic))).toBe(false);});
});
