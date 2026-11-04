import { describe,it,expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MISSIONS,missionsFor } from './catalog';
import { makeMission } from './generate';
import { restoreTool,freshRun,readRun,writeRun,missionKey } from './session';
import { ToolView } from '../teach/tools/Tools';
import type { Tool } from '../teach/model';
import { geometryMoves } from '../teach/tools/GeometryWorkbench';
const memory=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}};};
describe('hands-on curriculum expansion',()=>{
 it('provides six distinct missions for all eight level and track paths',()=>{expect(new Set(MISSIONS.map(m=>m.id)).size).toBe(48);for(let g=1;g<=6;g++)expect(missionsFor(g,'standard')).toHaveLength(6);for(const g of [5,6]){const f=missionsFor(g,'foundation');expect(f).toHaveLength(6);expect(f.some(m=>['ratio','ratio-share','balance'].includes(m.kind))).toBe(false);}expect(missionsFor(5,'foundation').some(m=>['percent','discount','percent-change'].includes(m.kind))).toBe(false);});
 for(const m of MISSIONS)it(`${m.id}: deterministic, nontrivial, valid targets across 80 variations`,()=>{for(let seed=0;seed<20;seed++)for(let round=0;round<4;round++){
   const p=makeMission(m,seed,round);expect(p.initial).toEqual(makeMission(m,seed,round).initial);expect(p.accepts(p.initial),p.prompt).toBe(false);expect(p.accepts(p.solution),p.prompt).toBe(true);expect(restoreTool(p.initial,p.solution),p.prompt).toEqual(p.solution);expect(p.prompt).not.toMatch(/NaN|undefined|Infinity/);expect(p.hint.length).toBeGreaterThan(20);
   if(p.initial.kind==='geometry'&&p.solution.kind==='geometry'){const initial=p.initial,target=p.solution;let model=initial;if(initial.mode==='clock'){const hour=Math.floor(target.a/60)%12;model=geometryMoves(model).find(t=>Math.floor(t.a/60)%12===hour)??model;if(model.a%60!==target.a%60)model=geometryMoves(model).find(t=>Math.floor(t.a/60)===Math.floor(model.a/60)&&t.a%60===target.a%60)??model;if((model.a>=720)!==(target.a>=720))model=geometryMoves(model).find(t=>t.a===target.a)!;expect(model.a).toBe(target.a);}else expect(geometryMoves(initial).some(t=>t.a===target.a)||initial.a===target.a).toBe(true);}
 }});
 it('accepts alternative mathematical models, not just one layout',()=>{
  for(const kind of ['area','perimeter','factor','volume'] as const){const m=MISSIONS.find(m=>m.kind===kind)!,p=makeMission(m,71,0),t=p.solution;const swapped:Tool=t.kind==='array'?{...t,rows:t.cols,cols:t.rows}:t.kind==='geometry'?{...t,a:t.b,b:t.a}:t;expect(p.accepts(swapped)).toBe(true);}
  const p=makeMission(MISSIONS.find(m=>m.kind==='jump')!,1,0),t=p.solution;if(t.kind!=='line')throw Error('line');const distance=t.jumps.reduce((a,b)=>a+b,0);expect(p.accepts({...t,jumps:Array(distance).fill(1)})).toBe(true);
 });
 it('renders the starting and solved interactive tools for every mission',()=>{for(const m of MISSIONS){const p=makeMission(m,124,0);for(const tool of [p.initial,p.solution]){const html=renderToStaticMarkup(createElement(ToolView,{tool,onChange:()=>{}}));expect(html,m.id).not.toMatch(/NaN|Infinity|undefined/);expect(html,m.id).toMatch(/button|type="range"/);}}});
 it('restores partial models with their checks and hints, scoped to each learner',()=>{const m=MISSIONS[0],kv=memory(),r=freshRun(m),p=makeMission(m,r.seed,0);r.tool=p.solution;r.tries=2;r.hint=true;r.hints=1;writeRun(kv,'guest',m,r);expect(readRun(kv,'guest',m)).toEqual(r);expect(readRun(kv,'student:other',m)).toBeNull();});
 it('ignores corrupt, oversized or impossible saved states',()=>{const m=MISSIONS[0],kv=memory(),r=freshRun(m);for(const bad of [null,{}, {...r,seed:-1},{...r,tool:{kind:'counters',count:1e8}},{...r,checked:true},{...r,finishedAt:Date.now()},{...r,round:100},{...r,clean:99}]){kv.setItem(missionKey('guest',m.id),JSON.stringify(bad));expect(readRun(kv,'guest',m)).toBeNull();}kv.setItem(missionKey('guest',m.id),'x'.repeat(25000));expect(readRun(kv,'guest',m)).toBeNull();});
 it('restores givens from trusted content instead of accepting saved mutations',()=>{const p=makeMission(MISSIONS.find(m=>m.kind==='ratio-share')!,3,0);expect(restoreTool(p.initial,{...p.solution,unitValue:999,names:['bad','data']})).toEqual(p.solution);});
});
