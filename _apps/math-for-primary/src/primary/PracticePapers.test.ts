import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {PracticePapers,PaperActions} from './PracticePapers';
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

describe('A single paper finish control',()=>{
 const actions={onMove:()=>{},onFinish:()=>{},onConfirm:()=>{},onCancel:()=>{},onCreate:()=>{}};
 it('shows exactly one check action at the end of a completed paper',()=>{
  const html=renderToStaticMarkup(createElement(PaperActions,{...actions,position:5,count:6,answered:6,marked:false,confirming:false}));
  expect(html.match(/Check my answers/g)).toHaveLength(1);expect(html).not.toContain('Finish early');expect(html).not.toContain('Finish &amp;');expect(html).not.toContain('paper-mark-confirm');
 });
 it('replaces navigation and finish buttons while confirming an incomplete paper',()=>{
  const html=renderToStaticMarkup(createElement(PaperActions,{...actions,position:5,count:6,answered:4,marked:false,confirming:true}));
  expect(html.match(/Check my answers/g)).toHaveLength(1);expect(html).toContain('2 questions are not finished.');expect(html).toContain('Keep working');expect(html).not.toContain('paper-next');expect(html).not.toContain('paper-submit');
 });
});
