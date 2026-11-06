import {describe,it,expect} from 'vitest';
import type {KV} from './sessionStore';
import {paperReasoningFamily} from './paperBlueprints';
import {correctAnswer,type Question} from './generate';
import {paperAnswerStatus} from './paperAttempt';
import {generatePracticePaper,parsePracticePaperCode,type PaperRequest} from './practicePaper';
import {generateFreshPracticePaper,paperFreshnessScore,paperHistoryEntry,readPaperHistory,rememberPaper,type PaperHistoryEntry} from './freshPracticePaper';
const request=(level:number):Omit<PaperRequest,'seed'>=>({level,track:'standard',count:6,topic:'mixed'});
const store=()=>{const entries=new Map<string,string>();const kv:KV={getItem:k=>entries.get(k)??null,setItem:(k,v)=>{entries.set(k,v);},removeItem:k=>{entries.delete(k);}};return {kv,entries};};
const seeds=[101,202,303,404,505,606];
describe('fresh practice paper selection',()=>{
 it('selects recent-family-aware papers for all six grades and keeps codes reproducible',()=>{
  for(let level=1;level<=6;level++){
   const input=request(level),first=generateFreshPracticePaper(input,[seeds[0]],[]),history=[paperHistoryEntry(first)];
   const alternatives=seeds.slice(1,5).map(seed=>generatePracticePaper({...input,seed})),fresh=generateFreshPracticePaper(input,seeds.slice(1,5),history),chosen=paperFreshnessScore(paperHistoryEntry(fresh).families,history),naive=paperFreshnessScore(paperHistoryEntry(alternatives[0]).families,history);
   expect(chosen.unseen,`P${level}`).toBeGreaterThanOrEqual(naive.unseen);
   expect(fresh.items).toHaveLength(6);expect(fresh.items.every(i=>i.activity.level===level&&i.activity.track==='standard')).toBe(true);
   expect(generatePracticePaper(parsePracticePaperCode(fresh.code)!)).toEqual(fresh);
   for(const {question:q} of fresh.items){expect(paperAnswerStatus(q,q.answer)).toBe('complete');expect(correctAnswer(q,q.answer)).toBe(true);}
  }
 },60000);
 it('chooses a better supplied seed when a genuinely less-repeated paper exists',()=>{
  const input=request(3),papers=seeds.map(seed=>generatePracticePaper({...input,seed})),history=[paperHistoryEntry(papers[0])];
  const firstScore=paperFreshnessScore(history[0].families,history),available=papers.slice(1).some(p=>paperFreshnessScore(paperHistoryEntry(p).families,history).unseen>firstScore.unseen);
  expect(available).toBe(true);const picked=generateFreshPracticePaper(input,seeds,history);
  expect(paperFreshnessScore(paperHistoryEntry(picked).families,history).unseen).toBeGreaterThan(firstScore.unseen);
 });
 it('treats changed numbers and choices as the same reasoning family',()=>{
  const p=generatePracticePaper({...request(3),seed:101}),activity={...p.items[0].activity,kind:'add' as const,canonicalPatternId:undefined};
  const q:Question={key:'a',prompt:'Calculate.',display:'23 + 18 = ?',answer:'41',hint:'Add.',explanation:'Add.'};
  const f=paperReasoningFamily(activity,q),g=paperReasoningFamily(activity,{...q,key:'b',display:'31 + 25 = ?',answer:'56',choices:['56','66','55']});expect(f).toBe(g);
  const history:PaperHistoryEntry[]=[{level:3,track:'standard',families:[f]}];
  expect(paperFreshnessScore([f],history)).toEqual(paperFreshnessScore([g],history));
 });
 it('retains only six family-only entries per path, isolates scopes, and survives bad storage',()=>{
  const {kv,entries}=store(),paper=generatePracticePaper({...request(1),seed:101});
  for(let level=1;level<=6;level++)for(const track of (level>=5?['standard','foundation']:['standard']) as Array<'standard'|'foundation'>)for(let i=0;i<8;i++){
   const item={...paper,request:{...paper.request,level,track}};expect(rememberPaper(kv,'student:1',item)).toBe(true);
  }
  const saved=readPaperHistory(kv,'student:1');expect(saved).toHaveLength(48);
  expect(saved.filter(x=>x.level===5&&x.track==='foundation')).toHaveLength(6);expect(readPaperHistory(kv,'student:2')).toEqual([]);
  const raw=[...entries.values()][0],payload=JSON.parse(raw);expect(Object.keys(payload).sort()).toEqual(['entries','schema']);expect(Object.keys(payload.entries[0]).sort()).toEqual(['families','level','track']);expect(raw).not.toContain(paper.items[0].question.prompt);expect(raw).not.toContain('student:1');
  const key=[...entries.keys()][0];entries.set(key,'{bad json');expect(readPaperHistory(kv,'student:1')).toEqual([]);
  entries.set(key,JSON.stringify({schema:1,entries:[{level:3,track:'standard',families:['contains a name']}] }));expect(readPaperHistory(kv,'student:1')).toEqual([]);
  const denied:KV={getItem(){throw Error('no');},setItem(){throw Error('no');},removeItem(){}};
  expect(readPaperHistory(denied,'guest')).toEqual([]);expect(rememberPaper(denied,'guest',paper)).toBe(false);expect(rememberPaper(null,'guest',paper)).toBe(false);
 });
 it('limits the history score to the last four entries and validates seed input',()=>{
  const entry=(f:string):PaperHistoryEntry=>({level:3,track:'standard',families:[f]});
  expect(paperFreshnessScore(['old','new'],[entry('old'),entry('x'),entry('x'),entry('x'),entry('new')])).toEqual({unseen:1,weightedReuse:4});
  expect(()=>generateFreshPracticePaper(request(3),[],[])).toThrow(RangeError);expect(()=>generateFreshPracticePaper(request(3),[-1],[])).toThrow(RangeError);
 });
});
