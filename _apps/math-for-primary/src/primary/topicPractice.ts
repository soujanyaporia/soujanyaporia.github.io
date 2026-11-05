import type {Activity} from './catalog';
import type {Track} from '../school/curriculum';

export const PRACTICE_TOPIC_NAMES:Record<string,string>={WN:'Whole numbers',AS:'Adding and subtracting',MD:'Multiplying and dividing',FACT:'Factors and multiples',FRAC:'Fractions',MONEY:'Money',DEC:'Decimals',PCT:'Percentages',RATE:'Rate',RATIO:'Ratio',ALG:'Algebra',LENGTH:'Length',MEASURE:'Measurement',TIME:'Time',AREA:'Area and perimeter',VOL:'Volume',ANGLE:'Angles',LINES:'Lines',SYM:'Symmetry',SHAPE:'Shapes',SOLID:'Solid shapes',CIRCLE:'Circles',GRAPH:'Graphs',AVG:'Averages'};
export const practiceTopicHref=(level:number,track:Track,topic:string)=>`#/papers/p${level}${level>=5&&track==='foundation'?'f':'s'}/${encodeURIComponent(topic)}`;
/** Lightweight catalogue browsing: no question generation on the home screen. */
export function topicPracticeChoices(activities:Activity[]){
 const groups=new Map<string,Activity[]>();
 for(const a of activities){if(a.kind==='daily'||a.parameter==='mixed')continue;const code=a.skillIds[0]?.split('.')[2];if(code)groups.set(code,[...(groups.get(code)??[]),a]);}
 return [...groups].map(([code,pool])=>{
  const contextual=pool.filter(a=>a.kind==='paper'&&!a.canonicalPatternId?.startsWith('arithmetic-'));
  const ranked=contextual.sort((a,b)=>Number(/^b12/.test(b.parameter??''))-Number(/^b12/.test(a.parameter??'')));
  return {code,title:PRACTICE_TOPIC_NAMES[code]??code,strand:pool[0].strand,examples:[...new Set((ranked.length?ranked:pool).map(a=>a.title))].slice(0,2)};
 });
}
