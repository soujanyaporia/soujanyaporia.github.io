import {describe,it,expect} from 'vitest';
import {guestSetup} from './guestSetup';
import {initialProgress} from '../state/progress';
import {parseRoute} from '../app/router';
describe('Guest account setup',()=>{
 it('keeps all learning records while saving a nickname and course',()=>{const before=initialProgress();before.totals.attempted=7;before.primary.activities={saved:{attempts:7} as any};const after=guestSetup(before,'  Star  ',5,'foundation');expect(after.profile.name).toBe('Star');expect(after.primary.selection).toEqual({level:5,track:'foundation'});expect(after.totals).toBe(before.totals);expect(after.primary.activities).toBe(before.primary.activities);expect(before.profile.name).toBe('');});
 it('uses a friendly default and restricts Foundation to P5/P6',()=>{expect(guestSetup(initialProgress(),' ',2,'foundation').profile.name).toBe('Explorer');expect(guestSetup(initialProgress(),'A',2,'foundation').primary.selection?.track).toBe('standard');expect(()=>guestSetup(initialProgress(),'A',7,'standard')).toThrow();});
 it('opens guest setup through a shareable route',()=>expect(parseRoute('#/guest')).toEqual({name:'guest'}));
});
