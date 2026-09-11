import {it,expect} from 'vitest';
import {parseRoster} from './SchoolScreens';
it('parses quoted CSV names and validates the selected class before import',()=>{
 expect(parseRoster('student_id,name,level,class\r\n10001,"Tan, Alice",P3,Integrity',{level:3,name:'Integrity'})).toEqual([{student_id:'10001',name:'Tan, Alice'}]);
 expect(()=>parseRoster('student_id,name,level,class\n1,Alice,P2,Integrity',{level:3,name:'Integrity'})).toThrow('level');
 expect(()=>parseRoster('student_id,name,level,class\n1,Alice,P3,Other',{level:3,name:'Integrity'})).toThrow('class');
 expect(()=>parseRoster('name\nAlice',{level:3,name:'Integrity'})).toThrow('student_id');
 expect(()=>parseRoster('student_id,name\n1,"Alice',{level:3,name:'Integrity'})).toThrow('Unclosed');
});
