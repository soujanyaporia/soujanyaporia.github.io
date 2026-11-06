import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN={
 id:'p6-whole-from-difference-between-shares',
 level:6,
 title:'Find the whole from a difference between shares',
 objective:'Write shares as fractions of one whole, then divide a known difference or increase by the matching fraction to recover the whole or a related quantity.',
 skillIds:['P6.S.RATIO.05','P6.S.RATIO.03','P5.S.FRAC.05','P4.S.FRAC.03'],
 canonicalPatternId:'p6-whole-from-difference-between-shares',
};

type Fr=[number,number];
type Step={text:string;equation?:string};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const lcm=(a:number,b:number)=>a/gcd(a,b)*b;
const red=([n,d]:Fr):Fr=>{const g=gcd(n,d)||1;return [n/g,d/g];};
const sub=(a:Fr,b:Fr):Fr=>red([a[0]*b[1]-b[0]*a[1],a[1]*b[1]]);
const mul=(a:Fr,b:Fr):Fr=>red([a[0]*b[0],a[1]*b[1]]);
const gt=(a:Fr,b:Fr)=>a[0]*b[1]>b[0]*a[1];
const txt=(f:Fr)=>`${f[0]}/${f[1]}`;
const ONE:Fr=[1,1];
const NAMES=['Ann','Ben','Cara','Dev','Eli','Fay','Gus','Hana','Ivan','Jo','Kai','Lena'];

/** A total that is a multiple of `unit`, kept inside a sensible size range. */
const multiple=(r:Rng,unit:number,lo:number,hi:number)=>{const a=Math.max(1,Math.ceil(lo/unit)),b=Math.max(a,Math.floor(hi/unit));return unit*r.int(a,b);};

const finish=(key:string,context:string[],prompt:string,answer:number,unit:string,hint:string,steps:Step[]):Question=>({
 key,context,prompt,answer:String(answer),unit,hint,
 explanation:steps.map(s=>s.equation?`${s.text} ${s.equation}.`:s.text).join(' '),
 workedSteps:steps,
});

function sharedCost(r:Rng,key:string):Question{
 const options:[number,number,number][]=[];
 for(const k of [2,3,4,5,6,7])for(const [p,q] of [[1,2],[2,5],[1,3],[1,4],[3,8],[3,10]]){
  const c=sub(sub(ONE,[1,k+1]),[p,q]);
  if(c[0]>0&&gt(c,[1,k+1]))options.push([k,p,q]);
 }
 const [k,p,q]=r.pick(options);
 const [A,B,C]=r.shuffle(NAMES).slice(0,3),item=r.pick(['gift','speaker','tent','bicycle','camera','kite']);
 const a:Fr=[1,k+1],b:Fr=[p,q],c=sub(sub(ONE,a),b),gap=sub(c,a);
 const total=multiple(r,lcm(k+1,q),100,2000),d=total*gap[0]/gap[1];
 return finish(key,[
  `${A}, ${B} and ${C} shared the cost of a ${item}.`,
  `${A} paid 1/${k} of the total that ${B} and ${C} paid together.`,
  `${B} paid ${p}/${q} of the whole cost of the ${item}.`,
  `${C} paid $${d} more than ${A}.`,
 ],`How much did the ${item} cost?`,total,'dollars',
 'Write each person’s payment as a fraction of the whole cost. The extra $ matches the difference of two fractions.',[
  {text:`${A} paid 1/${k} of what ${B} and ${C} paid together, so ${A} has 1 part for every ${k} parts of the others.`,equation:`${A} paid ${txt(a)} of the whole cost`},
  {text:`${B} paid ${txt(b)}. ${C} paid the rest.`,equation:`1 − ${txt(a)} − ${txt(b)} = ${txt(c)}`},
  {text:`Find the fraction of the whole that matches the extra amount.`,equation:`${txt(c)} − ${txt(a)} = ${txt(gap)}`},
  {text:`${txt(gap)} of the whole cost is $${d}. Find 1 part, then the whole.`,equation:`$${d} ÷ ${gap[0]} × ${gap[1]} = $${total}`},
 ]);
}

function restRatio(r:Rng,key:string):Question{
 const ratios:[number,number][]=[[3,2],[2,3],[1,2],[2,1],[3,1],[1,3],[4,3],[3,4],[5,2]];
 const options:[number,number,number,number][]=[];
 for(const n of [3,4,5,6,8])for(const [a,b] of ratios)for(const who of [0,1]){
  const share=mul([n-1,n],[who===0?a:b,a+b]);
  if(gt(share,[1,n]))options.push([n,a,b,who]);
 }
 const [n,a,b,who]=r.pick(options);
 const [A,B,C]=r.shuffle(NAMES).slice(0,3),things=r.pick(['bracelets','badges','bookmarks','keychains','cupcakes']);
 const first:Fr=[1,n],rest=sub(ONE,first),part=who===0?a:b,share=mul(rest,[part,a+b]),gap=sub(share,first);
 const total=n*(a+b)*r.int(1,8),d=total*gap[0]/gap[1],X=who===0?B:C;
 return finish(key,[
  `${A}, ${B} and ${C} sold some ${things} at a fair.`,
  `${A} sold 1/${n} of all the ${things}.`,
  `${B} and ${C} sold the rest in the ratio ${a} : ${b} (${B} : ${C}).`,
  `${X} sold ${d} more ${things} than ${A}.`,
 ],`How many ${things} did the three children sell altogether?`,total,things,
 'Find the fraction of the whole for the child being compared, then use the difference from the first child.',[
  {text:`${A} sold ${txt(first)} of all the ${things}, so the other two sold the rest.`,equation:`1 − ${txt(first)} = ${txt(rest)}`},
  {text:`The rest is split into ${a+b} equal parts. ${X} has ${part} of them.`,equation:`${txt(rest)} × ${part}/${a+b} = ${txt(share)} of the whole`},
  {text:`Find the fraction that matches the difference.`,equation:`${txt(share)} − ${txt(first)} = ${txt(gap)}`},
  {text:`${txt(gap)} of all the ${things} is ${d}. Find 1 part, then the whole.`,equation:`${d} ÷ ${gap[0]} × ${gap[1]} = ${total}`},
 ]);
}

