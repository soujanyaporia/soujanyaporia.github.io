import { test,after } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import { localDb } from '../local-db.mjs';
const DB=localDb();after(()=>DB.close());const env={DB,BOOTSTRAP_SECRET:'test-private-bootstrap'};
async function call(path,method='GET',body,token){const r=await worker.fetch(new Request('https://test'+path,{method,headers:{Origin:'https://soujanyaporia.github.io','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,body:await r.json()};}
const PASSWORD='Long-school-password!';
const login=async(code,username,password=PASSWORD)=>(await call('/api/login','POST',{schoolCode:code,username,password})).body.token;
async function school(code){
 assert.equal((await call('/api/bootstrap','POST',{code,schoolName:code,name:'Admin',username:'admin',password:PASSWORD},env.BOOTSTRAP_SECRET)).status,201);
 const admin=await login(code,'admin'),year=(await call('/api/school','GET',null,admin)).body.years[0].id;
 const classId=(await call('/api/classes','POST',{yearId:year,level:3,name:'Courage',track:'standard'},admin)).body.id;
 const pupil=async(username)=>{const id=(await call('/api/users','POST',{username,name:username,password:'12345678',classId},admin)).body.id;const t=await login(code,username,'12345678');assert.equal((await call('/api/password','POST',{current:'12345678',password:'87654321'},t)).status,200);return {id,token:await login(code,username,'87654321')};};
 return {admin,classId,pupil};
}
const now=Date.now();
const session=(extra={})=>({schema:1,id:'0123456789abcdef',activityId:'p1s-count-n0',generator:'1',seed:123,count:8,fingerprints:Array(8).fill(''),mode:'practice',repairOf:null,repair:[],cursor:1,results:[{answer:'7',correct:true,firstTry:true,hints:0,tries:1,wrong:[],at:now}],draft:{position:1,value:'1',picks:[],shaded:[],tries:1,wrong:['12'],hint:true,status:'wrong',stage:'try',at:now+1},startedAt:now-1000,updatedAt:now+1,completedAt:null,stars:null,...extra});
test('health advertises resumable sessions',async()=>{const r=await call('/health');assert.deepEqual(r.body.capabilities,['primary-sessions-1']);});
test('a pupil restores the same unfinished session, draft included, on a second device without changing progress',async()=>{
 const s=await school('SESS-A'),a=await s.pupil('pupil-a'),second=await login('SESS-A','pupil-a','87654321');
 assert.deepEqual((await call('/api/sessions','GET',null,a.token)).body.sessions,[]);
 const saved=await call('/api/sessions/p1s-count-n0','POST',{session:session(),baseRev:0},a.token);assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.rev,1);
 const restored=(await call('/api/sessions','GET',null,second)).body.sessions;assert.equal(restored.length,1);assert.equal(restored[0].rev,1);assert.deepEqual(restored[0].draft,session().draft);assert.equal(restored[0].cursor,1);
 assert.equal((await call('/api/progress','GET',null,second)).body.progress.totals.attempted,0);
 // A device that did not see revision 1 is told about it instead of overwriting it.
 const stale=await call('/api/sessions/p1s-count-n0','POST',{session:session({draft:null}),baseRev:0},second);assert.equal(stale.status,409);assert.equal(stale.body.rev,1);assert.equal(stale.body.session.draft.value,'1');
 const next=await call('/api/sessions/p1s-count-n0','POST',{session:session({draft:null,updatedAt:now+5}),baseRev:1},second);assert.equal(next.status,200);assert.equal(next.body.rev,2);
 for(const bad of [{session:session(),baseRev:2,path:'p1s-place-n1'},{session:{...session(),seed:-1},baseRev:2},{session:{...session(),activityId:'p9-missing'},baseRev:2,path:'p9-missing'},{session:session(),baseRev:'2'}])assert.equal((await call('/api/sessions/'+(bad.path||'p1s-count-n0'),'POST',bad,a.token)).status,400);
});
test('sessions stay private to each pupil, school and role',async()=>{
 const s=await school('SESS-B'),a=await s.pupil('pupil-a'),b=await s.pupil('pupil-b'),other=await (await school('SESS-C')).pupil('pupil-a');
 assert.equal((await call('/api/sessions/p1s-count-n0','POST',{session:session(),baseRev:0},a.token)).status,200);
 assert.deepEqual((await call('/api/sessions','GET',null,b.token)).body.sessions,[]);assert.deepEqual((await call('/api/sessions','GET',null,other.token)).body.sessions,[]);
 assert.equal((await call('/api/sessions/p1s-count-n0','POST',{session:session({id:'fedcba9876543210'}),baseRev:0},b.token)).status,200);
 assert.equal((await call('/api/sessions','GET',null,a.token)).body.sessions[0].id,'0123456789abcdef');
 assert.equal((await call('/api/sessions','GET',null,s.admin)).status,403);assert.equal((await call('/api/sessions/p1s-count-n0','POST',{session:session(),baseRev:0},s.admin)).status,403);
 assert.equal((await call('/api/users/'+a.id,'PATCH',{active:false},s.admin)).status,200);assert.equal((await call('/api/sessions','GET',null,a.token)).status,401);
 const reset=(await call('/api/users/'+b.id,'PATCH',{password:'11223344'},s.admin)).status;assert.equal(reset,200);const fresh=await login('SESS-B','pupil-b','11223344');assert.equal((await call('/api/sessions','GET',null,fresh)).status,403);
});
test('the same scored answer and completion from two devices count once',async()=>{
 const s=await school('SESS-D'),a=await s.pupil('pupil-a'),second=await login('SESS-D','pupil-a','87654321');
 const answer={id:'6f1c2a9e-4b7d-4e2a-9c3f-000000000001',at:now,kind:'primary_answer',activityId:'p1s-count-n0',questionKey:'p1s-count-n0:123:0|s=0123456789abcdef|p=0|n=8|g=1|f=-|m=p',answer:'7',correct:true,firstTry:true,hints:0,tries:1,sessionId:'0123456789abcdef',position:0};
 const complete={id:'6f1c2a9e-4b7d-4e2a-9c3f-000000000002',at:now,kind:'primary_complete',activityId:'p1s-count-n0',stars:3,sessionId:'0123456789abcdef'};
 assert.equal((await call('/api/progress','POST',{version:0,events:[answer,complete]},a.token)).status,200);
 assert.equal((await call('/api/progress','POST',{version:0,events:[answer,complete]},second)).status,409);
 const retry=await call('/api/progress','POST',{version:1,events:[answer,complete]},second);assert.equal(retry.status,200);
 assert.deepEqual([retry.body.progress.totals.attempted,retry.body.progress.totals.sessions,retry.body.progress.totals.stars],[1,1,3]);
 assert.equal(retry.body.progress.primary.history[0].questionKey,answer.questionKey);
 // A different event ID for the same session position is recognised from saved history.
 const again=await call('/api/progress','POST',{version:2,events:[{...answer,id:'6f1c2a9e-4b7d-4e2a-9c3f-000000000003'}]},a.token);assert.equal(again.body.progress.totals.attempted,1);
 assert.equal((await call('/api/progress','POST',{version:3,events:[{...answer,id:'6f1c2a9e-4b7d-4e2a-9c3f-000000000004',sessionId:'nope'}]},a.token)).status,400);
});
test('lazy daily and original picture activities restore six-question sessions and retain separate day progress',async()=>{
 const s=await school('SESS-DAILY'),a=await s.pupil('pupil-a');
 const ids=['p3s-daily-055','p6f-daily-200','p3s-paper-p3-gaps','p1s-paper-mixed','p1s-paper-hp25-12','p3s-paper-rg25-11','p2s-paper-b4e-half-symbol-pair-total','p6s-paper-b4u-savings-change-percent','p1s-paper-b5e-14-equation','p3s-paper-b5m-12','p5s-paper-b5u-tank-fraction','p2s-paper-b6e-12','p4s-paper-b6m-13','p6s-paper-b6u-1b'];
 for(const [i,activityId] of ids.entries()){
  const saved=session({activityId,id:(i+1).toString(16).padStart(16,'0'),generator:'1.1',count:6,fingerprints:Array(6).fill('')});
  const r=await call('/api/sessions/'+activityId,'POST',{session:saved,baseRev:0},a.token);assert.equal(r.status,200,JSON.stringify(r.body));
 }
 const restored=(await call('/api/sessions','GET',null,a.token)).body.sessions;
 assert.deepEqual(restored.map(s=>s.activityId).sort(),[...ids].sort());assert.ok(restored.every(s=>s.count===6&&s.draft.position===1));
 assert.equal((await call('/api/progress','GET',null,a.token)).body.progress.totals.attempted,0);
 const events=ids.slice(0,2).flatMap((activityId,i)=>{
  const sessionId=(i+1).toString(16).padStart(16,'0');
  return [...Array.from({length:6},(_,position)=>({id:crypto.randomUUID(),at:now,kind:'primary_answer',activityId,sessionId,position,questionKey:`${activityId}:123:${position}|s=${sessionId}|p=${position}|n=6|g=1.1|f=-|m=p`,answer:String(position),correct:true,firstTry:true,tries:1,hints:0})),{id:crypto.randomUUID(),at:now,kind:'primary_complete',activityId,sessionId,stars:3}];
 });
 const scored=await call('/api/progress','POST',{version:0,events},a.token);assert.equal(scored.status,200,JSON.stringify(scored.body));assert.equal(scored.body.progress.totals.attempted,12);
 for(const id of ids.slice(0,2)){assert.equal(scored.body.progress.primary.activities[id].sessions,1);assert.equal(scored.body.progress.primary.activities[id].attempts,6);}
 assert.equal(scored.body.progress.primary.activities['p3s-daily-054'],undefined);
 for(const activityId of ['p3f-daily-001','p6f-daily-201','p1s-daily-000','p3s-paper-missing']){
  assert.equal((await call('/api/sessions/'+activityId,'POST',{session:session({activityId}),baseRev:0},a.token)).status,400);
  assert.equal((await call('/api/progress','POST',{version:1,events:[{...events[0],id:crypto.randomUUID(),activityId}]},a.token)).status,400);
 }
});
