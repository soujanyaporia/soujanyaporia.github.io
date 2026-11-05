import type {Activity} from './catalog';
import type {Question} from './generate';

/** Broad presentation forms are scheduling hints, not counts of unique skills. */
export type PaperCompositionGroup='recognition'|'computation'|'visual-data'|'story';
export interface PaperBlueprint {level:number;sourcePaperIds:readonly string[];preferredForms:readonly PaperCompositionGroup[]}
/**
 * Soft preferences informed by two visually inventoried local paper sets per
 * grade. The papers have different emphases; these are not fixed quotas or a
 * claim that all source questions were equally common. Source references are
 * identifiers only: no source content is included in a generated question.
 */
export const PAPER_BLUEPRINTS:readonly PaperBlueprint[]=[
 {level:1,sourcePaperIds:['83f52da6fb608310','0fa004d1786d5dd9'],preferredForms:['visual-data','recognition','computation','story']},
 {level:2,sourcePaperIds:['1a14bf2e2a4e6460','1ecd894b28a9aa05'],preferredForms:['visual-data','computation','recognition','story']},
 {level:3,sourcePaperIds:['79c1903cf02bf7a9','242042bf41a05791'],preferredForms:['recognition','computation','visual-data','story']},
 {level:4,sourcePaperIds:['09144ff47dbdd61e','95d75c946fbfbc5a'],preferredForms:['computation','recognition','visual-data','story']},
 {level:5,sourcePaperIds:['fc86e57a9a66d7fd','f2a812a6326c3e75'],preferredForms:['computation','story','visual-data','recognition']},
 {level:6,sourcePaperIds:['d07175bcd190d819','0b3ae31bd258e3b8'],preferredForms:['computation','visual-data','story','recognition']},
];
export const paperBlueprint=(level:number)=>PAPER_BLUEPRINTS.find(b=>b.level===level);

const wordProblem=/\b(?:has|have|had|bought|buys|sold|sells|spent|spends|shares|shared|gave|gives|receives|pays|paid|travels|travelled|walked|arrives|poured|pours|contains|collected|packs|packed|bakes|baked|earns|saves|saved|makes|made)\b/i;
const textOf=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const operation=(s:string)=>s==='+'?'add':s==='-'||s==='−'?'subtract':s==='×'||s==='*'||s==='x'?'multiply':'divide';
/** A literal two-operand calculation is one concept even when its numbers or answer control change. */
function literalCalculation(a:Activity,q:Question):string|undefined{
 const text=textOf(q);
 if(wordProblem.test(text))return;
 const candidate=q.display??q.prompt.replace(/^\s*(?:calculate|find(?: the value of)?|what is)\s*/i,'');
 const fractions=/^\s*(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*([+\-−×*x÷])\s*(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*(?:=\s*\?)?\s*[.?]?\s*$/i.exec(candidate);
 if(fractions&&(fractions[1].includes('/')||fractions[3].includes('/')))return `calculation:fraction:${operation(fractions[2].toLowerCase())}`;
 const m=/^\s*(\d+(?:\.\d+)?)\s*([+\-−×*x÷])\s*(\d+(?:\.\d+)?)\s*(?:=\s*\?)?\s*[.?]?\s*$/i.exec(candidate);
 if(!m)return;
 const decimal=m[1].includes('.')||m[3].includes('.')||a.kind.startsWith('decimal');
 return `calculation:${decimal?'decimal:':'whole:'}${operation(m[2].toLowerCase())}`;
}
/**
 * A family is a conservative scheduling key for the generated question. It is
 * not a reviewed count of all mathematical patterns. Keep response format out
 * of this key, and inspect generated layouts when one activity has several.
 */
export function paperReasoningFamily(a:Activity,q:Question):string{
 const pic=q.picture as {type:string;layout?:string;target?:string}|undefined;
 if(pic?.type==='angleProblem')return `angle:${pic.layout}${pic.layout==='parallelogram'?':'+(pic.target??'adjacent'):''}`;
 const canonical=a.canonicalPatternId??'';
 // These are the same pupil task across baseline and paper-labelled sources.
 if(a.kind==='order'||canonical==='number-order')return 'number:order';
 if(a.kind==='groups'||a.parameter==='p1-groups'||canonical==='equal-groups-total')return 'equal-groups:find-total';
 if((a.kind==='average'&&a.parameter==='missing')||a.parameter==='p6-average'||canonical==='missing-score-from-average')return 'average:find-missing';
 if(canonical==='dual-scale-protractor-measurement'||canonical==='measure-drawn-angle-rotated-baseline')return 'angle:protractor-reading';
 if(canonical==='construct-angle-from-labelled-baseline')return 'angle:construction';
 if(canonical.startsWith('arithmetic-order-'))return 'calculation:order-of-operations';
 const arithmetic=/^arithmetic-([+\-−×÷])-(decimal|whole)/.exec(canonical);
 if(arithmetic)return `calculation:${arithmetic[2]}:${operation(arithmetic[1])}`;
 const literal=literalCalculation(a,q);if(literal)return literal;
 if(a.kind==='operations')return 'calculation:order-of-operations';
 if(a.kind==='angleType')return a.parameter==='measure'?'angle:protractor-reading':'angle:compare-to-right';
 if(canonical)return `pattern:${canonical}`;
 return `activity:${a.kind}${a.parameter?':'+a.parameter:''}`;
}
/** Response controls can be balanced separately from mathematical reasoning. */
export function paperResponseForm(q:Question):string{
 const withConstruction=q as Question&{angleConstruction?:unknown};
 if(q.gridDrawing)return `construction:${q.gridDrawing.kind}`;
 if(withConstruction.angleConstruction)return 'construction';
 if(q.structuredResponse)return `constructed:${q.structuredResponse.kind}`;
 if(q.numberSentence)return 'constructed:equation';
 if(q.grouping)return 'constructed:grouping';
 if(q.order)return 'ordered';
 if(q.fractionBuilder)return 'constructed:shading';
 if(q.choices)return 'choice';
 if(q.answerFormat==='number-words')return 'written-number';
 if(q.answerFormat==='pi')return 'symbolic';
 return 'entry';
}
function mathematicalFigure(q:Question):boolean{
 if(q.gridDrawing||q.angleConstruction)return true;
 const pic=q.picture as {type:string;layout?:string;cards?:{count?:number}[]}|undefined;
 if(!pic)return false;
 if(pic.type==='paper')return pic.layout==='bars'||pic.layout==='timeline'||!!pic.cards?.some(c=>c.count!==undefined);
 return ['batch10-early','batch11-upper','batch10-middle','batch9-middle','batch9-early','grid-drawing','parts','counters','fraction','clock','shape','bars','pie','angle','ruler','net','solid','area','angleProblem','batch8-angles','nanyang-p4','raffles-p3','catholic-p6','maha-bodhi-p5','batch2-early','batch2-upper','batch4-early','missing-column','corpus'].includes(pic.type);
}
/** Broad source-style form; actual reasoning-family diversity remains primary. */
export function paperCompositionGroup(a:Activity,q:Question):PaperCompositionGroup{
 const text=textOf(q),family=paperReasoningFamily(a,q);
 if(family.startsWith('calculation:'))return 'computation';
 if(mathematicalFigure(q))return 'visual-data';
 if(wordProblem.test(text))return 'story';
 if(/\b(?:which|identify|name|match|compare|arrange|order|show|choose|select|write in words|digit)\b/i.test(q.prompt)||['place','compare','order','shape','solid','angleType','parallel'].includes(a.kind))return 'recognition';
 return 'computation';
}
