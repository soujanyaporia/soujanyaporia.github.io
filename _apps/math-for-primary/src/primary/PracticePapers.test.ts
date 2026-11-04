import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {PracticePapers} from './PracticePapers';
import {generatePracticePaper} from './practicePaper';
import {createPaperAttempt,writePaperAttempt} from './paperAttempt';
import type {KV} from './sessionStore';

vi.mock('../state/ProgressContext',()=>({useProgress:()=>({scope:'guest',progress:{primary:{selection:{level:3,track:'standard'}}}})}));
afterEach(()=>vi.unstubAllGlobals());
describe('Paper setup and resume',()=>{
 it('opens setup with a clear Continue action, retaining an existing 18-question attempt',()=>{
  const values=new Map<string,string>(),kv:KV={getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}};
  const paper=generatePracticePaper({level:3,track:'standard',count:18,topic:'mixed',seed:817});
  const position=paper.items.findIndex(item=>item.activity.parameter==='p3-transfer');expect(position).toBeGreaterThanOrEqual(0);
  const saved={...createPaperAttempt(paper),position};saved.answers[0]='17';writePaperAttempt(kv,'guest',saved);vi.stubGlobal('localStorage',kv);
  const html=renderToStaticMarkup(createElement(PracticePapers));
  expect(html).toContain('<h1>Create a paper</h1>');expect(html).toContain('Create my paper');
  expect(html).toContain(`Continue my paper · question ${position+1}`);expect(html).not.toContain('class="paper-question-nav"');
  expect([...values.values()][0]).toBe(JSON.stringify(saved));
 });
});
