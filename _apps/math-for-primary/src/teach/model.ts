import type {SceneTool,FoundationTool} from './tools/LessonScene';
import type {GeometryTool} from './tools/GeometryWorkbench';
import type {Picture} from '../primary/generate';
import type { Track } from '../school/curriculum';
/**
 * Teaching content model. Lessons are data: stages, items and manipulative states. The lesson player,
 * tools and validation are generic, so a new lesson is a new content module rather than a new screen.
 * Generators must be deterministic for a (seed, index) pair; answers are verified by the lesson tests.
 */
export type Rep='diagram'|'table'|'objects'|'counters'|'ten-frame'|'number-bond'|'bar-model'|'number-line'|'equal-groups'|'array'|'sharing'|'fraction-wall'|'place-value'|'hundred-grid'|'percent-bar'|'ratio-bars'|'balance'|'symbols'|'story';
export const REP_LABEL:Record<Rep,string>={diagram:'diagrams',table:'tables',objects:'real objects',counters:'counters','ten-frame':'ten frames','number-bond':'number bonds','bar-model':'bar models','number-line':'number lines','equal-groups':'equal groups',array:'arrays',sharing:'sharing',
 'fraction-wall':'fraction strips','place-value':'place-value charts','hundred-grid':'hundred grids','percent-bar':'percentage bars','ratio-bars':'ratio bar models',balance:'balance scales',symbols:'number sentences',story:'stories'};
/** Mastery needs success across these facets, not five identical equations. */
export type Facet='direct'|'visual'|'reverse'|'missing'|'word'|'unfamiliar'|'reasoning';
export const FACET_LABEL:Record<Facet,string>={direct:'calculate directly',visual:'read a picture or model',reverse:'work backwards',missing:'find a missing quantity',word:'solve a story',unfamiliar:'use a new representation',reasoning:'explain or find a mistake'};
/** Manipulative states. Every tool can be shown read-only, or changed by the pupil through `onChange`. */
export type Tool=(
 |{kind:'take-away';start:number;removed:number[]}
 |{kind:'triangle-pair';base:number;height:number;joined:boolean;lengthUnit?:'m'}
 |{kind:'fraction-pieces';widths:number[];selected:number[];shape?:'strip'|'circle'}
 |{kind:'focus';source:Tool;rotate:number;caption:string}
 |SceneTool|FoundationTool
 |GeometryTool
 |{kind:'net-model';shape:'cube'|'cuboid'|'triangular prism'|'square pyramid'}
 |{kind:'diagram';picture:Picture;caption:string}
 |{kind:'table';headers:string[];rows:string[][];caption:string}

 |{kind:'counters';count:number;frame?:10|20}
 |{kind:'bond';whole:number;parts:[number,number];hide?:'whole'|'a'|'b';locked?:boolean}
 |{kind:'bar';parts:(number|null)[];whole:number|null;labels?:string[];compare?:{top:number|null;bottom:number|null;names:[string,string]}}
 |{kind:'line';min:number;max:number;start:number;jumps:number[];step?:number;mark?:number|null}
 |{kind:'groups';groups:number;size:number;limit?:number}
 |{kind:'array';rows:number;cols:number}
 |{kind:'share';total:number;people:number;given:number[];mode:'share'|'group';size?:number}
 |{kind:'fractions';denominators:number[];shaded:number[];hideValue?:boolean}
 |{kind:'place';digits:number[];wholes?:number}
 |{kind:'hundred';shaded:number}
 |{kind:'percent';whole:number;percent:number;unit?:string;step?:number}
 |{kind:'ratio';names:string[];units:number[];unitValue:number|null;total?:number|null;colours?:string[]}
 |{kind:'balance';left:{x:number;n:number};right:{x:number;n:number};xValue:number;letter?:string}) & {hideValue?:boolean};
