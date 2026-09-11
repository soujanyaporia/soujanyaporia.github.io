import { cp,mkdir,rm } from 'node:fs/promises';
await rm('shared',{recursive:true,force:true});
for(const dir of ['state','engine','content','game','primary'])await cp('../src/'+dir,'shared/'+dir,{recursive:true,filter:s=>!s.includes('__tests__')&&!s.endsWith('.tsx')&&!s.endsWith('.test.ts')});
await mkdir('shared/school',{recursive:true});await cp('../src/school/events.ts','shared/school/events.ts');
