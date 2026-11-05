import {describe,it,expect} from 'vitest';
import type {Activity} from './catalog';
import type {Question} from './generate';
import {PAPER_BLUEPRINTS,paperBlueprint,paperReasoningFamily,paperResponseForm,paperCompositionGroup} from './paperBlueprints';
const activity=(partial:Partial<Activity>={}):Activity=>({id:'test',level:4,track:'standard',strand:'Number & Algebra',kind:'paper',icon:'✦',title:'Example',objective:'Example',skillIds:['P4.S.MD.02'],...partial});
const question=(partial:Partial<Question>={}):Question=>({key:'x',prompt:'Calculate.',answer:'15',hint:'Add.',explanation:'Add.',...partial});
describe('source-informed paper composition helpers',()=>{
 it('contains two locally inventoried paper references for each grade, without fixed quotas',()=>{
  expect(PAPER_BLUEPRINTS).toHaveLength(6);for(let level=1;level<=6;level++){const b=paperBlueprint(level)!;expect(b.sourcePaperIds).toHaveLength(2);expect(new Set(b.preferredForms).size).toBe(4);}expect(paperBlueprint(7)).toBeUndefined();
 });
 it('does not count number width, regrouping or answer control as new arithmetic reasoning',()=>{
  const a=activity({canonicalPatternId:'arithmetic-+-whole-digits2'}),b=activity({canonicalPatternId:'arithmetic-+-whole-digits4'});
  const q=question({display:'23 + 18 = ?',choices:['41','31','42','51']}),r=question({display:'1104 + 25 = ?'});
  expect(paperReasoningFamily(a,q)).toBe(paperReasoningFamily(b,r));expect(paperResponseForm(q)).toBe('choice');expect(paperResponseForm(r)).toBe('entry');
  expect(paperReasoningFamily(activity({canonicalPatternId:'arithmetic-order-abc'}),q)).toBe(paperReasoningFamily(activity({canonicalPatternId:'arithmetic-order-xyz'}),q));
  expect(paperReasoningFamily(activity({kind:'add'}),q)).toBe(paperReasoningFamily(a,q));
  const fraction=question({display:'1/4 + 1/2'});expect(paperReasoningFamily(activity({kind:'fractionAdd'}),fraction)).toBe(paperReasoningFamily(activity({canonicalPatternId:'related-fraction-addition'}),fraction));
  expect(paperReasoningFamily(activity({kind:'fractionSubtract'}),{...fraction,display:'3/4 − 1/2'})).not.toBe(paperReasoningFamily(activity({kind:'fractionAdd'}),fraction));
 });
 it('merges equivalent baseline and paper questions but keeps different unknowns distinct',()=>{
  const q=question();
  expect(paperReasoningFamily(activity({kind:'order'}),q)).toBe(paperReasoningFamily(activity({canonicalPatternId:'number-order'}),q));
  expect(paperReasoningFamily(activity({kind:'groups'}),q)).toBe(paperReasoningFamily(activity({parameter:'p1-groups'}),q));
  expect(paperReasoningFamily(activity({kind:'average',parameter:'missing'}),q)).toBe(paperReasoningFamily(activity({parameter:'p6-average'}),q));
  expect(paperReasoningFamily(activity({kind:'average',parameter:'missing'}),q)).toBe(paperReasoningFamily(activity({canonicalPatternId:'missing-score-from-average'}),q));
  expect(paperReasoningFamily(activity({kind:'average',parameter:'missing'}),q)).not.toBe(paperReasoningFamily(activity({kind:'average',parameter:'total'}),q));
 });
 it('uses the generated angle relationship rather than an activity label',()=>{
  const a=activity({kind:'angleFacts'}),q=question({picture:{type:'angleProblem',layout:'line',a:40}});
  expect(paperReasoningFamily(a,q)).toBe(paperReasoningFamily(a,{...q,picture:{type:'angleProblem',layout:'line',a:90}}));
  expect(paperReasoningFamily(a,q)).not.toBe(paperReasoningFamily(a,{...q,picture:{type:'angleProblem',layout:'point',a:90}}));
  expect(paperReasoningFamily(activity({kind:'angleType',parameter:'measure'}),question())).toBe(paperReasoningFamily(activity({canonicalPatternId:'dual-scale-protractor-measurement'}),question()));
  expect(paperReasoningFamily(activity({canonicalPatternId:'construct-angle-from-labelled-baseline'}),question())).not.toBe(paperReasoningFamily(activity({kind:'angleType',parameter:'measure'}),question()));
  expect(paperResponseForm(question({angleConstruction:{baseline:0,direction:1,vertexLabel:'A',baseLabel:'B',endLabel:'C'}}))).toBe('construction');
  expect(paperReasoningFamily(activity({kind:'quadrilateral'}),{...q,picture:{type:'angleProblem',layout:'parallelogram',a:60,target:'opposite'}})).not.toBe(paperReasoningFamily(activity({kind:'quadrilateral'}),{...q,picture:{type:'angleProblem',layout:'parallelogram',a:60,target:'adjacent'}}));
 });
 it('recognises contextual, visual, and representation tasks without creating figures',()=>{
  expect(paperCompositionGroup(activity(),question({prompt:'How many are left?',context:['Nia had 12 beads and gave 3 away.']}))).toBe('story');
  expect(paperCompositionGroup(activity(),question({prompt:'Which month had the most rain?',picture:{type:'bars',labels:['Jan','Feb'],values:[4,7],scale:1}}))).toBe('visual-data');
  expect(paperCompositionGroup(activity(),question({prompt:'Read the diagram.',picture:{type:'raffles-p3',layout:'fraction-line',parts:4,position:2,marker:'A'}}))).toBe('visual-data');
  expect(paperCompositionGroup(activity({kind:'place'}),question({prompt:'Which digit is in the tens place?'}))).toBe('recognition');
  expect(paperCompositionGroup(activity({kind:'add'}),question({display:'3 + 4',prompt:'How many altogether?',picture:{type:'counters',count:7}}))).toBe('computation');
 });
});
