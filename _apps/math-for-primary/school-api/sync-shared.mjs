import { cp,mkdir,rm } from 'node:fs/promises';
await rm('shared',{recursive:true,force:true});
for(const dir of ['state','engine','content','game','primary'])await cp('../src/'+dir,'shared/'+dir,{recursive:true,filter:s=>!s.includes('__tests__')&&!s.endsWith('.tsx')&&!s.endsWith('.test.ts')});
await mkdir('shared/school',{recursive:true});await cp('../src/school/events.ts','shared/school/events.ts');

// Shared progress repositories reference this browser boundary; the API never calls it.
await mkdir('shared/services/cloudSync',{recursive:true});await cp('../src/services/cloudSync/storage.ts','shared/services/cloudSync/storage.ts');
