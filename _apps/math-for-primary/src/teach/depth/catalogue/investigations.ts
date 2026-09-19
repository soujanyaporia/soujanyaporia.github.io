import type {Stage,Tool} from '../../model';
import type {VisualGuide} from '../../build/guides';
import type {PlanEntry} from '../../build/plan';

/** Replay a change from this exact picture sequence, only when its model offers the relevant action. */
export function investigation(p:PlanEntry,guide:VisualGuide):Stage|undefined{
 const tools=guide.frames.flatMap(f=>f.tool?[f.tool]:[]),last=<K extends Tool['kind']>(kind:K)=>tools.slice().reverse().find((t):t is Extract<Tool,{kind:K}>=>t.kind===kind);
 const make=(title:string,text:string,tool:Tool,goal:(t:Tool)=>boolean,goalHint:string,success:string):Stage=>({kind:'explore',title,text,tool,goal,goalHint,success,flow:{phase:'together',label:'Try the change you just saw',transition:'The picture explanation is complete. Now use the same quantities to try its key change yourself before moving to a new example.'}});
 if(p.code==='FRAC'){
  const target=last('fractions');
  if(target&&target.denominators.length<=2&&target.denominators.every(d=>d<=24)&&target.shaded.some(n=>n>0)){
   if(target.denominators.length===1&&target.denominators[0]<=12){
    const d=target.denominators[0],n=target.shaded[0];
    return make('Choose the pieces yourself',`The same whole has ${d} equal parts. Choose any ${n} parts. They do not have to be next to each other.`,{kind:'fraction-pieces',widths:Array(d).fill(1),selected:[]},t=>t.kind==='fraction-pieces'&&t.selected.length===n,`Tap ${n} separate pieces. Tap a blue piece again to put it back.`,`${n} chosen out of ${d} equal parts is ${n}/${d}. Moving the colour to different pieces does not change the fraction: the whole and the amount chosen stay the same.`);
   }
   const start={...target,hideValue:true,shaded:target.shaded.map((n,i)=>i===target.shaded.length-1?0:n)},row=target.shaded.length-1;
   const words=`Shade ${target.shaded[row]} of the ${target.denominators[row]} equal parts in the ${row?'bottom':'only'} strip.`;
   return make('Rebuild the chosen share',words+(row?' Keep the top strip unchanged and compare the two chosen lengths.':' The unchosen parts still belong to the whole.'),start,t=>t.kind==='fractions'&&t.shaded.every((n,i)=>n===target.shaded[i]),words,row?'The two whole strips have equal size. Compare the chosen lengths as well as the numbers of pieces.':'You chose parts without changing the whole. The denominator includes every equal part.');
  }
 }
 if(p.code==='MD'){
  const share=last('share');
  if(share&&share.total<=40){
   if(share.mode==='share'&&share.people>0&&share.total%share.people===0){const each=share.total/share.people,start={...share,given:Array(share.people).fill(0)};return make('Share the same counters yourself',`Give all ${share.total} counters to ${share.people} children so that each child receives the same amount. You can give one to everybody at a time.`,start,t=>t.kind==='share'&&t.given.length===share.people&&t.given.every(n=>n===each),'Keep giving equal rounds until no counters remain.',`Each child has ${each}. Equal shares use the full starting total: ${share.people} × ${each} = ${share.total}.`);}
   if(share.mode==='group'&&share.size&&share.size>0){const size=share.size,count=Math.floor(share.total/size),remainder=share.total%size;return make('Pack the full groups',`Pack the same ${share.total} counters into groups of ${size}. Stop when another full group cannot be made.`,{...share,given:[]},t=>t.kind==='share'&&t.given.length===count&&t.given.every(n=>n===size),`Make full groups of ${size} until fewer than ${size} remain.`,`${count} full groups use ${count*size} counters. ${remainder} remain; that is not enough for another group.`);}
  }
  const group=last('groups');if(group&&group.groups>0&&group.groups<=10&&group.size<=10)return make('Build the equal groups',`Rebuild ${group.groups} groups with ${group.size} objects in each. Compare one group with the complete collection.`,{...group,groups:Math.max(0,group.groups-1)},t=>t.kind==='groups'&&t.groups===group.groups&&t.size===group.size,`Set the group count to ${group.groups}; keep ${group.size} in each group.`,`Every new group contributes another ${group.size}. The total is ${group.groups} × ${group.size}, not ${group.groups} + ${group.size}.`);
 }
 if(p.code==='DEC'){
  const target=last('place');if(target){const i=target.digits.findIndex(n=>n>0);if(i>=0){const names=['tenths','hundredths','thousandths'];return make('Rebuild the decimal places',`Restore the ${names[i]} digit to ${target.digits[i]}. Keep the other places unchanged and watch the amount represented by that column.`,{...target,digits:target.digits.map((d,j)=>j===i?d-1:d)},t=>t.kind==='place'&&t.digits.every((d,j)=>d===target.digits[j]),`Add one ${names[i].replace(/s$/,'')} using its column control.`,`The ${names[i]} column now counts ${target.digits[i]} units of that size. Other columns retain their values.`);}}
 }
 if(p.code==='PCT'){
  const target=last('hundred');if(target&&target.shaded>0&&target.shaded<=100)return make('Build the percentage share',`The whole contains 100 equal squares. Rebuild the example’s ${target.shaded} chosen squares. Compare the chosen part with the whole.`,{...target,shaded:0},t=>t.kind==='hundred'&&t.shaded===target.shaded,`Choose square ${target.shaded} to shade that many.`,`${target.shaded} of 100 is ${target.shaded}%. This describes a share; its amount depends on the whole.`);
 }
 if(p.code==='ALG'&&/solve|equation/.test(p.objective.toLowerCase())){
  const initial=tools.find((t):t is Extract<Tool,{kind:'balance'}>=>t.kind==='balance'&&t.left.x===1&&t.right.x===0&&t.left.n>0&&t.left.n<=6&&t.right.n>=t.left.n);
  if(initial)return make('Preserve the equality',`Use the balance from the example. Remove equal loose amounts from both sides until only the unknown remains on the left.`,initial,t=>t.kind==='balance'&&t.left.x===1&&t.left.n===0&&t.right.x===0&&t.right.n===initial.right.n-initial.left.n,'Use “Take 1 off both sides”. Keep the two sides equal.',`The unknown equals ${initial.right.n-initial.left.n}. Removing the same amount from both sides preserved the equation.`);
 }
 if(p.code==='SYM'){
  const target=last('geometry');if(target?.mode==='mirror'&&target.a>0&&target.a<=6)return make('Place the matching point',`The blue point is ${target.a} squares from the mirror. Move the orange point until the two points would meet when folded.`,{...target,b:Math.max(0,target.a-1)},t=>t.kind==='geometry'&&t.a===target.a&&t.b===target.a,'Keep the blue point fixed and match its distance on the opposite side.','Corresponding points are equally far from the mirror on opposite sides.');
 }
 // A line’s jump controls can reproduce only the same landing point, not every visual tick scale.
 const line=last('line');if(line&&['AS','WN'].includes(p.code)&&line.jumps.length&&line.max-line.min<=100){const end=line.start+line.jumps.reduce((a,b)=>a+b,0);if(end!==line.start&&Math.abs(end-line.start)<=20)return make('Make the journey on the line',`Start at ${line.start}, as in the example. Use jumps to reach ${end}. You can undo a jump and try a different route.`,{...line,jumps:[]},t=>t.kind==='line'&&t.start+t.jumps.reduce((a,b)=>a+b,0)===end,`Move ${Math.abs(end-line.start)} units ${end>line.start?'forward':'backward'}.`,`The net change is ${end-line.start}. Different jump sizes can connect the same start and finish.`);}
 return undefined;
}

