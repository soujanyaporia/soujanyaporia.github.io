import type {Gen,Item,Lesson,Stage} from './model';

/**
 * No question twice in one lesson attempt.
 *
 * Each stage draws its questions independently, and many objectives have small parameter spaces —
 * ten ordinal positions, a handful of coins, denominators up to 12 — so across the twenty or so
 * questions in a lesson the same question used to reappear in about half of all attempts. This pass
 * builds the whole attempt's questions in order and re-draws any question already asked.
 *
 * The player seeds stage k with `seed + k × 1009` (see `stageItems`), so every generator below can
 * recover the attempt seed and look up its position in the attempt's distinct list. Apply this pass
 * after selecting a mode's stages: reviews reorder facets and challenges shorten the sequence.
 * Rewrapping safely recovers the raw generators instead of retaining their old stage positions.
 * Generators stay pure, so a resumed attempt sees exactly the questions it saw before.
 */
const STAGE_STRIDE=1009;
const RETRIES=10;
const norm=(s:string)=>s.replace(/\s+/g,' ').trim();
/**
 * Two questions are the same to a pupil when they read the same, show the same picture and expect the
 * same answer. Two coin pictures that both total $17 are different questions; one picture asked twice
 * is not.
 */
export const questionKey=(it:Pick<Item,'prompt'|'display'|'answer'|'tool'>)=>`${norm(it.prompt)}|${norm(it.display??'')}|${norm(it.answer)}|${it.tool?JSON.stringify(it.tool):''}`;

type Drawn=Record<number,Item[]>;
const generated=(s:Stage)=>s.kind==='practice'||s.kind==='apply'||s.kind==='mastery';
// A catalogue lesson may already be wrapped before a review selects/reorders its generators.
// Weak keys avoid retaining old lesson/player instances solely for this metadata.
const originalGenerator=new WeakMap<Gen,Gen>();
const rawGenerator=(gen:Gen):Gen=>originalGenerator.get(gen)??gen;
const remember=(wrapped:Gen,raw:Gen):Gen=>{originalGenerator.set(wrapped,raw);return wrapped;};

export function withDistinctQuestions(lesson:Lesson):Lesson{
 const source=lesson.stages.map((s):Stage=>{
  if(s.kind==='practice'||s.kind==='apply')return {...s,gen:rawGenerator(s.gen)};
  if(s.kind==='mastery')return {...s,gens:s.gens.map(g=>({...g,gen:rawGenerator(g.gen)}))};
  return s;
 });
 if(!source.some(generated))return lesson;
 // A bounded memo: one entry per attempt seed seen recently.
 const memo=new Map<number,Drawn>();
 function draw(attempt:number):Drawn{
  const hit=memo.get(attempt);if(hit)return hit;
  const seen=new Set<string>(),out:Drawn={};
  const take=(make:(index:number)=>Item,index:number):Item=>{
   let first:Item|undefined;
   for(let t=0;t<=RETRIES;t++){
    const it=make(index+t*1000);first??=it;
    const k=questionKey(it);
    if(!seen.has(k)){seen.add(k);return it;}
   }
   // Some objectives genuinely have only a few questions; keep the draw rather than fail.
   seen.add(questionKey(first!));return first!;
  };
  source.forEach((s,k)=>{
   if(s.kind==='readiness'||s.kind==='reason'){for(const it of s.items)seen.add(questionKey(it));return;}
   if(!generated(s))return;
   const base=attempt+k*STAGE_STRIDE;
   if(s.kind==='mastery')out[k]=s.gens.map((g,i)=>take(index=>g.gen(base,index),i));
   else out[k]=Array.from({length:s.count},(_,i)=>take(index=>s.gen(base,index),i));
  });
  if(memo.size>256)memo.clear();
  memo.set(attempt,out);return out;
 }
 // Callers outside the attempt sequence (an index past the stage's count) get a plain draw.
 const lookup=(k:number,raw:Gen):Gen=>remember((seed,index)=>draw(seed-k*STAGE_STRIDE)[k]?.[index]??raw(seed,index),raw);
 // A learning-check facet sits at one position; any other index is not part of an attempt.
 const facet=(k:number,position:number,raw:Gen):Gen=>remember((seed,index)=>index===position?draw(seed-k*STAGE_STRIDE)[k]?.[position]??raw(seed,index):raw(seed,index),raw);
 const stages=source.map((s,k):Stage=>{
  if(s.kind==='practice'||s.kind==='apply')return {...s,gen:lookup(k,s.gen)};
  if(s.kind==='mastery')return {...s,gens:s.gens.map((g,i)=>({...g,gen:facet(k,i,g.gen)}))};
  return s;
 });
 return {...lesson,stages};
}
