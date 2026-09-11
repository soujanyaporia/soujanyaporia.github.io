import bcrypt from 'bcryptjs';
import { initialProgress } from './shared/state/progress';
import { reduceEvent } from './shared/school/events';
import { SKILLS } from './shared/engine/skills';

type Env = { DB: any; BOOTSTRAP_SECRET?: string; ALLOWED_ORIGIN?: string };
const uuid = () => crypto.randomUUID();
const now = () => Date.now();
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(s:string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join(''); }
class ApiError extends Error { constructor(public status:number,message:string){super(message)} }
const fail = (status:number,message:string):never => {throw new ApiError(status,message)};
const str = (s:any,max=100) => typeof s==='string' && s.trim().length>0 && s.trim().length<=max ? s.trim() : fail(400,'Please check the required fields.');
const secret = (s:any,role:string) => { if(typeof s!=='string'||s.length<(role==='student'?8:12)||new TextEncoder().encode(s).length>72) fail(400,role==='student'?'Use at least 8 characters for a student PIN/password.':'Use a password of 12–72 bytes.');return s; };
const integer = (n:any,min:number,max:number) => Number.isInteger(n)&&n>=min&&n<=max?n:fail(400,'Number outside the permitted range.');
const cleanUser = (u:any) => ({id:u.id,schoolId:u.school_id,username:u.username,name:u.name,role:u.role,mustChange:!!u.must_change,schoolName:u.school_name,schoolCode:u.school_code,demo:!!u.demo});
export default { async fetch(request:Request,env:Env) {
 const origin = request.headers.get('Origin');
 const origins = [env.ALLOWED_ORIGIN || 'https://soujanyaporia.github.io','http://localhost:5174'];
 const headers:Record<string,string> = {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Referrer-Policy':'no-referrer'};
 if(origin && origins.includes(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Authorization, Content-Type';headers['Access-Control-Allow-Methods']='GET, POST, PATCH, OPTIONS';}
 const response=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
 try {
  if(origin&&!origins.includes(origin)) fail(403,'This origin is not allowed.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(request.url).pathname.replace(/\/$/,'') || '/';
  if(path==='/'||path==='/health')return response({service:'Math for Primary accounts',version:1});
  const db=env.DB;
  const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
  const first=async(sql:string,...args:any[])=>q(sql,...args).first();
  const rows=async(sql:string,...args:any[])=>(await q(sql,...args).all()).results;
  async function body(){const raw=await request.text();if(raw.length>100000)fail(413,'Request too large.');try{return JSON.parse(raw)}catch{fail(400,'Invalid JSON.')}}
  async function throttle(key:string,max=8){const t=now();await q('INSERT INTO login_limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END',key,t+15*60000,t,t).run();const l=await first('SELECT count FROM login_limits WHERE key=?',key);if(l.count>max)fail(429,'Too many attempts. Please try again in 15 minutes.');}
  async function createSchool(b:any,demo=false){
   const sid=uuid(),uid=uuid(),code=str(b.code,24).toUpperCase();if(!/^[A-Z0-9-]+$/.test(code))fail(400,'Use letters, numbers and hyphens for school code.');
   const hash=await bcrypt.hash(secret(b.password,'admin'),12);
   await db.batch([q('INSERT INTO schools(id,code,name,demo) VALUES(?,?,?,?)',sid,code,str(b.schoolName),+demo),q('INSERT INTO users(id,school_id,username,name,role,password_hash,active,must_change,created_at) VALUES(?,?,?,?,?,?,1,0,?)',uid,sid,str(b.username).toLowerCase(),str(b.name),'admin',hash,now()),q('INSERT INTO years(id,school_id,year) VALUES(?,?,?)',uuid(),sid,new Date().getUTCFullYear())]);
   return {schoolId:sid,userId:uid};
  }
  if(path==='/api/bootstrap'&&request.method==='POST'){
   // Server-only provisioning; a deployment secret is never shipped in the client.
   if(!env.BOOTSTRAP_SECRET || request.headers.get('Authorization')!==`Bearer ${env.BOOTSTRAP_SECRET}`)fail(401,'Not authorised.');
   const b=await body();if(await first('SELECT id FROM schools WHERE code=?',str(b.code,24).toUpperCase()))fail(409,'School already exists.');
   return response(await createSchool(b),201);
  }
  if(path==='/api/login'&&request.method==='POST'){
   const b=await body(),code=str(b.schoolCode,24).toUpperCase(),username=str(b.username).toLowerCase();
   await throttle('ip:'+await digest(request.headers.get('CF-Connecting-IP')||'local'),100);
   await throttle('login:'+await digest(code+':'+username));
   const u=await first('SELECT u.*,s.name school_name,s.code school_code,s.demo FROM users u JOIN schools s ON s.id=u.school_id WHERE s.code=? AND u.username=?',code,username);
   // Always run a password hash comparison so unknown users have similar timing.
   const dummy='$2b$12$H1qCP1IXCMiFN6Ocy/P6I.Aksslp98w4ElSPHEK/.cbMgdk/QVm8m';
   const valid=await bcrypt.compare(typeof b.password==='string'?b.password.slice(0,100):'',u?.password_hash||dummy);
   if(!u||!u.active||!valid)fail(401,'School code, username or password is incorrect.');
   await q('DELETE FROM login_limits WHERE key=?','login:'+await digest(code+':'+username)).run();
   const t=token();await q('INSERT INTO sessions(hash,user_id,expires_at) VALUES(?,?,?)',await digest(t),u.id,now()+8*3600000).run();
   return response({token:t,user:cleanUser(u)});
  }
  const bearer=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const u=bearer?await first('SELECT u.*,s.name school_name,s.code school_code,s.demo FROM sessions t JOIN users u ON u.id=t.user_id JOIN schools s ON s.id=u.school_id WHERE t.hash=? AND t.expires_at>? AND u.active=1',await digest(bearer),now()):null;
  if(!u)fail(401,'Please sign in again.');
  const staff=()=>{if(!['teacher','admin'].includes(u.role))fail(403,'Staff access required.');};
  const admin=()=>{if(u.role!=='admin')fail(403,'Administrator access required.');};
  const audit=(action:string,target:string)=>q('INSERT INTO audit(id,school_id,actor,action,target,at) VALUES(?,?,?,?,?,?)',uuid(),u.school_id,u.id,action,target,now());
  async function allowedClass(id:string){const c=await first('SELECT * FROM classes WHERE id=? AND school_id=?',id,u.school_id);if(!c)fail(404,'Class not found.');if(u.role!=='admin'&&!await first('SELECT * FROM memberships WHERE user_id=? AND class_id=?',u.id,id))fail(403,'You are not assigned to this class.');return c;}
  if(path==='/api/me'&&request.method==='GET')return response({user:cleanUser(u),classes:await rows('SELECT c.*,y.year FROM classes c JOIN memberships m ON c.id=m.class_id JOIN years y ON y.id=c.year_id WHERE m.user_id=?',u.id)});
  if(path==='/api/logout'&&request.method==='POST'){await q('DELETE FROM sessions WHERE hash=?',await digest(bearer!)).run();return response({ok:true});}
  if(path==='/api/password'&&request.method==='POST'){
   const b=await body();await throttle('password:'+u.id);if(!await bcrypt.compare(String(b.current||''),u.password_hash))fail(400,'Current password is incorrect.');
   const hash=await bcrypt.hash(secret(b.password,u.role),12);
   await db.batch([q('UPDATE users SET password_hash=?,must_change=0 WHERE id=?',hash,u.id),q('DELETE FROM sessions WHERE user_id=? AND hash<>?',u.id,await digest(bearer!)),audit('password_changed',u.id)]);return response({ok:true});
  }
  if(u.must_change)fail(403,'Change your temporary password first.');
  if(path==='/api/progress'&&request.method==='GET'){
   const p=await first('SELECT * FROM progress WHERE user_id=?',u.id);return response(p?{version:p.version,progress:JSON.parse(p.data)}:{version:0,progress:initialProgress()});
  }
  if(path==='/api/progress'&&request.method==='POST'){
   if(u.role!=='student')fail(403,'Student account required to save learning.');
   const b=await body();integer(b.version,0,1e9);if(!Array.isArray(b.events)||!b.events.length||b.events.length>100)fail(400,'Send 1–100 learning events.');
   await q('INSERT INTO progress(user_id,version,data,updated_at) VALUES(?,0,?,?) ON CONFLICT(user_id) DO NOTHING',u.id,JSON.stringify(initialProgress()),now()).run();
   const p=await first('SELECT * FROM progress WHERE user_id=?',u.id);if(p.version!==b.version)return response({error:'Progress updated on another device.',version:p.version,progress:JSON.parse(p.data)},409);
   let state=JSON.parse(p.data);const inserts=[];const ids=new Set();
   for(const e of b.events){
    if(!/^[a-f0-9-]{36}$/.test(e.id)||ids.has(e.id))fail(400,'Invalid event ID.');ids.add(e.id);integer(e.at,0,now()+300000);
    if(e.kind==='attempt'){
     const o=e.outcome;if(!o||!Object.hasOwn(SKILLS,o.skill))fail(400,'Unknown skill.');integer(o.level,1,5);integer(o.tries,1,10000);integer(o.hints,0,1000);integer(o.at,0,now()+300000);
     for(const key of ['correct','firstTry','revealed'])if(typeof o[key]!=='boolean')fail(400,'Invalid attempt.');
     if(o.firstTry&&(!o.correct||o.revealed||o.tries!==1))fail(400,'Inconsistent attempt.');
     if(o.format!==undefined)str(o.format,50);if(o.misconception!==undefined)str(o.misconception,80);
    }else if(e.kind==='session'){integer(e.stars,0,3);if(e.lessonId!==undefined&&!/^[-a-z0-9.]{1,80}$/.test(e.lessonId))fail(400,'Invalid lesson.');}
    else if(e.kind==='settings'){if(!e.patch||Object.entries(e.patch).some(([k,v])=>!['sound','readAloud','unlockAll'].includes(k)||typeof v!=='boolean'))fail(400,'Invalid settings.');}
    else fail(400,'Unknown event.');
    if(!await first('SELECT id FROM events WHERE user_id=? AND id=?',u.id,e.id)){
     state=reduceEvent(state,e);inserts.push(q('INSERT INTO events(user_id,id,data,at) SELECT ?,?,?,? WHERE (SELECT version FROM progress WHERE user_id=?)=? ON CONFLICT(user_id,id) DO NOTHING',u.id,e.id,JSON.stringify(e),e.at,u.id,p.version));
    }
   }
   const results=await db.batch([...inserts,q('UPDATE progress SET data=?,version=version+1,updated_at=? WHERE user_id=? AND version=?',JSON.stringify(state),now(),u.id,p.version)]);
   if(!results.at(-1).meta.changes)fail(409,'Progress changed. Refresh and retry.');
   return response({version:p.version+1,progress:state});
  }
  if(path==='/api/school'&&request.method==='GET'){
   staff();const cs=u.role==='admin'?await rows('SELECT c.*,y.year FROM classes c JOIN years y ON c.year_id=y.id WHERE c.school_id=? ORDER BY y.year DESC,c.level,c.name',u.school_id):await rows('SELECT c.*,y.year FROM classes c JOIN years y ON c.year_id=y.id JOIN memberships m ON m.class_id=c.id WHERE m.user_id=? ORDER BY c.level,c.name',u.id);
   const us=u.role==='admin'?await rows('SELECT id,name,username,role,active,must_change FROM users WHERE school_id=? ORDER BY role,name',u.school_id):await rows("SELECT DISTINCT s.id,s.name,s.username,s.role,s.active,s.must_change FROM users s JOIN memberships sm ON sm.user_id=s.id JOIN memberships tm ON tm.class_id=sm.class_id WHERE tm.user_id=? AND s.role='student' ORDER BY s.name",u.id);
   const ms=await rows('SELECT m.* FROM memberships m JOIN classes c ON c.id=m.class_id WHERE c.school_id=?',u.school_id);
   return response({classes:cs,users:us,memberships:ms.filter((m:any)=>cs.some((c:any)=>c.id===m.class_id)),years:await rows('SELECT * FROM years WHERE school_id=? ORDER BY year DESC',u.school_id),curriculumVersion:'moe-2021-oct2025'});
  }
  if(path==='/api/years'&&request.method==='POST'){admin();const b=await body(),id=uuid();await db.batch([q('INSERT INTO years(id,school_id,year) VALUES(?,?,?)',id,u.school_id,integer(b.year,2020,2100)),audit('year_created',id)]);return response({id},201);}
  if(path==='/api/classes'&&request.method==='POST'){
   admin();const b=await body();if(!await first('SELECT id FROM years WHERE id=? AND school_id=?',b.yearId,u.school_id))fail(400,'Choose a school year.');const level=integer(b.level,1,6);if(!['standard','foundation'].includes(b.track)||(b.track==='foundation'&&level<5))fail(400,'Foundation is for P5 and P6.');const id=uuid();
   await db.batch([q('INSERT INTO classes(id,school_id,year_id,level,name,track) VALUES(?,?,?,?,?,?)',id,u.school_id,b.yearId,level,str(b.name,60),b.track),audit('class_created',id)]);return response({id},201);
  }
  if(path==='/api/users'&&request.method==='POST'){
   staff();const b=await body(),role=b.role||'student';if(!['student','teacher','admin'].includes(role))fail(400,'Invalid role.');if(role!=='student')admin();
   if(role==='student')await allowedClass(str(b.classId));else if(b.classId)await allowedClass(b.classId);
   const username=str(b.username,80).toLowerCase();if(!/^[a-z0-9@._-]+$/.test(username))fail(400,'Use letters, numbers, dots, hyphens or an email for username.');
   const id=uuid(),hash=await bcrypt.hash(secret(b.password,role),12);
   await db.batch([q('INSERT INTO users(id,school_id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?,?)',id,u.school_id,username,str(b.name),role,hash,now()),...(b.classId?[q('INSERT INTO memberships(user_id,class_id) VALUES(?,?)',id,b.classId)]:[]),audit('user_created',id)]);return response({id},201);
  }
  if(path==='/api/import'&&request.method==='POST'){
   staff();const b=await body();await allowedClass(str(b.classId));if(!Array.isArray(b.students)||b.students.length<1||b.students.length>50)fail(400,'Import 1–50 pupils at a time.');const inserts=[],credentials=[],seen=new Set();
   for(const s of b.students){const username=str(s.student_id,80).toLowerCase();if(!/^[a-z0-9._-]+$/.test(username)||seen.has(username))fail(400,'Use unique student IDs containing letters, numbers, dots or hyphens.');seen.add(username);const id=uuid(),password=token().slice(0,12),hash=await bcrypt.hash(password,12);credentials.push({username,name:str(s.name),password});inserts.push(q('INSERT INTO users(id,school_id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?,?)',id,u.school_id,username,str(s.name),'student',hash,now()),q('INSERT INTO memberships(user_id,class_id) VALUES(?,?)',id,b.classId));}
   await db.batch([...inserts,audit('roster_imported',b.classId)]);return response({credentials},201);
  }
  const userRoute=path.match(/^\/api\/users\/([^/]+)$/);
  if(userRoute&&request.method==='PATCH'){
   staff();const target=await first('SELECT * FROM users WHERE id=? AND school_id=?',userRoute[1],u.school_id);if(!target)fail(404,'User not found.');
   if(u.role==='teacher'){if(target.role!=='student')fail(403,'Teachers can manage assigned pupils only.');if(!await first('SELECT a.user_id FROM memberships a JOIN memberships b ON a.class_id=b.class_id WHERE a.user_id=? AND b.user_id=?',u.id,target.id))fail(403,'Pupil is outside your classes.');}
   const b=await body(),stmts=[];
   if(b.password!==undefined){stmts.push(q('UPDATE users SET password_hash=?,must_change=1 WHERE id=?',await bcrypt.hash(secret(b.password,target.role),12),target.id),q('DELETE FROM sessions WHERE user_id=?',target.id));}
   if(b.active!==undefined){admin();if(target.id===u.id)fail(400,'You cannot deactivate your own account.');if(typeof b.active!=='boolean')fail(400,'Invalid active status.');stmts.push(q('UPDATE users SET active=? WHERE id=?',+b.active,target.id),q('DELETE FROM sessions WHERE user_id=?',target.id));}
   if(b.classId!==undefined){admin();await allowedClass(str(b.classId));if(target.role==='student')stmts.push(q('DELETE FROM memberships WHERE user_id=?',target.id));stmts.push(q('INSERT INTO memberships(user_id,class_id) VALUES(?,?) ON CONFLICT DO NOTHING',target.id,b.classId));}
   if(!stmts.length)fail(400,'No changes supplied.');await db.batch([...stmts,audit('user_updated',target.id)]);return response({ok:true});
  }
  const report=path.match(/^\/api\/classes\/([^/]+)\/report$/);
  if(report&&request.method==='GET'){
   staff();await allowedClass(report[1]);const pupils=await rows("SELECT u.id,u.name,u.username,u.active,p.data,p.updated_at FROM users u JOIN memberships m ON m.user_id=u.id LEFT JOIN progress p ON p.user_id=u.id WHERE m.class_id=? AND u.role='student' ORDER BY u.name",report[1]);
   return response({students:pupils.map((p:any)=>({id:p.id,name:p.name,username:p.username,active:!!p.active,updatedAt:p.updated_at,progress:p.data?JSON.parse(p.data):initialProgress()})),demo:!!u.demo});
  }
  fail(404,'Endpoint not found.');
 }catch(e:any){if(e instanceof ApiError)return response({error:e.message},e.status);if(/UNIQUE constraint/i.test(String(e)))return response({error:'That school code, class, year or username already exists. Nothing was imported.'},409);console.error('API failure',e?.name);return response({error:'The service could not complete this request. Please try again.'},500);}
}};