/**
 * A family's hands-on task, used only where it practises this objective's own relationship: reading a
 * clock for clock objectives, building a rectangle for area and perimeter, an array for tables and
 * factors. Tasks that merely share a topic are not added; the picture sequence stands alone there.
 */
export function topicExplore(p:PlanEntry,explore:Extract<Stage,{kind:'explore'}>):Stage|undefined{
 const o=p.objective.toLowerCase(),c=p.code,kind=explore.tool.kind,geometry=kind==='geometry';
 if(c==='RATIO')return {kind:'explore',title:'Build the ratio with equal units',text:'Every box is one equal unit. Set red to 2 units and blue to 3 units, then read the ratio under the bars.',tool:{kind:'ratio',names:['Red','Blue'],units:[1,1],unitValue:null},goal:t=>t.kind==='ratio'&&t.units[0]===2&&t.units[1]===3,goalHint:'Use the steppers: red needs 2 units and blue needs 3.',success:'Red : blue = 2 : 3. The ratio counts equal units, whatever each unit is worth.'};
 const fits=
  c==='TIME'&&geometry&&/read clocks/.test(o)||
  c==='LENGTH'&&geometry||
  c==='AREA'&&geometry&&/area|perimeter/.test(o)&&!/triangle|composite|missing/.test(o)||
  c==='VOL'&&geometry&&/unit cubes|volumes of cubes and cuboids/.test(o)&&!/isometric|liquid|convert|unknown|base area|root/.test(o)||
  c==='ANGLE'&&geometry&&/protractor|draw angles|measure angles|right angle/.test(o)||
  c==='LINES'&&geometry||
  c==='SOLID'&&geometry&&/represent|draw/.test(o)||
  c==='SHAPE'&&geometry&&/rectangle|square/.test(o)&&!/triangle|composite|\bangles?\b/.test(o)||
  c==='FACT'&&kind==='array'&&/factor/.test(o)||
  c==='MD'&&kind==='array'&&/tables|facts|equal groups/.test(o)||
  c==='AS'&&kind==='counters'&&p.level===1&&/combining/.test(o)||
  c==='WN'&&kind==='hundred'&&p.level===1&&/count and represent|tens and ones|number names/.test(o)||
  c==='MONEY'&&kind==='counters'&&p.level===1||
  c==='GRAPH'&&kind==='counters'&&/one object per symbol/.test(o)||
  c==='DEC'&&kind==='place'&&/place value/.test(o)||
  c==='ALG'&&kind==='balance'&&/solve|equation/.test(o);
 return fits?explore:undefined;
}
