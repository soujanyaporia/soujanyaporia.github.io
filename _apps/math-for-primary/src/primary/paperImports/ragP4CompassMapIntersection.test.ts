import {describe,it,expect} from 'vitest';
import {makeRagQuestion} from './ragP4CompassMapIntersection';

function solveFromVisibleQuestion(q:ReturnType<typeof makeRagQuestion>):string{
  const lines=q.context??[];
  const nwLine=lines.find(line=>/^The .+ is north-west of John\.$/.test(line));
  const eastLine=lines.find(line=>/^The .+ is east of John\.$/.test(line));
  if(!nwLine||!eastLine) throw new Error('Visible compass clues are missing.');
  const nwName=nwLine.match(/^The (.+) is north-west of John\.$/)![1];
  const eastName=eastLine.match(/^The (.+) is east of John\.$/)![1];
  const mapLines=lines.filter(line=>/^Row \d+:/.test(line));
  const places=new Map<string,{x:number;y:number}>();
  mapLines.forEach((line,y)=>line.replace(/^Row \d+:\s*/, '').split('|').forEach((cell,x)=>{
    const name=cell.trim();
    if(name!=='·') places.set(name,{x,y});
  }));
  const nw=places.get(nwName),east=places.get(eastName);
  if(!nw||!east) throw new Error('A clue reference is absent from the visible map.');
  const matches=[...places.entries()].filter(([,p])=>p.x>nw.x&&p.y>nw.y&&p.y===east.y&&p.x<east.x);
  if(matches.length!==1) throw new Error(`Visible clue paths have ${matches.length} matching places.`);
  return matches[0][0];
}

describe('P4 compass-map clue intersection',()=>{
  it('independently locates the place from the visible map and clues over varied seeds',()=>{
    for(let seed=0;seed<40;seed++){
      const q=makeRagQuestion(seed,seed%5);
      expect(solveFromVisibleQuestion(q)).toBe(q.answer);
    }
  });
});