function readMorePages(r:Rng,key:string):Question{
 const pqs:[number,number][]=[[2,3],[3,4],[1,2],[3,2],[2,5],[4,5],[3,5]];
 const options:[number,number,number][]=[];
 for(const a of [3,4,5,6,8])for(const [p,q] of pqs)if(gt([p,p+q],[1,a]))options.push([a,p,q]);
 const [a,p,q]=r.pick(options);
 const A=r.pick(NAMES),book=r.pick(['storybook','science book','novel','guide']);
 const before:Fr=[1,a],after:Fr=[p,p+q],gap=sub(after,before);
 const total=multiple(r,lcm(a,p+q),60,600),d=total*gap[0]/gap[1],read=total*p/(p+q);
 return finish(key,[
  `${A} has read 1/${a} of a ${book}.`,
  `After reading ${d} more pages, the pages ${A} has read are ${p}/${q} of the pages not yet read.`,
 ],`How many pages has ${A} read altogether now?`,read,'pages',
 'If the pages read are p/q of the pages unread, then the read part is p parts and the unread part is q parts of the whole.',[
  {text:`Read : unread is ${p} : ${q}, so the pages read make ${p} out of ${p+q} equal parts of the ${book}.`,equation:`Now read = ${txt(after)} of all the pages`},
  {text:`Before, ${A} had read ${txt(before)}. The extra pages are the increase in the fraction.`,equation:`${txt(after)} − ${txt(before)} = ${txt(gap)}`},
  {text:`${txt(gap)} of all the pages is ${d}. Find the whole ${book}.`,equation:`${d} ÷ ${gap[0]} × ${gap[1]} = ${total} pages`},
  {text:`Now ${A} has read ${txt(after)} of the whole.`,equation:`${total} × ${p}/${p+q} = ${read} pages`},
 ]);
}

function successiveBoxes(r:Rng,key:string):Question{
 const pqs:[number,number][]=[[1,2],[1,3],[2,3],[3,4],[2,5],[3,5],[1,4]];
 const options:[number,number,number][]=[];
 for(const a of [3,4,5,6])for(const [p,q] of pqs)if(gt(mul([a-1,a],[p,q]),[1,a]))options.push([a,p,q]);
 const [a,p,q]=r.pick(options);
 const things=r.pick(['cans','toys','books','coats']);
 const first:Fr=[1,a],rest=sub(ONE,first),second=mul(rest,[p,q]),third=mul(rest,sub(ONE,[p,q])),gap=sub(second,first);
 const total=multiple(r,a*q,60,900),d=total*gap[0]/gap[1],answer=total*third[0]/third[1];
 return finish(key,[
  `Some ${things} were put into three boxes.`,
  `Box 1 got 1/${a} of all the ${things}.`,
  `Box 2 got ${p}/${q} of the ${things} that were left after Box 1.`,
  `Box 3 got the rest.`,
  `Box 2 got ${d} more ${things} than Box 1.`,
 ],`How many ${things} did Box 3 get?`,answer,things,
 'Turn “a fraction of the remainder” into a fraction of the whole. Use the difference to find the whole first.',[
  {text:`After Box 1, the fraction of the whole left is`,equation:`1 − ${txt(first)} = ${txt(rest)}`},
  {text:`Box 2 gets ${p}/${q} of what is left.`,equation:`${txt(rest)} × ${p}/${q} = ${txt(second)} of the whole`},
  {text:`Find the fraction that matches the difference between Box 2 and Box 1.`,equation:`${txt(second)} − ${txt(first)} = ${txt(gap)}`},
  {text:`${txt(gap)} of all the ${things} is ${d}. Find the whole.`,equation:`${d} ÷ ${gap[0]} × ${gap[1]} = ${total}`},
  {text:`Box 3 gets the rest of what was left after Box 1.`,equation:`${total} × ${txt(third)} = ${answer} ${things}`},
 ]);
}

export function makeRagQuestion(seed:number,index=0):Question{
 const key=`${RAG_PATTERN.id}:${seed}:${index}`;
 const r=new Rng(hashString(key));
 const variant=(Math.abs(Math.trunc(seed))+index)%4;
 return [sharedCost,restRatio,readMorePages,successiveBoxes][variant](r,key);
}
