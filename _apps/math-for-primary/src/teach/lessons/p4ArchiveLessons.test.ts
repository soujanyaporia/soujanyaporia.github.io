import {describe,it,expect} from 'vitest';
import type {Facet} from '../model';
import {activityById} from '../../primary/catalog';
import {LESSONS} from '../catalog';
import {LESSON_INDEX} from '../index';
import {P4_ARCHIVE_LESSONS,threeGroupsItem,transferDifferenceItem} from './p4ArchiveLessons';
import {P4_ARCHIVE_META} from './p4ArchiveLessonMeta';

const facets:Facet[]=['direct','visual','missing','word','reverse','reasoning'];
const nums=(s:string)=>Array.from(s.matchAll(/\d+/g),m=>Number(m[0]));
describe('P4 archive lessons',()=>{
 it('solves every generated facet from the visible givens',()=>{
  for(let seed=1;seed<=100;seed++) for(const facet of facets){
   const a=threeGroupsItem(seed,0,facet),n=nums(a.prompt);
   expect(a).toEqual(threeGroupsItem(seed,0,facet));
   if(facet==='reasoning') expect(a.answer).toBe('Set aside the extra red buttons.');
   else if(facet==='reverse'){const [green,factor,extra]=n;expect(Number(a.answer)).toBe(green*(2*factor+1)+extra);}
   else {const [total,extra,factor]=n,green=(total-extra)/(2*factor+1);expect(Number.isInteger(green)).toBe(true);expect(Number(a.answer)).toBe(facet==='visual'?green:facet==='missing'?total-extra:facet==='word'?factor*green+extra:factor*green);}
   const b=transferDifferenceItem(seed,0,facet),v=nums(b.prompt);
   expect(b).toEqual(transferDifferenceItem(seed,0,facet));
   if(facet==='reasoning') expect(b.answer).toBe('The top lost and the bottom gained the same number.');
   else if(facet==='reverse'){const [bottom,moved]=v;expect(Number(b.answer)).toBe(2*bottom-moved-(bottom+moved));}
   else {const [moved,gap]=v,oldGap=gap+2*moved;expect(Number(b.answer)).toBe(facet==='visual'||facet==='missing'?oldGap:facet==='word'?2*oldGap-moved:2*oldGap);}
  }
 });
 it('registers the lessons and matching lightweight metadata against active activities',()=>{
  for(const meta of P4_ARCHIVE_META){expect(activityById(meta.activityId)).toBeTruthy();expect(LESSON_INDEX.find(x=>x.id===meta.id)).toEqual(meta);expect(LESSONS.find(x=>x.id===meta.id)?.activityId).toBe(meta.activityId);}
 });
 it('keeps checkpoint answers out of the given tables',()=>{
  for(const lesson of P4_ARCHIVE_LESSONS){const worked=lesson.stages.find(s=>s.kind==='worked');expect(worked?.kind).toBe('worked');if(worked?.kind!=='worked')continue;for(const step of worked.steps){if(!step.ask)continue;expect(step.math).toBeUndefined();expect(step.tool?.kind).toBe('table');if(step.tool?.kind==='table')expect(step.tool.rows.flat().map(v=>v.trim())).not.toContain(step.ask.answer);}}
 });
});