export type ToolKind=Tool['kind'];
export interface Item {
 /** Stable identity within a lesson attempt, e.g. `guided-3`. */
 key:string;
 prompt:string;display?:string;answer:string;unit?:string;
 /** Choice questions compare the exact text; others compare numerical value (fractions allowed). */
 choices?:string[];
 /** Set when only this exact written form is accepted (for example a fraction in simplest form). */
 exact?:boolean;
 facet?:Facet;rep?:Rep;tool?:Tool;requiresModel?:boolean;
 /** Staged clues: the relationship, a representation, the operation, then one step. */
 hints:string[];
 /** “Teach me”: a mini-lesson for this item. The pupil completes the final step. */
 steps:string[];
 another?:{title:string;steps:string[];tool?:Tool}[];
 /** “I still don't get it”: an easier question on the same idea, then back to this one. */
 simpler?:Item;
 /** Targeted feedback for specific wrong answers. */
 wrong?:Record<string,string>;
 /** How to check the answer: part of the reasoning, not just the interface. */
 check?:string;
}
export type Gen=(seed:number,index:number)=>Item;
export interface Why {question:string;answer:string;tool?:Tool}
export interface RevealStep {caption?:string;because?:string;wonder?:{question:string;answer:string};text:string;math?:string;tool?:Tool;ask?:{prompt:string;answer:string;choices?:string[]}}
export interface StageFlow {phase:'watch'|'together'|'try'|'check';label:string;transition:string;carry?:string}
export type Stage=({flow?:StageFlow;actionLabel?:string}&(

 |{kind:'readiness';title:string;text?:string;items:Item[];booster:{text:string;math?:string;tool?:Tool}[]}
 |{kind:'hook';title:string;text:string;tool?:Tool;caption?:string;next?:string}
 |{kind:'explore';title:string;text:string;tool:Tool;goal:(t:Tool)=>boolean;goalHint:string;success:string}
 |{kind:'notice';title:string;text:string;tool?:Tool;options:{text:string;correct:boolean;reply:string}[]}
 |{kind:'connect';title:string;text?:string;rows:{text:string;math?:string;tool?:Tool}[]}
 |{kind:'explain';title:string;text:string;math?:string;tool?:Tool;why?:Why;frames?:RevealStep[];example?:string;method?:{label:string;intro:string};alternatives?:{label:string;intro?:string;frames:RevealStep[]}[]}
 |{kind:'worked';title:string;problem:string;tool?:Tool;steps:RevealStep[]}
 |{kind:'practice';mode:'guided'|'independent';title:string;text?:string;gen:Gen;count:number}
 |{kind:'apply';title:string;text?:string;gen:Gen;count:number}
 |{kind:'reason';title:string;text?:string;items:Item[]}
 |{kind:'mastery';title:string;text?:string;gens:{facet:Facet;gen:Gen}[]}
 |{kind:'discovery';title:string;text:string;math?:string;tool?:Tool;caption?:string}));
export type WorldId='number-kingdom'|'operation-station'|'fraction-forest'|'decimal-depths'|'measurement-metro'|'geometry-galaxy'|'data-city'|'ratio-realm'|'algebra-academy';
export const WORLDS:Record<WorldId,{title:string;blurb:string}>={
 'number-kingdom':{title:'Number Kingdom',blurb:'Whole numbers and place value'},
 'operation-station':{title:'Operation Station',blurb:'Adding, subtracting, multiplying and dividing'},
 'fraction-forest':{title:'Fraction Forest',blurb:'Parts of a whole, and fractions as numbers'},
 'decimal-depths':{title:'Decimal Depths',blurb:'Tenths, hundredths and thousandths'},
 'measurement-metro':{title:'Measurement Metro',blurb:'Length, mass, volume, time and money'},
 'geometry-galaxy':{title:'Geometry Galaxy',blurb:'Shapes, angles and space'},
 'data-city':{title:'Data City',blurb:'Collecting, showing and reading data'},
 'ratio-realm':{title:'Ratio Realm',blurb:'Percentage, rate and ratio'},
 'algebra-academy':{title:'Algebra Academy',blurb:'Unknowns, expressions and equations'},
};
export interface Lesson {
 revision?:string;mission?:{goal:string;question:string;connection:string;pictureExample?:string};
 /** Lowercase letters, digits and hyphens; stored as `learn.<id>` in progress. */
 id:string;level:number;track:Track|'both';world:WorldId;title:string;minutes:number;
 /** Curated MOE objective IDs from the curriculum map; never generated at runtime. */
 skillIds:string[];
 /** The existing practice activity this lesson prepares for; lesson answers are recorded against it. */
 activityId:string;
 objectives:string[];canDo:string[];prerequisites:string[];
 representations:Rep[];misconceptions:{name:string;fix:string}[];
 /** How this idea grows across the primary years. */
 grows?:string[];
 stages:Stage[];
}
