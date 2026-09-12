import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LESSONS} from '../../catalog';
import {ToolView} from '../../tools/Tools';
import {questionModel} from '../../tools/questionModel';
import type {Tool,Item} from '../../model';

it('renders every lesson demonstration and sampled question model with finite geometry',()=>{
 let rendered=0;
 const inspect=(tool:Tool|undefined,where:string)=>{if(!tool)return;const html=renderToStaticMarkup(createElement(ToolView,{tool}));expect(html,where).not.toMatch(/(?:NaN|Infinity|undefined)/);expect(html.length,where).toBeGreaterThan(30);rendered++;};
 const item=(q:Item,where:string)=>{inspect(q.tool&&questionModel(q.tool),where);inspect(q.simpler?.tool&&questionModel(q.simpler.tool),where+' support');};
 for(const lesson of LESSONS)for(const stage of lesson.stages){
  const where=lesson.id+' '+stage.kind;
  if('tool' in stage)inspect(stage.tool,where);
  if(stage.kind==='explain'){for(const frame of [...(stage.frames??[]),...(stage.alternatives??[]).flatMap(a=>a.frames)])inspect(frame.tool,where);inspect(stage.why?.tool,where);}
  if(stage.kind==='worked')for(const step of stage.steps)inspect(step.tool,where);
  if(stage.kind==='connect')for(const row of stage.rows)inspect(row.tool,where);
  if(stage.kind==='readiness'||stage.kind==='reason')for(const q of stage.items)item(q,where);
  if(stage.kind==='practice'||stage.kind==='apply')for(let seed=0;seed<3;seed++)item(stage.gen(seed,seed),where);
  if(stage.kind==='mastery')for(const g of stage.gens)for(let seed=0;seed<3;seed++)item(g.gen(seed,seed),where+' '+g.facet);
 }
 expect(rendered).toBeGreaterThan(10000);
},30000);
